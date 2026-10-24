import { Queue } from 'bullmq'
import type { PasswordResetEmailJob } from './password-reset-email'
import { queueRedisConnectionOptions } from './queue-redis'

const queueName = 'emails'
let emailQueue: Queue<PasswordResetEmailJob, void, 'password-reset'> | undefined

function getEmailQueue() {
  return (emailQueue ??= new Queue<PasswordResetEmailJob, void, 'password-reset'>(queueName, {
    connection: queueRedisConnectionOptions(2),
    defaultJobOptions: {
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 2_000
      },
      removeOnComplete: {
        age: 60 * 60,
        count: 1_000
      },
      removeOnFail: {
        age: 24 * 60 * 60,
        count: 1_000
      }
    }
  }))
}

export function enqueuePasswordResetEmail(data: PasswordResetEmailJob) {
  return getEmailQueue().add('password-reset', data)
}

export async function closeEmailQueue() {
  const queue = emailQueue
  emailQueue = undefined

  if (queue) {
    await queue.close()
  }
}
