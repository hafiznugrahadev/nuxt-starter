<script setup lang="ts">
import { Loader2Icon } from '@lucide/vue'
import { z } from 'zod'
import { toast } from 'vue-sonner'
import { authClient } from '~/lib/auth-client'

definePageMeta({ middleware: ['guest', 'registration'] })
useHead({ title: 'Create account' })

const route = useRoute()

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.email('Enter a valid email'),
  password: z.string().min(8, 'At least 8 characters')
})

const state = reactive({
  name: '',
  email: '',
  password: ''
})
const errors = reactive<{ name?: string, email?: string, password?: string }>({})
const loading = ref(false)

async function onSubmit() {
  errors.name = undefined
  errors.email = undefined
  errors.password = undefined

  const parsed = schema.safeParse(state)
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const field = issue.path[0]
      if (field === 'name' || field === 'email' || field === 'password') errors[field] = issue.message
    }
    return
  }

  loading.value = true
  const { error } = await authClient.signUp.email(parsed.data)
  loading.value = false

  if (error) {
    toast.error('Sign up failed', {
      description: error.message || 'Could not create the account'
    })
    return
  }

  // signUp signs the new user in; land with a full page load so the auth
  // middleware sees the fresh session cookie instead of a stale shared read.
  window.location.assign((route.query.redirect as string) || '/')
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
        Create account
      </h1>
      <p class="text-muted-foreground text-sm">
        Sign up with your email and a password.
      </p>
    </div>

    <form
      class="space-y-4"
      @submit.prevent="onSubmit()"
    >
      <FormField
        id="name"
        v-model="state.name"
        label="Name"
        placeholder="Jane Doe"
        autocomplete="name"
        :error="errors.name"
      />

      <FormField
        id="email"
        v-model="state.email"
        label="Email"
        type="email"
        placeholder="jane@example.com"
        autocomplete="email"
        :error="errors.email"
      />

      <FormField
        id="password"
        v-model="state.password"
        label="Password"
        type="password"
        placeholder="••••••••"
        autocomplete="new-password"
        :error="errors.password"
      />

      <Button
        type="submit"
        class="w-full"
        :disabled="loading"
      >
        <Loader2Icon
          v-if="loading"
          class="animate-spin"
        />
        Create account
      </Button>
    </form>

    <p class="text-muted-foreground text-center text-sm">
      Already have an account?
      <NuxtLink
        to="/login"
        class="inline-flex min-h-11 items-center rounded-sm text-primary font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        Sign in
      </NuxtLink>
    </p>
  </AuthSplitCard>
</template>
