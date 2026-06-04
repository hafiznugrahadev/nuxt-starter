# syntax=docker/dockerfile:1

# ---- Build stage ----------------------------------------------------------
FROM oven/bun:1.3 AS build

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

# Generate the Prisma client, then build the Nuxt/Nitro server output.
RUN bunx prisma generate
RUN bun run build

# ---- Runtime stage --------------------------------------------------------
FROM oven/bun:1.3-slim AS runner

ENV NODE_ENV=production \
    NUXT_HOST=0.0.0.0 \
    NUXT_PORT=3000

WORKDIR /app

# Self-contained Nitro server (includes the traced Prisma client + engine).
COPY --from=build /app/.output ./.output

# Prisma schema, migrations and CLI so the entrypoint can run `migrate deploy`.
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules/prisma ./node_modules/prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/.bin/prisma ./node_modules/.bin/prisma

COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["bun", "/app/.output/server/index.mjs"]
