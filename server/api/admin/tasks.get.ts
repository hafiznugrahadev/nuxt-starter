import { requireAdmin } from '../../utils/guard'
import { getTaskLastRuns, SCHEDULED_TASKS } from '../../utils/scheduled-tasks'
import { getTaskSchedules } from '../../utils/task-queue'

defineRouteMeta({
  openAPI: {
    summary: 'List scheduled tasks (admin)',
    description: 'Recurring maintenance tasks with their schedule, next run and last result. Processing happens in the worker container. Requires an admin session.',
    responses: {
      200: {
        description: 'Scheduled task listing',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                tasks: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      title: { type: 'string' },
                      description: { type: 'string' },
                      pattern: { type: 'string' },
                      nextRun: { type: 'string', nullable: true },
                      lastRun: { type: 'object', nullable: true }
                    }
                  }
                }
              },
              required: ['tasks']
            }
          }
        }
      },
      401: { description: 'Not signed in' },
      403: { description: 'Administrator access required' }
    }
  }
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const [lastRuns, schedules] = await Promise.all([
    getTaskLastRuns(),
    getTaskSchedules().catch(() => ({}) as Record<string, number>)
  ])

  return {
    tasks: SCHEDULED_TASKS.map((task) => {
      const next = schedules[task.id]
      return {
        id: task.id,
        title: task.title,
        description: task.description,
        pattern: task.pattern,
        nextRun: next ? new Date(next).toISOString() : null,
        lastRun: lastRuns[task.id] ?? null
      }
    })
  }
})
