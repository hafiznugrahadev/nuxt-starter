import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from '../db/schema'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL must be set before connecting to the database')
}

// Reuse a single pool across HMR reloads in development to avoid exhausting
// the database connection limit.
const globalForDb = globalThis as unknown as {
  dbPool: Pool | undefined
}

const pool = globalForDb.dbPool ?? new Pool({
  connectionString,
  connectionTimeoutMillis: 5_000,
  max: 10
})

if (process.env.NODE_ENV !== 'production') {
  globalForDb.dbPool = pool
}

export const db = drizzle({ client: pool, schema })

export type Database = typeof db

// For scripts and the worker; Nitro keeps the pool for the process lifetime.
export async function closeDb() {
  await pool.end()
  globalForDb.dbPool = undefined
}

/**
 * Escapes `%`, `_` and `\` so user input matches literally inside a LIKE
 * pattern (Postgres' default escape character is the backslash).
 */
export function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, char => `\\${char}`)
}
