import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { devTask } from '../../../db/schema'
import { db } from '../../../utils/db'
import { requireSuperAdmin } from '../../../utils/guard'

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

  const deleted = await db
    .delete(devTask)
    .where(eq(devTask.id, id))
    .returning({ id: devTask.id })

  if (deleted.length === 0) {
    throw createError({ statusCode: 404, statusMessage: 'Task not found' })
  }

  return { deleted: true }
})
