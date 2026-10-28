<script setup lang="ts">
import {
  BlocksIcon,
  CheckIcon,
  CodeIcon,
  CopyIcon,
  PaletteIcon,
  RocketIcon,
  ShieldCheckIcon,
  TerminalIcon,
  ZapIcon
} from '@lucide/vue'
import { toast } from 'vue-sonner'

const features = [
  {
    icon: RocketIcon,
    title: 'Production-ready from day one',
    description: 'Pre-configured with TypeScript, ESLint, Tailwind CSS, and all the best practices. Focus on building features, not setting up tooling.'
  },
  {
    icon: ShieldCheckIcon,
    title: 'Auth out of the box',
    description: 'Email & password sign-in, sessions, role-based access and admin user management powered by the Better Auth admin plugin.'
  },
  {
    icon: PaletteIcon,
    title: 'Beautiful by default',
    description: 'shadcn-vue components on top of Tailwind CSS v4 with automatic dark mode, consistent spacing, and polished styling.'
  },
  {
    icon: ZapIcon,
    title: 'Lightning fast',
    description: 'Optimized for performance with SSR support, automatic code splitting, and edge-ready deployment. Your users will love the speed.'
  },
  {
    icon: BlocksIcon,
    title: 'Composable UI primitives',
    description: 'Accessible headless components from reka-ui, wrapped in shadcn-vue patterns you can own and customize directly in your repo.'
  },
  {
    icon: CodeIcon,
    title: 'Developer experience first',
    description: 'Auto-imports, hot module replacement, and TypeScript support. Write less boilerplate and ship more features.'
  }
]

const INSTALL_COMMAND = 'npm create @manusiakemos/nuxt-starter@latest my-app'

const copied = ref(false)

async function copyInstallCommand() {
  try {
    // Clipboard API only exists in secure contexts; fall back to a hidden
    // textarea for older browsers and plain-HTTP setups.
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(INSTALL_COMMAND)
    } else {
      const helper = document.createElement('textarea')
      helper.value = INSTALL_COMMAND
      helper.setAttribute('readonly', '')
      helper.style.position = 'fixed'
      helper.style.opacity = '0'
      document.body.appendChild(helper)
      helper.select()
      document.execCommand('copy')
      helper.remove()
    }
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  } catch {
    toast.error('Could not copy to the clipboard')
  }
}
</script>

<template>
  <div class="mx-auto w-full max-w-6xl px-4">
    <section class="flex flex-col items-center gap-6 py-24 text-center">
      <Badge variant="secondary">
        Nuxt 4 · Better Auth · shadcn-vue
      </Badge>
      <h1 class="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
        A production-ready Nuxt starter
      </h1>
      <p class="text-muted-foreground max-w-2xl text-lg">
        Everything you need to build modern Nuxt applications: authentication, role-based
        access control, beautiful UI components, and API docs, wired up and ready to go.
      </p>
      <div class="flex flex-wrap items-center justify-center gap-3">
        <Button
          size="lg"
          as-child
        >
          <NuxtLink to="/login">
            Sign in
          </NuxtLink>
        </Button>
      </div>
    </section>

    <section class="pb-24">
      <Card class="mx-auto max-w-3xl p-6">
        <CardHeader class="p-0">
          <div class="flex items-center gap-2">
            <div class="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-lg">
              <TerminalIcon class="size-4.5" />
            </div>
            <CardTitle class="text-base">
              Start a new project
            </CardTitle>
          </div>
          <CardDescription>
            Scaffold a fresh copy of this starter with the npm installer — it generates a
            <code class="bg-muted rounded px-1 py-0.5 text-xs">.env</code> with fresh secrets and
            prints the setup steps (database, migrations, admin seed, dev server).
          </CardDescription>
        </CardHeader>
        <CardContent class="mt-5 p-0">
          <div class="bg-muted/60 dark:bg-input/30 flex items-center gap-2 rounded-lg border p-2 pl-4">
            <code class="min-w-0 flex-1 overflow-x-auto text-sm whitespace-nowrap">
              <span class="text-muted-foreground select-none">$ </span>{{ INSTALL_COMMAND }}
            </code>
            <Button
              variant="ghost"
              size="icon"
              :aria-label="copied ? 'Copied' : 'Copy install command'"
              @click="copyInstallCommand()"
            >
              <CheckIcon
                v-if="copied"
                class="text-primary"
              />
              <CopyIcon v-else />
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>

    <section class="grid gap-4 pb-24 sm:grid-cols-2 lg:grid-cols-3">
      <Card
        v-for="feature in features"
        :key="feature.title"
      >
        <CardHeader>
          <div class="bg-primary/10 text-primary mb-2 flex size-9 items-center justify-center rounded-lg">
            <component
              :is="feature.icon"
              class="size-4.5"
            />
          </div>
          <CardTitle class="text-base">
            {{ feature.title }}
          </CardTitle>
          <CardDescription>{{ feature.description }}</CardDescription>
        </CardHeader>
      </Card>
    </section>
  </div>
</template>
