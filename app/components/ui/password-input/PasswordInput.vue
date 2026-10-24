<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { EyeIcon, EyeOffIcon } from '@lucide/vue'
import { useVModel } from '@vueuse/core'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'

defineOptions({ inheritAttrs: false })

const props = defineProps<{
  defaultValue?: string | number
  modelValue?: string | number
  class?: HTMLAttributes['class']
}>()

const emits = defineEmits<{
  (e: 'update:modelValue', payload: string | number): void
}>()

const modelValue = useVModel(props, 'modelValue', emits, {
  passive: true,
  defaultValue: props.defaultValue
})

const visible = ref(false)
</script>

<template>
  <div class="relative w-full">
    <Input
      v-model="modelValue"
      v-bind="$attrs"
      :type="visible ? 'text' : 'password'"
      :class="cn('pr-12', props.class)"
    />
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      class="absolute top-1/2 right-1.5 -translate-y-1/2"
      :aria-label="visible ? 'Hide password' : 'Show password'"
      :aria-pressed="visible"
      @click="visible = !visible"
    >
      <EyeOffIcon
        v-if="visible"
        class="size-4"
      />
      <EyeIcon
        v-else
        class="size-4"
      />
    </Button>
  </div>
</template>
