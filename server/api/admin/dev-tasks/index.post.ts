import { z } from 'zod'
import {
  DEV_TASK_PRIORITIES,
  DEV_TASK_STATUSES,
  devTaskBaseSchema,
  devTaskDescriptionSchema,
  devTaskPrioritySchema,
  devTaskStatusSchema
} from '#shared/utils/dev-tasks'
import { requireSuperAdmin } from '../../../utils/guard'
import { prisma } from '../../../utils/prisma'

const bodySchema = devTaskBaseSchema.extend({
  description: devTaskDescriptionSchema.optional(),
  status: devTaskStatusSchema.default('todo'),
  priority: devTaskPrioritySchema.default('medium'),
  // Send null or omit to leave the due date empty.
  dueDate: z.coerce.date().nullish()
})

defineRouteMeta({
  openAPI: {
    summary: 'Create a dev task (super admin)',
    description: 'Creates a task-manager entry. Requires the super-admin role.',
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['title'],
            properties: {
              title: { type: 'string' },
              description: { type: 'string' },
              status: { type: 'string', enum: [...DEV_TASK_STATUSES] },
              priority: { type: 'string', enum: [...DEV_TASK_PRIORITIES] },
              dueDate: { type: 'string', format: 'date-time', nullable: true }
            }
          }
        }
      }
    },
    responses: {
      201: { description: 'Task created' },
      400: { description: 'Invalid request body' },
      401: { description: 'Not signed in' },
      403: { description: 'Super administrator access required' }
    }
  }
})

export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)

  const body = await readValidatedBody(event, bodySchema.parse)
  const { dueDate, ...rest } = body

  const task = await prisma.devTask.create({
    data: { ...rest, ...(dueDate ? { dueDate } : {}) }
  })

  event.node.res.statusCode = 201
  return { task }
})
