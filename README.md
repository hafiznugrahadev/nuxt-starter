# Nuxt Starter — Admin + Server-side DataTable

[![Nuxt UI](https://img.shields.io/badge/Made%20with-Nuxt%20UI-00DC82?logo=nuxt&labelColor=020420)](https://ui.nuxt.com)

A production-ready Nuxt 4 starter with cookie-session auth, a protected admin area, and a **reusable server-side datatable**. The only domain model is `User`, with a CLI command to seed the admin account.

## Stack

| Concern        | Choice                                                        |
| -------------- | ------------------------------------------------------------- |
| Framework      | [Nuxt 4](https://nuxt.com) + [Nuxt UI 4](https://ui.nuxt.com) |
| Database / ORM | [PostgreSQL](https://www.postgresql.org) + [Prisma 6](https://www.prisma.io) |
| Auth           | [nuxt-auth-utils](https://github.com/atinux/nuxt-auth-utils) (sealed cookie sessions) |
| Validation     | [Zod 4](https://zod.dev)                                      |
| Package manager| [Bun](https://bun.sh)                                         |

## Features

- 🔐 **Email/password login** with sealed cookie sessions and `scrypt` password hashing.
- 🛡️ **Protected admin area** (`/admin/users`) — route middleware + admin-only API guard.
- 📊 **Reusable `<ServerDataTable>`** — server-side pagination, sorting and search driven by the `useServerTable` composable. Drop it anywhere with a `url` + `columns`.
- 👥 **Users CRUD API** with Zod validation (`/api/users`).
- 🌱 **`bun run seed:admin`** — idempotent admin seeding from env vars (plus `seed:users` for demo data).

## Getting started

### 1. Install dependencies

```bash
bun install
```

### 2. Start PostgreSQL

A `docker-compose.yml` is included:

```bash
docker compose up -d
```

> Or point `DATABASE_URL` at any existing PostgreSQL instance.

### 3. Configure environment

```bash
cp .env.example .env
# then edit values — at minimum set NUXT_SESSION_PASSWORD (>= 32 chars)
openssl rand -base64 32   # handy for the session secret
```

### 4. Create the database schema

```bash
bun run db:migrate     # creates tables via Prisma migrations
# or, without migration history:
bun run db:push
```

### 5. Seed the admin user

```bash
bun run seed:admin
```

Credentials come from `.env` (`ADMIN_EMAIL` / `ADMIN_PASSWORD`, default `admin@example.com` / `admin12345`). Re-running resets the admin to those values.

Optionally seed demo users to see pagination in action:

```bash
bun run seed:users           # 50 users
SEED_COUNT=200 bun run seed:users
```

### 6. Run the dev server

```bash
bun run dev
```

Visit `http://localhost:3000`, click **Sign in**, log in with the admin credentials, and open **Admin → Users**.

## Project layout

```
prisma/schema.prisma          # User model + Role enum
server/utils/prisma.ts        # PrismaClient singleton
server/utils/password.ts      # scrypt hash/verify (shared with seed scripts)
server/utils/auth.ts          # requireAdmin() guard
server/utils/schemas.ts       # Zod request schemas
server/api/auth/*             # login / logout
server/api/users/*            # list (server-side) + create / update / delete
app/composables/useServerTable.ts   # reactive state + fetching
app/components/ServerDataTable.vue   # reusable table UI
app/pages/login.vue           # login form
app/pages/admin/users.vue     # protected users table + CRUD modals
app/middleware/{auth,guest}.ts
scripts/seed-admin.ts         # bun run seed:admin
scripts/seed-users.ts         # bun run seed:users
```

## Reusing the datatable

The table is generic — give it an endpoint that returns `{ rows, total, page, pageSize }` and TanStack column defs:

```vue
<ServerDataTable
  url="/api/users"
  :columns="columns"
  search-placeholder="Search…"
  default-sort="createdAt"
  default-order="desc"
/>
```

The endpoint receives `page`, `pageSize`, `sort`, `order` and `search` as query params. See `server/api/users/index.get.ts` for the reference implementation.

## Scripts

| Command              | Description                              |
| -------------------- | ---------------------------------------- |
| `bun run dev`        | Start the dev server                     |
| `bun run build`      | Production build                         |
| `bun run typecheck`  | Type-check the project                   |
| `bun run lint`       | Lint with ESLint                         |
| `bun run db:migrate` | Run Prisma migrations (dev)              |
| `bun run db:push`    | Push schema without migrations           |
| `bun run db:studio`  | Open Prisma Studio                       |
| `bun run db:reset`   | Reset DB (re-runs migrations + seed)     |
| `bun run seed:admin` | Seed/reset the admin user                |
| `bun run seed:users` | Seed demo users                          |
