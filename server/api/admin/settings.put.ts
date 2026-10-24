import { z } from 'zod'
import { requireAdmin } from '../../utils/guard'
import { updateAppSettings } from '../../utils/settings'

const bodySchema = z.object({
  enableRegistration: z.boolean().optional()
})

defineRouteMeta({
  openAPI: {
    summary: 'Update app settings (admin)',
    description: 'Persist runtime app settings. Requires an admin session.',
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: { enableRegistration: { type: 'boolean' } }
          }
        }
      }
    },
    responses: {
      200: {
        description: 'Updated app settings',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: { enableRegistration: { type: 'boolean' } },
              required: ['enableRegistration']
            }
          }
        }
      },
      400: { description: 'Invalid request body' },
      401: { description: 'Not signed in' },
      403: { description: 'Administrator access required' }
    }
  }
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readValidatedBody(event, bodySchema.parse)
  return updateAppSettings(body)
})
