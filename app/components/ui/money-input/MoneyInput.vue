<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

defineOptions({ inheritAttrs: false })

const props = defineProps<{
  modelValue?: number | null
  class?: HTMLAttributes['class']
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: number | null): void
}>()

const formatter = new Intl.NumberFormat('id-ID')
const display = computed(() => props.modelValue == null ? '' : `Rp ${formatter.format(props.modelValue)}`)

function formatInput(input: HTMLInputElement) {
  const raw = input.value
  const digitPosition = (raw.slice(0, input.selectionStart ?? raw.length).match(/\d/g) ?? []).length
  const digits = raw.replace(/\D/g, '').replace(/^0+(?=\d)/, '')
  const number = digits ? Number(digits) : null
  // Avoid silently rounding large monetary values beyond JavaScript's safe range.
  const value = number !== null && !Number.isSafeInteger(number) ? props.modelValue ?? null : number
  const formatted = value === null ? '' : `Rp ${formatter.format(value)}`
  input.value = formatted
  emit('update:modelValue', value)

  let position = formatted.length
  if (digitPosition === 0) position = formatted ? 3 : 0
  else {
    let count = 0
    for (let i = 0; i < formatted.length; i++) {
      if (/\d/.test(formatted[i]!) && ++count === digitPosition) {
        position = i + 1
        break
      }
    }
  }
  input.setSelectionRange(position, position)
}

function onInput(event: Event) {
  formatInput(event.target as HTMLInputElement)
}

function onKeydown(event: KeyboardEvent) {
  if (event.key !== 'Backspace' && event.key !== 'Delete') return
  const input = event.target as HTMLInputElement
  const start = input.selectionStart ?? 0
  if (start !== input.selectionEnd) return
  const backward = event.key === 'Backspace'
  const index = backward ? start - 1 : start
  if (input.value[index] !== '.') return
  const digitIndex = backward ? index - 1 : index + 1
  if (!/\d/.test(input.value[digitIndex] ?? '')) return
  event.preventDefault()
  input.value = input.value.slice(0, digitIndex) + input.value.slice(digitIndex + 1)
  input.setSelectionRange(backward ? digitIndex : start, backward ? digitIndex : start)
  formatInput(input)
}
</script>

<template>
  <input
    v-bind="$attrs"
    :value="display"
    data-slot="input"
    :class="cn(
      'dark:bg-input/30 border-foreground/50 focus-visible:border-ring focus-visible:ring-primary aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 disabled:bg-input/50 dark:disabled:bg-input/80 h-11 rounded-lg border bg-transparent px-3 py-2 text-base transition-colors focus-visible:ring-3 aria-invalid:ring-3 md:text-sm w-full min-w-0 outline-none placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
      props.class
    )"
    type="text"
    inputmode="numeric"
    @input="onInput"
    @keydown="onKeydown"
  >
</template>
