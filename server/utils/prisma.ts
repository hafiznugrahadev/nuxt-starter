import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../../generated/prisma/client'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL must be set before creating the Prisma client')
}

const adapter = new PrismaPg({
  connectionString,
  connectionTimeoutMillis: 5_000,
  max: 10
})

// Reuse a single PrismaClient across HMR reloads in development to avoid
// exhausting the database connection pool.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma
  = globalForPrisma.prisma
    ?? new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error']
    })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
