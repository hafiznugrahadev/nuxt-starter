import type { DevTaskPriority, DevTaskStatus } from '#shared/utils/dev-tasks'

export type DevTaskSortField = 'title' | 'status' | 'priority' | 'dueDate' | 'createdAt'

export interface DevTask {
  id: string
  title: string
  description: string | null
  status: DevTaskStatus | string
  priority: DevTaskPriority | string
  dueDate: string | null
  createdAt: string
  updatedAt: string
}

interface DevTasksResult {
  tasks: DevTask[]
  total: number
}

/**
 * Paged, sorted, searchable and filterable task-manager list backed by
 * `GET /api/admin/dev-tasks` (super-admin only). Mirrors `useAdminUsers` —
 * the task manager is the starter's reference CRUD implementation.
 */
export function useDevTasks() {
  const page = ref(1)
  const pageSize = ref(10)
  const search = ref('')
  // '' means "all"; single-choice filters straight from the shared registry.
  const status = ref('')
  const priority = ref('')
  const sortBy = ref<DevTaskSortField>('createdAt')
  const sortDirection = ref<'asc' | 'desc'>('desc')

  const { data, status: fetchStatus, error, refresh } = useAsyncData(
    'admin-dev-tasks',
    () => $fetch<DevTasksResult>('/api/admin/dev-tasks', {
      query: {
        page: page.value,
        pageSize: pageSize.value,
        sortBy: sortBy.value,
        sortDirection: sortDirection.value,
        ...(search.value ? { search: search.value } : {}),
        ...(status.value ? { status: status.value } : {}),
        ...(priority.value ? { priority: priority.value } : {})
      }
    }),
    {
      server: false,
      default: () => ({ tasks: [] as DevTask[], total: 0 }),
      watch: [page, pageSize, search, status, priority, sortBy, sortDirection]
    }
  )

  // Changing the filters or the page size should always go back to page 1.
  watch([search, status, priority, pageSize], () => {
    page.value = 1
  })

  const rows = computed<DevTask[]>(() => data.value?.tasks ?? [])
  const total = computed(() => data.value?.total ?? 0)
  const loadError = computed(() => Boolean(error.value))
  const loading = computed(() => fetchStatus.value === 'idle' || fetchStatus.value === 'pending')

  function toggleSort(field: DevTaskSortField) {
    if (sortBy.value === field) {
      sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
    } else {
      sortBy.value = field
      sortDirection.value = 'asc'
    }
  }

  return {
    rows,
    total,
    loading,
    loadError,
    refresh,
    page,
    pageSize,
    search,
    status,
    priority,
    sortBy,
    sortDirection,
    toggleSort
  }
}
