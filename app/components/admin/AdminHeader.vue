<script setup lang="ts">
import { HomeIcon, LogOutIcon, UserRoundIcon } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { authClient } from '~/lib/auth-client'

// Header follows the template's VerticalHeader: sidebar trigger + logo on
// mobile, theme toggle and profile dropdown on the right.
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
  <header class="bg-card/95 sticky top-0 z-20 border-b backdrop-blur">
    <div class="flex items-center justify-between gap-3 px-2 py-3 sm:px-6">
      <!-- Mobile: trigger + logo -->
      <div class="flex items-center gap-2 xl:hidden">
        <SidebarTrigger />
      </div>
      <div class="flex flex-1 justify-center xl:hidden">
        <NuxtLink
          to="/admin"
          aria-label="Admin home"
          class="focus-visible:ring-ring focus-visible:ring-offset-card flex min-h-11 items-center rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        >
          <AppLogo class="h-6 w-auto" />
        </NuxtLink>
      </div>

      <!-- Right: theme + profile -->
      <div class="ms-auto flex items-center gap-1">
        <ColorModeButton />

        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <button
              type="button"
              aria-label="Account menu"
              class="hover:bg-lightprimary hover:text-primary flex min-h-11 min-w-11 items-center justify-center rounded-full transition"
            >
              <Avatar size="sm">
                <AvatarImage
                  v-if="user?.image"
                  :src="user.image"
                  :alt="user.name"
                />
                <AvatarFallback>{{ initials }}</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            class="w-56"
          >
            <div class="px-1.5 py-1">
              <p class="truncate text-sm font-medium">
                {{ user?.name ?? 'Signed in' }}
              </p>
              <p class="text-muted-foreground truncate text-xs">
                {{ user?.email }}
              </p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              as-child
            >
              <NuxtLink to="/admin/profile">
                <UserRoundIcon />
                Profile
              </NuxtLink>
            </DropdownMenuItem>
            <DropdownMenuItem
              as-child
            >
              <NuxtLink to="/">
                <HomeIcon />
                Back to Site
              </NuxtLink>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              @click="logout()"
            >
              <LogOutIcon />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  </header>
</template>
