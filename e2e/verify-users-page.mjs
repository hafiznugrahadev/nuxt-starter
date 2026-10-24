// Headless E2E: multi-role + role filter + filter modal + mobile card mode.
// Run: bun e2e/verify-users-page.mjs
// Env: BASE_URL (default https://app.nuxt-starter.orb.local), ADMIN_EMAIL,
//      ADMIN_PASSWORD (defaults match the dev seed).
import { chromium } from 'playwright-core'

const BASE = process.env.BASE_URL || 'https://app.nuxt-starter.orb.local'
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin12345'
const results = []
let page

function pass(name) {
  results.push(['PASS', name])
  console.log(`  PASS ${name}`)
}

function fail(name, detail) {
  results.push(['FAIL', name])
  console.log(`  FAIL ${name}\n       ${String(detail).slice(0, 300)}`)
}

async function step(name, fn) {
  try {
    await fn()
    pass(name)
  } catch (err) {
    const url = page?.url()
    try {
      await page.screenshot({ path: `.e2e-artifacts/${name.replace(/[^a-z0-9]+/gi, '-')}.png` })
    } catch { /* screenshot is best-effort */ }
    fail(name, `${err.message || err} | url=${url}`)
    // close any stuck modal/menu so one failure does not cascade
    try {
      await page.keyboard.press('Escape')
      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)
    } catch { /* best-effort recovery */ }
  }
}

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, ignoreHTTPSErrors: true })
await (await import('node:fs')).mkdirSync('.e2e-artifacts', { recursive: true })
page = await ctx.newPage()
page.on('pageerror', (err) => {
  console.log(`  [pageerror] ${String(err).slice(0, 200)}`)
})
page.on('console', (msg) => {
  if (msg.type() === 'error') console.log(`  [console.error] ${msg.text().slice(0, 200)}`)
})

