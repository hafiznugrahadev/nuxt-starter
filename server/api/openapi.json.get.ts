import { auth } from '../utils/auth'

defineRouteMeta({
  openAPI: {
    summary: 'Get the Better Auth OpenAPI document',
    description: 'Returns Better Auth endpoint schemas. Nitro routes are documented at /_openapi.json.',
    responses: {
      200: {
        description: 'OpenAPI document',
        content: {
          'application/json': {
            schema: { type: 'object' }
          }
        }
      }
    }
  }
})

// The document is deterministic for a running build, so it is served through
// Nitro's cache (Redis when REDIS_URL is set, see server/plugins/redis-cache.ts)
// instead of regenerating it on every request. The five-minute maxAge bounds
// staleness for both the server cache and the response's Cache-Control header.
export default defineCachedEventHandler(
  () => auth.api.generateOpenAPISchema(),
  {
    name: 'openapi-json',
    maxAge: 60 * 5
  }
)
