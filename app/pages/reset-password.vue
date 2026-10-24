<script setup lang="ts">
import { z } from 'zod'
import { authClient } from '~/lib/auth-client'

useHead({ title: 'Reset password' })

const route = useRoute()
const token = computed(() => typeof route.query.token === 'string' ? route.query.token : '')
const invalidLink = computed(() => route.query.error === 'INVALID_TOKEN' || !token.value)

const schema = z.object({
  password: z.string().min(8, 'Use at least 8 characters').max(128, 'Use 128 characters or fewer'),
  confirmation: z.string().min(1, 'Confirm your password')
}).refine(value => value.password === value.confirmation, {
  path: ['confirmation'],
  message: 'Passwords do not match'
})

const state = reactive({ password: '', confirmation: '' })
const errors = reactive<{ password?: string, confirmation?: string }>({})
const requestError = ref('')
const loading = ref(false)
const completed = ref(false)

async function onSubmit() {
  errors.password = undefined
  errors.confirmation = undefined
  requestError.value = ''

  const parsed = schema.safeParse(state)

  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const field = issue.path[0]
      if (field === 'password' || field === 'confirmation') errors[field] = issue.message
    }
    return
  }

  loading.value = true

  try {
    const { error } = await authClient.resetPassword({
      newPassword: parsed.data.password,
      token: token.value
    })

    if (error) {
      requestError.value = 'We could not update your password. Check the link and try again.'
      return
    }

    completed.value = true
  } catch {
    requestError.value = 'We could not update your password. Check the link and try again.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex items-center justify-center px-4 py-24">
    <Card class="w-full max-w-sm">
      <CardHeader>
        <CardTitle
          class="text-lg"
          role="heading"
          aria-level="1"
        >
          {{ completed ? 'Password updated' : invalidLink ? 'Reset link unavailable' : 'Choose a new password' }}
        </CardTitle>
        <CardDescription v-if="completed">
          Sign in with your new password.
        </CardDescription>
        <CardDescription v-else-if="invalidLink">
          This reset link is missing, invalid, or expired. Request a new one to continue.
        </CardDescription>
        <CardDescription v-else>
          Choose a password with at least 8 characters.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div
          v-if="completed"
          class="space-y-4"
          role="status"
          aria-live="polite"
        >
          <p class="text-sm">
            Your password has been changed. Other active sessions have been signed out.
          </p>
          <NuxtLink
            to="/login"
            class="inline-flex min-h-11 items-center rounded-sm text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Sign in
          </NuxtLink>
        </div>

        <div
          v-else-if="invalidLink"
          class="space-y-4"
          role="alert"
          aria-live="polite"
        >
          <NuxtLink
            to="/forgot-password"
            class="inline-flex min-h-11 items-center rounded-sm text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Request another reset link
          </NuxtLink>
        </div>

        <form
          v-else
          class="space-y-4"
          @submit.prevent="onSubmit()"
        >
          <FormField
            id="password"
            v-model="state.password"
            label="New password"
            type="password"
            autocomplete="new-password"
            :error="errors.password"
          />

          <FormField
            id="confirmation"
            v-model="state.confirmation"
            label="Confirm new password"
            type="password"
            autocomplete="new-password"
            :error="errors.confirmation"
          />

          <p
            v-if="requestError"
            class="text-destructive text-sm"
            role="alert"
            aria-live="polite"
          >
            {{ requestError }}
          </p>

          <Button
            type="submit"
            class="w-full"
            :disabled="loading"
            :aria-busy="loading"
          >
            {{ loading ? 'Updating password…' : 'Update password' }}
          </Button>
        </form>
      </CardContent>

      <CardFooter
        v-if="!completed && !invalidLink"
        class="justify-center text-sm"
      >
        <NuxtLink
          to="/login"
          class="inline-flex min-h-11 items-center rounded-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Back to sign in
        </NuxtLink>
      </CardFooter>
    </Card>
  </div>
</template>
