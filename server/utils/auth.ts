import { betterAuth } from 'better-auth'
import { APIError, createAuthMiddleware } from 'better-auth/api'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { admin, openAPI } from 'better-auth/plugins'
import { enqueuePasswordResetEmail } from './email-queue'
import { prisma } from './prisma'
import { getAppSettings } from './settings'

// This module is imported by Nitro handlers, the seed scripts and the
// Better Auth CLI. Keep it free of Nitro globals by using explicit imports
// only, and let Better Auth read BETTER_AUTH_SECRET / BETTER_AUTH_URL from the
// environment itself.
export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    resetPasswordTokenExpiresIn: 60 * 60,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      try {
        await enqueuePasswordResetEmail({
          to: user.email,
          name: user.name,
          url
        })
      } catch {
        // Keep the response generic so queue failures do not reveal whether an
        // email address belongs to an account.
        console.error('Unable to queue a password reset email')
      }
    }
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7 // 7 days
  },
  rateLimit: {
    customRules: {
      '/request-password-reset': {
        window: 60 * 60,
        max: 5
      }
    }
  },
  hooks: {
    // Server-side enforcement of the admin "enable registration" setting.
    // Runs before every auth endpoint; only the e-mail sign-up path is gated.
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path === '/sign-up/email') {
        const settings = await getAppSettings()
        if (!settings.enableRegistration) {
          throw new APIError('FORBIDDEN', { message: 'Registration is currently disabled' })
        }
      }
    })
  },
  plugins: [
    // admin: role-based access (`user.role`), ban/unban and the managed
    // /api/auth/admin/* user-management endpoints used by the admin page.
    // `user.role` may hold several comma-separated roles ("user,admin"); the
    // plugin grants admin access when any of them is listed in adminRoles.
    admin({ adminRoles: ['admin'], defaultRole: 'user' }),
    // openAPI: /api/auth/reference (Scalar UI) for the auth surface.
    openAPI()
  ]
})

export type Session = typeof auth.$Infer.Session
