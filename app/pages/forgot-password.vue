<script setup lang="ts">
import { z } from 'zod'
import { authClient } from '~/lib/auth-client'

definePageMeta({ middleware: 'guest' })
useHead({ title: 'Forgot password' })

const schema = z.object({
  email: z.email('Enter a valid email')
})

const email = ref('')
const emailError = ref('')
const requestError = ref('')
const loading = ref(false)
const submitted = ref(false)

async function onSubmit() {
  emailError.value = ''
  requestError.value = ''

  const parsed = schema.safeParse({ email: email.value })

  if (!parsed.success) {
    emailError.value = parsed.error.issues[0]?.message ?? 'Enter a valid email'
    return
  }

  loading.value = true

  try {
    const { error } = await authClient.requestPasswordReset({
      email: parsed.data.email,
      redirectTo: `${window.location.origin}/reset-password`
    })

    if (error) {
      requestError.value = 'We could not submit the request. Try again later.'
      return
    }

    submitted.value = true
  } catch {
    requestError.value = 'We could not submit the request. Try again later.'
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
          Forgot password?
        </CardTitle>
        <CardDescription>
          Enter your account email to request a password reset link.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div
          v-if="submitted"
          class="space-y-4"
          role="status"
          aria-live="polite"
        >
          <p class="text-sm">
            If an account uses this address, check its inbox for a password reset link.
          </p>
          <NuxtLink
            to="/login"
            class="inline-flex min-h-11 items-center rounded-sm text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Return to sign in
          </NuxtLink>
        </div>

        <form
          v-else
          class="space-y-4"
          @submit.prevent="onSubmit()"
        >
          <FormField
            id="email"
            v-model="email"
            label="Email"
            type="email"
            autocomplete="email"
            placeholder="you@example.com"
            :error="emailError"
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
            {{ loading ? 'Sending request…' : 'Send reset link' }}
          </Button>
        </form>
      </CardContent>

      <CardFooter
        v-if="!submitted"
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
