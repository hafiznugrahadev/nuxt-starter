import { closeEmailQueue } from '../utils/email-queue'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('close', closeEmailQueue)
})
