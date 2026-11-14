import { and, asc, desc, like, type SQL } from 'drizzle-orm'
import { z } from 'zod'
import { USER_ROLES, parseRoles } from '#shared/utils/roles'
import { user } from '../../db/schema'
import { db, escapeLike } from '../../utils/db'
import { requireAdmin } from '../../utils/guard'
import { whereUserHasRole } from '../../utils/user-roles'

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().max(200).optional(),
  searchField: z.enum(['email', 'name']).default('email'),
  // Empty/omitted means "all roles"; matched against the comma-separated
  // role list so a user with "user,admin" shows up when filtering by either.
  role: z.string().trim().optional(),
  sortBy: z.enum(['name', 'email', 'createdAt', 'role']).default('createdAt'),
  sortDirection: z.enum(['asc', 'desc']).default('desc')
})

defineRouteMeta({
  openAPI: {
    summary: 'List users (admin)',
    description: 'Paged user list with text search, role filter and sorting. Requires an admin session. Users may hold multiple comma-separated roles.',
    parameters: [
      { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1 }, description: '1-based page number' },
      { name: 'pageSize', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100 }, description: 'Rows per page' },
      { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Case-sensitive contains match' },
      { name: 'searchField', in: 'query', schema: { type: 'string', enum: ['email', 'name'] } },
      { name: 'role', in: 'query', schema: { type: 'string', enum: [...USER_ROLES] }, description: 'Filter to users holding this role' },
      { name: 'sortBy', in: 'query', schema: { type: 'string', enum: ['name', 'email', 'createdAt', 'role'] } },
      { name: 'sortDirection', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'] } }
    ],
    responses: {
      200: {
        description: 'Paged user list',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                users: { type: 'array', items: { type: 'object' } },
                total: { type: 'number' }
              },
              required: ['users', 'total']
            }
          }
        }
      },
      400: { description: 'Invalid query parameters' },
      401: { description: 'Not signed in' },
      403: { description: 'Administrator access required' }
    }
  }
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const query = await getValidatedQuery(event, querySchema.parse)

  const conditions: SQL[] = []
  if (query.search) {
    conditions.push(like(user[query.searchField], `%${escapeLike(query.search)}%`))
  }
  if (query.role) {
    conditions.push(whereUserHasRole(query.role))
  }
  const where = and(...conditions)
  const order = query.sortDirection === 'asc' ? asc : desc

  const [users, total] = await Promise.all([
    db
      .select()
      .from(user)
      .where(where)
      .orderBy(order(user[query.sortBy]))
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize),
    db.$count(user, where)
  ])

  return {
    // Role lists stay comma-separated in storage; normalizing here keeps the
    // client rendering simple ("admin,user" and "user,admin" look alike).
    users: users.map(row => ({ ...row, role: parseRoles(row.role).join(',') })),
    total
  }
})
