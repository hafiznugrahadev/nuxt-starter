import { z } from 'zod'
import { requireAdmin } from '../../../../utils/guard'
import { getScheduledTask } from '../../../../utils/scheduled-tasks'
import { runTaskNow } from '../../../../utils/task-queue'

const paramsSchema = z.object({ id: z.string() })

defineRouteMeta({
  openAPI: {
    summary: 'Run a scheduled task now (admin)',
    description: 'Queues an immediate one-off run of a scheduled task on the worker. Requires an admin session.',
    parameters: [
      { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
    ],
    responses: {
      202: {
        description: 'Task queued',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: { queued: { type: 'boolean' } },
              required: ['queued']
            }
          }
        }
      },
      401: { description: 'Not signed in' },
      403: { description: 'Administrator access required' },
      404: { description: 'Unknown task id' }
    }
  }
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const { id } = await getValidatedRouterParams(event, paramsSchema.parse)
  const task = getScheduledTask(id)
  if (!task) {
    throw createError({ statusCode: 404, statusMessage: 'Unknown task id' })
  }

  await runTaskNow(id)
  event.node.res.statusCode = 202
  return { queued: true }
})
