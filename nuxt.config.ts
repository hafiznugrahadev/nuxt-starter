// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    'nuxt-auth-utils'
  ],

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    // Session cookie sealed by nuxt-auth-utils.
    // Override the secret via NUXT_SESSION_PASSWORD (min. 32 chars) — see .env.example
    session: {
      maxAge: 60 * 60 * 24 * 7 // 7 days
    }
  },

  routeRules: {
    '/': { prerender: true }
  },

  compatibilityDate: '2025-01-15',

  vite: {
    server: {
      // Reliable file watching for HMR when the source is bind-mounted into a
      // container. Polling is only enabled inside the dev container (see
      // Dockerfile.dev / docker-compose.yml), never on the host.
      watch: process.env.NUXT_DOCKER_DEV
        ? { usePolling: true, interval: 300 }
        : undefined
    }
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
