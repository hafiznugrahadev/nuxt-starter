import { inArray } from 'drizzle-orm'
import { setting } from '../db/schema'
import { db } from './db'

// Runtime app settings. Values live in the `setting` table (managed from the
// admin settings page); an absent row falls back to the env-provided default
// so fresh installs keep behaving like the documented env-only setup.
export interface AppSettings {
  enableRegistration: boolean
}

const SETTING_KEYS = ['enableRegistration'] as const

// Default mirrors the pre-DB behavior in server/utils/auth.ts and
// runtimeConfig.public.enableRegistration (NUXT_PUBLIC_ENABLE_REGISTRATION).
const envEnableRegistration = process.env.NUXT_PUBLIC_ENABLE_REGISTRATION !== 'false'

export async function getAppSettings(): Promise<AppSettings> {
  const rows = await db
    .select()
    .from(setting)
    .where(inArray(setting.key, [...SETTING_KEYS]))
  const byKey = new Map(rows.map(row => [row.key, row.value]))

  return {
    enableRegistration: byKey.has('enableRegistration')
      ? byKey.get('enableRegistration') === 'true'
      : envEnableRegistration
  }
}

/** Inserts the setting or overwrites its value. */
export async function upsertSetting(key: string, value: string) {
  await db
    .insert(setting)
    .values({ key, value })
    // `$onUpdate` only covers `update()`, so the upsert path sets it itself.
    .onConflictDoUpdate({ target: setting.key, set: { value, updatedAt: new Date() } })
}

export async function updateAppSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  if (typeof patch.enableRegistration === 'boolean') {
    await upsertSetting('enableRegistration', String(patch.enableRegistration))
  }
  return getAppSettings()
}
