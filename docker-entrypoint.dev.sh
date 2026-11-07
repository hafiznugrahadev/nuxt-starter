#!/bin/sh
set -e

# Sync the container-side node_modules volume on every boot.
#
# The named volume (see docker-compose.yml) shields /app/node_modules from the
# bind-mounted host directory, because host deps are macOS binaries and the
# container needs Linux ones. A volume is only seeded from the image when it
# is created, so after a dependency change it would otherwise keep serving the
# old install ("module could not be loaded"). Running `bun install` here makes
# it converge with bun.lock on every start — no `docker volume rm` needed.
bun install --frozen-lockfile

# Keep Prisma output in sync with the bind-mounted schema. Worker containers
# keep their image-generated client and skip regeneration.
if [ "${SKIP_PRISMA_GENERATE:-false}" != "true" ]; then
  bunx prisma generate
fi

if [ "${SKIP_MIGRATIONS:-false}" != "true" ] && [ -n "${DATABASE_URL:-}" ]; then
  echo "→ Applying database migrations (prisma migrate deploy)…"
  bun node_modules/prisma/build/index.js migrate deploy
fi

exec "$@"
