// Worker entrypoint: boots the email queue processor and the task scheduler.
// Runs as its own container (`bun run worker`, see docker-compose.yml).
import { startEmailWorker } from './email'
import { startTaskWorker } from './tasks'

let shuttingDown = false

async function main() {
  const stopEmail = await startEmailWorker()
  console.log('Email worker is listening for jobs')

  const stopTasks = await startTaskWorker()

  async function shutdown() {
    if (shuttingDown) return
    shuttingDown = true

    await Promise.allSettled([stopTasks(), stopEmail()])
    await prismaDisconnect()
    process.exit(0)
  }

  process.once('SIGINT', () => void shutdown())
  process.once('SIGTERM', () => void shutdown())
}

async function prismaDisconnect() {
  const { prisma } = await import('../server/utils/prisma')
  await prisma.$disconnect()
}

main().catch((error) => {
  console.error('Worker failed to start', error)
  process.exit(1)
})
