import { z } from 'zod'

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1, 'Password is required')
})

export const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.email(),
  password: z.string().min(8, 'Password must be at least 8 characters').max(100),
  role: z.enum(['ADMIN', 'USER']).default('USER')
})

export const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.email().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').max(100).optional(),
  role: z.enum(['ADMIN', 'USER']).optional()
})

// Query params for the reusable server-side datatable.
export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  sort: z.enum(['name', 'email', 'role', 'createdAt']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().trim().default('')
})
