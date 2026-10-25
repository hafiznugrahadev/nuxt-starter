import { closeEmailQueue } from '../utils/email-queue'
import { closeTaskQueue } from '../utils/task-queue'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('close', async () => {
    await Promise.allSettled([closeEmailQueue(), closeTaskQueue()])
  })
})
