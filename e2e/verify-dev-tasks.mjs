// Headless E2E: super-admin task manager (reference CRUD) — create, edit,
// filter, search, mobile card mode, delete, and the role gate.
// Run: bun e2e/verify-dev-tasks.mjs
// Env: BASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD (defaults match the dev seed).
import { chromium } from 'playwright-core'

const BASE = process.env.BASE_URL || 'https://app.nuxt-starter.orb.local'
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin12345'
const PLAIN_ADMIN_EMAIL = 'plain-admin@example.com'
const PLAIN_ADMIN_PASSWORD = 'password123'

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
    try {
      // Desktop viewport + closing stuck overlays so one failure (e.g. a
      // phone-viewport step) does not cascade into every later step.
      await page.setViewportSize({ width: 1280, height: 900 })
      await page.keyboard.press('Escape')
      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)
    } catch { /* best-effort recovery */ }
  }
}

async function openHydrated(p, url, selector) {
  await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await p.locator(selector).first().waitFor({ timeout: 60000 })
  await p.waitForFunction(
    sel => Boolean(document.querySelector(sel)?.__vueParentComponent),
    selector,
    { timeout: 30000, polling: 200 }
  ).catch(() => { /* plain elements without a vue instance: continue */ })
}

async function submitLoginForm(p, email, password, attempts = 3) {
  for (let attempt = 0; attempt < attempts; attempt++) {
    await openHydrated(p, `${BASE}/login`, '#email')
    await p.locator('#email').fill(email)
    await p.locator('#password').fill(password)
    await p.getByRole('button', { name: 'Sign in' }).click()
    await p.waitForURL(u => !u.href.includes('/login') || u.href.includes('/login?'), { timeout: 20000 }).catch(() => {})
    if (!p.url().includes('/login')) {
      await p.waitForLoadState('load')
      return
    }
  }
  throw new Error(`sign-in did not navigate (at ${p.url()})`)
}

async function setCombobox(p, selector, optionName) {
  await p.locator(selector).click()
  await p.getByRole('option', { name: optionName, exact: true }).click()
}

const browser = await chromium.launch({ channel: 'chrome', headless: true })
await (await import('node:fs')).mkdirSync('.e2e-artifacts', { recursive: true })
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, ignoreHTTPSErrors: true })
const plainCtx = await browser.newContext({ viewport: { width: 1280, height: 900 }, ignoreHTTPSErrors: true })
page = await ctx.newPage()
page.on('pageerror', err => console.log(`  [pageerror] ${String(err).slice(0, 200)}`))

console.log(`\n== access control ==`)
await step('dev-tasks API is protected (anonymous 401)', async () => {
  const res = await page.request.get(`${BASE}/api/admin/dev-tasks`)
  if (res.status() !== 401) throw new Error(`status=${res.status()}`)
})

console.log(`\n== super admin setup ==`)
await step('login as (super) admin', async () => {
  await submitLoginForm(page, ADMIN_EMAIL, ADMIN_PASSWORD)
})

await step('sidebar shows the Developer > Task Manager entry', async () => {
  await openHydrated(page, `${BASE}/admin`, 'a[href="/admin/users"]')
  await page.getByRole('link', { name: 'Task Manager' }).waitFor({ timeout: 30000 })
})

console.log(`\n== CRUD ==`)
await step('task manager page loads with empty state', async () => {
  await page.getByRole('link', { name: 'Task Manager' }).click()
  await page.waitForURL(/\/admin\/dev-tasks/)
  await page.getByRole('heading', { name: 'Task Manager' }).waitFor({ timeout: 30000 })
  // The empty state renders in both the table cell and the (CSS-hidden)
  // mobile card container, so match the first occurrence.
  await page.getByText('No tasks yet').first().waitFor({ timeout: 30000 })
})

