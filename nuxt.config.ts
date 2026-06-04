// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    'nuxt-auth-utils',
    '@scalar/nuxt'
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

  nitro: {
    experimental: {
      // Auto-generate an OpenAPI document from the server routes.
      openAPI: true
    },
    openAPI: {
      // Serve the spec (and keep it available) in production, not just dev.
      production: 'runtime',
      meta: {
        title: 'Nuxt Starter API',
        description: 'Authentication and server-side users datatable API.',
        version: '1.0.0'
      }
    }
  },

  vite: {
    server: {
      allowedHosts: ['.orb.local', '.tabalongkab.go.id'],
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
  },

  // Interactive API reference (Scalar) served at /docs, backed by the
  // Nitro-generated OpenAPI document.
  scalar: {
    pathRouting: {
      basePath: '/docs'
    },
    darkMode: true,
    metaData: {
      title: 'Nuxt Starter API Reference'
    }
  }
})
