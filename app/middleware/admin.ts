import { hasRole } from '#shared/utils/roles'

// Route middleware: require a signed-in admin or super-admin.
export default defineNuxtRouteMiddleware(async (to) => {
  const { data: session } = await useAuthSession()

  if (!session.value) {
    return navigateTo({ path: '/login', query: { redirect: to.fullPath } })
  }

  if (!hasRole(session.value.user.role, 'admin')) {
    return navigateTo('/', { replace: true })
  }
})
