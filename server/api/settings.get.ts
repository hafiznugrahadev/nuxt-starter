import { getAppSettings } from '../utils/settings'

defineRouteMeta({
  openAPI: {
    summary: 'Get public app settings',
    description: 'Feature flags safe to expose to anonymous visitors, e.g. whether public sign-up is open. Cached briefly; changes from the admin settings page propagate within seconds.',
    responses: {
      200: {
        description: 'Public settings',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: { enableRegistration: { type: 'boolean' } },
              required: ['enableRegistration']
            }
          }
        }
      }
    }
  }
})

// Read on every auth-relevant page, so keep it cheap: short Nitro cache
// (Redis when REDIS_URL is set) bounding toggle propagation to 10 seconds.
// swr is off on purpose: serving a stale expired entry for one extra request
// would visibly mis-gate the register page right after an admin toggle.
export default defineCachedEventHandler(
  async () => getAppSettings(),
  {
    name: 'public-settings',
    maxAge: 10,
    swr: false
  }
)
