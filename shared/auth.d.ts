// Augment the nuxt-auth-utils session types with our user shape.
// Placed under shared/ so both the app and server tsconfigs include it.
declare module '#auth-utils' {
  interface User {
    id: string
    email: string
    name: string
    role: 'ADMIN' | 'USER'
  }

  interface UserSession {
    loggedInAt?: number
  }
}

export {}
