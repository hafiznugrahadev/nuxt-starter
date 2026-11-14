import { count, desc, eq, gt, gte, sql } from 'drizzle-orm'
import { session, user } from '../../db/schema'
import { db } from '../../utils/db'
import { requireAdmin } from '../../utils/guard'
import { whereUserHasRole } from '../../utils/user-roles'

defineRouteMeta({
  openAPI: {
    summary: 'Get admin dashboard statistics',
    description: 'Counts and recent activity computed live from the database. Requires an admin session.',
    responses: {
      200: {
        description: 'Aggregated user statistics',
        content: {
          'application/json': {
            schema: { type: 'object' }
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

  const now = new Date()

  // Mapping through the column keeps the UTC handling of `timestamp(3)`.
  const month = sql<Date>`date_trunc('month', ${user.createdAt})`.mapWith(user.createdAt)

  const [
    totalUsers,
    adminUsers,
    bannedUsers,
    activeSessions,
    recentUsers,
    signupsByMonth
  ] = await Promise.all([
    db.$count(user),
    // Comma-separated role lists ("user,admin") must count as admins too.
    db.$count(user, whereUserHasRole('admin')),
    db.$count(user, eq(user.banned, true)),
    db.$count(session, gt(session.expiresAt, now)),
    db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        banned: user.banned,
        createdAt: user.createdAt
      })
      .from(user)
      .orderBy(desc(user.createdAt))
      .limit(5),
    // Real signups per calendar month over the last 6 months. Months without
    // signups produce no row.
    db
      .select({ month, count: count() })
      .from(user)
      .where(gte(user.createdAt, sql`date_trunc('month', now()) - interval '5 months'`))
      .groupBy(month)
      .orderBy(month)
  ])

  return {
    totalUsers,
    adminUsers,
    bannedUsers,
    activeSessions,
    recentUsers,
    signupsByMonth: signupsByMonth.map(row => ({
      month: row.month.toISOString(),
      count: row.count
    }))
  }
})
