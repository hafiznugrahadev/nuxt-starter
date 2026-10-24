import { Worker } from 'bullmq'
import { createTransport } from 'nodemailer'
import { buildPasswordResetEmail, passwordResetEmailJobSchema } from '../server/utils/password-reset-email'
import type { PasswordResetEmailJob } from '../server/utils/password-reset-email'
import { queueRedisConnectionOptions } from '../server/utils/queue-redis'

function requiredEnv(name: string) {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new Error(`${name} must be set before starting the email worker`)
  }

  return value
}

const smtpHost = requiredEnv('SMTP_HOST')
const sender = requiredEnv('SMTP_FROM')
const smtpPort = Number(process.env.SMTP_PORT || 1025)
const smtpUser = process.env.SMTP_USER?.trim()
const smtpPassword = process.env.SMTP_PASSWORD

if (!Number.isSafeInteger(smtpPort) || smtpPort < 1 || smtpPort > 65_535) {
  throw new Error('SMTP_PORT must be a valid TCP port')
}

if (Boolean(smtpUser) !== Boolean(smtpPassword)) {
  throw new Error('Set both SMTP_USER and SMTP_PASSWORD, or leave both empty')
}

const transporter = createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: process.env.SMTP_SECURE === 'true',
  auth: smtpUser && smtpPassword ? { user: smtpUser, pass: smtpPassword } : undefined,
  connectionTimeout: 10_000,
  greetingTimeout: 10_000,
  socketTimeout: 30_000
})

const worker = new Worker<PasswordResetEmailJob, void, 'password-reset'>(
  'emails',
  async (job) => {
    const data = passwordResetEmailJobSchema.parse(job.data)
    const message = buildPasswordResetEmail(data)

    await transporter.sendMail({
      from: sender,
      to: data.to,
      subject: message.subject,
      text: message.text,
      html: message.html
    })
  },
  {
    connection: queueRedisConnectionOptions(null),
    concurrency: 5
  }
)

worker.on('failed', (job, error) => {
  console.error('Password reset email job failed', {
    jobId: job?.id,
    errorCode: 'code' in error ? error.code : error.name
  })
})

worker.on('error', (error) => {
  console.error('Email worker connection error', {
    errorCode: 'code' in error ? error.code : error.name
  })
})

let shuttingDown = false

async function shutdown() {
  if (shuttingDown) return
  shuttingDown = true

  await worker.close()
  transporter.close()
}

process.once('SIGINT', () => void shutdown())
process.once('SIGTERM', () => void shutdown())

console.log('Email worker is listening for jobs')
