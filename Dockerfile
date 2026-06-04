# syntax=docker/dockerfile:1

# ---- Build stage ----------------------------------------------------------
# Full dependency tree — also reused as the "migrator" image (it has the
# Prisma CLI and its transitive deps) to run `migrate deploy` / `db seed`.
FROM oven/bun:1.3 AS build

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

# Generate the Prisma client, then build the Nuxt/Nitro server output.
RUN bunx prisma generate
RUN bun run build

# ---- Runtime stage --------------------------------------------------------
# Lean image: the Nitro `.output` is self-contained (it bundles the Prisma
# client + query engine). Migrations are applied by the `migrate` service in
# docker-compose.prod.yml, which runs from the build stage above.
FROM oven/bun:1.3-slim AS runner

ENV NODE_ENV=production \
    NUXT_HOST=0.0.0.0 \
    NUXT_PORT=3000

# Prisma's query engine needs OpenSSL at runtime.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=build /app/.output ./.output

EXPOSE 3000

CMD ["bun", "/app/.output/server/index.mjs"]
