import type { H3Event } from 'h3'
import { hasRole } from '#shared/utils/roles'
import { auth } from './auth'

// Require an authenticated session. Throws 401 when absent; returns the
// session so callers can read `session.user`.
export async function requireSession(event: H3Event) {
  const session = await auth.api.getSession({ headers: event.headers })

  if (!session) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  return session
}

// Require an authenticated session with the admin role. Users can hold
// several comma-separated roles, so membership is checked per entry.
export async function requireAdmin(event: H3Event) {
  const session = await requireSession(event)

  if (!hasRole(session.user.role, 'admin')) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden: administrator access required'
    })
  }

  return session
}

// Require the super-admin role (a superset of admin that additionally gates
// developer tooling such as the task manager).
export async function requireSuperAdmin(event: H3Event) {
  const session = await requireSession(event)

  if (!hasRole(session.user.role, 'super-admin')) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden: super administrator access required'
    })
  }

  return session
}
