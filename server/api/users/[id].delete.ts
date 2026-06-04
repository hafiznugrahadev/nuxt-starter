import { Prisma } from '@prisma/client'

defineRouteMeta({
  openAPI: {
    tags: ['Users'],
    summary: 'Delete a user',
    description: 'Delete a user by id. You cannot delete your own account. Requires an admin session.',
    parameters: [
      { in: 'path', name: 'id', required: true, schema: { type: 'string' } }
    ],
    responses: {
      200: { description: 'Deleted' },
      400: { description: 'Cannot delete your own account' },
      404: { description: 'User not found' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const session = await requireAdmin(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing user id' })
  }

  if (id === session.user.id) {
    throw createError({ statusCode: 400, statusMessage: 'You cannot delete your own account' })
  }

  try {
    await prisma.user.delete({ where: { id } })
    return { ok: true }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw createError({ statusCode: 404, statusMessage: 'User not found' })
    }
    throw error
  }
})
