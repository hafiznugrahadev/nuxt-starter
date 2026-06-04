<script setup lang="ts" generic="T extends Record<string, any>">
import type { TableColumn } from '@nuxt/ui'

const props = withDefaults(defineProps<{
  /** API endpoint returning `{ rows, total, page, pageSize }`. */
  url: string
  /** TanStack column definitions. */
  columns: TableColumn<T>[]
  searchable?: boolean
  searchPlaceholder?: string
  defaultSort?: string
  defaultOrder?: 'asc' | 'desc'
  pageSize?: number
  pageSizes?: number[]
}>(), {
  searchable: true,
  searchPlaceholder: 'Search…',
  defaultSort: 'createdAt',
  defaultOrder: 'desc',
  pageSize: 10,
  pageSizes: () => [10, 25, 50, 100]
})

const { page, pageSize, sort, order, search, rows, total, pending, refresh } = useServerTable<T>(props.url, {
  defaultSort: props.defaultSort,
  defaultOrder: props.defaultOrder,
  pageSize: props.pageSize
})

// Bridge TanStack's sorting model <-> the server-side sort state.
const sorting = ref([{ id: sort.value, desc: order.value === 'desc' }])
watch(sorting, (value) => {
  const next = value[0]
  if (!next) return
  sort.value = next.id
  order.value = next.desc ? 'desc' : 'asc'
})

// Debounce the search box so we don't fire a request on every keystroke.
const searchInput = ref('')
let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(searchInput, (value) => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    search.value = value
  }, 350)
})

const rangeLabel = computed(() => {
  if (total.value === 0) return '0 of 0'
  const start = (page.value - 1) * pageSize.value + 1
  const end = Math.min(page.value * pageSize.value, total.value)
  return `${start}–${end} of ${total.value}`
})

defineExpose({ refresh })
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between gap-3">
      <UInput
        v-if="searchable"
        v-model="searchInput"
        icon="i-lucide-search"
        :placeholder="searchPlaceholder"
        class="max-w-sm w-full"
      />
      <span v-else />

      <slot
        name="toolbar"
        :refresh="refresh"
      />
    </div>

    <UTable
      v-model:sorting="sorting"
      :data="rows"
      :columns="columns"
      :loading="pending"
      class="border border-default rounded-lg"
    >
      <template #empty>
        <slot name="empty">
          <div class="py-6 text-center text-muted">
            No records found
          </div>
        </slot>
      </template>
    </UTable>

    <div class="flex flex-col sm:flex-row items-center justify-between gap-3">
      <div class="flex items-center gap-2 text-sm text-muted">
        <span>Rows per page</span>
        <USelect
          v-model="pageSize"
          :items="pageSizes"
          class="w-20"
        />
        <span class="hidden sm:inline">{{ rangeLabel }}</span>
      </div>

      <UPagination
        :page="page"
        :items-per-page="pageSize"
        :total="total"
        @update:page="(p: number) => (page = p)"
      />
    </div>
  </div>
</template>