console.log(`\n== login ==`)
await step('login as admin', async () => {
  // Wait for Vue hydration before clicking: an SSR-rendered button clicked
  // too early falls back to a native form submit and looks like a failed
  // login.
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.locator('#email').waitFor({ timeout: 60000 })
  await page.waitForFunction(
    () => Boolean(document.querySelector('#email')?.__vueParentComponent),
    { timeout: 30000, polling: 200 }
  ).catch(() => { /* continue if the marker is absent */ })
  await page.locator('#email').fill(ADMIN_EMAIL)
  await page.locator('#password').fill(ADMIN_PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL(/\/admin|\/$/, { timeout: 15000 })
})

console.log(`\n== desktop: users table ==`)
await page.goto(`${BASE}/admin/users`, { waitUntil: 'networkidle' })
await step('table shows both users', async () => {
  await page.getByRole('heading', { name: 'User Management' }).waitFor({ timeout: 15000 })
  await page.getByText('Administrator').first().waitFor({ timeout: 15000 })
  const rowCount = await page.locator('table tbody tr').count()
  if (rowCount < 2) throw new Error(`expected >=2 rows, got ${rowCount}`)
})

await step('role column heading sorts by role', async () => {
  // Heading must say Role (not Email) and sort the role column: ascending
  // puts the admin user ("admin") before the plain user ("user"). Later
  // steps locate rows by text, so the changed order needs no restore.
  const header = page.getByRole('button', { name: /^Role/, exact: false })
  await header.click()
  await page.waitForTimeout(900)
  const firstRow = await page.locator('table tbody tr').first().innerText()
  if (!firstRow.includes('Administrator')) throw new Error(`first row after role sort: ${firstRow.slice(0, 100)}`)
})

console.log(`\n== filter modal: role filter ==`)
await step('filter modal opens with search-field + role comboboxes', async () => {
  await page.getByRole('button', { name: /Filters/ }).click()
  await page.getByRole('dialog').getByText('Filter users').waitFor()
  await page.locator('#filter-search-field').waitFor()
  await page.locator('#filter-role').waitFor()
})

await step('role filter = Admin keeps only admin rows', async () => {
  await page.locator('#filter-role').click()
  await page.getByRole('option', { name: 'Admin', exact: true }).click()
  await page.getByRole('button', { name: /Apply filters/ }).click()
  await page.waitForTimeout(800)
  const names = await page.locator('table tbody tr').allInnerTexts()
  const nonAdmin = names.filter(t => !t.includes('Administrator'))
  if (names.length !== 1 || nonAdmin.length > 0) throw new Error(`rows: ${JSON.stringify(names)}`)
})

await step('active filter count badge shows 1', async () => {
  const badge = page.getByRole('button', { name: /Filters/ }).locator('span[aria-label="Active filters"]')
  const text = await badge.innerText()
  if (text.trim() !== '1') throw new Error(`badge=${text}`)
})

await step('reset returns all users', async () => {
  await page.getByRole('button', { name: /Filters/ }).click()
  await page.getByRole('button', { name: 'Reset' }).click()
  await page.getByRole('button', { name: /Apply filters/ }).click()
  await page.waitForTimeout(800)
  const rowCount = await page.locator('table tbody tr').count()
  if (rowCount < 2) throw new Error(`expected >=2 rows after reset, got ${rowCount}`)
})

await step('search-field filter (Name) works via modal', async () => {
  await page.getByRole('button', { name: /Filters/ }).click()
  await page.locator('#filter-search-field').click()
  await page.getByRole('option', { name: 'Name', exact: true }).click()
  await page.getByRole('button', { name: /Apply filters/ }).click()
  await page.getByPlaceholder('Search users...').fill('qycoji')
  await page.waitForTimeout(900)
  const rowCount = await page.locator('table tbody tr').count()
  if (rowCount !== 1) throw new Error(`expected 1 row for name search, got ${rowCount}`)
  await page.getByPlaceholder('Search users...').fill('')
  await page.waitForTimeout(900)
})

console.log(`\n== multi-role editing ==`)
await step('edit user: add admin role alongside user', async () => {
  const row = page.locator('table tbody tr', { hasText: 'qycoji' })
  await row.getByRole('button', { name: 'Row actions' }).click()
  await page.getByRole('menuitem', { name: 'Edit' }).click()
  await page.getByRole('dialog').getByText('Edit user').waitFor()
  const adminToggle = page.getByRole('dialog').getByRole('button', { name: 'Admin', exact: true })
  if (await adminToggle.getAttribute('aria-pressed') !== 'false') throw new Error('Admin toggle should start unpressed')
  await adminToggle.click()
  await page.getByRole('button', { name: 'Save changes' }).click()
  await page.waitForTimeout(1000)
  const badges = await page.locator('table tbody tr', { hasText: 'qycoji' }).locator('[data-slot="badge"]').allInnerTexts()
  if (!badges.includes('user') || !badges.includes('admin')) throw new Error(`badges: ${JSON.stringify(badges)}`)
})

await step('role filter = Admin now matches the multi-role user too', async () => {
  await page.getByRole('button', { name: /Filters/ }).click()
  await page.locator('#filter-role').click()
  await page.getByRole('option', { name: 'Admin', exact: true }).click()
  await page.getByRole('button', { name: /Apply filters/ }).click()
  await page.waitForTimeout(800)
  const rowCount = await page.locator('table tbody tr').count()
  if (rowCount !== 2) throw new Error(`expected 2 rows (admin + multi-role user), got ${rowCount}`)
})

await step('create user with two roles at once', async () => {
  await page.getByRole('button', { name: /Reset/ }).count() // noop
  await page.getByRole('button', { name: /Filters/ }).click()
  await page.getByRole('button', { name: 'Reset' }).click()
  await page.getByRole('button', { name: /Apply filters/ }).click()
  await page.waitForTimeout(600)
  await page.getByRole('button', { name: /Add user/ }).click()
  const dlg = page.getByRole('dialog')
  await dlg.getByLabel('Name').fill('Multi Role Tester')
  await dlg.getByLabel('Email').fill('multirole@example.com')
  await dlg.locator('#user-password').fill('password123')
  await dlg.getByRole('button', { name: 'Admin', exact: true }).click()
  await dlg.getByRole('button', { name: 'Create user' }).click()
  await page.waitForTimeout(1000)
  const row = page.locator('table tbody tr', { hasText: 'multirole@example.com' })
  if (await row.count() !== 1) throw new Error('created user row not found')
  const badges = await row.locator('[data-slot="badge"]').allInnerTexts()
  if (!badges.includes('user') || !badges.includes('admin')) throw new Error(`badges: ${JSON.stringify(badges)}`)
})

console.log(`\n== mobile: card mode ==`)
await step('phone viewport hides table, shows cards', async () => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.waitForTimeout(400)
  const tableVisible = await page.locator('table').first().isVisible()
  if (tableVisible) throw new Error('table should be hidden on phone viewport')
  const card = page.locator('div.sm\\:hidden > [data-slot="card"]', { hasText: 'multirole@example.com' })
  if (await card.count() !== 1) throw new Error('card for created user not found')
  const badges = await card.locator('[data-slot="badge"]').allInnerTexts()
  if (!badges.includes('user') || !badges.includes('admin')) throw new Error(`card badges: ${JSON.stringify(badges)}`)
})

