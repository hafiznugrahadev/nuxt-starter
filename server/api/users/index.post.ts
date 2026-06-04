defineRouteMeta({
  openAPI: {
    tags: ['Users'],
    summary: 'Create a user',
    description: 'Create a new user account. Requires an admin session.',
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['name', 'email', 'password'],
            properties: {
              name: { type: 'string' },
              email: { type: 'string', format: 'email' },
              password: { type: 'string', description: 'At least 8 characters' },
              role: { type: 'string', enum: ['ADMIN', 'USER'], default: 'USER' }
            }
          }
        }
      }
    },
    responses: {
      201: { description: 'Created' },
      409: { description: 'Email already exists' }
    }
  }
})

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
