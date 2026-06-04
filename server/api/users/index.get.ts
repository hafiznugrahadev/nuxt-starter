import type { Prisma } from '@prisma/client'

// Server-side datatable endpoint: pagination, sorting and search are all
// computed on the server and returned as `{ rows, total }`.
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
