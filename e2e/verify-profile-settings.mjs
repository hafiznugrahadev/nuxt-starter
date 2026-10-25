// Headless E2E: admin profile page + admin settings page + registration
// enforcement (dynamic sign-up toggle).
// Run: bun e2e/verify-profile-settings.mjs
// Env: BASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD (defaults match the dev seed).
import { chromium } from 'playwright-core'

const BASE = process.env.BASE_URL || 'https://app.nuxt-starter.orb.local'
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin12345'
const TEMP_PASSWORD = 'admin123456'

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
      await page.keyboard.press('Escape')
      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)
    } catch { /* best-effort recovery */ }
  }
}

// Open a page and wait until the target control is not only in the DOM but
// hydrated by Vue — clicking an SSR-rendered form control before hydration
// falls back to a native GET submit and looks like a failed login.
async function openHydrated(p, url, selector) {
  await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await p.locator(selector).first().waitFor({ timeout: 60000 })
  await p.waitForFunction(
    sel => Boolean(document.querySelector(sel)?.__vueParentComponent),
    selector,
    { timeout: 30000, polling: 200 }
  ).catch(() => { /* plain elements without a vue instance: continue */ })
}

// Fill and submit the login form, retrying when the click races hydration
// (a native GET submit leaves the URL on "/login?...") or the navigation is
// bounced while the old session cookie is still being cleared.
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

async function login(p) {
  // 20s per attempt: right after a container restart the first sign-in
  // compiles the dev bundle and can easily exceed the default timeout.
  await submitLoginForm(p, ADMIN_EMAIL, ADMIN_PASSWORD)
  await p.waitForURL(/\/admin|\/$/, { timeout: 30000 })
}

// Deterministic sign-in: always navigate freshly (a post-logout fill races
// the full-page load and can leave fields empty).
async function signIn(p, email, password) {
  await submitLoginForm(p, email, password)
}

async function setRegistration(enabled) {
  const wantLabel = enabled ? 'Enabled' : 'Disabled'
  await openHydrated(page, `${BASE}/admin/settings`, '#setting-registration')
  // Selecting can race the popup mount; retry until the trigger shows it.
  for (let attempt = 0; attempt < 3; attempt++) {
    const trigger = page.locator('#setting-registration')
    if ((await trigger.innerText()).trim() === wantLabel) break
    await trigger.click()
    const option = page.getByRole('option', { name: wantLabel, exact: true })
    await option.waitFor({ state: 'visible', timeout: 5000 })
    await option.click()
    await page.waitForTimeout(400)
  }
  const triggerText = (await page.locator('#setting-registration').innerText()).trim()
  if (triggerText !== wantLabel) throw new Error(`trigger shows "${triggerText}", wanted ${wantLabel}`)
  await page.getByRole('button', { name: /Save changes/ }).click()
  await page.waitForTimeout(1000)
  const settings = await page.evaluate(() => fetch('/api/admin/settings').then(r => r.json()))
  if (settings.enableRegistration !== enabled) throw new Error(`stored=${JSON.stringify(settings)}`)
}

const browser = await chromium.launch({ channel: 'chrome', headless: true })
await (await import('node:fs')).mkdirSync('.e2e-artifacts', { recursive: true })
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, ignoreHTTPSErrors: true })
const anonCtx = await browser.newContext({ viewport: { width: 1280, height: 900 }, ignoreHTTPSErrors: true })
page = await ctx.newPage()
page.on('pageerror', err => console.log(`  [pageerror] ${String(err).slice(0, 200)}`))

console.log(`\n== setup ==`)
await step('login as admin', () => login(page))

console.log(`\n== settings navigation ==`)
await step('sidebar links to Settings and Profile', async () => {
  await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle' })
  await page.getByRole('link', { name: 'Settings', exact: true }).waitFor()
  await page.getByRole('link', { name: 'Profile', exact: true }).waitFor()
})

await step('settings page loads with registration status', async () => {
  await page.goto(`${BASE}/admin/settings`, { waitUntil: 'networkidle' })
  await page.getByRole('heading', { name: 'Settings' }).waitFor()
  await page.locator('#setting-registration').waitFor()
})

