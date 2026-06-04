export interface ServerTableResponse<T> {
  rows: T[]
  total: number
  page: number
  pageSize: number
}

export interface UseServerTableOptions {
  /** Column key to sort by initially. */
  defaultSort?: string
  /** Initial sort direction. */
  defaultOrder?: 'asc' | 'desc'
  /** Rows per page. */
  pageSize?: number
}

/**
 * Reactive state + fetching for a server-side datatable. Pagination, sorting
 * and search are sent to `url` as query params; the endpoint is expected to
 * return `{ rows, total, page, pageSize }`. Any change to the state refetches
 * automatically through `useFetch`.
 */
export function useServerTable<T = unknown>(url: string, options: UseServerTableOptions = {}) {
  const page = ref(1)
  const pageSize = ref(options.pageSize ?? 10)
  const sort = ref(options.defaultSort ?? 'createdAt')
  const order = ref<'asc' | 'desc'>(options.defaultOrder ?? 'desc')
  const search = ref('')

  const query = computed(() => ({
    page: page.value,
    pageSize: pageSize.value,
    sort: sort.value,
    order: order.value,
    search: search.value
  }))

  const { data, status, error, refresh } = useFetch<ServerTableResponse<T>>(url, {
    query,
    default: () => ({ rows: [], total: 0, page: 1, pageSize: pageSize.value })
  })

  // Reset to the first page when the result set is narrowed or resized.
  watch([search, pageSize], () => {
    page.value = 1
  })

  const rows = computed(() => data.value?.rows ?? [])
  const total = computed(() => data.value?.total ?? 0)
  const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))
  const pending = computed(() => status.value === 'pending')

  return {
    page,
    pageSize,
    sort,
    order,
    search,
    rows,
    total,
    pageCount,
    pending,
    error,
    refresh
  }
}
