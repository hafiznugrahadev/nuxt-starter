// Route middleware: require a signed-in user.
export default defineNuxtRouteMiddleware(async (to) => {
  const { data: session } = await useAuthSession()

  if (!session.value) {
    return navigateTo({ path: '/login', query: { redirect: to.fullPath } })
  }
})
