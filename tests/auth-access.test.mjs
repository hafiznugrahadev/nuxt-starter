import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createError } from 'h3'
import { admin } from 'better-auth/plugins'
import { adminClient } from 'better-auth/client/plugins'
import { adminOptions, authRoles } from '../shared/utils/auth-permissions.ts'

const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }))
vi.mock('../server/utils/auth', () => ({ auth: { api: { getSession } } }))
const roles = [
  ['super-admin', true, true], ['admin', true, false],
  ['admin,super-admin', true, true], ['user,super-admin', true, true],
  ['user,admin', true, false], ['user', false, false],
  ['unknown', false, false], ['super-admin-extra', false, false], ['', false, false]
]

beforeEach(() => {
  vi.stubGlobal('createError', createError)
  vi.stubGlobal('defineNuxtRouteMiddleware', callback => callback)
  vi.stubGlobal('navigateTo', vi.fn((...args) => args))
})
afterEach(() => vi.unstubAllGlobals())

describe('API and page access', () => {
  it.each(roles)('%s: admin=%s, super-admin=%s', async (role, isAdmin, isSuperAdmin) => {
    const session = { user: { id: 'actor', role }, session: {} }
    getSession.mockResolvedValue(session)
    vi.stubGlobal('useAuthSession', async () => ({ data: { value: session } }))
    const { requireAdmin, requireSuperAdmin } = await import('../server/utils/guard.ts')
    for (const [guard, allowed] of [[requireAdmin, isAdmin], [requireSuperAdmin, isSuperAdmin]]) {
      const result = guard({ headers: new Headers() })
      if (allowed) await expect(result).resolves.toBe(session)
      else await expect(result).rejects.toMatchObject({ statusCode: 403 })
    }
    const adminPage = (await import('../app/middleware/admin.ts')).default
    const superPage = (await import('../app/middleware/super-admin.ts')).default
    expect(await adminPage({ fullPath: '/admin/users' })).toEqual(isAdmin ? undefined : ['/', { replace: true }])
    expect(await superPage({ fullPath: '/admin/dev-tasks' })).toEqual(isSuperAdmin ? undefined : ['/', { replace: true }])
    const guest = (await import('../app/middleware/guest.ts')).default
    expect(await guest()).toEqual([isAdmin ? '/admin/users' : '/', { replace: true }])
    expect(session.user.role).toBe(role)
  })

  it('rejects anonymous API access and preserves the page login redirect', async () => {
    getSession.mockResolvedValue(null)
    vi.stubGlobal('useAuthSession', async () => ({ data: { value: null } }))
    const { requireAdmin, requireSuperAdmin } = await import('../server/utils/guard.ts')
    for (const guard of [requireAdmin, requireSuperAdmin]) {
      await expect(guard({ headers: new Headers() })).rejects.toMatchObject({ statusCode: 401 })
    }
    for (const file of ['admin', 'super-admin']) {
      const middleware = (await import(`../app/middleware/${file}.ts`)).default
      expect(await middleware({ fullPath: '/admin/users' })).toEqual([{ path: '/login', query: { redirect: '/admin/users' } }])
    }
    expect(await (await import('../app/middleware/guest.ts')).default()).toBeUndefined()
  })
})

describe('Better Auth registered permissions', () => {
  const plugin = admin(adminOptions)
  const client = adminClient({ roles: authRoles }).getActions().admin
  it.each(roles)('%s has admin operation permissions=%s', async (role, allowed) => {
    const permissions = { user: ['create', 'list', 'set-role', 'ban', 'delete', 'set-password', 'update'], session: ['list', 'revoke', 'delete'] }
    expect(client.checkRolePermission({ role, permissions })).toBe(allowed)
    const result = await plugin.endpoints.userHasPermission({
      body: { role, permissions },
      context: { options: {}, session: { user: { id: 'actor', role }, session: {} } }
    })
    expect(result.success).toBe(allowed)
  })
  it.each(roles)('%s can list users and assign super-admin=%s', async (role, allowed) => {
    const target = { id: 'target', name: 'Target', email: 'target@example.com', role: 'user' }
    const internalAdapter = {
      listUsers: vi.fn(async () => [target]),
      countTotalUsers: vi.fn(async () => 1),
      findUserById: vi.fn(async () => target),
      updateUser: vi.fn(async (id, data) => ({ ...target, ...data }))
    }
    const context = {
      options: { plugins: [plugin] }, internalAdapter,
      session: { user: { id: 'actor', role }, session: {} }
    }
    const list = plugin.endpoints.listUsers({ query: {}, context })
    if (allowed) await expect(list).resolves.toMatchObject({ total: 1, users: [{ id: 'target' }] })
    else await expect(list).rejects.toMatchObject({ status: 'FORBIDDEN' })
    const setRole = plugin.endpoints.setRole({ headers: new Headers(), body: { userId: 'target', role: ['super-admin'] }, context })
    if (allowed) {
      await expect(setRole).resolves.toMatchObject({ user: { role: 'super-admin' } })
      expect(internalAdapter.updateUser).toHaveBeenCalledWith('target', { role: 'super-admin' })
    } else {
      await expect(setRole).rejects.toMatchObject({ status: 'FORBIDDEN' })
      expect(internalAdapter.listUsers).not.toHaveBeenCalled()
      expect(internalAdapter.updateUser).not.toHaveBeenCalled()
    }
  })
  it.each([[['super-admin']], [['admin', 'super-admin']], [['user', 'admin']]])('updates the selected roles %j', async (selectedRoles) => {
    const target = { id: 'target', name: 'Target', email: 'target@example.com', role: 'user' }
    const updateUser = vi.fn(async (id, data) => ({ ...target, ...data }))
    const result = await plugin.endpoints.adminUpdateUser({
      body: { userId: 'target', data: { role: selectedRoles } },
      context: {
        options: { plugins: [plugin] },
        session: { user: { id: 'actor', role: 'super-admin' }, session: {} },
        internalAdapter: { findUserById: vi.fn(async () => target), updateUser }
      }
    })
    expect(result.role).toBe(selectedRoles.join(','))
    expect(updateUser).toHaveBeenCalledWith('target', { role: selectedRoles.join(',') })
  })
  it('registers standalone super-admin as an administrator without broadening admin permissions', () => {
    expect(adminOptions.adminRoles).toEqual(['admin', 'super-admin'])
    expect(authRoles['super-admin']).toBe(authRoles.admin)
    expect(client.checkRolePermission({ role: 'super-admin', permissions: { user: ['impersonate-admins'] } })).toBe(false)
  })
})
