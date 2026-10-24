import type { AuthUser } from '~/lib/auth-client'

export type UserSortField = 'name' | 'email' | 'createdAt' | 'role'
export type UserSearchField = 'email' | 'name'

interface AdminUsersResult {
  users: AuthUser[]
  total: number
}

/**
 * Paged, sorted, searchable and role-filtered user list backed by
 * `GET /api/admin/users`. Browser-only like before: the endpoint needs the
 * session cookie and the page renders skeletons until hydration anyway.
 */
export function useAdminUsers() {
  const page = ref(1)
  const pageSize = ref(10)
  const search = ref('')
  const searchField = ref<UserSearchField>('email')
  // '' means "all roles"; users can hold several comma-separated roles and
  // the endpoint matches any listed role.
  const role = ref('')
  const sortBy = ref<UserSortField>('createdAt')
  const sortDirection = ref<'asc' | 'desc'>('desc')

  const { data, status, error, refresh } = useAsyncData(
    'admin-users',
    () => $fetch<AdminUsersResult>('/api/admin/users', {
      query: {
        page: page.value,
        pageSize: pageSize.value,
        sortBy: sortBy.value,
        sortDirection: sortDirection.value,
        ...(search.value ? { search: search.value, searchField: searchField.value } : {}),
        ...(role.value ? { role: role.value } : {})
      }
    }),
    {
      server: false,
      default: () => ({ users: [] as AuthUser[], total: 0 }),
      watch: [page, pageSize, search, searchField, role, sortBy, sortDirection]
    }
  )

  // Changing the filters or the page size should always go back to page 1.
  watch([search, searchField, role, pageSize], () => {
    page.value = 1
  })

  const rows = computed<AuthUser[]>(() => data.value?.users ?? [])
  const total = computed(() => data.value?.total ?? 0)
  // Surface fetch failures: without it a failed load would render the empty
  // state ("No users found"), which reads as "there are no users".
  const loadError = computed(() => Boolean(error.value))
  // The fetch never runs on the server, so SSR sees status `idle` while the
  // client starts at `pending`. Treating both as loading keeps the SSR and
  // hydration renders identical (skeletons), avoiding a hydration mismatch.
  const loading = computed(() => status.value === 'idle' || status.value === 'pending')

  function toggleSort(field: UserSortField) {
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
    searchField,
    role,
    sortBy,
    sortDirection,
    toggleSort
  }
}
