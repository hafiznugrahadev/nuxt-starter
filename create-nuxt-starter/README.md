# @hafiznugrahadev/create-nuxt-starter

npm installer that scaffolds the
[nuxt-starter](https://github.com/hafiznugrahadev/nuxt-starter) template
(Nuxt 4 + Better Auth with multi-role admin + Prisma + Redis + BullMQ).

## Usage

```bash
npm create @hafiznugrahadev/nuxt-starter@latest my-app
# or
bun create @hafiznugrahadev/nuxt-starter my-app
npx @hafiznugrahadev/create-nuxt-starter my-app
```

The installer downloads the template tarball from GitHub at run time, so it
always scaffolds the latest state of the branch/tag:

| Option            | Description                                            |
| ----------------- | ------------------------------------------------------ |
| `[dir]`           | Target directory (prompted when omitted)               |
| `--ref <git-ref>` | Branch or tag to scaffold from (default: `main`)       |
| `--git`/`--no-git`| Initialize (or skip) a git repository                  |
| `-h`, `--help`    | Show help                                              |

It also:

- skips installer-only entries (`create-nuxt-starter/`),
- generates `.env` from `.env.example` with a fresh `BETTER_AUTH_SECRET` and
  a random `ADMIN_PASSWORD` (printed at the end),
- prints the exact next steps (`bun install`, compose services, migrations,
  admin seed, `bun run dev`).

> The template repository must be **public** for anonymous installs. For a
> private clone, set `GITHUB_TOKEN` with repo read access before running.

## Publishing

From this directory (requires an npm account with write access to the
`@hafiznugrahadev` scope):

```bash
bun install          # or npm install
npm publish --access public
```

Bump `version` in `package.json` per release. The template itself is not
bundled — it is fetched from GitHub — so installer releases are only needed
when the CLI logic or its defaults change.
