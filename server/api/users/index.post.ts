export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const data = await readValidatedBody(event, createUserSchema.parse)

  const existing = await prisma.user.findUnique({ where: { email: data.email } })
  if (existing) {
    throw createError({
      statusCode: 409,
      statusMessage: 'A user with this email already exists'
    })
  }

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      role: data.role,
      password: await hashUserPassword(data.password)
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      updatedAt: true
    }
  })

  setResponseStatus(event, 201)
  return user
})