await step('create a task with status, priority and due date', async () => {
  await page.getByRole('button', { name: /Add task/ }).click()
  const dlg = page.getByRole('dialog')
  await dlg.getByLabel('Title').waitFor()
  await dlg.locator('#dev-task-title').fill('Set up the CI pipeline')
  await dlg.locator('#dev-task-description').fill('Wire the lint + typecheck + e2e workflow')
  await setCombobox(page, '#dev-task-status', 'In progress')
  await setCombobox(page, '#dev-task-priority', 'High')
  await dlg.locator('#dev-task-due').fill('2026-12-01')
  await dlg.getByRole('button', { name: 'Create task' }).click()
  await page.waitForTimeout(1000)
  const row = page.locator('table tbody tr', { hasText: 'Set up the CI pipeline' })
  if (await row.count() !== 1) throw new Error('created task row not found')
  const text = await row.first().innerText()
  for (const expected of ['In progress', 'High', 'Dec 1, 2026']) {
    if (!text.includes(expected)) throw new Error(`row missing "${expected}": ${text.slice(0, 120)}`)
  }
})

await step('create a second task with defaults', async () => {
  await page.getByRole('button', { name: /Add task/ }).click()
  const dlg = page.getByRole('dialog')
  await dlg.locator('#dev-task-title').fill('Write the launch notes')
  await dlg.getByRole('button', { name: 'Create task' }).click()
  await page.waitForTimeout(1000)
  const row = page.locator('table tbody tr', { hasText: 'Write the launch notes' })
  if (await row.count() !== 1) throw new Error('second task row not found')
})

await step('edit: mark the first task done', async () => {
  const row = page.locator('table tbody tr', { hasText: 'Set up the CI pipeline' })
  await row.getByRole('button', { name: 'Row actions' }).click()
  await page.getByRole('menuitem', { name: 'Edit' }).click()
  const dlg = page.getByRole('dialog')
  await dlg.waitFor()
  await setCombobox(page, '#dev-task-status', 'Done')
  await dlg.getByRole('button', { name: 'Save changes' }).click()
  await page.waitForTimeout(1000)
  const text = await page.locator('table tbody tr', { hasText: 'Set up the CI pipeline' }).first().innerText()
  if (!text.includes('Done')) throw new Error(`status not updated: ${text.slice(0, 120)}`)
})

await step('validation blocks an empty title', async () => {
  await page.getByRole('button', { name: /Add task/ }).click()
  const dlg = page.getByRole('dialog')
  await dlg.locator('#dev-task-title').fill('')
  await dlg.getByRole('button', { name: 'Create task' }).click()
  await dlg.getByText('Title is required').waitFor()
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
})

console.log(`\n== filters ==`)
await step('status filter = Done keeps only finished tasks', async () => {
  await page.getByRole('button', { name: /Filters/ }).click()
  await setCombobox(page, '#filter-status', 'Done')
  await page.getByRole('button', { name: /Apply filters/ }).click()
  await page.waitForTimeout(800)
  const rows = await page.locator('table tbody tr').allInnerTexts()
  if (rows.length !== 1 || !rows[0].includes('Set up the CI pipeline')) {
    throw new Error(`rows: ${JSON.stringify(rows.map(r => r.slice(0, 40)))}`)
  }
})

await step('priority filter = High on top of the status filter', async () => {
  await page.getByRole('button', { name: /Filters/ }).click()
  await setCombobox(page, '#filter-priority', 'High')
  await page.getByRole('button', { name: /Apply filters/ }).click()
  await page.waitForTimeout(800)
  const rows = await page.locator('table tbody tr').allInnerTexts()
  if (rows.length !== 1) throw new Error(`expected 1 row, got ${rows.length}`)
})

await step('reset returns every task', async () => {
  await page.getByRole('button', { name: /Filters/ }).click()
  await page.getByRole('button', { name: 'Reset' }).click()
  await page.getByRole('button', { name: /Apply filters/ }).click()
  await page.waitForTimeout(800)
  if (await page.locator('table tbody tr').count() !== 2) throw new Error('expected 2 rows after reset')
})

await step('search narrows by title', async () => {
  await page.getByPlaceholder('Search tasks...').fill('launch notes')
  await page.waitForTimeout(900)
  const rows = await page.locator('table tbody tr').allInnerTexts()
  if (rows.length !== 1 || !rows[0].includes('Write the launch notes')) throw new Error(`rows: ${JSON.stringify(rows)}`)
  await page.getByPlaceholder('Search tasks...').fill('')
  await page.waitForTimeout(900)
})

