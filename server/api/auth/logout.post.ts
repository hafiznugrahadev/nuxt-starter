defineRouteMeta({
  openAPI: {
    tags: ['Auth'],
    summary: 'Log out',
    description: 'Clear the current user session.',
    responses: {
      200: { description: 'Logged out' }
    }
  }
})

export default defineEventHandler(async (event) => {
  await clearUserSession(event)
  return { ok: true }
})
