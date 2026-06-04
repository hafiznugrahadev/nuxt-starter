import { Prisma } from '@prisma/client'

defineRouteMeta({
  openAPI: {
    tags: ['Users'],
    summary: 'Update a user',
    description: 'Update an existing user. Omit `password` to keep the current one. Requires an admin session.',
    parameters: [
      { in: 'path', name: 'id', required: true, schema: { type: 'string' } }
    ],
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              email: { type: 'string', format: 'email' },
              password: { type: 'string', description: 'At least 8 characters; omit to keep current' },
              role: { type: 'string', enum: ['ADMIN', 'USER'] }
            }
          }
        }
      }
    },
    responses: {
      200: { description: 'Updated' },
      404: { description: 'User not found' },
      409: { description: 'Email already exists' }
    }
  }
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing user id' })
  }

  const data = await readValidatedBody(event, updateUserSchema.parse)

  const updateData: Prisma.UserUpdateInput = {
    name: data.name,
    email: data.email,
    role: data.role
  }
  if (data.password) {
    updateData.password = await hashUserPassword(data.password)
  }

  try {
    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    })
    return user
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        throw createError({ statusCode: 404, statusMessage: 'User not found' })
      }
      if (error.code === 'P2002') {
        throw createError({ statusCode: 409, statusMessage: 'A user with this email already exists' })
      }
    }
    throw error
  }
})
