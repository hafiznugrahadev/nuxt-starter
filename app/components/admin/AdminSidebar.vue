<script setup lang="ts">
import { HomeIcon, LayoutDashboardIcon, SettingsIcon, UserRoundIcon, UsersIcon } from '@lucide/vue'
import type { Component } from 'vue'

// Sidebar structure mirrors the TailwindAdmin template's VerticalSidebar:
// labelled groups, active item highlighted with primary, hover with
// lightprimary. Every entry points at a real page (no placeholder links).
interface NavItem {
  title: string
  icon: Component
  to: string
  exact?: boolean
}

const groups: { header: string, items: NavItem[] }[] = [
  {
    header: 'Admin',
    items: [
      { title: 'Dashboard', icon: LayoutDashboardIcon, to: '/admin', exact: true },
      { title: 'User Management', icon: UsersIcon, to: '/admin/users' },
      { title: 'Settings', icon: SettingsIcon, to: '/admin/settings' }
    ]
  },
  {
    header: 'Account',
    items: [
      { title: 'Profile', icon: UserRoundIcon, to: '/admin/profile' }
    ]
  },
  {
    header: 'Site',
    items: [
      { title: 'Back to Site', icon: HomeIcon, to: '/' }
    ]
  }
]

const route = useRoute()
const isActive = (item: NavItem) =>
  item.exact ? route.path === item.to : route.path.startsWith(item.to)
</script>

<template>
  <Sidebar
    collapsible="icon"
    class="sidebar bg-card pb-6"
    side="left"
  >
    <SidebarHeader class="relative pt-6 pb-5 whitespace-nowrap">
      <div class="logo flex items-center gap-2.5 px-2 py-1">
        <NuxtLink
          to="/admin"
          class="flex min-h-11 items-center rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
          aria-label="Admin home"
        >
          <AppLogo class="h-7 w-auto" />
        </NuxtLink>
      </div>
    </SidebarHeader>

    <SidebarContent class="overflow-hidden">
      <SidebarGroup class="p-0">
        <SidebarGroupContent>
          <SidebarMenu>
            <template
              v-for="group in groups"
              :key="group.header"
            >
              <SidebarGroupLabel class="px-0 py-5 mt-3 text-xs font-bold uppercase whitespace-nowrap text-link dark:text-darklink">
                {{ group.header }}
              </SidebarGroupLabel>

              <SidebarMenuItem
                v-for="item in group.items"
                :key="item.to"
              >
                <SidebarMenuButton
                  as-child
                  :is-active="isActive(item)"
                  class="h-11 rounded-lg transition-all duration-200 ease-in-out hover:translate-x-1"
                >
                  <NuxtLink
                    :to="item.to"
                    class="gap-3 px-4"
                    :class="isActive(item)
                      ? 'bg-primary text-primary-foreground shadow-md dark:shadow-none'
                      : 'text-link dark:text-darklink hover:bg-lightprimary hover:text-primary'"
                  >
                    <component
                      :is="item.icon"
                      class="size-5 shrink-0"
                    />
                    <span class="text-sm leading-5">{{ item.title }}</span>
                  </NuxtLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </template>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
  </Sidebar>
</template>
