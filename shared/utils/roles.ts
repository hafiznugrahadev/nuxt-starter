// Role registry shared by the app and the server (import from
// `#shared/utils/roles`). Better Auth stores multiple roles per user as one
// comma-separated string in the `user.role` column ("user,admin"); its admin
// plugin checks membership with `role.split(",")`, so multi-role needs no
// schema change — just keep values in this registry and never make one role
// name a substring of another ("admin" vs "superadmin" would break the
// `contains`-style matching used for filtering).
export const USER_ROLES = ['user', 'admin'] as const

export type UserRole = (typeof USER_ROLES)[number]

export const DEFAULT_ROLE: UserRole = 'user'

/** Split a stored comma-separated role string into a deduped role list. */
export function parseRoles(role: string | null | undefined): string[] {
  const roles = (role ?? '')
    .split(',')
    .map(part => part.trim().toLowerCase())
    .filter(Boolean)
  return [...new Set(roles)]
}

/** Join roles back into the stored format, ordered by the registry. */
export function formatRoles(roles: string[]): string {
  const unique = [...new Set(roles.map(role => role.trim().toLowerCase()).filter(Boolean))]
  const known = USER_ROLES.filter(role => unique.includes(role))
  const extra = unique.filter(role => !(USER_ROLES as readonly string[]).includes(role))
  return [...known, ...extra].join(',')
}

/** True when a stored role string grants `expected` (comma-separated aware). */
export function hasRole(role: string | null | undefined, expected: string): boolean {
  return parseRoles(role).includes(expected)
}

/** Display label for a role value ("admin" -> "Admin"). */
export function roleLabel(role: string): string {
  return role.charAt(0).toUpperCase() + role.slice(1)
}
