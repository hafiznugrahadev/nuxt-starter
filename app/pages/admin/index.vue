<script setup lang="ts">
import {
  BanIcon,
  ShieldCheckIcon,
  UserRoundIcon,
  UsersIcon
} from '@lucide/vue'
import type { AuthUser } from '~/lib/auth-client'
import { parseRoles } from '#shared/utils/roles'

definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead({ title: 'Dashboard · Admin' })

interface Stats {
  totalUsers: number
  adminUsers: number
  bannedUsers: number
  activeSessions: number
  recentUsers: Array<Pick<AuthUser, 'id' | 'name' | 'email' | 'role' | 'banned' | 'createdAt'>>
  signupsByMonth: { month: string, count: number }[]
}

const { data, status, error, refresh } = await useFetch<Stats>('/api/admin/stats', {
  key: 'admin-stats'
})

const loading = status.value === 'pending'
const loadError = computed(() => Boolean(error.value))

const cards = computed(() => [
  { label: 'Total Users', value: data.value?.totalUsers, icon: UsersIcon, chip: 'bg-lightprimary text-primary' },
  { label: 'Admins', value: data.value?.adminUsers, icon: ShieldCheckIcon, chip: 'bg-lightsecondary text-secondary-foreground' },
  { label: 'Banned Users', value: data.value?.bannedUsers, icon: BanIcon, chip: 'bg-destructive/10 text-destructive' },
  { label: 'Active Sessions', value: data.value?.activeSessions, icon: UserRoundIcon, chip: 'bg-lightprimary text-primary' }
])

const monthFormatter = new Intl.DateTimeFormat('en', { month: 'short' })

const signupBars = computed(() => {
  const rows = data.value?.signupsByMonth ?? []
  const max = Math.max(1, ...rows.map(row => row.count))
  return rows.map(row => ({
    label: monthFormatter.format(new Date(row.month)),
    count: row.count,
    height: Math.max(4, Math.round((row.count / max) * 100))
  }))
})

function formatDate(value: string | Date) {
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}
</script>

<template>
  <div>
    <AdminPageHeader
      title="Dashboard"
      :breadcrumbs="[{ text: 'Dashboard' }]"
    />

    <Alert
      v-if="loadError"
      variant="destructive"
      role="alert"
      class="mb-7"
    >
      <AlertTitle>Could not load statistics</AlertTitle>
      <AlertDescription>
        The request for dashboard data failed. Check the connection and try again.
      </AlertDescription>
      <AlertAction>
        <Button
          variant="outline"
          size="sm"
          @click="refresh()"
        >
          Try again
        </Button>
      </AlertAction>
    </Alert>

    <template v-else>
      <!-- Stat cards -->
      <div class="mb-7 grid grid-cols-1 gap-7 sm:grid-cols-2 xl:grid-cols-4">
        <Card
          v-for="card in cards"
          :key="card.label"
        >
          <CardContent class="flex items-center gap-4 py-6">
            <div
              class="flex size-12 shrink-0 items-center justify-center rounded-lg"
              :class="card.chip"
            >
              <component
                :is="card.icon"
                class="size-6"
              />
            </div>
            <div class="min-w-0">
              <Skeleton
                v-if="loading"
                class="h-8 w-16"
              />
              <h5
                v-else
                class="text-2xl font-semibold"
              >
                {{ card.value }}
              </h5>
              <p class="text-muted-foreground text-sm">
                {{ card.label }}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div class="grid grid-cols-1 gap-7 lg:grid-cols-2">
        <!-- Signups per month (real counts) -->
        <Card>
          <CardHeader>
            <CardTitle class="text-base">
              New Users
            </CardTitle>
            <CardDescription>Signups per month, computed from the database.</CardDescription>
          </CardHeader>
          <CardContent>
            <div
              v-if="loading"
              class="flex h-48 items-end gap-4"
              aria-hidden="true"
            >
              <Skeleton
                v-for="i in 6"
                :key="i"
                class="w-full"
                :style="{ height: `${30 + ((i * 13) % 60)}%` }"
              />
            </div>
            <div
              v-else
              class="flex h-48 items-end gap-4"
              role="img"
              aria-label="Bar chart of new users per month for the last six months"
            >
              <div
                v-for="bar in signupBars"
                :key="bar.label"
                class="flex h-full flex-1 flex-col items-center justify-end gap-2"
              >
                <span class="text-sm font-semibold">{{ bar.count }}</span>
                <div
                  class="bg-primary w-full rounded-t-lg transition-all"
                  :style="{ height: `${bar.height}%` }"
                />
                <span class="text-muted-foreground text-xs">{{ bar.label }}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- Recent users -->
        <Card>
          <CardHeader class="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle class="text-base">
                Recent Users
              </CardTitle>
              <CardDescription>The five most recently created accounts.</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              as-child
            >
              <NuxtLink to="/admin/users">
                View all
              </NuxtLink>
            </Button>
          </CardHeader>
          <CardContent>
            <div
              v-if="loading"
              class="space-y-4"
              aria-hidden="true"
            >
              <div
                v-for="i in 5"
                :key="i"
                class="flex items-center gap-3"
              >
                <Skeleton class="size-10 rounded-full" />
                <div class="flex-1 space-y-1.5">
                  <Skeleton class="h-4 w-32" />
                  <Skeleton class="h-3 w-48" />
                </div>
              </div>
            </div>
            <ul
              v-else
              class="divide-y"
            >
              <li
                v-for="user in data?.recentUsers"
                :key="user.id"
                class="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
              >
                <Avatar>
                  <AvatarFallback class="text-xs">
                    {{ user.name.slice(0, 2).toUpperCase() }}
                  </AvatarFallback>
                </Avatar>
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-medium">
                    {{ user.name }}
                  </p>
                  <p class="text-muted-foreground truncate text-xs">
                    {{ user.email }}
                  </p>
                </div>
                <div class="flex shrink-0 flex-wrap justify-end gap-1.5">
                  <Badge
                    v-for="userRole in parseRoles(user.role)"
                    :key="userRole"
                    :variant="userRole === 'admin' ? 'default' : 'secondary'"
                    class="font-semibold text-xs"
                  >
                    {{ userRole }}
                  </Badge>
                </div>
                <span class="text-muted-foreground hidden text-xs whitespace-nowrap sm:inline">
                  {{ formatDate(user.createdAt) }}
                </span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </template>
  </div>
</template>
