<script setup lang="ts">
import { Loader2Icon } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { z } from 'zod'
import { parseRoles } from '#shared/utils/roles'
import { authClient } from '~/lib/auth-client'

definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead({ title: 'Profile · Admin' })

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

function formatDate(value: string | Date) {
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

// ---- Edit profile ----
// Name only: better-auth routes self-service email changes through a
// verification flow (changeEmail), not updateUser.
const profileForm = reactive({
  name: user.value?.name ?? ''
})
const profileErrors = reactive<{ name?: string }>({})
const savingProfile = ref(false)

const profileSchema = z.object({
  name: z.string().min(1, 'Name is required')
})

async function saveProfile() {
  profileErrors.name = undefined

  const parsed = profileSchema.safeParse(profileForm)
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      if (issue.path[0] === 'name') profileErrors.name = issue.message
    }
    return
  }

  savingProfile.value = true
  const { error } = await authClient.updateUser({
    name: parsed.data.name
  })
  savingProfile.value = false

  if (error) {
    toast.error('Failed to update profile', {
      description: error.message || 'Something went wrong'
    })
    return
  }

  toast.success('Profile updated')
  // The admin header and sidebar read the shared session fetch.
  await refreshNuxtData('auth-session')
}

// ---- Change password ----
const passwordForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})
const passwordErrors = reactive<{ currentPassword?: string, newPassword?: string, confirmPassword?: string }>({})
const savingPassword = ref(false)

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'At least 8 characters'),
  confirmPassword: z.string().min(8, 'At least 8 characters')
}).refine(data => data.newPassword === data.confirmPassword, {
  path: ['confirmPassword'],
  message: 'Passwords do not match'
})

async function changePassword() {
  passwordErrors.currentPassword = undefined
  passwordErrors.newPassword = undefined
  passwordErrors.confirmPassword = undefined

  const parsed = passwordSchema.safeParse(passwordForm)
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const field = issue.path[0]
      if (field === 'currentPassword' || field === 'newPassword' || field === 'confirmPassword') {
        passwordErrors[field] = issue.message
      }
    }
    return
  }

  savingPassword.value = true
  const { error } = await authClient.changePassword({
    currentPassword: parsed.data.currentPassword,
    newPassword: parsed.data.newPassword,
    revokeOtherSessions: true
  })
  savingPassword.value = false

  if (error) {
    toast.error('Failed to change password', {
      description: error.message || 'Something went wrong'
    })
    return
  }

  toast.success('Password changed', {
    description: 'Other sessions have been signed out.'
  })
  Object.assign(passwordForm, { currentPassword: '', newPassword: '', confirmPassword: '' })
}
</script>

<template>
  <div>
    <AdminPageHeader
      title="Profile"
      :breadcrumbs="[{ text: 'Profile' }]"
    />

    <div class="space-y-7">
      <!-- Overview -->
      <Card class="p-6">
        <div class="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
          <Avatar size="lg">
            <AvatarImage
              v-if="user?.image"
              :src="user.image"
              :alt="user?.name"
            />
            <AvatarFallback class="text-sm">
              {{ initials }}
            </AvatarFallback>
          </Avatar>
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <h5 class="text-lg font-semibold">
                {{ user?.name }}
              </h5>
              <Badge
                v-for="userRole in parseRoles(user?.role)"
                :key="userRole"
                :variant="userRole === 'admin' ? 'default' : 'secondary'"
                class="font-semibold text-xs"
              >
                {{ userRole }}
              </Badge>
            </div>
            <p class="text-muted-foreground truncate text-sm">
              {{ user?.email }}
            </p>
            <p
              v-if="user?.createdAt"
              class="text-muted-foreground mt-1 text-xs"
            >
              Member since {{ formatDate(user.createdAt) }}
            </p>
          </div>
        </div>
      </Card>

      <div class="grid grid-cols-1 gap-7 lg:grid-cols-2">
        <!-- Edit profile -->
        <Card class="p-6">
          <CardHeader class="p-0">
            <CardTitle>Edit profile</CardTitle>
            <CardDescription>
              Update the name shown on your account.
            </CardDescription>
          </CardHeader>
          <CardContent class="p-0">
            <form
              id="profile-form"
              class="mt-5 space-y-4"
              @submit.prevent="saveProfile()"
            >
              <FormField
                id="profile-name"
                v-model="profileForm.name"
                label="Name"
                placeholder="Jane Doe"
                :error="profileErrors.name"
              />
            </form>
          </CardContent>
          <CardFooter class="mt-5 p-0">
            <Button
              type="submit"
              form="profile-form"
              :disabled="savingProfile"
            >
              <Loader2Icon
                v-if="savingProfile"
                class="animate-spin"
              />
              Save changes
            </Button>
          </CardFooter>
        </Card>

        <!-- Change password -->
        <Card class="p-6">
          <CardHeader class="p-0">
            <CardTitle>Change password</CardTitle>
            <CardDescription>
              Changing your password signs out all other sessions.
            </CardDescription>
          </CardHeader>
          <CardContent class="p-0">
            <form
              id="password-form"
              class="mt-5 space-y-4"
              @submit.prevent="changePassword()"
            >
              <FormField
                id="current-password"
                v-model="passwordForm.currentPassword"
                label="Current password"
                type="password"
                placeholder="••••••••"
                autocomplete="current-password"
                :error="passwordErrors.currentPassword"
              />

              <FormField
                id="new-password"
                v-model="passwordForm.newPassword"
                label="New password"
                type="password"
                placeholder="••••••••"
                autocomplete="new-password"
                :error="passwordErrors.newPassword"
              />

              <FormField
                id="confirm-password"
                v-model="passwordForm.confirmPassword"
                label="Confirm new password"
                type="password"
                placeholder="••••••••"
                autocomplete="new-password"
                :error="passwordErrors.confirmPassword"
              />
            </form>
          </CardContent>
          <CardFooter class="mt-5 p-0">
            <Button
              type="submit"
              form="password-form"
              :disabled="savingPassword"
            >
              <Loader2Icon
                v-if="savingPassword"
                class="animate-spin"
              />
              Change password
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  </div>
</template>
