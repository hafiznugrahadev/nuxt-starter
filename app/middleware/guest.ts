import { hasRole } from '#shared/utils/roles'

// Route middleware: keep signed-in users away from auth pages.
export default defineNuxtRouteMiddleware(async () => {
  const { data: session } = await useAuthSession()

  if (session.value) {
    return navigateTo(
      hasRole(session.value.user.role, 'admin') ? '/admin/users' : '/',
      { replace: true }
    )
  }
})
