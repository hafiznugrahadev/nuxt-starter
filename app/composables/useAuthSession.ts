import type { Ref } from 'vue'
import type { Session } from '~/lib/auth-client'

interface SessionState {
  data: Ref<Session | null>
}

declare module '#app' {
  interface NuxtApp {
    _authSession?: Promise<SessionState>
  }
}

/** Share one cookie-aware session request across the app shell and middleware. */
export function useAuthSession(): Promise<SessionState> {
  const nuxtApp = useNuxtApp()

  return (nuxtApp._authSession ??= useFetch<Session | null>('/api/auth/get-session', {
    key: 'auth-session',
    headers: import.meta.server ? useRequestHeaders(['cookie']) : undefined
  }).then(({ data }) => ({
    data: computed(() => data.value ?? null)
  })))
}
