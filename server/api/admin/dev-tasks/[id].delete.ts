import { z } from 'zod'
import { requireSuperAdmin } from '../../../utils/guard'
import { prisma } from '../../../utils/prisma'

const paramsSchema = z.object({ id: z.string() })

defineRouteMeta({
  openAPI: {
    summary: 'Delete a dev task (super admin)',
    description: 'Permanently removes a task-manager entry. Requires the super-admin role.',
    parameters: [
      { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
    ],
    responses: {
      200: { description: 'Task deleted' },
      401: { description: 'Not signed in' },
      403: { description: 'Super administrator access required' },
      404: { description: 'Task not found' }
    }
  }
})

export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)

  const { id } = await getValidatedRouterParams(event, paramsSchema.parse)

  try {
    await prisma.devTask.delete({ where: { id } })
  } catch {
    throw createError({ statusCode: 404, statusMessage: 'Task not found' })
  }

  return { deleted: true }
})
