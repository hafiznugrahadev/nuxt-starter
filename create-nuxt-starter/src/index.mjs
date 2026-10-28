#!/usr/bin/env node
// Installer for the nuxt-starter template (hafiznugrahadev/nuxt-starter).
//
//   npm create @manusiakemos/nuxt-starter@latest my-app
//   bun  create @manusiakemos/nuxt-starter my-app
//   npx  @manusiakemos/create-nuxt-starter my-app --ref main
//
// The template is fetched as a tarball of the GitHub repo at install time,
// so every run scaffolds the latest state of the chosen ref. Installer-only
// entries (this folder) are skipped, and a ready-to-run .env is generated
// from .env.example with fresh secrets.
import { spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { existsSync } from 'node:fs'
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import * as p from '@clack/prompts'
import * as tar from 'tar'

const REPO = 'hafiznugrahadev/nuxt-starter'
const DEFAULT_REF = 'main'
// Repository-specific entries that do not belong to a freshly scaffolded app.
const SKIP_ENTRIES = new Set(['create-nuxt-starter'])
const USAGE = `
  npm create @manusiakemos/nuxt-starter@latest [dir] [options]

  Options:
    --ref <git-ref>   Branch or tag to scaffold from (default: main)
    --git / --no-git  Initialize (or skip) a git repository in the new project
    -h, --help        Show this help`

function parseArgs(argv) {
  const args = { dir: '', ref: DEFAULT_REF, git: null, help: false }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--ref') args.ref = argv[++i]
    else if (arg === '--git') args.git = true
    else if (arg === '--no-git') args.git = false
    else if (arg === '-h' || arg === '--help') args.help = true
    else if (!arg.startsWith('-')) args.dir = arg
    else throw new Error(`Unknown option: ${arg}`)
  }
  return args
}

function generateEnv(example) {
  // Quote-safe random values; everything else keeps the example defaults,
  // which already match the bundled docker-compose services.
  const authSecret = randomBytes(32).toString('base64')
  const adminPassword = randomBytes(9).toString('base64url')
  return {
    adminPassword,
    content: example
      .replace(/^BETTER_AUTH_SECRET=.*$/m, `BETTER_AUTH_SECRET="${authSecret}"`)
      .replace(/^ADMIN_PASSWORD=.*$/m, `ADMIN_PASSWORD="${adminPassword}"`)
  }
}

function normalizeProjectName(value) {
  const name = value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, '')

  if (!name) throw new Error('Project directory must include letters or numbers.')
  return name
}

async function personalizeProject(targetDir, projectName) {
  const databaseName = projectName.replace(/-/g, '_')
  const packageJsonPath = path.join(targetDir, 'package.json')
  const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'))
  packageJson.name = projectName
  await writeFile(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`)

  const lockPath = path.join(targetDir, 'bun.lock')
  const lock = await readFile(lockPath, 'utf8')
  await writeFile(lockPath, lock.replace(/("name"\s*:\s*)"nuxt-starter"/, `$1${JSON.stringify(projectName)}`))

  for (const file of ['docker-compose.yml', 'docker-compose.prod.yml']) {
    const filePath = path.join(targetDir, file)
    let compose = await readFile(filePath, 'utf8')
    compose = compose
      .replace(/^    container_name: .*\n/gm, '')
      .replaceAll('nuxt_starter', databaseName)
      .replaceAll('nuxt-starter.orb.local', `${projectName}.orb.local`)
    compose = `name: ${file === 'docker-compose.prod.yml' ? `${projectName}-prod` : projectName}\n${compose}`
    await writeFile(filePath, compose)
  }

  for (const file of ['.env.example', '.github/workflows/ci.yml', 'e2e/verify-dev-tasks.mjs', 'e2e/verify-profile-settings.mjs', 'e2e/verify-users-page.mjs']) {
    const filePath = path.join(targetDir, file)
    let contents
    try {
      contents = await readFile(filePath, 'utf8')
    } catch (error) {
      if (error.code === 'ENOENT') continue
      throw error
    }
    contents = contents
      .replaceAll('nuxt_starter', databaseName)
      .replaceAll('nuxt-starter.orb.local', `${projectName}.orb.local`)
    await writeFile(filePath, contents)
  }
}

async function downloadTemplate(ref) {
  // The REST tarball endpoint redirects to a signed codeload URL and works
  // anonymously for public repos. Set GITHUB_TOKEN to scaffold from a
  // private clone of the template.
  const url = `https://api.github.com/repos/${REPO}/tarball/${ref}`
  const response = await fetch(url, {
    headers: {
      accept: 'application/vnd.github+json',
      ...(process.env.GITHUB_TOKEN ? { authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {})
    }
  })
  if (!response.ok) {
    throw new Error(`Could not download ${REPO}@${ref} (HTTP ${response.status}). Check the ref and your connection.`)
  }
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'nuxt-starter-'))
  const archive = path.join(tempDir, 'template.tar.gz')
  await writeFile(archive, Buffer.from(await response.arrayBuffer()))
  await tar.x({ file: archive, cwd: tempDir })
  // codeload archives wrap everything in a single "<repo>-<ref>" directory.
  const entries = await readdir(tempDir, { withFileTypes: true })
  const rootDir = entries.find(entry => entry.isDirectory() && entry.name !== '.')
  if (!rootDir) throw new Error('Downloaded archive did not contain a template directory.')
  return { tempDir, templateDir: path.join(tempDir, rootDir.name) }
}

