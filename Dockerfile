# syntax=docker/dockerfile:1

# ---- Build stage ----------------------------------------------------------
# Full dependency tree: build the Nuxt/Nitro server output.
FROM oven/bun:1.3 AS build

WORKDIR /app

COPY package.json bun.lock ./
# bun has no built-in download retry: one truncated tarball kills the build.
RUN bun install --frozen-lockfile \
  || (sleep 5 && bun install --frozen-lockfile) \
  || (sleep 10 && bun install --frozen-lockfile)

COPY . .

# Generate the Prisma client, then build the Nuxt/Nitro server output.
RUN DATABASE_URL=postgresql://postgres:postgres@localhost:5432/nuxt_starter bun run db:generate
RUN bun run build

# ---- Prisma stage ---------------------------------------------------------
# An isolated install of the runtime dependencies needed by Prisma, Better
# Auth seeding, and the email worker. Nuxt and build-only dependencies stay in
# the build stage.
FROM oven/bun:1.3 AS prisma

WORKDIR /app

# trustedDependencies lets bun run Prisma's postinstall (engine setup).
# better-auth is used by the seed scripts; BullMQ and Nodemailer are used by
# the separate email worker process.
RUN printf '{"name":"prisma-runtime","private":true,"trustedDependencies":["prisma","@prisma/client","@prisma/engines"]}\n' > package.json
RUN bun add prisma@7.10.1 @prisma/client@7.10.1 @prisma/adapter-pg@7.10.1 pg@8.23.1 \
  better-auth@1.7.12 bullmq@6.4.0 nodemailer@10.2.1 ioredis@6.0.0 unstorage@1.17.6 \
  || (sleep 5 && bun add prisma@7.10.1 @prisma/client@7.10.1 @prisma/adapter-pg@7.10.1 pg@8.23.1 \
    better-auth@1.7.12 bullmq@6.4.0 nodemailer@10.2.1 ioredis@6.0.0 unstorage@1.17.6) \
  || (sleep 10 && bun add prisma@7.10.1 @prisma/client@7.10.1 @prisma/adapter-pg@7.10.1 pg@8.23.1 \
    better-auth@1.7.12 bullmq@6.4.0 nodemailer@10.2.1 ioredis@6.0.0 unstorage@1.17.6)

# Generate the client so `prisma db seed` (scripts/seed-admin.ts) can use it.
COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts
RUN DATABASE_URL=postgresql://postgres:postgres@localhost:5432/nuxt_starter bunx prisma generate

# ---- Runtime stage --------------------------------------------------------
# Lean image. The Nitro `.output` is self-contained for serving requests; the
# Prisma CLI is carried only so the entrypoint can run `prisma migrate deploy`
# on start (and `db seed` on demand) — handy for single-service platforms like
# Dokploy where there is no separate migrate job.
FROM oven/bun:1.3-slim AS runner

ENV NODE_ENV=production \
    NUXT_HOST=0.0.0.0 \
    NUXT_PORT=3000

# Prisma's query engine needs OpenSSL at runtime.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Self-contained Nitro server.
COPY --from=build /app/.output ./.output

# Runtime dependencies and the generated Prisma client.
COPY --from=prisma /app/node_modules ./node_modules
COPY --from=prisma /app/generated ./generated

# Schema, worker source, and seed scripts used by the entrypoint and CLI.
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/server/utils ./server/utils
COPY --from=build /app/workers ./workers

COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["bun", "/app/.output/server/index.mjs"]
