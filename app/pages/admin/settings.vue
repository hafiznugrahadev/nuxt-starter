<script setup lang="ts">
import { Loader2Icon, RefreshCwIcon } from '@lucide/vue'
import { toast } from 'vue-sonner'

definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead({ title: 'Settings · Admin' })

interface AppSettings {
  enableRegistration: boolean
}

const { data, status, error, refresh } = await useFetch<AppSettings>('/api/admin/settings', {
  key: 'admin-settings'
})

const loading = computed(() => status.value === 'pending')
const loadError = computed(() => Boolean(error.value))

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
  </div>
</template>
