import type { Prisma } from '@prisma/client'

// Server-side datatable endpoint: pagination, sorting and search are all
// computed on the server and returned as `{ rows, total }`.
defineRouteMeta({
  openAPI: {
    tags: ['Users'],
    summary: 'List users (server-side datatable)',
    description: 'Paginated, sortable and searchable list. Requires an admin session.',
    parameters: [
      { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
      { in: 'query', name: 'pageSize', schema: { type: 'integer', default: 10, maximum: 100 } },
      { in: 'query', name: 'sort', schema: { type: 'string', enum: ['name', 'email', 'role', 'createdAt'], default: 'createdAt' } },
      { in: 'query', name: 'order', schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' } },
      { in: 'query', name: 'search', schema: { type: 'string' } }
    ],
    responses: {
      200: { description: 'A page of users with the total count' },
      401: { description: 'Not authenticated' },
      403: { description: 'Not an administrator' }
    }
  }
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const { page, pageSize, sort, order, search } = await getValidatedQuery(
    event,
    listUsersQuerySchema.parse
  )

  const where: Prisma.UserWhereInput = search
    ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } }
        ]
      }
    : {}

  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { [sort]: order } as Prisma.UserOrderByWithRelationInput,
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    }),
    prisma.user.count({ where })
  ])

  return { rows, total, page, pageSize }
})
