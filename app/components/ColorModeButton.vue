<script setup lang="ts">
import { MoonIcon, SunIcon } from '@lucide/vue'

const colorMode = useColorMode()

const isDark = computed(() => colorMode.value === 'dark')

function toggle() {
  colorMode.preference = isDark.value ? 'light' : 'dark'
}
</script>

<template>
  <Button
    variant="ghost"
    size="icon"
    class="min-h-11 min-w-11 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    aria-label="Toggle color mode"
    @click="toggle()"
  >
    <ClientOnly>
      <SunIcon
        v-if="isDark"
        class="size-4"
      />
      <MoonIcon
        v-else
        class="size-4"
      />
      <template #fallback>
        <span
          class="size-4"
          aria-hidden="true"
        />
      </template>
    </ClientOnly>
  </Button>
</template>
