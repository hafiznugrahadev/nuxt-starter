// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    'shadcn-nuxt',
    '@nuxtjs/color-mode',
    '@nuxt/fonts',
    '@scalar/nuxt'
  ],

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  // Required for Tailwind v4's `.dark` variant (no `-mode` suffix on the class).
  colorMode: {
    classSuffix: ''
  },

  runtimeConfig: {
    public: {
      // Public sign-up toggle (NUXT_PUBLIC_ENABLE_REGISTRATION). Mirrored on
      // the server: when disabled, Better Auth rejects sign-ups entirely via
      // `emailAndPassword.disableSignUp` (see server/utils/auth.ts).
      enableRegistration: true
    }
  },

  compatibilityDate: '2025-01-15',

  nitro: {
    experimental: {
      openAPI: true
    },
    openAPI: {
      route: '/_openapi.json',
      production: 'runtime',
      meta: {
        title: 'Nuxt Starter API',
        description: 'Native Nitro server routes. Better Auth endpoints have their own generated reference.',
        version: '1.0.0'
      },
      ui: {
        scalar: false,
        swagger: false
      }
    }
  },

  vite: {
    plugins: [tailwindcss()],
    // zod ships dual CJS/ESM builds. In the dev container (`nuxt dev` on Bun),
    // Vite's SSR externalized/CJS path loses the named `z` export and pages
    // break with "undefined is not an object (evaluating '…z.object')".
    // Loading zod through Vite's ESM transform keeps the named exports intact.
    ssr: {
      noExternal: ['zod']
    },
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

  // Interactive API reference for Nitro routes. Better Auth publishes its
  // endpoint-level reference at /api/auth/reference.
  scalar: {
    url: '/_openapi.json',
    pathRouting: {
      basePath: '/docs'
    },
    darkMode: true,
    metaData: {
      title: 'Nuxt Starter API Reference'
    },
    // Scalar's default controls are smaller than the app's 44px touch target.
    // Keep the embedded reference usable by touch and keyboard.
    customCss: `
      .scalar-app button:not(.download-button),
      .scalar-app [role="button"],
      .scalar-app [role="tab"],
      .scalar-app a.endpoint {
        min-height: 44px !important;
      }

      .scalar-app button:not(.download-button),
      .scalar-app [role="button"],
      .scalar-app [role="tab"] {
        min-width: 44px !important;
      }

      .scalar-app .scalar-icon-button {
        min-width: 44px !important;
        min-height: 44px !important;
      }

      .scalar-app .download-button {
        min-height: 44px !important;
        min-width: 44px !important;
      }

      .scalar-app button:focus-visible,
      .scalar-app [role="button"]:focus-visible,
      .scalar-app [role="tab"]:focus-visible,
      .scalar-app a:focus-visible {
        outline: 3px solid #008150 !important;
        outline-offset: 2px !important;
      }
    `
  },

  shadcn: {
    prefix: '',
    componentDir: '@/components/ui'
  }
})
