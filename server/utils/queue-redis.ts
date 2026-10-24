export function queueRedisConnectionOptions(maxRetriesPerRequest: number | null) {
  const value = process.env.QUEUE_REDIS_URL

  if (!value) {
    throw new Error('QUEUE_REDIS_URL must be set to use the email queue')
  }

  const url = new URL(value)

  if (url.protocol !== 'redis:' && url.protocol !== 'rediss:') {
    throw new Error('QUEUE_REDIS_URL must use the redis or rediss protocol')
  }

  const database = url.pathname.length > 1 ? Number(url.pathname.slice(1)) : 0

  if (!Number.isSafeInteger(database) || database < 0) {
    throw new Error('QUEUE_REDIS_URL has an invalid database number')
  }

  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 6379,
    username: url.username ? decodeURIComponent(url.username) : undefined,
    password: url.password ? decodeURIComponent(url.password) : undefined,
    db: database,
    maxRetriesPerRequest,
    ...(url.protocol === 'rediss:' ? { tls: {} } : {})
  }
}
