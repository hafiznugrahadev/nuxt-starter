#!/bin/sh
set -e

# Apply pending database migrations before starting the server.
if [ -n "$DATABASE_URL" ]; then
  echo "→ Applying database migrations (drizzle)…"
  bun scripts/migrate.ts
else
  echo "⚠ DATABASE_URL is not set — skipping migrations."
fi

exec "$@"