console.log(`\n== mobile card mode ==`)
await step('phone viewport shows cards instead of the table', async () => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.waitForTimeout(400)
  if (await page.locator('table').first().isVisible()) throw new Error('table should be hidden on phones')
  // waitFor (not an instant count): the search-clear refetch from the
  // previous step can still be in flight.
  const card = page.locator('div.sm\\:hidden > [data-slot="card"]', { hasText: 'Set up the CI pipeline' })
  await card.waitFor({ timeout: 10000 })
  const badges = await card.locator('[data-slot="badge"]').allInnerTexts()
  if (!badges.includes('Done') || !badges.includes('High')) throw new Error(`card badges: ${JSON.stringify(badges)}`)
  await page.setViewportSize({ width: 1280, height: 900 })
})

console.log(`\n== role gate (plain admin) ==`)
await step('seed a plain admin without super-admin', async () => {
  await openHydrated(page, `${BASE}/admin/users`, 'table tbody tr')
  await page.getByRole('button', { name: /Add user/ }).click()
  const dlg = page.getByRole('dialog')
  await dlg.locator('#user-name').fill('Plain Admin')
  await dlg.locator('#user-email').fill(PLAIN_ADMIN_EMAIL)
  await dlg.locator('#user-password').fill(PLAIN_ADMIN_PASSWORD)
  // role stays at the default ("user") — flip it to Admin only.
  await dlg.getByRole('button', { name: 'Admin', exact: true }).click()
  await dlg.getByRole('button', { name: 'Create user' }).click()
  await page.waitForTimeout(1200)
})

await step('plain admin: no Task Manager entry, page redirects, API 403', async () => {
  const plain = await plainCtx.newPage()
  await submitLoginForm(plain, PLAIN_ADMIN_EMAIL, PLAIN_ADMIN_PASSWORD)
  await openHydrated(plain, `${BASE}/admin`, 'a[href="/admin/users"]')
  if (await plain.getByRole('link', { name: 'Task Manager' }).count() !== 0) {
    throw new Error('Task Manager entry visible for plain admin')
  }
  await plain.goto(`${BASE}/admin/dev-tasks`, { waitUntil: 'domcontentloaded' })
  await plain.waitForURL(url => !url.href.includes('/admin/dev-tasks'), { timeout: 15000 })
  const res = await plain.request.get(`${BASE}/api/admin/dev-tasks`)
  if (res.status() !== 403) throw new Error(`API status=${res.status()}`)
  await plain.close()
})

console.log(`\n== cleanup ==`)
await step('delete both tasks', async () => {
  // The plain-admin seeding step left the main page on /admin/users.
  await openHydrated(page, `${BASE}/admin/dev-tasks`, 'table')
  for (const title of ['Set up the CI pipeline', 'Write the launch notes']) {
    const row = page.locator('table tbody tr', { hasText: title })
    await row.getByRole('button', { name: 'Row actions' }).click()
    await page.getByRole('menuitem', { name: 'Delete' }).click()
    await page.getByRole('dialog').getByText('Delete task').waitFor()
    await page.getByRole('button', { name: 'Delete', exact: true }).click()
    await page.waitForTimeout(1000)
  }
  await page.getByText('No tasks yet').first().waitFor({ timeout: 15000 })
})

await step('delete the plain admin test user', async () => {
  await openHydrated(page, `${BASE}/admin/users`, 'table tbody tr')
  const row = page.locator('table tbody tr', { hasText: PLAIN_ADMIN_EMAIL })
  await row.getByRole('button', { name: 'Row actions' }).click()
  await page.getByRole('menuitem', { name: 'Delete' }).click()
  await page.getByRole('dialog').getByText('Delete user').waitFor()
  await page.getByRole('button', { name: 'Delete', exact: true }).click()
  await page.waitForTimeout(1000)
  if (await page.locator('table tbody tr', { hasText: PLAIN_ADMIN_EMAIL }).count() !== 0) {
    throw new Error('plain admin still listed')
  }
})

await browser.close()

const failed = results.filter(([s]) => s === 'FAIL')
console.log(`\n==== ${results.length - failed.length}/${results.length} passed ====`)
process.exit(failed.length > 0 ? 1 : 0)
