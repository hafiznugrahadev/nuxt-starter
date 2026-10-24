// Generates demo (non-admin) users so the admin datatable has enough rows to
// showcase pagination, sorting and search. Users are created through Better
// Auth; emails that already exist are skipped, so the script can be re-run.
//
//   bun run seed:users           # 50 users
//   SEED_COUNT=200 bun run seed:users

// Seeding only touches the database; silence Better Auth's base-URL warning.
process.env.BETTER_AUTH_URL ||= 'http://localhost:3000'
const { auth } = await import('../server/utils/auth')
const { prisma } = await import('../server/utils/prisma')
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

  const existing = new Set(
    (await prisma.user.findMany({ select: { email: true } })).map(user => user.email)
  )

  let created = 0
  for (let i = 0; i < count; i++) {
    const first = firstNames[i % firstNames.length]
    const last = lastNames[Math.floor(i / firstNames.length) % lastNames.length]
    const email = `${first}.${last}.${i}@example.com`.toLowerCase()
    if (existing.has(email)) continue

    await auth.api.createUser({
      body: {
        name: `${first} ${last}`,
        email,
        password: 'password123',
        role: 'user'
      }
    })
    created++
  }

  console.log(`✓ Seeded ${created} demo users (password: password123)`)
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
