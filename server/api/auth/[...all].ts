import { auth } from '../../utils/auth'

// Mounts Better Auth's full route surface under /api/auth.
// sign-in/sign-up/sign-out, get-session, the admin/* user-management
// endpoints and /api/auth/reference (OpenAPI UI).
export default defineEventHandler(event => auth.handler(toWebRequest(event)))
