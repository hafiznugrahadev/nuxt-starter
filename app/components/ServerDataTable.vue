<script setup lang="ts" generic="T extends Record<string, any>">
import { ChevronLeftIcon, ChevronRightIcon, SearchIcon } from '@lucide/vue'

const props = withDefaults(defineProps<{
  /** Rows for the current page, or null/undefined while loading. */
  rows: T[] | null | undefined
  loading?: boolean
  page: number
  pageSize: number
  total: number
  /** Column count, used for the skeleton and empty-state colspans. */
  columnCount: number
  pageSizes?: number[]
  searchable?: boolean
  searchPlaceholder?: string
}>(), {
  loading: false,
  pageSizes: () => [10, 25, 50, 100],
  searchable: true,
  searchPlaceholder: 'Search…'
})

const emit = defineEmits<{
  (e: 'update:page' | 'update:pageSize', value: number): void
  (e: 'search', value: string): void
  (e: 'refresh'): void
}>()

// When the caller provides a `card` slot, phones (< sm) render one card per
// row instead of the table, which does not fit narrow screens. Without the
// slot the table stays visible at every width.
const slots = useSlots()
const hasCardSlot = computed(() => Boolean(slots.card))

// Debounce the search box so we don't fire a request on every keystroke.
const searchInput = ref('')
let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(searchInput, (value) => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => emit('search', value), 350)
})

const pageSizeOptions = computed(() =>
  props.pageSizes.map(size => ({ label: String(size), value: String(size) }))
)

const totalPages = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))

const rangeLabel = computed(() => {
  if (props.total === 0) return '0 of 0'
  const start = (props.page - 1) * props.pageSize + 1
  const end = Math.min(props.page * props.pageSize, props.total)
  return `${start}–${end} of ${props.total}`
})
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
      <div
        v-if="searchable"
        class="relative w-full max-w-sm"
      >
        <SearchIcon class="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <Input
          v-model="searchInput"
          type="search"
          :placeholder="searchPlaceholder"
          :aria-label="searchPlaceholder"
          class="pl-8"
        />
      </div>
      <span v-else />

      <slot
        name="toolbar"
        :refresh="() => emit('refresh')"
      />
    </div>

    <Card
      class="overflow-hidden p-0"
      :class="hasCardSlot ? 'hidden sm:block' : ''"
    >
      <div class="overflow-x-auto">
        <Table>
          <TableHeader>
            <slot name="head" />
          </TableHeader>
          <TableBody>
            <template v-if="loading">
              <TableRow
                v-for="i in pageSize"
                :key="`skeleton-${i}`"
              >
                <TableCell :colspan="columnCount">
                  <Skeleton class="h-4 w-full" />
                </TableCell>
              </TableRow>
            </template>

            <TableRow v-else-if="!rows || rows.length === 0">
              <TableCell
                :colspan="columnCount"
                class="text-muted-foreground h-24 text-center"
              >
                <slot name="empty">
                  No records found
                </slot>
              </TableCell>
            </TableRow>

            <template
              v-for="(row, index) in rows"
              v-else
              :key="(row as any).id ?? index"
            >
              <slot
                name="row"
                :row="row"
                :index="index"
              />
            </template>
          </TableBody>
        </Table>
      </div>
    </Card>

    <!-- Phone layout: one card per row instead of the table. -->
    <div
      v-if="hasCardSlot"
      class="space-y-3 sm:hidden"
    >
      <template v-if="loading">
        <Card
          v-for="i in pageSize"
          :key="`skeleton-card-${i}`"
          class="p-4"
        >
          <div class="flex items-center gap-3">
            <Skeleton class="size-10 shrink-0 rounded-full" />
            <div class="w-full space-y-2">
              <Skeleton class="h-4 w-2/5" />
              <Skeleton class="h-3 w-3/5" />
            </div>
          </div>
        </Card>
      </template>

      <Card
        v-else-if="!rows || rows.length === 0"
        class="text-muted-foreground flex h-24 items-center justify-center p-6 text-center text-sm"
      >
        <slot name="empty">
          No records found
        </slot>
      </Card>

      <template
        v-for="(row, index) in rows"
        v-else
        :key="(row as any).id ?? index"
      >
        <slot
          name="card"
          :row="row"
          :index="index"
        />
      </template>
    </div>

    <div class="flex flex-col items-center justify-between gap-3 sm:flex-row">
      <div class="text-muted-foreground flex items-center gap-2 text-sm">
        <span>Rows per page</span>
        <Combobox
          :model-value="String(pageSize)"
          :options="pageSizeOptions"
          aria-label="Rows per page"
          class="w-20"
          @update:model-value="emit('update:pageSize', Number($event))"
        />
        <span class="hidden sm:inline">{{ rangeLabel }}</span>
      </div>

      <div class="flex items-center gap-2">
        <span class="text-muted-foreground text-sm">Page {{ page }} of {{ totalPages }}</span>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Previous page"
          :disabled="page <= 1"
          @click="emit('update:page', page - 1)"
        >
          <ChevronLeftIcon />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Next page"
          :disabled="page >= totalPages"
          @click="emit('update:page', page + 1)"
        >
          <ChevronRightIcon />
        </Button>
      </div>
    </div>
  </div>
</template>
