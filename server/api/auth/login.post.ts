defineRouteMeta({
  openAPI: {
    tags: ['Auth'],
    summary: 'Log in',
    description: 'Authenticate with email/password and start a sealed cookie session.',
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['email', 'password'],
            properties: {
              email: { type: 'string', format: 'email' },
              password: { type: 'string' }
            }
          }
        }
      }
    },
    responses: {
      200: { description: 'Logged in' },
      401: { description: 'Invalid email or password' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const { email, password } = await readValidatedBody(event, loginSchema.parse)

  const user = await prisma.user.findUnique({ where: { email } })

  if (!user || !(await verifyUserPassword(user.password, password))) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid email or password'
    })
  }

  await setUserSession(event, {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    },
    loggedInAt: Date.now()
  })

  return { ok: true }
})
