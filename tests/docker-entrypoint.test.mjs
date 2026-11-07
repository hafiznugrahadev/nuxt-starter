import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, expect, test } from 'vitest'

const entrypoint = fileURLToPath(new URL('../docker-entrypoint.dev.sh', import.meta.url))
const migration = 'bun node_modules/prisma/build/index.js migrate deploy'
let directory
let log

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), 'nuxt-entrypoint-'))
  log = join(directory, 'commands.log')
  writeFileSync(log, '')
  const stub = `#!/bin/sh
printf '%s %s\\n' "\${0##*/}" "$*" >> "$COMMAND_LOG"
if [ "$1" = "node_modules/prisma/build/index.js" ]; then
  exit "\${MIGRATION_EXIT_CODE:-0}"
fi
`
  for (const command of ['bun', 'bunx', 'app']) {
    writeFileSync(join(directory, command), stub, { mode: 0o755 })
  }
})

afterEach(() => {
  rmSync(directory, { recursive: true, force: true })
})

function start(environment = {}) {
  return spawnSync('/bin/sh', [entrypoint, 'app', '--host'], {
    encoding: 'utf8',
    env: {
      PATH: `${directory}:${process.env.PATH}`,
      COMMAND_LOG: log,
      DATABASE_URL: 'postgresql://postgres:postgres@postgres:5432/nuxt_starter',
      ...environment
    },
    timeout: 5000
  })
}

function commands() {
  return readFileSync(log, 'utf8').trim().split('\n')
}

test('applies pending migrations before starting the app on every boot without seeding', () => {
  for (let boot = 0; boot < 2; boot++) {
    expect(start().status).toBe(0)
  }
  expect(commands()).toEqual(Array(2).fill([
    'bun install --frozen-lockfile',
    'bunx prisma generate',
    migration,
    'app --host'
  ]).flat())
})

test('does not start the app when applying migrations fails', () => {
  expect(start({ MIGRATION_EXIT_CODE: '23' }).status).toBe(23)
  expect(commands()).toEqual([
    'bun install --frozen-lockfile',
    'bunx prisma generate',
    migration
  ])
})

test('lets the worker explicitly skip migrations and Prisma generation', () => {
  expect(start({ SKIP_MIGRATIONS: 'true', SKIP_PRISMA_GENERATE: 'true' }).status).toBe(0)
  expect(commands()).toEqual(['bun install --frozen-lockfile', 'app --host'])
})

test('still migrates when only Prisma generation is skipped', () => {
  expect(start({ SKIP_PRISMA_GENERATE: 'true' }).status).toBe(0)
  expect(commands()).toEqual(['bun install --frozen-lockfile', migration, 'app --host'])
})

test('skips migrations when no database is configured', () => {
  expect(start({ DATABASE_URL: '' }).status).toBe(0)
  expect(commands()).toEqual(['bun install --frozen-lockfile', 'bunx prisma generate', 'app --host'])
})
