import { Worker } from 'bullmq'
import { queueRedisConnectionOptions } from '../server/utils/queue-redis'
import { getScheduledTask, recordTaskRun, SCHEDULED_TASKS } from '../server/utils/scheduled-tasks'
import { scheduleRecurringTasks, TASK_QUEUE_NAME } from '../server/utils/task-queue'
import { prisma } from '../server/utils/prisma'

// Starts the scheduled-task worker: registers the recurring BullMQ jobs
// (this process is the single scheduler registrar) and processes their
// occurrences, persisting the last run result per task for the admin UI.
export async function startTaskWorker() {
  await scheduleRecurringTasks()

  const worker = new Worker(TASK_QUEUE_NAME, async (job) => {
    const task = getScheduledTask(job.name)
    if (!task) {
      // Unknown task id: a registry entry was removed while jobs were
      // still queued. Drop it instead of crashing the worker.
      return
    }

    const result = await task.run(prisma)
    return result
  }, {
    connection: queueRedisConnectionOptions(null),
    concurrency: 1
  })

  worker.on('completed', async (job, result) => {
    const message = (result as { message?: string } | undefined)?.message
      ?? 'Task completed.'
    await recordTaskRun(job.name, 'success', message).catch(error => console.error(
      'Could not persist task run result',
      { taskId: job.name, error: (error as Error).message }
    ))
  })

  worker.on('failed', async (job, error) => {
    console.error('Scheduled task failed', { taskId: job?.name, error: error.message })
    if (job) {
      await recordTaskRun(job.name, 'failed', error.message).catch(() => {})
    }
  })

  worker.on('error', (error) => {
    console.error('Task worker connection error', {
      errorCode: 'code' in error ? error.code : error.name
    })
  })

  await worker.waitUntilReady()
  console.log(`Task scheduler is watching ${SCHEDULED_TASKS.length} recurring task(s)`)

  return () => worker.close()
}
