# Project rules

## Imports

`nuxt.config.ts` sets `imports.scan: false` and `components.dirs: []`, so
project code is not auto-imported in `app/`. Every symbol in a file should be
traceable to an import line.

Auto-imported (do NOT add imports for these):

- Vue and Nuxt APIs: `ref`, `computed`, `watch`, `useFetch`, `useRoute`,
  `navigateTo`, `definePageMeta`, `defineNuxtRouteMiddleware`, `NuxtLink`,
  `NuxtPage`, ... Never write `import { ref } from 'vue'`.
- shadcn `ui/*` components (`<Button>`, `<Input>`, `<Combobox>`, ...). The
  `shadcn-nuxt` module registers only what each folder's `index.ts` exports,
  so a new ui component must be exported from `app/components/ui/<name>/index.ts`.

Import explicitly:

- Composables: `import { useAuthSession } from '~/composables/useAuthSession'`
  (one file per composable, named after it).
- Custom components (everything in `app/components/` outside `ui/`): import
  the `.vue` file, e.g.
  `import AdminPageHeader from '~/components/admin/AdminPageHeader.vue'`.
  A missing import does not fail the build; Vue only warns
  "Failed to resolve component" at runtime.
- App helpers: `~/lib/<file>` (e.g. `~/lib/auth-client`, `@/lib/utils` in ui).
- Shared code: `#shared/utils/<file>`.

Server (`server/`): Nitro still auto-imports `server/utils`, but new or edited
code imports explicitly from `~~/server/utils/<file>` (e.g.
`import { requireAdmin } from '~~/server/utils/guard'`). h3 helpers
(`defineEventHandler`, `getQuery`, `createError`, ...) stay auto-imported.

Unit tests (`tests/*.test.mjs`) run outside Nuxt: mock project modules with
`vi.mock('../app/composables/<file>', ...)`, and only `vi.stubGlobal` for
Nuxt/Vue auto-imports.

## UI components (consistency)

These rules keep forms and controls consistent across the app. Follow them in
every change, including generated/scaffolded code.

### Pick-lists: always `Combobox`

- Every single-choice picker (filters, role/duration selectors, rows-per-page,
  any list of options) uses the reusable searchable combobox:
  `app/components/ui/combobox/Combobox.vue` (`<Combobox>`).
- API: `v-model` (string value), `options: { label, value }[]`,
  `placeholder`, `searchPlaceholder`, `id` (for `<Label for>`), plus a
  `class` prop for the trigger button. Unknown attrs (`aria-*`) forward to the
  trigger button.
- Option `value`s must never be empty strings: reka-ui reserves `''` to clear
  the selection, and an empty-valued option throws on open and the popup
  never renders (use a sentinel like `'all'` and map it at the call site).
- Do NOT use `Select`/`SelectTrigger`/... — the `ui/select` folder was removed
  on purpose (2026-10-23). Do not re-add it via the shadcn-vue CLI; extend
  `Combobox` instead if a case is missing.
- The admin header has no global search box. Filtering belongs to the page
  that owns the data (e.g. the user table's own search input).

### Password fields: always `PasswordInput`

- Every password input uses `app/components/ui/password-input/PasswordInput.vue`
  (`<PasswordInput>`): it wraps `Input` and adds the show/hide toggle
  (44px touch target, `aria-pressed`, dynamic `aria-label`).
- Never write `<Input type="password">` by hand.
- API mirrors `Input` (`v-model`, attrs like `id`, `placeholder`,
  `autocomplete`, `aria-invalid` pass through to the input); `class` applies
  to the input element.

### Forms and a11y conventions

- Text-style form fields (text/email/password/search/…) use the reusable
  `app/components/ui/form-field/FormField.vue` (`<FormField>`): it renders
  label + control + validation message with all a11y wiring (`Label for`,
  `aria-invalid`, `aria-describedby`, `role="alert"` error) done once.
  API: `v-model`, `id`, `label`, `error?`, `hint?` (shown when no error),
  `type?` (`password` renders `PasswordInput` with its toggle), and any input
  attrs (`placeholder`, `autocomplete`, …) pass through to the control.
  Do NOT hand-roll `<Label>` + `<Input>` + error `<p>` blocks for these.
  Pickers (Combobox) keep the explicit `<Label for>` + `<Combobox id>` pair.
- Interactive elements keep a 44px minimum touch target. Sizes are unified
  in the base components, so never add per-page `min-h-11`/`h-11` overrides:
  Button default `h-11` (sm `h-9` for dense contexts like table headers,
  lg `h-12`), Input/PasswordInput `h-11`, Combobox trigger `h-11`,
  DropdownMenuItem `min-h-11`.
- Data tables use `<ServerDataTable>` (pagination, debounced search,
  loading skeleton, empty state); pages own the fetch state and must render
  an error state with a retry action.
