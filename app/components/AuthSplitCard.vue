<script setup lang="ts">
import { CalendarClockIcon, DatabaseIcon, ShieldCheckIcon } from '@lucide/vue'

// Shared two-pane shell for the auth pages (sign-in, register, password
// recovery): a primary-colored branding pane on lg+ screens and the page's
// own content (heading, form, links) in the right pane. On phones and
// tablets the branding pane is hidden and the card collapses to the form.
const features = [
  { icon: ShieldCheckIcon, text: 'Better Auth with multi-role admin and super-admin tooling' },
  { icon: DatabaseIcon, text: 'Prisma + PostgreSQL with migrations and seeds' },
  { icon: CalendarClockIcon, text: 'BullMQ email queue and scheduled maintenance tasks' }
]
</script>

<template>
  <div class="flex items-center justify-center px-4 py-12 sm:py-24">
    <Card class="w-full max-w-4xl p-0 lg:grid lg:grid-cols-2">
      <!-- Branding pane (hidden on phones and tablets) -->
      <div class="bg-primary text-primary-foreground hidden flex-col justify-between gap-10 p-10 lg:flex">
        <div class="flex min-h-11 items-center">
          <AppLogo class="h-7 w-auto" />
        </div>

        <div class="space-y-4">
          <h2 class="text-2xl leading-tight font-semibold">
            Production-ready Nuxt starter
          </h2>
          <p class="text-primary-foreground/80 text-sm leading-relaxed">
            Email &amp; password auth, a multi-role admin area, scheduled tasks
            and interactive API docs — wired up and ready to go.
          </p>
          <ul class="space-y-3 pt-2">
            <li
              v-for="feature in features"
              :key="feature.text"
              class="flex items-start gap-3"
            >
              <component
                :is="feature.icon"
                class="mt-0.5 size-4 shrink-0"
              />
              <span class="text-sm">{{ feature.text }}</span>
            </li>
          </ul>
        </div>

        <p class="text-primary-foreground/70 text-xs">
          Built with Nuxt, Better Auth &amp; shadcn-vue
        </p>
      </div>

      <!-- Content pane: the page owns its heading, form and links -->
      <div class="flex items-center justify-center p-6 sm:p-10">
        <div class="w-full max-w-sm space-y-6">
          <slot />
        </div>
      </div>
    </Card>
  </div>
</template>
