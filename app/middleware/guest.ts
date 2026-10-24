// Route middleware: keep signed-in users away from auth pages.
export default defineNuxtRouteMiddleware(async () => {
  const { data: session } = await useAuthSession()

  if (session.value) {
    return navigateTo(
      session.value.user.role === 'admin' ? '/admin/users' : '/',
      { replace: true }
    )
  }
})
