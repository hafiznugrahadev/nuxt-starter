import { PrismaClient } from '@prisma/client'
import { hashUserPassword } from '../server/utils/password'

// Generates demo (non-admin) users so the server-side datatable has enough
// rows to showcase pagination, sorting and search.
//
//   bun run seed:users           # 50 users
//   SEED_COUNT=200 bun run seed:users
const prisma = new PrismaClient()

const firstNames = [
  'Alice', 'Bob', 'Carol', 'David', 'Emma', 'Frank', 'Grace', 'Henry',
  'Ivy', 'Jack', 'Kara', 'Liam', 'Mia', 'Noah', 'Olivia', 'Peter',
  'Quinn', 'Rose', 'Sam', 'Tara', 'Uma', 'Victor', 'Wendy', 'Xavier',
  'Yara', 'Zane'
]
const lastNames = [
  'Anderson', 'Brown', 'Clark', 'Davis', 'Evans', 'Foster', 'Green',
  'Harris', 'Irwin', 'Jones', 'King', 'Lopez', 'Miller', 'Nguyen'
]

async function main() {
  const count = Number(process.env.SEED_COUNT || 50)
  const password = await hashUserPassword('password123')

  const data = Array.from({ length: count }, (_, i) => {
    const first = firstNames[i % firstNames.length]
    const last = lastNames[Math.floor(i / firstNames.length) % lastNames.length]
    return {
      name: `${first} ${last}`,
      email: `${first}.${last}.${i}@example.com`.toLowerCase(),
      password,
      role: 'USER' as const
    }
  })

  const result = await prisma.user.createMany({ data, skipDuplicates: true })
  console.log(`✓ Seeded ${result.count} demo users (password: password123)`)
}

main()
  .catch((error) => {
    console.error('✗ Failed to seed demo users')
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
