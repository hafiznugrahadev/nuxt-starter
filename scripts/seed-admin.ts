import { PrismaClient } from '@prisma/client'
import { hashUserPassword } from '../server/utils/password'

// Seeds (or resets) the administrator account. Credentials are read from the
// environment (see .env.example) and the command is idempotent — re-running it
// updates the existing admin to the configured name/password.
//
//   bun run seed:admin
const prisma = new PrismaClient()

async function main() {
  const name = process.env.ADMIN_NAME || 'Administrator'
  const email = process.env.ADMIN_EMAIL || 'admin@example.com'
  const password = process.env.ADMIN_PASSWORD || 'admin12345'

  const hashed = await hashUserPassword(password)

  const admin = await prisma.user.upsert({
    where: { email },
    update: { name, role: 'ADMIN', password: hashed },
    create: { name, email, role: 'ADMIN', password: hashed }
  })

  console.log('✓ Admin user is ready')
  console.log(`  email:    ${admin.email}`)
  console.log(`  password: ${password}`)
}

main()
  .catch((error) => {
    console.error('✗ Failed to seed admin user')
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