async function copyTemplate(templateDir, targetDir) {
  await mkdir(targetDir, { recursive: true })
  const entries = await readdir(templateDir, { withFileTypes: true })
  for (const entry of entries) {
    if (SKIP_ENTRIES.has(entry.name)) continue
    // force: the target may hold confirmed-to-be-replaced leftovers.
    await cp(path.join(templateDir, entry.name), path.join(targetDir, entry.name), {
      recursive: true,
      force: true
    })
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  p.intro('nuxt-starter installer')
  if (args.help) {
    p.log.message(USAGE)
    p.outro('Done')
    return
  }

  const dir = args.dir || await p.text({
    message: 'Where should the project be created?',
    placeholder: 'my-app',
    validate: value => (!value || !value.trim()) && 'Please enter a directory name.'
  })
  if (p.isCancel(dir)) return p.cancel('Cancelled.')

  const dirRaw = String(dir).trim()
  const targetDir = path.resolve(process.cwd(), dirRaw)
  const projectName = normalizeProjectName(path.basename(targetDir))

  if (existsSync(targetDir) && (await readdir(targetDir)).length > 0) {
    const overwrite = await p.confirm({
      message: `"${projectName}" is not empty. Remove its contents and continue?`,
      initialValue: false
    })
    if (p.isCancel(overwrite) || !overwrite) return p.cancel('Cancelled.')
    await rm(targetDir, { recursive: true, force: true })
  }

  const spinner = p.spinner()
  let adminPassword = ''
  try {
    spinner.start(`Downloading ${REPO}@${args.ref}`)
    const { tempDir, templateDir } = await downloadTemplate(args.ref)
    spinner.message('Copying template files')
    await copyTemplate(templateDir, targetDir)
    await rm(tempDir, { recursive: true, force: true })

    spinner.message('Personalizing project names')
    await personalizeProject(targetDir, projectName)

    spinner.message('Generating .env')
    const env = generateEnv(await readFile(path.join(targetDir, '.env.example'), 'utf8'))
    adminPassword = env.adminPassword
    await writeFile(path.join(targetDir, '.env'), env.content)
    spinner.stop('Template ready')
  } catch (error) {
    spinner.stop('Download failed', 1)
    p.cancel(String(error.message || error))
    process.exit(1)
  }

  const initGit = args.git ?? await p.confirm({
    message: 'Initialize a git repository?',
    initialValue: true
  })
  if (p.isCancel(initGit)) return p.cancel('Cancelled.')
  if (initGit) {
    spawnSync('git', ['init'], { cwd: targetDir, stdio: 'ignore' })
  }

  p.log.success(`Project created in ${targetDir}`)
  p.log.info(`Admin credentials for the first sign-in (seeded by "bun run seed:admin"):
  email:    admin@example.com
  password: ${adminPassword}`)
  p.log.message(`Next steps:

  cd ${dirRaw}
  bun install
  docker compose up -d postgres redis redis-queue mailpit
  bun run db:migrate
  bun run seed:admin
  bun run dev

Then sign in at http://localhost:3000 (admin area under /admin).
.env was generated with a fresh auth secret — review it before deploying.`)
  p.outro('Happy building!')
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    p.cancel(String(error?.message || error))
    process.exit(1)
  })
}

export { normalizeProjectName, personalizeProject }
