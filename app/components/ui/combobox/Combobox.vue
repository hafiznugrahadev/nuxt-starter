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
  ComboboxViewport,
  ComboboxVirtualizer
} from 'reka-ui'
import { cn } from '@/lib/utils'

export interface ComboboxOption {
  label: string
  value: string
}

export interface ComboboxLoadOptionsParams {
  search: string
  page: number
  pageSize: number
  signal: AbortSignal
}

export type ComboboxLoadOptions = (params: ComboboxLoadOptionsParams) => Promise<{
  options: ComboboxOption[]
  hasMore: boolean
}>

// Route unmatched attrs (aria-*, data-*) to the trigger button.
defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<{
  /** Selected option value. */
  modelValue?: string
  options?: ComboboxOption[]
  loadOptions?: ComboboxLoadOptions
  selectedOption?: ComboboxOption
  minSearchLength?: number
  debounceMs?: number
  pageSize?: number
  virtualizeThreshold?: number
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
  options: () => [],
  loadOptions: undefined,
  selectedOption: undefined,
  minSearchLength: 2,
  debounceMs: 300,
  pageSize: 50,
  virtualizeThreshold: 100,
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
const remoteOptions = ref<ComboboxOption[]>([])
const remembered = ref<ComboboxOption>()
const loading = ref(false)
const pending = ref(false)
const failed = ref(false)
const page = ref(0)
const hasMore = ref(false)
let controller: AbortController | undefined
let timer: ReturnType<typeof setTimeout> | undefined
let generation = 0

const remote = computed(() => Boolean(props.loadOptions))
const enoughSearch = computed(() => search.value.trim().length >= Math.max(0, props.minSearchLength))

function invalidate() {
  generation++
  controller?.abort()
  controller = undefined
  if (timer) clearTimeout(timer)
  timer = undefined
  loading.value = false
  pending.value = false
}

async function loadPage(nextPage: number) {
  if (!props.loadOptions || !open.value || !enoughSearch.value || loading.value) return
  const currentGeneration = generation
  const request = new AbortController()
  controller = request
  loading.value = true
  pending.value = false
  failed.value = false
  try {
    const result = await props.loadOptions({
      search: search.value.trim(),
      page: nextPage,
      pageSize: props.pageSize,
      signal: request.signal
    })
    if (request.signal.aborted || currentGeneration !== generation) return
    const combined = nextPage === 1 ? result.options : [...remoteOptions.value, ...result.options]
    remoteOptions.value = [...new Map(combined.filter(option => option.value !== '').map(option => [option.value, option])).values()]
    page.value = nextPage
    hasMore.value = result.hasMore
  } catch {
    if (!request.signal.aborted && currentGeneration === generation) failed.value = true
  } finally {
    if (currentGeneration === generation) {
      loading.value = false
      controller = undefined
    }
  }
}

watch([open, search, () => props.loadOptions, () => props.minSearchLength], () => {
  invalidate()
  remoteOptions.value = []
  page.value = 0
  hasMore.value = false
  failed.value = false
  if (remote.value && open.value && enoughSearch.value) {
    pending.value = true
    timer = setTimeout(() => {
      void loadPage(1)
    }, Math.max(0, props.debounceMs))
  }
})

onBeforeUnmount(invalidate)

watch([value, () => props.selectedOption, () => props.options, remoteOptions], () => {
  const option = [props.selectedOption, ...props.options, ...remoteOptions.value]
    .find(item => item?.value === value.value)
  if (option) remembered.value = option
  else if (remembered.value?.value !== value.value) remembered.value = undefined
}, { immediate: true, flush: 'sync' })

const selected = computed(() =>
  [props.selectedOption, ...props.options, ...remoteOptions.value, remembered.value]
    .find(option => option?.value === value.value)
)

// Filtering is done here (not by reka-ui) so matching always follows the
// option label, whatever the caller uses as values.
const filteredOptions = computed(() => {
  if (remote.value) return remoteOptions.value
  const term = search.value.trim().toLowerCase()
  if (!term) return props.options
  return props.options.filter(option =>
    option.label.toLowerCase().includes(term)
  )
})

// Reka marks the root as virtual when the virtualizer mounts, so keep using it
// after the list shrinks rather than switching back to non-virtual navigation.
const virtualized = ref(false)
watch(filteredOptions, (options) => {
  if (options.length >= props.virtualizeThreshold) virtualized.value = true
}, { immediate: true, flush: 'sync' })
const optionLabels = computed(() => new Map(filteredOptions.value.map(option => [option.value, option.label])))
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

      <ComboboxViewport :class="cn('max-h-64 overflow-y-auto p-1', virtualized && 'h-64')">
        <p
          v-if="remote && !enoughSearch"
          class="text-muted-foreground py-6 text-center text-sm"
        >
          Type at least {{ minSearchLength }} characters to search.
        </p>
        <p
          v-else-if="(loading || pending) && page === 0"
          class="text-muted-foreground py-6 text-center text-sm"
          role="status"
        >
          Loading options...
        </p>
        <p
          v-else-if="!failed && filteredOptions.length === 0"
          class="text-muted-foreground py-6 text-center text-sm"
        >
          No results found.
        </p>

        <ComboboxVirtualizer
          v-if="virtualized"
          v-slot="{ option }"
          :options="filteredOptions.map(item => item.value)"
          :estimate-size="44"
          :text-content="(option: string) => optionLabels.get(option) ?? ''"
        >
          <ComboboxItem
            :value="option"
            class="data-highlighted:bg-accent data-highlighted:text-accent-foreground relative flex h-11 w-full cursor-pointer items-center gap-2 rounded-md px-2 pr-8 text-sm outline-none select-none"
          >
            <span class="truncate">{{ optionLabels.get(option) }}</span>
            <ComboboxItemIndicator class="absolute right-2 flex items-center">
              <CheckIcon class="size-4" />
            </ComboboxItemIndicator>
          </ComboboxItem>
        </ComboboxVirtualizer>
        <ComboboxGroup v-else-if="filteredOptions.length > 0">
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
        <p
          v-if="loading && page > 0"
          class="text-muted-foreground py-3 text-center text-sm"
          role="status"
        >
          Loading more options...
        </p>
        <div
          v-if="failed"
          class="text-muted-foreground flex flex-col items-center gap-2 py-3 text-sm"
          role="alert"
        >
          <span>Could not load options.</span>
          <button
            type="button"
            class="text-foreground min-h-11 underline"
            @click="loadPage(page + 1)"
          >
            Try again
          </button>
        </div>
        <button
          v-else-if="remote && hasMore && !loading"
          type="button"
          class="text-foreground min-h-11 w-full text-sm underline"
          @click="loadPage(page + 1)"
        >
          Load more
        </button>
      </ComboboxViewport>
    </ComboboxContent>
  </ComboboxRoot>
</template>
