import type { H3Event } from 'h3'

// Require an authenticated session with the ADMIN role. Returns the session so
// callers can read `session.user`.
export async function requireAdmin(event: H3Event) {
  const session = await requireUserSession(event)

  if (session.user.role !== 'ADMIN') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden: administrator access required'
    })
  }

  return session
}
