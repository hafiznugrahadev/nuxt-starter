// Seeds (or resets) the administrator account. Credentials are read from the
// environment (see .env.example). The user is created through Better Auth so
// the password hash and related records match what the app expects, which
// makes the command idempotent: re-running it recreates the admin with the
// configured name/password.
//
//   bun run seed:admin

// Seeding only touches the database; silence Better Auth's base-URL warning.
process.env.BETTER_AUTH_URL ||= 'http://localhost:3000'
const { auth } = await import('../server/utils/auth')
const { prisma } = await import('../server/utils/prisma')

async function main() {
  const name = process.env.ADMIN_NAME || 'Administrator'
  const email = process.env.ADMIN_EMAIL || 'admin@example.com'
  const password = process.env.ADMIN_PASSWORD || 'admin12345'

  await prisma.user.deleteMany({ where: { email } })

  await auth.api.createUser({
    body: { name, email, password, role: 'admin,super-admin' }
  })

  console.log('✓ Admin user is ready')
  console.log(`  email:    ${email}`)
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
