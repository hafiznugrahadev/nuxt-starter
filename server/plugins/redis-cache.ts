import { useStorage } from 'nitropack/runtime'
import redisDriver from 'unstorage/drivers/redis'

export default defineNitroPlugin(() => {
  const url = process.env.REDIS_URL

  if (!url) return

  const storage = useStorage()

  // Nitro creates an in-memory cache mount by default. Replace it before any
  // request handlers run so runtime REDIS_URL works in containers and deploys.
  void storage.unmount('cache', false)
  storage.mount('cache', redisDriver({
    url,
    base: 'nuxt-starter:cache',
    maxRetriesPerRequest: 2
  }))
})
