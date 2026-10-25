import { hasRole } from '#shared/utils/roles'

// Route middleware: require a signed-in user holding the super-admin role
// (a superset of admin that gates developer tooling like the task manager).
export default defineNuxtRouteMiddleware(async (to) => {
  const { data: session } = await useAuthSession()

  if (!session.value) {
    return navigateTo({ path: '/login', query: { redirect: to.fullPath } })
  }

  if (!hasRole(session.value.user.role, 'super-admin')) {
    return navigateTo('/', { replace: true })
  }
})
