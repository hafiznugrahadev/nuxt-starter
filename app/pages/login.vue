<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({ middleware: 'guest' })
useHead({ title: 'Sign in' })

const { fetch: refreshSession } = useUserSession()
const route = useRoute()
const toast = useToast()

const schema = z.object({
  email: z.email('Enter a valid email'),
  password: z.string().min(1, 'Password is required')
})
type Schema = z.output<typeof schema>

const state = reactive({
  email: '',
  password: ''
})
const loading = ref(false)

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true
  try {
    await $fetch('/api/auth/login', {
      method: 'POST',
      body: event.data
    })
    await refreshSession()
    await navigateTo((route.query.redirect as string) || '/admin/users')
  } catch (error: unknown) {
    const message = (error as { data?: { statusMessage?: string } })?.data?.statusMessage
    toast.add({
      title: 'Sign in failed',
      description: message || 'Invalid email or password',
      color: 'error',
      icon: 'i-lucide-circle-x'
    })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UContainer class="flex items-center justify-center min-h-[70vh] py-12">
    <UCard class="w-full max-w-sm">
      <template #header>
        <h1 class="text-lg font-semibold text-highlighted">
          Sign in
        </h1>
        <p class="text-sm text-muted mt-1">
          Use your administrator credentials to continue.
        </p>
      </template>

      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField
          label="Email"
          name="email"
          required
        >
          <UInput
            v-model="state.email"
            type="email"
            placeholder="admin@example.com"
            autocomplete="email"
            class="w-full"
          />
        </UFormField>

        <UFormField
          label="Password"
          name="password"
          required
        >
          <UInput
            v-model="state.password"
            type="password"
            placeholder="••••••••"
            autocomplete="current-password"
            class="w-full"
          />
        </UFormField>

        <UButton
          type="submit"
          label="Sign in"
          block
          :loading="loading"
        />
      </UForm>
    </UCard>
  </UContainer>
</template>
