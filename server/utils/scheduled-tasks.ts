import { like, lt } from 'drizzle-orm'
import { session, setting, verification } from '../db/schema'
import { db, escapeLike, type Database } from './db'
import { upsertSetting } from './settings'

// Registry of recurring maintenance tasks executed by the task scheduler
// (worker process). Adding a task here is enough: the worker registers the
// BullMQ repeatable job on boot and the admin settings page picks it up.
export interface ScheduledTask {
  id: string
  title: string
  description: string
  /** 5-field cron pattern, evaluated in UTC. */
  pattern: string
  run: (database: Database) => Promise<{ message: string }>
}

export const SCHEDULED_TASKS: ScheduledTask[] = [
  {
    id: 'prune-sessions',
    title: 'Prune expired sessions',
    description: 'Deletes session rows whose expiry has passed.',
    pattern: '15 * * * *',
    async run(database) {
      const removed = await database.delete(session).where(lt(session.expiresAt, new Date()))
      return { message: `Removed ${removed.rowCount ?? 0} expired session(s).` }
    }
  },
  {
    id: 'prune-verifications',
    title: 'Prune expired verification tokens',
    description: 'Deletes Better Auth verification rows (password reset, email verification) past their expiry.',
    pattern: '30 3 * * *',
    async run(database) {
      const removed = await database.delete(verification).where(lt(verification.expiresAt, new Date()))
      return { message: `Removed ${removed.rowCount ?? 0} expired verification(s).` }
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
  await upsertSetting(lastRunKey(id), value)
}

export async function getTaskLastRuns(): Promise<Record<string, TaskLastRun>> {
  const rows = await db
    .select()
    .from(setting)
    .where(like(setting.key, `${escapeLike('task:lastRun:')}%`))

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
