<script setup lang="ts">
import { Loader2Icon } from '@lucide/vue'
import { z } from 'zod'
import { toast } from 'vue-sonner'
import { authClient } from '~/lib/auth-client'

definePageMeta({ middleware: 'guest' })
useHead({ title: 'Sign in' })

const route = useRoute()
// Dynamic sign-up flag (admin-managed DB setting); falls back to the env
// default when the settings endpoint is unreachable.
const { data: publicSettings } = await useFetch('/api/settings', { key: 'public-settings' })
const registrationEnabled = publicSettings.value?.enableRegistration
  ?? useRuntimeConfig().public.enableRegistration

const schema = z.object({
  email: z.email('Enter a valid email'),
  password: z.string().min(1, 'Password is required')
})

const state = reactive({
  email: '',
  password: ''
})
const errors = reactive<{ email?: string, password?: string }>({})
const loading = ref(false)

async function onSubmit() {
  errors.email = undefined
  errors.password = undefined

  const parsed = schema.safeParse(state)
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const field = issue.path[0]
      if (field === 'email' || field === 'password') errors[field] = issue.message
    }
    return
  }

  loading.value = true
  const { error } = await authClient.signIn.email(parsed.data)
  loading.value = false

  if (error) {
    toast.error('Sign in failed', {
      description: error.message || 'Invalid email or password'
    })
    return
  }

  // Full-page navigation: a client-side redirect could race the shared session
  // refetch and bounce the user back to /login from the auth middleware.
  window.location.assign((route.query.redirect as string) || '/admin/users')
}
</script>

<template>
  <AuthSplitCard>
    <div class="space-y-1.5">
      <h1
        class="text-lg font-semibold"
        role="heading"
        aria-level="1"
      >
        Sign in
      </h1>
      <p class="text-muted-foreground text-sm">
        Use your credentials to continue.
      </p>
    </div>

    <form
      class="space-y-4"
      @submit.prevent="onSubmit()"
    >
      <FormField
        id="email"
        v-model="state.email"
        label="Email"
        type="email"
        placeholder="admin@example.com"
        autocomplete="email"
        :error="errors.email"
      />

      <FormField
        id="password"
        v-model="state.password"
        label="Password"
        type="password"
        placeholder="••••••••"
        autocomplete="current-password"
        :error="errors.password"
      />

      <div class="flex justify-end">
        <NuxtLink
          to="/forgot-password"
          class="inline-flex min-h-11 items-center rounded-sm text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Forgot password?
        </NuxtLink>
      </div>

      <Button
        type="submit"
        class="w-full"
        :disabled="loading"
      >
        <Loader2Icon
          v-if="loading"
          class="animate-spin"
        />
        Sign in
      </Button>
    </form>

    <p
      v-if="registrationEnabled"
      class="text-muted-foreground text-center text-sm"
    >
      No account yet?
      <NuxtLink
        to="/register"
        class="inline-flex min-h-11 items-center rounded-sm text-primary font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        Create one
      </NuxtLink>
    </p>
  </AuthSplitCard>
</template>
