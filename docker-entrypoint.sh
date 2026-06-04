#!/bin/sh
set -e

# Apply pending database migrations before starting the server.
if [ -n "$DATABASE_URL" ]; then
  echo "→ Applying database migrations (prisma migrate deploy)…"
  bunx prisma migrate deploy
fi

exec "$@"
