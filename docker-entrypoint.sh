#!/bin/sh
set -e

# Apply pending database migrations before starting the server.
if [ -n "$DATABASE_URL" ]; then
  echo "→ Applying database migrations (prisma migrate deploy)…"
  # Invoke the package entry directly so its bundled assets (wasm/engine)
  # resolve relative to node_modules/prisma/build.
  bun node_modules/prisma/build/index.js migrate deploy
else
  echo "⚠ DATABASE_URL is not set — skipping migrations."
fi

exec "$@"
