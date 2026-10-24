import { z } from 'zod'

export const passwordResetEmailJobSchema = z.object({
  to: z.email(),
  name: z.string().trim().min(1).max(200),
  url: z.url()
})

export type PasswordResetEmailJob = z.infer<typeof passwordResetEmailJobSchema>

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll('\'', '&#39;')
}

export function buildPasswordResetEmail(input: PasswordResetEmailJob) {
  const { name, url } = passwordResetEmailJobSchema.parse(input)
  const safeName = escapeHtml(name)
  const safeUrl = escapeHtml(url)

  return {
    subject: 'Reset your Nuxt Starter password',
    text: [
      `Hello ${name},`,
      '',
      'We received a request to reset the password for your Nuxt Starter account.',
      'Use this link to choose a new password:',
      url,
      '',
      'The link expires in one hour. If you did not request a reset, you can ignore this email.'
    ].join('\n'),
    html: [
      `<p>Hello ${safeName},</p>`,
      '<p>We received a request to reset the password for your Nuxt Starter account.</p>',
      `<p><a href="${safeUrl}">Choose a new password</a></p>`,
      '<p>The link expires in one hour. If you did not request a reset, you can ignore this email.</p>'
    ].join('\n')
  }
}
