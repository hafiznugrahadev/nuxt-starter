<script setup lang="ts">
import { ExternalLinkIcon, LogOutIcon, ShieldCheckIcon } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { hasRole } from '#shared/utils/roles'
import { authClient } from '~/lib/auth-client'

// Public site chrome (header + footer), moved out of app.vue so admin pages
// can use the dedicated sidebar layout.
const { data: session } = await useAuthSession()
const user = computed(() => session.value?.user ?? null)

const initials = computed(() => {
  const name = user.value?.name || user.value?.email || '?'
  return name
    .split(/[\s.@]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]!.toUpperCase())
    .join('')
})

async function logout() {
  try {
    await authClient.signOut()
  } catch {
    toast.error('Sign out failed')
    return
  }
  window.location.assign('/login')
}
</script>

<template>
  <div class="bg-background text-foreground flex min-h-screen flex-col">
    <header class="bg-background/80 sticky top-0 z-40 border-b backdrop-blur">
      <div class="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-3 px-4">
        <NuxtLink
          to="/"
          class="focus-visible:ring-ring focus-visible:ring-offset-background flex min-h-11 items-center rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        >
          <AppLogo class="h-5 w-auto shrink-0 sm:h-6" />
        </NuxtLink>

        <div class="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            as-child
            class="focus-visible:ring-ring focus-visible:ring-offset-background min-h-11 focus-visible:ring-2 focus-visible:ring-offset-2"
          >
            <NuxtLink
              to="/docs"
              aria-label="API docs"
            >
              <span class="sm:hidden">Docs</span>
              <span class="hidden sm:inline">API docs</span>
            </NuxtLink>
          </Button>

          <ColorModeButton />

          <template v-if="user">
            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <Button
                  variant="ghost"
                  size="sm"
                  class="focus-visible:ring-ring focus-visible:ring-offset-background min-h-11 min-w-11 gap-2 px-1.5 focus-visible:ring-2 focus-visible:ring-offset-2"
                >
                  <Avatar size="sm">
                    <AvatarImage
                      v-if="user.image"
                      :src="user.image"
                      :alt="user.name"
                    />
                    <AvatarFallback class="text-xs">
                      {{ initials }}
                    </AvatarFallback>
                  </Avatar>
                  <span class="hidden max-w-32 truncate sm:inline">{{ user.name }}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                class="w-48"
              >
                <div class="px-1.5 py-1">
                  <p class="truncate text-sm font-medium">
                    {{ user.name }}
                  </p>
                  <p class="text-muted-foreground truncate text-xs">
                    {{ user.email }}
                  </p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  v-if="hasRole(user.role, 'admin')"
                  as-child
                >
                  <NuxtLink to="/admin">
                    <ShieldCheckIcon />
                    Admin
                  </NuxtLink>
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  @click="logout()"
                >
                  <LogOutIcon />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </template>

          <Button
            v-else
            variant="ghost"
            size="sm"
            as-child
            class="focus-visible:ring-ring focus-visible:ring-offset-background min-h-11 focus-visible:ring-2 focus-visible:ring-offset-2"
          >
            <NuxtLink to="/login">
              Sign in
            </NuxtLink>
          </Button>
        </div>
      </div>
    </header>

    <main class="flex-1">
      <slot />
    </main>

    <footer class="border-t">
      <div class="text-muted-foreground mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-3 px-4 text-sm">
        <p>Built with Nuxt, Better Auth & shadcn-vue • © {{ new Date().getFullYear() }}</p>
        <Button
          variant="ghost"
          size="icon-sm"
          as-child
          class="focus-visible:ring-ring focus-visible:ring-offset-background min-h-11 min-w-11 focus-visible:ring-2 focus-visible:ring-offset-2"
        >
          <NuxtLink
            to="https://github.com/nuxt-ui-templates/starter"
            target="_blank"
            aria-label="Source template on GitHub"
          >
            <ExternalLinkIcon />
          </NuxtLink>
        </Button>
      </div>
    </footer>
  </div>
</template>
