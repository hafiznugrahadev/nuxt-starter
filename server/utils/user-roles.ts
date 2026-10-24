import type { Prisma } from '../../generated/prisma/client'

/**
 * Prisma `where` clause matching users whose comma-separated `role` column
 * includes `role` as a whole entry — "admin,editor" matches "admin" but not
 * "adm". Postgres `contains` alone would do substring matching, hence the
 * four anchored variants.
 */
export function whereUserHasRole(role: string): Prisma.UserWhereInput {
  return {
    OR: [
      { role },
      { role: { startsWith: `${role},` } },
      { role: { contains: `,${role},` } },
      { role: { endsWith: `,${role}` } }
    ]
  }
}
