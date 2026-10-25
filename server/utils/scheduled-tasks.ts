import type { PrismaClient } from '../../generated/prisma/client'
import { prisma } from './prisma'

// Registry of recurring maintenance tasks executed by the task scheduler
// (worker process). Adding a task here is enough: the worker registers the
// BullMQ repeatable job on boot and the admin settings page picks it up.
export interface ScheduledTask {
  id: string
  title: string
  description: string
  /** 5-field cron pattern, evaluated in UTC. */
  pattern: string
  run: (db: PrismaClient) => Promise<{ message: string }>
}

export const SCHEDULED_TASKS: ScheduledTask[] = [
  {
    id: 'prune-sessions',
    title: 'Prune expired sessions',
    description: 'Deletes session rows whose expiry has passed.',
    pattern: '15 * * * *',
    async run(db) {
      const removed = await db.session.deleteMany({ where: { expiresAt: { lt: new Date() } } })
      return { message: `Removed ${removed.count} expired session(s).` }
    }
  },
  {
    id: 'prune-verifications',
    title: 'Prune expired verification tokens',
    description: 'Deletes Better Auth verification rows (password reset, email verification) past their expiry.',
    pattern: '30 3 * * *',
    async run(db) {
      const removed = await db.verification.deleteMany({ where: { expiresAt: { lt: new Date() } } })
      return { message: `Removed ${removed.count} expired verification(s).` }
    }
  }
]

export function getScheduledTask(id: string) {
  return SCHEDULED_TASKS.find(task => task.id === id)
}

// --- Last-run bookkeeping (stored in the existing `setting` table) ---

export interface TaskLastRun {
  status: 'success' | 'failed'
  message: string
  finishedAt: string
}

function lastRunKey(id: string) {
  return `task:lastRun:${id}`
}

export async function recordTaskRun(id: string, status: TaskLastRun['status'], message: string) {
  const value = JSON.stringify({ status, message, finishedAt: new Date().toISOString() })
  await prisma.setting.upsert({
    where: { key: lastRunKey(id) },
    create: { key: lastRunKey(id), value },
    update: { value }
  })
}

export async function getTaskLastRuns(): Promise<Record<string, TaskLastRun>> {
  const rows = await prisma.setting.findMany({
    where: { key: { startsWith: 'task:lastRun:' } }
  })

  const runs: Record<string, TaskLastRun> = {}
  for (const row of rows) {
    const id = row.key.slice('task:lastRun:'.length)
    try {
      runs[id] = JSON.parse(row.value) as TaskLastRun
    } catch {
      // Corrupt row: ignore rather than break the whole listing.
    }
  }
  return runs
}
