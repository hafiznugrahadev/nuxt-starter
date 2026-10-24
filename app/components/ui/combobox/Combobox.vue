<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { useVModel } from '@vueuse/core'
import { CheckIcon, ChevronDownIcon, SearchIcon } from '@lucide/vue'
import {
  ComboboxAnchor,
  ComboboxContent,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxItemIndicator,
  ComboboxRoot,
  ComboboxTrigger,
  ComboboxViewport
} from 'reka-ui'
import { cn } from '@/lib/utils'

export interface ComboboxOption {
  label: string
  value: string
}

// Route unmatched attrs (aria-*, data-*) to the trigger button.
defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<{
  /** Selected option value. */
  modelValue?: string
  options: ComboboxOption[]
  /** Text shown on the trigger when nothing is selected. */
  placeholder?: string
  searchPlaceholder?: string
  disabled?: boolean
  /** Associates a <Label for="..."> with the trigger button. */
  id?: string
  /** Extra classes for the trigger button. */
  class?: HTMLAttributes['class']
}>(), {
  modelValue: '',
  placeholder: 'Select...',
  searchPlaceholder: 'Search...',
  disabled: false,
  id: undefined,
  class: undefined
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const value = useVModel(props, 'modelValue', emit, {
  passive: true,
  defaultValue: props.modelValue ?? ''
})

const open = ref(false)
const search = ref('')

const selected = computed(() =>
  props.options.find(option => option.value === value.value)
)

// Filtering is done here (not by reka-ui) so matching always follows the
// option label, whatever the caller uses as values.
const filteredOptions = computed(() => {
  const term = search.value.trim().toLowerCase()
  if (!term) return props.options
  return props.options.filter(option =>
    option.label.toLowerCase().includes(term)
  )
})
</script>

<template>
  <ComboboxRoot
    v-model="value"
    v-model:open="open"
    :disabled="disabled"
    :ignore-filter="true"
  >
    <ComboboxAnchor as-child>
      <ComboboxTrigger
        v-bind="$attrs"
        :id="id"
        role="combobox"
        :aria-expanded="open"
        :class="cn(
          'dark:bg-input/30 dark:hover:bg-input/50 border-input flex h-11 w-full items-center justify-between gap-2 rounded-lg border bg-transparent px-3 py-2 text-start text-sm whitespace-nowrap shadow-none transition-colors hover:bg-transparent disabled:cursor-not-allowed disabled:opacity-50',
          !selected && 'text-muted-foreground',
          props.class
        )"
      >
        <span class="truncate">
          {{ selected ? selected.label : placeholder }}
        </span>
        <ChevronDownIcon
          class="size-4 shrink-0 opacity-50 transition-transform"
          :class="open ? 'rotate-180' : ''"
        />
      </ComboboxTrigger>
    </ComboboxAnchor>

    <ComboboxContent
      position="popper"
      class="bg-popover text-popover-foreground relative z-50 mt-1 overflow-hidden rounded-lg border shadow-md"
    >
      <div class="relative">
        <SearchIcon class="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <ComboboxInput
          v-model="search"
          :display-value="() => ''"
          :placeholder="searchPlaceholder"
          autocomplete="off"
          class="border-border focus:border-ring h-11 w-full border-b bg-transparent pr-8 pl-8 text-sm outline-none"
        />
      </div>

      <ComboboxViewport class="max-h-64 overflow-y-auto p-1">
        <p
          v-if="filteredOptions.length === 0"
          class="text-muted-foreground py-6 text-center text-sm"
        >
          No results found.
        </p>

        <ComboboxGroup v-else>
          <ComboboxItem
            v-for="option in filteredOptions"
            :key="option.value"
            :value="option.value"
            class="data-highlighted:bg-accent data-highlighted:text-accent-foreground relative flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 pr-8 text-sm outline-none select-none"
          >
            <span class="truncate">
              {{ option.label }}
            </span>
            <ComboboxItemIndicator class="absolute right-2 flex items-center">
              <CheckIcon class="size-4" />
            </ComboboxItemIndicator>
          </ComboboxItem>
        </ComboboxGroup>
      </ComboboxViewport>
    </ComboboxContent>
  </ComboboxRoot>
</template>
