<script setup lang="ts">
import { CalendarClockIcon, Loader2Icon, PlayIcon, RefreshCwIcon } from '@lucide/vue'
import { toast } from 'vue-sonner'

definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead({ title: 'Settings · Admin' })

interface AppSettings {
  enableRegistration: boolean
}

interface TaskLastRun {
  status: 'success' | 'failed'
  message: string
  finishedAt: string
}

interface ScheduledTaskInfo {
  id: string
  title: string
  description: string
  pattern: string
  nextRun: string | null
  lastRun: TaskLastRun | null
}

const { data, status, error, refresh } = await useFetch<AppSettings>('/api/admin/settings', {
  key: 'admin-settings'
})

const {
  data: tasksData,
  status: tasksStatus,
  error: tasksError,
  refresh: refreshTasks
} = await useFetch<{ tasks: ScheduledTaskInfo[] }>('/api/admin/tasks', {
  key: 'admin-tasks'
})

const loading = computed(() => status.value === 'pending')
const loadError = computed(() => Boolean(error.value))

const tasksLoading = computed(() => tasksStatus.value === 'pending')
const tasksLoadError = computed(() => Boolean(tasksError.value))
const tasks = computed(() => tasksData.value?.tasks ?? [])

const runningTaskId = ref('')

function formatDateTime(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

async function runTaskNow(task: ScheduledTaskInfo) {
  runningTaskId.value = task.id
  try {
    await $fetch(`/api/admin/tasks/${task.id}/run`, { method: 'POST' })
    toast.success(`"${task.title}" queued`, { description: 'The worker runs it within a few seconds.' })
    // Give the worker a moment to process before reading the last-run state.
    setTimeout(() => void refreshTasks(), 4000)
  } catch (err) {
    toast.error('Failed to queue the task', {
      description: (err as { message?: string }).message || 'Something went wrong'
    })
  } finally {
    runningTaskId.value = ''
  }
}

// Combobox values must never be empty strings (reka-ui reserves '' to clear
// the selection), so the setting maps to explicit enabled/disabled values.
const REGISTRATION_ENABLED = 'enabled'
const REGISTRATION_DISABLED = 'disabled'

const registrationOptions = [
  { label: 'Enabled', value: REGISTRATION_ENABLED },
  { label: 'Disabled', value: REGISTRATION_DISABLED }
]

const pendingRegistration = ref(REGISTRATION_ENABLED)
watch(data, (value) => {
  if (value) pendingRegistration.value = value.enableRegistration ? REGISTRATION_ENABLED : REGISTRATION_DISABLED
}, { immediate: true })

const dirty = computed(() =>
  data.value
    ? (pendingRegistration.value === REGISTRATION_ENABLED) !== data.value.enableRegistration
    : false
)

const saving = ref(false)

async function saveSettings() {
  saving.value = true
  try {
    const updated = await $fetch<AppSettings>('/api/admin/settings', {
      method: 'PUT',
      body: { enableRegistration: pendingRegistration.value === REGISTRATION_ENABLED }
    })
    // Keep the local copy in sync with what the server persisted.
    data.value = updated
    toast.success('Settings saved')
  } catch (err) {
    toast.error('Failed to save settings', {
      description: (err as { message?: string }).message || 'Something went wrong'
    })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div>
    <AdminPageHeader
      title="Settings"
      :breadcrumbs="[{ text: 'Settings' }]"
    />

    <Alert
      v-if="loadError"
      variant="destructive"
      role="alert"
      class="mb-7"
    >
      <AlertTitle>Could not load settings</AlertTitle>
      <AlertDescription>
        The request for the app settings failed. Check the connection and try again.
      </AlertDescription>
      <AlertAction>
        <Button
          variant="outline"
          size="sm"
          @click="refresh()"
        >
          <RefreshCwIcon />
          Try again
        </Button>
      </AlertAction>
    </Alert>

    <Card
      v-else
      class="p-6"
    >
      <CardHeader class="p-0">
        <CardTitle>Public registration</CardTitle>
        <CardDescription>
          Control whether visitors can create their own accounts. When disabled, the
          registration page redirects to sign-in and the sign-up endpoint rejects new
          accounts server-side. New installs default to the
          NUXT_PUBLIC_ENABLE_REGISTRATION environment variable until an admin
          overrides it here.
        </CardDescription>
      </CardHeader>

      <CardContent class="mt-5 p-0">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div class="space-y-1.5">
            <Label for="setting-registration">Status</Label>
            <Combobox
              id="setting-registration"
              v-model="pendingRegistration"
              :options="registrationOptions"
              :disabled="loading"
              class="w-40"
            />
            <Skeleton
              v-if="loading"
              class="h-4 w-32"
            />
          </div>
          <Button
            class="sm:ms-auto"
            :disabled="saving || loading || !dirty"
            @click="saveSettings()"
          >
            <Loader2Icon
              v-if="saving"
              class="animate-spin"
            />
            Save changes
          </Button>
        </div>
      </CardContent>
    </Card>

    <!-- Scheduled tasks -->
    <Alert
      v-if="tasksLoadError"
      variant="destructive"
      role="alert"
      class="mb-7"
    >
      <AlertTitle>Could not load scheduled tasks</AlertTitle>
      <AlertDescription>
        The request for the task scheduler state failed. Check the connection and try again.
      </AlertDescription>
      <AlertAction>
        <Button
          variant="outline"
          size="sm"
          @click="refreshTasks()"
        >
          <RefreshCwIcon />
          Try again
        </Button>
      </AlertAction>
    </Alert>

    <Card
      v-else
      class="p-6"
    >
      <CardHeader class="p-0">
        <CardTitle>Scheduled tasks</CardTitle>
        <CardDescription>
          Recurring maintenance jobs run by the worker container (BullMQ
          repeatable jobs, schedules in UTC). Use "Run now" to queue an
          immediate one-off run.
        </CardDescription>
      </CardHeader>

      <CardContent class="mt-5 p-0">
        <Skeleton
          v-if="tasksLoading"
          class="h-20 w-full"
        />
        <ul
          v-else
          class="divide-y"
        >
          <li
            v-for="task in tasks"
            :key="task.id"
            class="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center"
          >
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold">
                {{ task.title }}
              </p>
              <p class="text-muted-foreground text-xs">
                {{ task.description }}
              </p>
              <p class="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                <span class="inline-flex items-center gap-1">
                  <CalendarClockIcon class="size-3.5" />
                  {{ task.pattern }} UTC
                </span>
                <span aria-hidden="true">·</span>
                <span>Next: {{ formatDateTime(task.nextRun) }}</span>
                <span aria-hidden="true">·</span>
                <span :class="task.lastRun?.status === 'failed' ? 'text-destructive' : ''">
                  Last: {{ task.lastRun
                    ? `${task.lastRun.status} — ${formatDateTime(task.lastRun.finishedAt)} (${task.lastRun.message})`
                    : 'never run' }}
                </span>
              </p>
            </div>
            <Button
              variant="outline"
              class="sm:shrink-0"
              :disabled="runningTaskId === task.id"
              @click="runTaskNow(task)"
            >
              <Loader2Icon
                v-if="runningTaskId === task.id"
                class="animate-spin"
              />
              <PlayIcon v-else />
              Run now
            </Button>
          </li>
        </ul>
      </CardContent>
    </Card>
  </div>
</template>
