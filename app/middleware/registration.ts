// Route middleware: gate /register behind the public sign-up setting. The
// source of truth is the admin-managed DB setting (GET /api/settings, which
// also falls back to NUXT_PUBLIC_ENABLE_REGISTRATION when no override is
// stored); the auth server enforces the same value on the sign-up endpoint
// itself, so this is UX gating, not security.
export default defineNuxtRouteMiddleware(async () => {
  const { data } = await useFetch('/api/settings', { key: 'public-settings' })

  if (data.value && !data.value.enableRegistration) {
    return navigateTo('/login', { replace: true })
  }
})
