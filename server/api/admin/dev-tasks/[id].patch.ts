import { z } from 'zod'
import {
  DEV_TASK_PRIORITIES,
  DEV_TASK_STATUSES,
  devTaskBaseSchema,
  devTaskDescriptionSchema
} from '#shared/utils/dev-tasks'
import { requireSuperAdmin } from '../../../utils/guard'
import { prisma } from '../../../utils/prisma'

const paramsSchema = z.object({ id: z.string() })

const bodySchema = devTaskBaseSchema.partial().extend({
  description: devTaskDescriptionSchema.nullable().optional(),
  // null clears the due date; omitting it keeps the current value.
  dueDate: z.coerce.date().nullable().optional()
}).refine(body => Object.keys(body).length > 0, {
  message: 'Provide at least one field to update'
})

defineRouteMeta({
  openAPI: {
    summary: 'Update a dev task (super admin)',
    description: 'Partially updates a task-manager entry. Requires the super-admin role.',
    parameters: [
      { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
    ],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              description: { type: 'string', nullable: true },
              status: { type: 'string', enum: [...DEV_TASK_STATUSES] },
              priority: { type: 'string', enum: [...DEV_TASK_PRIORITIES] },
              dueDate: { type: 'string', format: 'date-time', nullable: true }
            }
          }
        }
      }
    },
    responses: {
      200: { description: 'Task updated' },
      400: { description: 'Invalid request body' },
      401: { description: 'Not signed in' },
      403: { description: 'Super administrator access required' },
      404: { description: 'Task not found' }
    }
  }
})

export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)

  const { id } = await getValidatedRouterParams(event, paramsSchema.parse)
  const body = await readValidatedBody(event, bodySchema.parse)

  const data: Record<string, unknown> = {}
  if (body.title !== undefined) data.title = body.title
  if (body.description !== undefined) data.description = body.description
  if (body.status !== undefined) data.status = body.status
  if (body.priority !== undefined) data.priority = body.priority
  if (body.dueDate !== undefined) data.dueDate = body.dueDate

  try {
    const task = await prisma.devTask.update({ where: { id }, data })
    return { task }
  } catch {
    throw createError({ statusCode: 404, statusMessage: 'Task not found' })
  }
})
