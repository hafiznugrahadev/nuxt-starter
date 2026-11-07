import { adminAc, userAc } from 'better-auth/plugins/admin/access'
import { DEFAULT_ROLE, SUPER_ADMIN_ROLE } from './roles'

export const authRoles = {
  user: userAc,
  admin: adminAc,
  [SUPER_ADMIN_ROLE]: adminAc
}

export const adminOptions = {
  roles: authRoles,
  adminRoles: ['admin', SUPER_ADMIN_ROLE],
  defaultRole: DEFAULT_ROLE
}
