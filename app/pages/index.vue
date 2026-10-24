<script setup lang="ts">
import {
  BlocksIcon,
  CodeIcon,
  PaletteIcon,
  RocketIcon,
  ShieldCheckIcon,
  ZapIcon
} from '@lucide/vue'

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
          class="min-h-11 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <NuxtLink to="/login">
            Sign in
          </NuxtLink>
        </Button>
        <Button
          size="lg"
          variant="outline"
          as-child
          class="min-h-11 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <NuxtLink to="/docs">
            API docs
          </NuxtLink>
        </Button>
      </div>
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
