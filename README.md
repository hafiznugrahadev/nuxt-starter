# Nuxt Starter: Better Auth + shadcn-vue

[![shadcn-vue](https://img.shields.io/badge/Made%20with-shadcn--vue-000000?logo=shadcnui&labelColor=020420)](https://www.shadcn-vue.com)

A production-ready Nuxt 4 starter with [Better Auth](https://www.better-auth.com) (email/password, roles, ban/unban via the admin plugin) and [shadcn-vue](https://www.shadcn-vue.com) components. The only domain model is `User`, with CLI commands to seed the admin account and demo data.

The admin area's visual design (sidebar shell, palette, page-header cards) is adapted from the [TailwindAdmin free template](https://github.com/Tailwind-Admin/free-tailwind-admin-dashboard-template) (MIT); the `ui/sidebar` components come from the same source. Dashboard statistics are computed live from the database.

## Reusable money input and combobox

`FormField` supports `type="money"` for whole rupiah values. Its model is a
number, or `null` when empty; for example, `1250000` displays as `Rp 1.250.000`.
The underlying `MoneyInput` can also be imported from `@/components/ui/money-input`.
Values must be non-negative safe integers. Use application validation for
required fields and other business limits.

```vue
<script setup lang="ts">
import type { ComboboxLoadOptions } from '@/components/ui/combobox'

const amount = ref<number | null>(null)
const userId = ref('')
const loadUsers: ComboboxLoadOptions = async ({ search, page, pageSize, signal }) => {
  const result = await $fetch('/api/admin/users', {
    query: { search, page, pageSize, searchField: 'name' },
    signal
  })
  return {
    options: result.users.map(user => ({ label: user.name, value: user.id })),
    hasMore: page * pageSize < result.total
  }
}
</script>

<template>
  <FormField id="amount" v-model="amount" label="Amount" type="money" />
  <Label for="user">User</Label>
  <Combobox id="user" v-model="userId" :load-options="loadUsers" />
</template>
```

Local `:options="[{ label, value }]"` usage remains supported. Option values
must be non-empty strings. Remote search defaults to two characters, 300 ms
debounce and 50 results per page; customize `min-search-length`, `debounce-ms`
and `page-size` when needed. The loader must perform server-side filtering and
pagination and return `{ options, hasMore }`; it should forward `signal` to the
request. A load-more action fetches subsequent pages. For an initial selection
on an edit form, pass `:selected-option="{ label, value }"`; the component
retains a selected label as result pages change. Large loaded lists are
virtualized from 100 options by default (`virtualize-threshold`).

## Stack

| Concern         | Choice                                                                     |
| --------------- | -------------------------------------------------------------------------- |
| Framework       | [Nuxt 4](https://nuxt.com)                                                 |
| UI              | [shadcn-vue](https://www.shadcn-vue.com) (reka-ui) + [Tailwind CSS 4](https://tailwindcss.com) |
| Auth            | [Better Auth 1.7](https://www.better-auth.com) with the `admin` plugin     |
| Database / ORM  | [PostgreSQL](https://www.postgresql.org) + [Prisma 7](https://www.prisma.io) |
| API docs        | Nitro OpenAPI + [Scalar](https://github.com/scalar/scalar)                |
| Validation      | [Zod 4](https://zod.dev)                                                   |
| Cache / jobs    | Redis for Nitro cache, BullMQ for email delivery                         |
| Package manager | [Bun](https://bun.sh)                                                      |

## Features

- 🔐 **Email/password auth** via Better Auth. Sessions last 7 days, passwords are hashed by Better Auth (`scrypt`).
- 🛡️ **Admin plugin**. The `/admin` area uses a TailwindAdmin-style shell (collapsible sidebar, sticky header). `/admin` is a dashboard with live database statistics (user counts, active sessions, signups per month, recent accounts); `/admin/users` manages accounts through `authClient.admin.*` (create, edit, set password, assign **multiple comma-separated roles**, **ban/unban** with reason + expiry, delete) with a role-filter modal and a card layout on phone screens. Better Auth and the `admin` route middleware enforce access.
- ✍️ **Self-service registration** (`/register`), toggleable at runtime from **Admin → Settings** (stored in the `setting` table, enforced server-side by a Better Auth `hooks.before` guard). `NUXT_PUBLIC_ENABLE_REGISTRATION` remains the default for fresh installs.
- 👤 **Profile page** (`/admin/profile`) for renaming the account and changing its password (other sessions are revoked).
- 📋 **Task manager** (`/admin/dev-tasks`) — a developer helper and the starter's **reference CRUD implementation** (paged list, debounced search, status/priority filter modal, create/edit/delete dialogs, mobile card layout) on `/api/admin/dev-tasks`. Gated to the **super-admin** role, a superset of admin; the seed admin receives `admin,super-admin`.
- 🔑 **Password recovery by email**. Better Auth creates one-hour reset links, BullMQ queues delivery, and the worker sends through SMTP. Development uses Mailpit.
- 🧰 **Separate Redis roles**. Nitro cache uses LRU eviction; BullMQ uses a dedicated persistent Redis instance with `noeviction`.
- ⏰ **Task scheduler**. The worker container registers BullMQ 6 job schedulers for recurring maintenance (pruning expired sessions and verification tokens) and records each run; **Admin → Settings** lists the schedules with the last result and a "Run now" button.
- 📊 **Reusable `<ServerDataTable>`**. It is a *presentational* table with skeleton loading, debounced search, rows-per-page and pagination. You own the fetching state; see `useAdminUsers.ts` for the reference implementation.
- 📖 **Interactive API docs** at `/docs` backed by Nitro OpenAPI; Better Auth publishes its endpoint-level reference at `/api/auth/reference`.
- 🌗 **Dark mode** (`@nuxtjs/color-mode`) and self-hosted fonts (`@nuxt/fonts`).
- 🐳 **Docker** dev stack with hot reload + a production image and compose files.
- 🌱 **`bun run seed:admin`**. Admin seeding reads env vars and is idempotent (plus `seed:users` for demo data). Seeds create users through Better Auth (`auth.api.createUser`), so hashes match production behavior.

## Installation

### Prerequisites

| Tool                | Why                                                        | Version       |
| ------------------- | ---------------------------------------------------------- | ------------- |
| [Bun](https://bun.sh) | Package manager + runs the app, worker and seed scripts  | ≥ 1.3         |
| [Docker](https://docker.com) | PostgreSQL, Redis (×2) and Mailpit via the bundled compose file | any   |
| Git                 | Cloning (and the installer's optional `git init`)           | any           |

The npm installer itself only needs Node ≥ 18.17 or Bun on the machine you
scaffold from.

### Option 1 — npm installer (recommended)

The published installer scaffolds a fresh copy of this template, downloads the
latest source from GitHub, skips repository-only entries, generates `.env`
with a fresh `BETTER_AUTH_SECRET` and a random admin password (printed at the
end), and can initialize a git repository:

```bash
# scaffold into ./my-app (≈ composer create-project)
npm create @hafiznugrahadev/nuxt-starter@latest my-app

# equivalents
bun create @hafiznugrahadev/nuxt-starter my-app
npx @hafiznugrahadev/create-nuxt-starter my-app

# or install once and use it anywhere
npm i -g @hafiznugrahadev/create-nuxt-starter
create-nuxt-starter my-app
```

Omit the directory to be prompted for one. Extra flags: `--ref <branch|tag>`
scaffolds a specific version, `--git` / `--no-git` controls repository
initialization (flags go after `--` with `npm create`). When the command
finishes it prints the exact next steps — the same steps 1–6 of the manual
path below, minus the `.env` creation it already did for you.

The installer lives in [`create-nuxt-starter/`](./create-nuxt-starter) in this
repository.

### Option 2 — clone manually

```bash
git clone https://github.com/hafiznugrahadev/nuxt-starter.git my-app
cd my-app
```

Then follow every step in [Getting started](#getting-started) below, including
creating `.env` from `.env.example`.

## Getting started

### 1. Install dependencies

```bash
bun install
```

### 2. Start PostgreSQL and supporting services

A `docker-compose.yml` is included. For host development, start the database, Redis services, and Mailpit:

```bash
docker compose up -d postgres redis redis-queue mailpit
# OrbStack endpoints are listed in the Docker section below.
# Otherwise set DATABASE_URL, REDIS_URL, QUEUE_REDIS_URL, and SMTP_HOST yourself.
```

> Prefer running the whole app in Docker? See [Docker](#docker) below.

### 3. Configure environment

```bash
cp .env.example .env
# then edit values. At minimum, set BETTER_AUTH_SECRET (>= 32 chars)
openssl rand -base64 32   # handy for the auth secret
```

| Variable                         | Purpose                                                        |
| -------------------------------- | -------------------------------------------------------------- |
| `DATABASE_URL`                   | PostgreSQL connection string                                   |
| `REDIS_URL`                      | Nitro cache Redis URL                                          |
| `QUEUE_REDIS_URL`                | Dedicated BullMQ Redis URL, configured with noeviction         |
| `BETTER_AUTH_SECRET`             | Secret Better Auth signs session tokens with (>= 32 chars)     |
| `BETTER_AUTH_URL`                | App origin; set it when serving from a non-localhost domain    |
| `NUXT_PUBLIC_ENABLE_REGISTRATION`| `"true"` (default) / `"false"`: public sign-up toggle          |
| `DOCS_BASIC_AUTH_USER` / `DOCS_BASIC_AUTH_PASSWORD` | Basic auth for the API docs; unset = public |
| `SMTP_HOST` / `SMTP_PORT`        | SMTP server used by the email worker                          |
| `SMTP_USER` / `SMTP_PASSWORD`    | Optional SMTP credentials                                      |
| `SMTP_FROM`                      | Sender address shown in reset emails                           |
| `ADMIN_NAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Used by `bun run seed:admin`                    |

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

Visit `http://localhost:3000`, click **Sign in**, log in with the admin credentials, and open **Admin → Users**. The API reference is at <http://localhost:3000/docs>.

## How auth is wired

```
server/utils/auth.ts             betterAuth() + prismaAdapter + admin() + openAPI()
server/api/auth/[...all].ts      catch-all handler → all auth lives under /api/auth/*
app/lib/auth-client.ts           createAuthClient (better-auth/vue) + adminClient
app/composables/useAuthSession.ts one shared SSR-safe session request
app/middleware/auth.ts           not signed in → /login?redirect=…
app/middleware/guest.ts          signed in → / (admins land on /admin/users)
app/middleware/admin.ts          signed in + role admin, else redirect home
app/middleware/registration.ts   registration disabled → back to /login
server/utils/email-queue.ts      BullMQ producer for password reset email
workers/email.ts                 SMTP worker for password reset email
server/plugins/redis-cache.ts    runtime Redis mount for Nitro cache storage
```

- Better Auth reads `BETTER_AUTH_SECRET` / `BETTER_AUTH_URL` from the environment directly; no secret is hardcoded in the config.
- `useAuthSession()` memoizes the cookie-aware session request per Nuxt app instance, so the header and middleware share the same SSR result.
- After `signIn` / `signUp` / `signOut`, the pages navigate with a full page load (`window.location.assign`). This avoids a client-side redirect racing the session refresh.
- Password reset requests return the same response for known and unknown email addresses and are limited to five requests per hour per client. The email worker logs job IDs and error codes only, not recipient addresses or reset links.
- Writing your own API endpoints? Use the helpers in `server/utils/guard.ts` (`requireSession` / `requireAdmin`). Better Auth guards its own `/api/auth/admin/*` routes.

### Registration toggle

`NUXT_PUBLIC_ENABLE_REGISTRATION=false` hides the sign-up links, redirects `/register` to `/login`, **and** makes Better Auth reject `sign-up` API calls outright. Default is enabled.

## Project layout

```
prisma/schema.prisma                 # User / Session / Account / Verification (Better Auth)
prisma.config.ts                     # Prisma 7 schema, migrations, and seed config
server/utils/auth.ts                 # Better Auth instance
server/utils/prisma.ts               # PrismaClient singleton
server/utils/guard.ts                # requireSession() / requireAdmin() for custom endpoints
server/api/auth/[...all].ts          # Better Auth catch-all handler
server/api/openapi.json.get.ts       # Better Auth OpenAPI schema
server/plugins/redis-cache.ts        # Runtime Nitro cache storage
server/utils/email-queue.ts          # BullMQ password reset producer
workers/email.ts                     # SMTP worker
app/lib/auth-client.ts               # Better Auth client (vue + admin plugin)
app/composables/useAuthSession.ts    # shared reactive session
app/composables/useAdminUsers.ts     # admin list state (page/sort/search)
app/components/ServerDataTable.vue   # reusable table UI (presentational)
app/pages/login.vue / register.vue   # auth pages
app/pages/forgot-password.vue        # request a reset email
app/pages/reset-password.vue         # set a password using a reset token
app/pages/admin/index.vue            # admin dashboard (live statistics)
app/pages/admin/users.vue            # protected users table + CRUD/ban dialogs
app/layouts/default.vue              # public site chrome (header + footer)
app/layouts/admin.vue                # admin shell (sidebar + header, TailwindAdmin style)
app/components/admin/                # AdminSidebar, AdminHeader, AdminPageHeader
app/middleware/{auth,guest,admin,registration}.ts
server/api/admin/stats.get.ts        # guarded dashboard statistics endpoint
scripts/seed-admin.ts                # bun run seed:admin
scripts/seed-users.ts                # bun run seed:users
```

## Reusing the datatable

`<ServerDataTable>` renders the rows and state supplied by your page or composable:

```vue
<ServerDataTable
  v-model:page="page"
  v-model:page-size="pageSize"
  :rows="rows"
  :loading="loading"
  :total="total"
  :column-count="5"
  search-placeholder="Search…"
  @search="search = $event"
  @refresh="refresh()"
>
  <template #head>
    <!-- your <TableRow> of <TableHead>s -->
  </template>
  <template #row="{ row }">
    <!-- your <TableRow> of <TableCell>s -->
  </template>
  <template #toolbar="{ refresh }">
    <!-- action buttons; refresh is pre-wired to the refresh event -->
  </template>
</ServerDataTable>
```

Props: `rows`, `loading`, `page`, `pageSize`, `total`, `columnCount`, plus optional `pageSizes`, `searchable`, `searchPlaceholder`. Emits: `update:page`, `update:pageSize`, `search` (debounced 350 ms), `refresh`. Slots: `head`, `row` (with `row` + `index`), `toolbar` (with `refresh`), `empty`.

`app/composables/useAdminUsers.ts` + `app/pages/admin/users.vue` are the reference wiring: `useAsyncData` (client-only) calling `authClient.admin.listUsers` with `limit`/`offset`/`sortBy`/`searchField` query params.

## API documentation

`/docs` renders [Scalar](https://github.com/scalar/scalar) against Nitro's runtime OpenAPI document at `/_openapi.json`. Nitro includes native server routes and their `defineRouteMeta` metadata.

Better Auth owns the catch-all `/api/auth/*` handler, so its endpoint-level schemas are generated from the Better Auth instance and available at `/api/auth/reference` and `/api/openapi.json`. That document is served through Nitro's cache (Redis when `REDIS_URL` is set, five-minute TTL), so regenerating it does not run on every request. Better Auth validates its request bodies with Zod. Use Zod schemas for custom Nitro route input validation and describe those routes with Nitro metadata.

| URL                     | What                                             |
| ----------------------- | ------------------------------------------------ |
| `/docs`                 | Scalar UI for Nitro routes                       |
| `/_openapi.json`        | Nitro-generated OpenAPI document                 |
| `/api/openapi.json`     | Better Auth-generated OpenAPI document           |
| `/api/auth/reference`   | Better Auth endpoint reference                   |

- Local: <http://localhost:3000/docs>
- The spec is available in development and also on the deployed app (Scalar's `spec.url` is a runtime route, no build-time env needed).
- Admin endpoints require an admin session. Log in first; the session cookie is sent with same-origin "Try it" requests.
- The documentation endpoints (`/docs`, `/_openapi.json`, `/api/openapi.json`, `/api/auth/reference`) can be protected with HTTP Basic auth: set `DOCS_BASIC_AUTH_USER` and `DOCS_BASIC_AUTH_PASSWORD`. With either unset, the docs stay public.

To change the docs path or title, edit the `scalar` block in `nuxt.config.ts`.

## Docker

The dev stack (`docker-compose.yml`) runs Postgres, a cache Redis, a dedicated BullMQ Redis, Mailpit, the Nuxt dev server, and an email worker. The source is bind-mounted and Vite watch-polling is enabled inside the app container.

**No ports are published to the host.** Services are only `expose`d and reached through [OrbStack](https://orbstack.dev)'s per-container domains:

| Service  | URL                                        | Notes                       |
| -------- | ------------------------------------------ | --------------------------- |
| app      | <https://app.nuxt-starter.orb.local>       | HTTPS terminated by OrbStack |
| postgres | `postgres.nuxt-starter.orb.local:5432`     | raw TCP (psql, migrations from the host) |
| redis    | `redis.nuxt-starter.orb.local:6379`        | Nitro cache with LRU eviction |
| redis-queue | `redis-queue.nuxt-starter.orb.local:6379` | BullMQ jobs with noeviction |
| mailpit  | <http://mailpit.nuxt-starter.orb.local:8025> | captured email inbox        |
| SMTP     | `mailpit.nuxt-starter.orb.local:1025`      | local SMTP for the worker   |

Prisma Studio binds to `127.0.0.1` only (Prisma 7), so it is not run as a compose service. Browse the database from the host instead:

```bash
DATABASE_URL=postgresql://postgres:postgres@postgres.nuxt-starter.orb.local:5432/nuxt_starter?schema=public \
  bun run db:studio
```

```bash
docker compose up --build
```

On first run, create the schema and seed the admin inside the app container:

```bash
docker compose exec app bun run db:migrate
docker compose exec app bun run seed:admin
docker compose exec app bun run seed:users   # optional demo data
```

The stack sets `BETTER_AUTH_URL=https://app.nuxt-starter.orb.local` by default. Better Auth checks the browser's `Origin` header against it and derives cookie attributes from it. Override it via `BETTER_AUTH_URL` in `.env` if you browse from a different host.

Hot reload works through the bind-mounted source; the container keeps its own `node_modules` in a named volume (host deps are macOS binaries, the container needs Linux ones). The entrypoint (`docker-entrypoint.dev.sh`) runs `bun install` + `prisma generate` on **every boot**, so after changing dependencies just:

```bash
docker compose up -d --build
```

The container-side install converges with `bun.lock` automatically, so dependency updates do not require deleting volumes.

Useful commands:

```bash
docker compose logs -f app         # follow dev server logs
docker compose exec app sh         # shell into the app container
docker compose down                # stop (keeps the db volume)
docker compose down -v             # stop and wipe the database
```

## Deployment

The multi-stage `Dockerfile` keeps the runtime image lean. A build stage compiles Nitro, and a separate runtime-dependency stage installs Prisma 7, Better Auth, BullMQ, Nodemailer, and the PostgreSQL adapter. Nuxt and build-only packages stay out of the runner image.

The image runs **`prisma migrate deploy` automatically on start** (via `docker-entrypoint.sh`), so a freshly deployed container migrates its database before serving.

### Dokploy (app only, external database)

`docker-compose.dokploy.yml` deploys the app and worker and expects managed PostgreSQL and Redis services. It attaches to the external `dokploy-network` and publishes no ports. Dokploy's Traefik reaches the app over that network.

1. Create a **Compose** service in Dokploy from this repo, using `docker-compose.dokploy.yml`.
2. Set `DATABASE_URL`, separate `REDIS_URL` and `QUEUE_REDIS_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `SMTP_HOST`, `SMTP_PORT`, and `SMTP_FROM`. Set `NUXT_PUBLIC_ENABLE_REGISTRATION` and admin seed variables as needed.
3. Add a **Domain** pointing to the `app` service on container port **3000**.

Migrations run automatically on deploy. To seed the admin once, run in the app container (Dokploy → Terminal):

```bash
bun node_modules/prisma/build/index.js db seed
```

### Docker (production, with bundled Postgres)

`docker-compose.prod.yml` runs the app, email worker, PostgreSQL, and separate cache and queue Redis services. Configure SMTP variables before starting it:

```bash
BETTER_AUTH_SECRET=$(openssl rand -base64 32) \
SMTP_HOST=smtp.example.com SMTP_PORT=587 SMTP_SECURE=true \
SMTP_FROM='Nuxt Starter <no-reply@example.com>' \
  docker compose -f docker-compose.prod.yml up -d --build
```

Seed the admin once the app is up:

```bash
docker compose -f docker-compose.prod.yml exec app \
  bun node_modules/prisma/build/index.js db seed
```

### Without Docker

`bun run build` produces a self-contained server in `.output` (Nitro `node-server` preset). On the host, set the env vars, apply migrations, then start it:

```bash
bun run build
bunx prisma migrate deploy        # apply migrations to DATABASE_URL
node .output/server/index.mjs     # start the server (defaults to port 3000)
```

Required production environment variables:

| Variable                          | Purpose                                        |
| --------------------------------- | ---------------------------------------------- |
| `DATABASE_URL`                    | PostgreSQL connection string                   |
| `REDIS_URL`                       | Redis URL for Nitro cache                      |
| `QUEUE_REDIS_URL`                 | Dedicated Redis URL for BullMQ                 |
| `BETTER_AUTH_SECRET`              | Auth secret (>= 32 chars)                      |
| `BETTER_AUTH_URL`                 | Public origin (behind a proxy)                 |
| `SMTP_HOST` / `SMTP_PORT`         | SMTP endpoint for the email worker             |
| `SMTP_USER` / `SMTP_PASSWORD`     | Optional SMTP credentials                      |
| `SMTP_FROM`                       | Sender address shown in reset emails           |
| `NUXT_PUBLIC_ENABLE_REGISTRATION` | Sign-up toggle (`"false"` to disable)          |
| `DOCS_BASIC_AUTH_USER` / `DOCS_BASIC_AUTH_PASSWORD` | Basic auth for the API docs; unset = public |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD`  | Used by the seed command                       |

See the [Nuxt deployment docs](https://nuxt.com/docs/getting-started/deployment) for platform-specific presets (Node, Vercel, Netlify, etc.).

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
| `bun run db:reset`   | Reset DB and regenerate Prisma Client   |
| `bun run seed:admin` | Seed/reset the admin user                |
| `bun run seed:users` | Seed demo users                          |
| `bun run worker`     | Start the BullMQ email worker            |
