import { sql } from 'drizzle-orm'
import { boolean, foreignKey, index, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'

// Column, index and constraint names match the database created by the
// former Prisma migrations, so existing databases need no rename. Better Auth
// reads the `user`, `session`, `account` and `verification` exports by key;
// its admin plugin adds `role`, `banned`, `banReason`, `banExpires` and
// `impersonatedBy`.

const id = () => text().primaryKey().$defaultFn(() => crypto.randomUUID())
const timestamp3 = () => timestamp({ precision: 3 })

// `updatedAt` has no database default (as under Prisma): the app sets it on
// insert and on every update.
const timestamps = {
  createdAt: timestamp3().notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp3().notNull().$defaultFn(() => new Date()).$onUpdate(() => new Date())
}

export const user = pgTable('user', {
  id: id(),
  name: text().notNull(),
  email: text().notNull(),
  emailVerified: boolean().notNull().default(false),
  image: text(),
  // Comma-separated role list, e.g. "user,admin" (see shared/utils/roles.ts).
  role: text().notNull().default('user'),
  banned: boolean().notNull().default(false),
  banReason: text(),
  banExpires: timestamp3(),
  ...timestamps
}, table => [
  uniqueIndex('user_email_key').on(table.email),
  index('user_name_idx').on(table.name),
  index('user_createdAt_idx').on(table.createdAt)
])

export const session = pgTable('session', {
  id: id(),
  expiresAt: timestamp3().notNull(),
  token: text().notNull(),
  ...timestamps,
  ipAddress: text(),
  userAgent: text(),
  impersonatedBy: text(),
  userId: text().notNull()
}, table => [
  uniqueIndex('session_token_key').on(table.token),
  index('session_userId_idx').on(table.userId),
  foreignKey({ name: 'session_userId_fkey', columns: [table.userId], foreignColumns: [user.id] })
    .onDelete('cascade')
    .onUpdate('cascade')
])

export const account = pgTable('account', {
  id: id(),
  accountId: text().notNull(),
  providerId: text().notNull(),
  userId: text().notNull(),
  accessToken: text(),
  refreshToken: text(),
  idToken: text(),
  accessTokenExpiresAt: timestamp3(),
  refreshTokenExpiresAt: timestamp3(),
  scope: text(),
  // Credential provider (email + password) keeps its hash here.
  password: text(),
  ...timestamps
}, table => [
  uniqueIndex('account_providerId_accountId_key').on(table.providerId, table.accountId),
  index('account_userId_idx').on(table.userId),
  foreignKey({ name: 'account_userId_fkey', columns: [table.userId], foreignColumns: [user.id] })
    .onDelete('cascade')
    .onUpdate('cascade')
])

export const verification = pgTable('verification', {
  id: id(),
  identifier: text().notNull(),
  value: text().notNull(),
  expiresAt: timestamp3().notNull(),
  ...timestamps
}, table => [
  index('verification_identifier_idx').on(table.identifier)
])

// Runtime app settings managed from the admin settings page (key/value
// strings). Absent keys fall back to their env-provided defaults.
export const setting = pgTable('setting', {
  key: text().primaryKey(),
  value: text().notNull(),
  ...timestamps
})

// Reference CRUD resource for the super-admin task manager. Status and
// priority are plain strings constrained by shared/utils/dev-tasks.ts.
export const devTask = pgTable('dev_task', {
  id: id(),
  title: text().notNull(),
  description: text(),
  status: text().notNull().default('todo'),
  priority: text().notNull().default('medium'),
  dueDate: timestamp3(),
  ...timestamps
}, table => [
  index('dev_task_status_idx').on(table.status)
])

export type User = typeof user.$inferSelect
export type DevTask = typeof devTask.$inferSelect
