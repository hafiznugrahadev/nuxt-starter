import { describe, expect, it } from 'vitest'
import { formatRoles, hasRole, parseRoles } from '../shared/utils/roles.ts'

const roleCases = [
  ['super-admin', true, true],
  ['admin', true, false],
  ['admin,super-admin', true, true],
  ['user,super-admin', true, true],
  ['user,admin', true, false],
  ['user', false, false],
  ['unknown', false, false],
  ['not-admin,super-admin-extra', false, false],
  ['', false, false],
  [null, false, false],
  [undefined, false, false]
]

describe('role grants', () => {
  it.each(roleCases)('%s grants admin=%s and super-admin=%s', (role, admin, superAdmin) => {
    expect(hasRole(role, 'admin')).toBe(admin)
    expect(hasRole(role, 'super-admin')).toBe(superAdmin)
  })

  it('normalizes role tokens without adding inherited memberships', () => {
    expect(parseRoles(' Super-Admin,super-admin ')).toEqual(['super-admin'])
    expect(formatRoles(['super-admin'])).toBe('super-admin')
    expect(hasRole(' Super-Admin ', 'admin')).toBe(true)
    expect(hasRole('super-admin', 'user')).toBe(false)
  })
})
