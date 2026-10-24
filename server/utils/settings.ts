import { prisma } from './prisma'

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
  const rows = await prisma.setting.findMany({
    where: { key: { in: [...SETTING_KEYS] } }
  })
  const byKey = new Map(rows.map(row => [row.key, row.value]))

  return {
    enableRegistration: byKey.has('enableRegistration')
      ? byKey.get('enableRegistration') === 'true'
      : envEnableRegistration
  }
}

export async function updateAppSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  if (typeof patch.enableRegistration === 'boolean') {
    await prisma.setting.upsert({
      where: { key: 'enableRegistration' },
      create: { key: 'enableRegistration', value: String(patch.enableRegistration) },
      update: { value: String(patch.enableRegistration) }
    })
  }
  return getAppSettings()
}
