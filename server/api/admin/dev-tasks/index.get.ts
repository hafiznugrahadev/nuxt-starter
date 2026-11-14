import { and, asc, desc, eq, like, type SQL } from 'drizzle-orm'
import { z } from 'zod'
import {
  DEV_TASK_PRIORITIES,
  DEV_TASK_STATUSES,
  devTaskPrioritySchema,
  devTaskStatusSchema
} from '#shared/utils/dev-tasks'
import { devTask } from '../../../db/schema'
import { db, escapeLike } from '../../../utils/db'
import { requireSuperAdmin } from '../../../utils/guard'

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().max(200).optional(),
  status: devTaskStatusSchema.optional(),
  priority: devTaskPrioritySchema.optional(),
  sortBy: z.enum(['title', 'status', 'priority', 'dueDate', 'createdAt']).default('createdAt'),
  sortDirection: z.enum(['asc', 'desc']).default('desc')
})

defineRouteMeta({
  openAPI: {
    summary: 'List dev tasks (super admin)',
    description: 'Paged task-manager listing with text search, status/priority filters and sorting. Requires the super-admin role; the page is the reference CRUD implementation of this starter.',
    parameters: [
      { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1 } },
      { name: 'pageSize', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100 } },
      { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Case-sensitive contains match on the title' },
      { name: 'status', in: 'query', schema: { type: 'string', enum: [...DEV_TASK_STATUSES] } },
      { name: 'priority', in: 'query', schema: { type: 'string', enum: [...DEV_TASK_PRIORITIES] } },
      { name: 'sortBy', in: 'query', schema: { type: 'string', enum: ['title', 'status', 'priority', 'dueDate', 'createdAt'] } },
      { name: 'sortDirection', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'] } }
    ],
    responses: {
      200: {
        description: 'Paged task list',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                tasks: { type: 'array', items: { type: 'object' } },
                total: { type: 'number' }
              },
              required: ['tasks', 'total']
            }
          }
        }
      },
      401: { description: 'Not signed in' },
      403: { description: 'Super administrator access required' }
    }
  }
})

export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)

  const query = await getValidatedQuery(event, querySchema.parse)

  const conditions: SQL[] = []
  if (query.search) {
    conditions.push(like(devTask.title, `%${escapeLike(query.search)}%`))
  }
  if (query.status) {
    conditions.push(eq(devTask.status, query.status))
  }
  if (query.priority) {
    conditions.push(eq(devTask.priority, query.priority))
  }
  const where = and(...conditions)
  const order = query.sortDirection === 'asc' ? asc : desc

  const [tasks, total] = await Promise.all([
    db
      .select()
      .from(devTask)
      .where(where)
      .orderBy(order(devTask[query.sortBy]))
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize),
    db.$count(devTask, where)
  ])

  return { tasks, total }
})