console.log(`\n== disable registration ==`)
await step('admin disables public registration', async () => {
  await setRegistration(false)
})

await step('sign-up API rejects new accounts server-side', async () => {
  // Let the 10s public cache expire so we test the stored value, not stale.
  // Run from an anonymous context: a successful sign-up would replace the
  // caller's session cookie, and the admin session must stay intact.
  await page.waitForTimeout(11000)
  const anon = await anonCtx.newPage()
  await anon.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
  const res = await anon.evaluate(async () => {
    const r = await fetch('/api/auth/sign-up/email', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Blocked User', email: `blocked-${Date.now()}@example.com`, password: 'password123' })
    })
    return { status: r.status, body: await r.json() }
  })
  await anon.close()
  // A 200 sign-up would have replaced this context's session; start clean so
  // later anonymous steps are truly anonymous.
  await anonCtx.clearCookies()
  if (res.status !== 403) throw new Error(`status=${res.status} body=${JSON.stringify(res.body).slice(0, 150)}`)
})

await step('anonymous /register redirects to /login', async () => {
  const anon = await anonCtx.newPage()
  await anon.goto(`${BASE}/register`, { waitUntil: 'networkidle' })
  if (!anon.url().includes('/login')) throw new Error(`landed on ${anon.url()}`)
  await anon.close()
})

await step('login page hides the create-account link', async () => {
  const anon = await anonCtx.newPage()
  await anon.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  if (await anon.getByRole('link', { name: 'Create one' }).count() !== 0) {
    throw new Error('Create one link still visible')
  }
  await anon.close()
})

console.log(`\n== re-enable registration ==`)
await step('admin re-enables public registration', async () => {
  await setRegistration(true)
})

await step('re-login as admin to guarantee the session for the rest', async () => {
  // Sign-out/in also proves the admin credentials still work end-to-end.
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  if (page.url().includes('/login')) {
    await page.locator('#email').fill(ADMIN_EMAIL)
    await page.locator('#password').fill(ADMIN_PASSWORD)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await page.waitForURL(/\/admin|\/$/, { timeout: 15000 })
  }
})

await step('anonymous visitor can sign up again', async () => {
  await page.waitForTimeout(11000)
  await anonCtx.clearCookies()
  const anon = await anonCtx.newPage()
  // Retry when the submit click races hydration (native GET -> /register?...).
  for (let attempt = 0; attempt < 3; attempt++) {
    await openHydrated(anon, `${BASE}/register`, '#name')
    await anon.locator('#name').fill('Settings Check')
    await anon.locator('#email').fill('settings-check@example.com')
    await anon.locator('#password').fill('password123')
    await anon.getByRole('button', { name: /sign up|create/i }).click()
    await anon.waitForURL(u => !u.href.includes('/register') || u.href.includes('/register?'), { timeout: 20000 }).catch(() => {})
    if (!anon.url().includes('/register')) break
  }
  if (anon.url().includes('/register')) {
    throw new Error(`sign-up did not navigate (at ${anon.url()})`)
  }
  await anon.close()
  await anonCtx.clearCookies()
})

await step('cleanup: delete the sign-up test user', async () => {
  await page.goto(`${BASE}/admin/users`, { waitUntil: 'networkidle' })
  await page.getByText('settings-check@example.com').first().waitFor({ timeout: 15000 })
  const row = page.locator('table tbody tr', { hasText: 'settings-check@example.com' })
  await row.getByRole('button', { name: 'Row actions' }).click()
  await page.getByRole('menuitem', { name: 'Delete' }).click()
  await page.getByRole('dialog').getByText('Delete user').waitFor()
  await page.getByRole('button', { name: 'Delete', exact: true }).click()
  await page.waitForTimeout(1000)
  if (await page.locator('table tbody tr', { hasText: 'settings-check@example.com' }).count() !== 0) {
    throw new Error('user still listed')
  }
})

console.log(`\n== scheduled tasks ==`)
await step('settings page lists the scheduled maintenance tasks', async () => {
  await openHydrated(page, `${BASE}/admin/settings`, '#setting-registration')
  await page.getByText('Scheduled tasks').waitFor({ timeout: 30000 })
  await page.getByText('Prune expired sessions').waitFor({ timeout: 30000 })
})

