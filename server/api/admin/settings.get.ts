import { requireAdmin } from '../../utils/guard'
import { getAppSettings } from '../../utils/settings'

defineRouteMeta({
  openAPI: {
    summary: 'Get app settings (admin)',
    description: 'Runtime app settings managed on the admin settings page. Requires an admin session.',
    responses: {
      200: {
        description: 'Current app settings',
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
      401: { description: 'Not signed in' },
      403: { description: 'Administrator access required' }
    }
  }
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  return getAppSettings()
})
