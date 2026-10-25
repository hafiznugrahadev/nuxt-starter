<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { useVModel } from '@vueuse/core'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PasswordInput } from '@/components/ui/password-input'

// Reusable text field: label + control + validation error / hint, with the
// a11y wiring (Label for, aria-invalid, aria-describedby) done once. Use
// this instead of hand-rolling the three parts in forms.
defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<{
  /** Field label shown above the control. */
  label: string
  /** Field id; pairs the label with the control and must be unique per page. */
  id: string
  /** Validation error rendered below the control. */
  error?: string
  /** Neutral hint rendered below the control when there is no error. */
  hint?: string
  /** password renders the PasswordInput (show/hide toggle); other values render Input. */
  type?: 'text' | 'email' | 'password' | 'search' | 'tel' | 'url' | 'date'
  defaultValue?: string | number
  modelValue?: string | number
  class?: HTMLAttributes['class']
}>(), {
  error: undefined,
  hint: undefined,
  type: 'text',
  defaultValue: undefined,
  modelValue: '',
  class: undefined
})

const emits = defineEmits<{
  (e: 'update:modelValue', payload: string | number): void
}>()

const modelValue = useVModel(props, 'modelValue', emits, {
  passive: true,
  defaultValue: props.defaultValue
})

const descriptionId = computed(() =>
  props.error || props.hint ? `${props.id}-description` : undefined
)
const invalid = computed(() => Boolean(props.error))
</script>

<template>
  <div class="space-y-1.5">
    <Label :for="id">
      {{ label }}
    </Label>

    <PasswordInput
      v-if="type === 'password'"
      :id="id"
      v-model="modelValue"
      v-bind="$attrs"
      :aria-invalid="invalid"
      :aria-describedby="descriptionId"
      :class="cn('min-h-11', props.class)"
    />
    <Input
      v-else
      :id="id"
      v-model="modelValue"
      v-bind="$attrs"
      :type="type"
      :aria-invalid="invalid"
      :aria-describedby="descriptionId"
      :class="props.class"
    />

    <p
      v-if="error"
      :id="descriptionId"
      class="text-destructive text-xs"
      role="alert"
    >
      {{ error }}
    </p>
    <p
      v-else-if="hint"
      :id="descriptionId"
      class="text-muted-foreground text-xs"
    >
      {{ hint }}
    </p>
  </div>
</template>
