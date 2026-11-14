// Applies pending SQL migrations from server/db/migrations. Used by the
// Docker entrypoints and the Vercel build, so production images only need
// drizzle-orm and pg (not drizzle-kit).
//
//   bun run db:migrate
import { fileURLToPath } from 'node:url'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { closeDb, db } from '../server/utils/db'

const migrationsFolder = fileURLToPath(new URL('../server/db/migrations', import.meta.url))

try {
  await migrate(db, { migrationsFolder })
  console.log('✓ Database migrations are up to date')
} catch (error) {
  console.error('✗ Failed to apply database migrations')
  console.error(error)
  process.exitCode = 1
} finally {
  await closeDb()
}
