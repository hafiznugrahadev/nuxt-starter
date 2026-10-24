import { prisma } from '../../utils/prisma'
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

  const [
    totalUsers,
    adminUsers,
    bannedUsers,
    activeSessions,
    recentUsers,
    signupsByMonth
  ] = await Promise.all([
    prisma.user.count(),
    // Comma-separated role lists ("user,admin") must count as admins too.
    prisma.user.count({ where: whereUserHasRole('admin') }),
    prisma.user.count({ where: { banned: true } }),
    prisma.session.count({ where: { expiresAt: { gt: now } } }),
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        banned: true,
        createdAt: true
      }
    }),
    // Real signups per calendar month (last 6 months including empty ones).
    prisma.$queryRaw<Array<{ month: Date, count: bigint }>>`
      SELECT date_trunc('month', "createdAt") AS month, COUNT(*)::bigint AS count
      FROM "user"
      WHERE "createdAt" >= date_trunc('month', now()) - interval '5 months'
      GROUP BY 1
      ORDER BY 1
    `
  ])

  return {
    totalUsers,
    adminUsers,
    bannedUsers,
    activeSessions,
    recentUsers,
    signupsByMonth: signupsByMonth.map(row => ({
      month: row.month.toISOString(),
      count: Number(row.count)
    }))
  }
})
