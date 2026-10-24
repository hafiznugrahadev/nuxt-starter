import { timingSafeEqual } from 'node:crypto'

// Protects the API documentation endpoints with HTTP Basic authentication.
// Enabled when both DOCS_BASIC_AUTH_USER and DOCS_BASIC_AUTH_PASSWORD are set
// (see .env.example); when either is unset the docs stay public, so dev
// environments without the variables keep working.
//
// Runs before every route handler (including the Better Auth catch-all), so
// the reference UI under /api/auth/reference is covered too.
const protectedPaths = ['/_openapi.json', '/api/openapi.json', '/api/auth/reference']

export default defineEventHandler((event) => {
  const user = process.env.DOCS_BASIC_AUTH_USER?.trim()
  const password = process.env.DOCS_BASIC_AUTH_PASSWORD

  if (!user || !password) return

  const path = event.path.split('?')[0] ?? ''
  const isDocsPage = path === '/docs' || path.startsWith('/docs/')
  if (!isDocsPage && !protectedPaths.includes(path)) return

  // timingSafeEqual requires equal lengths; compare the raw "user:password"
  // bytes so both credentials are covered by one constant-time check.
  const expected = Buffer.from(`${user}:${password}`)
  const [scheme, encoded] = (getHeader(event, 'authorization') ?? '').split(' ')
  const provided = scheme?.toLowerCase() === 'basic' && encoded
    ? Buffer.from(encoded, 'base64')
    : Buffer.alloc(0)

  const authorized = provided.length === expected.length
    && timingSafeEqual(provided, expected)

  if (!authorized) {
    // The realm makes the browser show its native credentials prompt.
    setHeader(event, 'WWW-Authenticate', 'Basic realm="API docs", charset="UTF-8"')
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
})
