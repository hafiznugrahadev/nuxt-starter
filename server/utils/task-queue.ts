import { Queue } from 'bullmq'
import { queueRedisConnectionOptions } from './queue-redis'
import { SCHEDULED_TASKS } from './scheduled-tasks'

// Queue for the scheduled maintenance tasks (processed by the worker). It is
// separate from `emails` so a slow task never blocks password-reset mail.
// BullMQ 6 job schedulers are used for the recurring runs: upserting by id
// updates the pattern in place, so boot-time registration is idempotent.
export const TASK_QUEUE_NAME = 'tasks'

let taskQueue: Queue | undefined

export function getTaskQueue() {
  return (taskQueue ??= new Queue(TASK_QUEUE_NAME, {
    connection: queueRedisConnectionOptions(2),
    defaultJobOptions: {
      attempts: 1,
      removeOnComplete: { age: 60 * 60, count: 1_000 },
      removeOnFail: { age: 24 * 60 * 60, count: 1_000 }
    }
  }))
}

function isRegisteredTask(schedulerId: string) {
  return SCHEDULED_TASKS.some(task => task.id === schedulerId)
}

/**
 * Register one BullMQ job scheduler per scheduled task. Idempotent: upserts
 * by scheduler id (pattern changes in code update the schedule in place) and
 * removes schedulers whose registry entries no longer exist. Called from the
 * worker on boot — a single registrar avoids two processes racing.
 */
export async function scheduleRecurringTasks() {
  const queue = getTaskQueue()

  for (const task of SCHEDULED_TASKS) {
    await queue.upsertJobScheduler(task.id, {
      pattern: task.pattern,
      tz: 'UTC'
    }, {
      name: task.id
    })
  }

  for (const scheduler of await queue.getJobSchedulers()) {
    if (!isRegisteredTask(scheduler.key)) {
      await queue.removeJobScheduler(scheduler.key)
    }
  }
}

/** Queue an immediate, one-off run of a task (admin "Run now"). */
export async function runTaskNow(id: string) {
  return getTaskQueue().add(id, { manual: true })
}

/** Next scheduled run (ms epoch) per task id, from the job schedulers. */
export async function getTaskSchedules(): Promise<Record<string, number>> {
  const schedulers = await getTaskQueue().getJobSchedulers()
  const schedules: Record<string, number> = {}
  for (const scheduler of schedulers) {
    if (scheduler.next) schedules[scheduler.key] = scheduler.next
  }
  return schedules
}

export async function closeTaskQueue() {
  const queue = taskQueue
  taskQueue = undefined

  if (queue) {
    await queue.close()
  }
}