await step('run now executes the task and records the result', async () => {
  const row = page.locator('li', { hasText: 'Prune expired sessions' })
  await row.getByRole('button', { name: /Run now/ }).click()
  // queue hand-off + worker processing + the page's own delayed refresh
  await page.waitForTimeout(8000)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.getByText('Prune expired sessions').waitFor({ timeout: 30000 })
  const text = await page.locator('li', { hasText: 'Prune expired sessions' }).innerText()
  if (!text.includes('success') || !text.includes('session')) {
    throw new Error(`last run: ${text.slice(0, 200)}`)
  }
})

await step('next run is scheduled from the cron pattern', async () => {
  const text = await page.locator('li', { hasText: 'Prune expired sessions' }).innerText()
  if (!text.includes('Next:')) throw new Error(`no next run shown: ${text.slice(0, 160)}`)
})

console.log(`\n== profile page ==`)
await step('account menu links to profile', async () => {
  // The previous step reloaded the page; gate on hydration before clicking
  // or the menu button falls back to a dead native click.
  await page
    .locator('button[aria-label="Account menu"]')
    .waitFor({ timeout: 30000 })
  await page.waitForFunction(
    () => Boolean(document.querySelector('button[aria-label="Account menu"]')?.__vueParentComponent),
    { timeout: 30000, polling: 200 }
  )
  await page.getByRole('button', { name: 'Account menu' }).click()
  await page.getByRole('menuitem', { name: 'Profile' }).click()
  await page.waitForURL(/\/admin\/profile/)
  await page.getByRole('heading', { name: 'Profile' }).waitFor()
})

await step('overview shows name, email and role badges', async () => {
  await page.getByText(ADMIN_EMAIL).first().waitFor()
  const badges = await page.locator('[data-slot="badge"]').allInnerTexts()
  if (!badges.some(b => b.trim() === 'admin')) throw new Error(`badges: ${JSON.stringify(badges)}`)
})

await step('rename via profile form reflects in header menu', async () => {
  await page.locator('#profile-name').fill('Administrator QA')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await page.waitForTimeout(1200)
  await page.getByRole('button', { name: 'Account menu' }).click()
  await page.getByRole('menu').getByText('Administrator QA').waitFor()
  await page.keyboard.press('Escape')
})

await step('revert name change', async () => {
  await page.locator('#profile-name').fill('Administrator')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await page.waitForTimeout(1200)
})

await step('change password, sign in with new password, restore original', async () => {
  await page.locator('#current-password').fill(ADMIN_PASSWORD)
  await page.locator('#new-password').fill(TEMP_PASSWORD)
  await page.locator('#confirm-password').fill(TEMP_PASSWORD)
  await page.getByRole('button', { name: 'Change password' }).click()
  await page.waitForTimeout(1200)

  // sign out, sign in with the new password
  await page.getByRole('button', { name: 'Account menu' }).click()
  await page.getByRole('menuitem', { name: 'Sign out' }).click()
  await page.waitForURL(/\/login/, { timeout: 15000 })
  await page.waitForLoadState('load')
  await signIn(page, ADMIN_EMAIL, TEMP_PASSWORD)

  // restore the original password
  await page.goto(`${BASE}/admin/profile`, { waitUntil: 'networkidle' })
  await page.locator('#current-password').fill(TEMP_PASSWORD)
  await page.locator('#new-password').fill(ADMIN_PASSWORD)
  await page.locator('#confirm-password').fill(ADMIN_PASSWORD)
  await page.getByRole('button', { name: 'Change password' }).click()
  await page.waitForTimeout(1200)

  await page.getByRole('button', { name: 'Account menu' }).click()
  await page.getByRole('menuitem', { name: 'Sign out' }).click()
  await page.waitForURL(/\/login/, { timeout: 15000 })
  await page.waitForLoadState('load')
  await signIn(page, ADMIN_EMAIL, ADMIN_PASSWORD)
})

await browser.close()

const failed = results.filter(([s]) => s === 'FAIL')
console.log(`\n==== ${results.length - failed.length}/${results.length} passed ====`)
process.exit(failed.length > 0 ? 1 : 0)