await step('card row menu opens (edit entry point)', async () => {
  const card = page.locator('div.sm\\:hidden > [data-slot="card"]', { hasText: 'multirole@example.com' })
  await card.getByRole('button', { name: 'Row actions' }).click()
  await page.getByRole('menuitem', { name: 'Delete' }).waitFor()
  await page.keyboard.press('Escape')
})

await step('filter modal usable from phone viewport', async () => {
  await page.getByRole('button', { name: /Filters/ }).click()
  await page.locator('#filter-role').click()
  await page.getByRole('option', { name: 'Admin', exact: true }).click()
  await page.getByRole('button', { name: /Apply filters/ }).click()
  await page.waitForTimeout(800)
  const cardCount = await page.locator('div.sm\\:hidden > [data-slot="card"]').count()
  if (cardCount < 2) throw new Error(`expected >=2 admin cards on mobile, got ${cardCount}`)
})

console.log(`\n== cleanup ==`)
await step('delete created test user', async () => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.getByRole('button', { name: /Filters/ }).click()
  await page.getByRole('button', { name: 'Reset' }).click()
  await page.getByRole('button', { name: /Apply filters/ }).click()
  await page.waitForTimeout(800)
  const row = page.locator('table tbody tr', { hasText: 'multirole@example.com' })
  await row.getByRole('button', { name: 'Row actions' }).click()
  await page.getByRole('menuitem', { name: 'Delete' }).click()
  await page.getByRole('dialog').getByText('Delete user').waitFor()
  await page.getByRole('button', { name: 'Delete', exact: true }).click()
  await page.waitForTimeout(1000)
  if (await page.locator('table tbody tr', { hasText: 'multirole@example.com' }).count() !== 0) throw new Error('user still listed')
})

await step('revert qycoji to user-only role', async () => {
  const row = page.locator('table tbody tr', { hasText: 'qycoji' })
  await row.getByRole('button', { name: 'Row actions' }).click()
  await page.getByRole('menuitem', { name: 'Edit' }).click()
  const adminToggle = page.getByRole('dialog').getByRole('button', { name: 'Admin', exact: true })
  await adminToggle.click() // pressed -> unpressed
  await page.getByRole('button', { name: 'Save changes' }).click()
  await page.waitForTimeout(1000)
  const badges = await page.locator('table tbody tr', { hasText: 'qycoji' }).locator('[data-slot="badge"]').allInnerTexts()
  if (badges.includes('admin')) throw new Error(`badges after revert: ${JSON.stringify(badges)}`)
})

console.log(`\n== dashboard badges ==`)
await step('dashboard recent-users renders role badges', async () => {
  await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle' })
  await page.getByText('Recent Users', { exact: false }).first().waitFor({ timeout: 15000 })
  await page.waitForTimeout(500)
  const badges = await page.locator('[data-slot="badge"]').allInnerTexts()
  if (!badges.some(b => b.trim() === 'admin')) throw new Error(`no admin badge found: ${JSON.stringify(badges.slice(0, 10))}`)
})

await browser.close()

const failed = results.filter(([s]) => s === 'FAIL')
console.log(`\n==== ${results.length - failed.length}/${results.length} passed ====`)
process.exit(failed.length > 0 ? 1 : 0)
