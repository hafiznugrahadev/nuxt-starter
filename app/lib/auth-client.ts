import { createAuthClient } from 'better-auth/vue'
import { adminClient } from 'better-auth/client/plugins'

// Client for the Better Auth handler mounted at /api/auth
// (see server/api/auth/[...all].ts). baseURL is omitted on purpose: the client
// targets same-origin, which works in the browser on any host.
// Session reads during SSR go through `useAuthSession()`, which forwards the
// incoming cookies via Nuxt's `useFetch`.
export const authClient = createAuthClient({
  plugins: [adminClient()]
})

export type Session = typeof authClient.$Infer.Session
export type AuthUser = Session['user']
