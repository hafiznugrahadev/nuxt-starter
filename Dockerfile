# syntax=docker/dockerfile:1

# ---- Build stage ----------------------------------------------------------
# Full dependency tree: build the Nuxt/Nitro server output.
FROM oven/bun:1.4 AS build

WORKDIR /app

COPY package.json bun.lock ./
# bun has no built-in download retry: one truncated tarball kills the build.
RUN bun install --frozen-lockfile \
  || (sleep 5 && bun install --frozen-lockfile) \
  || (sleep 10 && bun install --frozen-lockfile)

COPY . .

RUN bun run build

# ---- Runtime dependencies stage --------------------------------------------
# An isolated install of the packages used outside the Nitro bundle: the
# migration runner (Drizzle + pg), the seed scripts (Better Auth), and the
# separate worker process (BullMQ, Nodemailer). Nuxt and build-only
# dependencies stay in the build stage.
FROM oven/bun:1.4 AS runtime-deps

WORKDIR /app

RUN printf '{"name":"runtime-deps","private":true}\n' > package.json
RUN bun add drizzle-orm@0.45.4 pg@8.23.1 \
  better-auth@1.7.14 bullmq@6.5.1 nodemailer@10.3.1 ioredis@6.0.0 unstorage@1.17.6 zod@4.6.7 \
  || (sleep 5 && bun add drizzle-orm@0.45.4 pg@8.23.1 \
    better-auth@1.7.14 bullmq@6.5.1 nodemailer@10.3.1 ioredis@6.0.0 unstorage@1.17.6 zod@4.6.7) \
  || (sleep 10 && bun add drizzle-orm@0.45.4 pg@8.23.1 \
    better-auth@1.7.14 bullmq@6.5.1 nodemailer@10.3.1 ioredis@6.0.0 unstorage@1.17.6 zod@4.6.7)

# ---- Runtime stage --------------------------------------------------------
# Lean image. The Nitro `.output` is self-contained for serving requests; the
# migration runner and seed scripts are carried so the entrypoint can apply
# migrations on start (and seed on demand), which suits single-service
# platforms like Dokploy that have no separate migrate job.
FROM oven/bun:1.4-slim AS runner

ENV NODE_ENV=production \
    NUXT_HOST=0.0.0.0 \
    NUXT_PORT=3000

# CA bundle for TLS connections to managed databases and SMTP.
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Self-contained Nitro server.
COPY --from=build /app/.output ./.output

COPY --from=runtime-deps /app/node_modules ./node_modules

# Schema, migrations, worker source, and seed scripts used by the entrypoint
# and on-demand commands.
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/server/db ./server/db
COPY --from=build /app/server/utils ./server/utils
COPY --from=build /app/shared ./shared
COPY --from=build /app/workers ./workers

COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["bun", "/app/.output/server/index.mjs"]
