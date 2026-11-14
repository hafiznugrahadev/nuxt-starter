import { eq, like, or, type SQL } from 'drizzle-orm'
import { user } from '../db/schema'
import { escapeLike } from './db'

/**
 * Matches users whose comma-separated `role` column includes `role` as a
 * whole entry: "admin,editor" matches "admin" but not "adm". A plain
 * substring match would not, hence the four anchored variants.
 */
export function whereUserHasRole(role: string): SQL {
  const pattern = escapeLike(role)
  return or(
    eq(user.role, role),
    like(user.role, `${pattern},%`),
    like(user.role, `%,${pattern},%`),
    like(user.role, `%,${pattern}`)
  )!
}
