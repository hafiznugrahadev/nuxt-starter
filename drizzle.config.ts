import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'postgresql',
  schema: './server/db/schema.ts',
  out: './server/db/migrations',
  // Only `migrate`, `push` and `studio` connect; `generate` works offline.
  dbCredentials: {
    url: process.env.DATABASE_URL ?? ''
  },
  strict: true,
  verbose: true
})
