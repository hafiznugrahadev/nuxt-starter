import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { normalizeProjectName, personalizeProject } from '../src/index.mjs'

async function makeProjectFixture(root, directory) {
  const target = path.join(root, directory)
  await mkdir(path.join(target, '.github', 'workflows'), { recursive: true })
  await mkdir(path.join(target, 'e2e'), { recursive: true })
  await writeFile(path.join(target, 'package.json'), '{"name":"nuxt-starter"}\n')
  await writeFile(path.join(target, 'bun.lock'), '{"workspaces":{"":{"name":"nuxt-starter"}}}\n')
  await writeFile(path.join(target, 'docker-compose.yml'), [
    'services:',
    '  app:',
    '    container_name: nuxt_starter_app',
    '    environment:',
    '      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/nuxt_starter?schema=public',
    '      BETTER_AUTH_URL: ${BETTER_AUTH_URL:-https://app.nuxt-starter.orb.local}',
    '    volumes:',
    '      - app_node_modules:/app/node_modules',
    '  postgres:',
    '    container_name: nuxt_starter_db',
    '    environment:',
    '      POSTGRES_DB: nuxt_starter',
    'volumes:',
    '  app_node_modules:',
    '  postgres_data:',
    ''
  ].join('\n'))
  await writeFile(path.join(target, 'docker-compose.prod.yml'), [
    'services:',
    '  postgres:',
    '    container_name: nuxt_starter_db_prod',
    '    environment:',
    '      POSTGRES_DB: nuxt_starter',
    'volumes:',
    '  postgres_data:',
    ''
  ].join('\n'))
  await writeFile(path.join(target, '.env.example'), 'DATABASE_URL="postgresql://localhost:5432/nuxt_starter?schema=public"\n')
  await writeFile(path.join(target, '.github/workflows/ci.yml'), 'DATABASE_URL=postgresql://localhost:5432/nuxt_starter\n')
  await writeFile(path.join(target, 'e2e/verify-dev-tasks.mjs'), "const BASE = 'https://app.nuxt-starter.orb.local'\n")
  return target
}

test('normalizes names into Docker Compose-safe project names', () => {
  assert.equal(normalizeProjectName('My Cool_App'), 'my-cool-app')
  assert.throws(() => normalizeProjectName('---'))
})

test('personalizes package, database, Compose project and OrbStack host per scaffold', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'nuxt-starter-test-'))
  t.after(() => rm(root, { recursive: true, force: true }))

  const first = await makeProjectFixture(root, 'my-app')
  const second = await makeProjectFixture(root, 'other-app')
  await Promise.all([
    personalizeProject(first, normalizeProjectName('my-app')),
    personalizeProject(second, normalizeProjectName('other-app'))
  ])

  for (const [target, project, database] of [[first, 'my-app', 'my_app'], [second, 'other-app', 'other_app']]) {
    const packageJson = JSON.parse(await readFile(path.join(target, 'package.json'), 'utf8'))
    const lock = await readFile(path.join(target, 'bun.lock'), 'utf8')
    const compose = await readFile(path.join(target, 'docker-compose.yml'), 'utf8')
    const production = await readFile(path.join(target, 'docker-compose.prod.yml'), 'utf8')
    const env = await readFile(path.join(target, '.env.example'), 'utf8')

    assert.equal(packageJson.name, project)
    assert.match(lock, new RegExp(`"name":"${project}"`))
    assert.match(compose, new RegExp(`^name: ${project}$`, 'm'))
    assert.match(compose, new RegExp(`postgres:5432/${database}\\?schema=public`))
    assert.match(compose, new RegExp(`POSTGRES_DB: ${database}`))
    assert.match(compose, new RegExp(`app\\.${project}\\.orb\\.local`))
    assert.match(compose, /- app_node_modules:\/app\/node_modules/)
    assert.doesNotMatch(compose, /container_name:|nuxt[-_]starter/)
    assert.match(production, new RegExp(`^name: ${project}-prod$`, 'm'))
    assert.match(production, new RegExp(`POSTGRES_DB: ${database}`))
    assert.doesNotMatch(production, /container_name:|nuxt[-_]starter/)
    assert.match(env, new RegExp(`5432/${database}\\?schema=public`))
  }

  const firstCompose = await readFile(path.join(first, 'docker-compose.yml'), 'utf8')
  const secondCompose = await readFile(path.join(second, 'docker-compose.yml'), 'utf8')
  assert.notEqual(firstCompose.match(/^name: (.+)$/m)?.[1], secondCompose.match(/^name: (.+)$/m)?.[1])
})
