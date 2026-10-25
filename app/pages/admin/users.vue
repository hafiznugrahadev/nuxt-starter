<script setup lang="ts">
import {
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  BanIcon,
  CheckIcon,
  EllipsisVerticalIcon,
  ListFilterIcon,
  Loader2Icon,
  PencilIcon,
  PlusIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
  Trash2Icon
} from '@lucide/vue'
import { toast } from 'vue-sonner'
import { z } from 'zod'
import { USER_ROLES, formatRoles, parseRoles, roleLabel } from '#shared/utils/roles'
import type { AuthUser } from '~/lib/auth-client'
import { authClient } from '~/lib/auth-client'

definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead({ title: 'User Management · Admin' })

const { data: session } = await useAuthSession()

const {
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
} = useAdminUsers()

const isSelf = (user: AuthUser) => user.id === session.value?.user.id

function formatDate(value: string | Date) {
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

// Registry roles only; unknown stored roles are dropped when editing and
// would be removed on save.
function editableRoles(user: AuthUser): string[] {
  const roles = parseRoles(user.role).filter(
    roleValue => (USER_ROLES as readonly string[]).includes(roleValue)
  )
  return roles.length > 0 ? roles : [USER_ROLES[0]]
}

// ---- Create / edit dialog ----
const formOpen = ref(false)
const editing = ref<AuthUser | null>(null)
const saving = ref(false)
const form = reactive({
  name: '',
  email: '',
  password: '',
  roles: ['user'] as string[]
})
const formErrors = reactive<{ name?: string, email?: string, password?: string, roles?: string }>({})

const isEditing = computed(() => editing.value !== null)

const createSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.email('Enter a valid email'),
  password: z.string().min(8, 'At least 8 characters'),
  roles: z.array(z.enum(USER_ROLES)).min(1, 'Pick at least one role')
})

const editSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.email('Enter a valid email'),
  password: z.union([z.string().min(8, 'At least 8 characters'), z.literal('')]),
  roles: z.array(z.enum(USER_ROLES)).min(1, 'Pick at least one role')
})

function toggleFormRole(roleValue: string) {
  const next = form.roles.includes(roleValue)
    ? form.roles.filter(selected => selected !== roleValue)
    : [...form.roles, roleValue]
  form.roles = next
}

function openCreate() {
  editing.value = null
  Object.assign(form, { name: '', email: '', password: '', roles: ['user'] })
  formOpen.value = true
}

function openEdit(user: AuthUser) {
  editing.value = user
  Object.assign(form, {
    name: user.name,
    email: user.email,
    password: '',
    roles: editableRoles(user)
  })
  formOpen.value = true
}

async function submitForm() {
  formErrors.name = undefined
  formErrors.email = undefined
  formErrors.password = undefined
  formErrors.roles = undefined

  const schema = isEditing.value ? editSchema : createSchema
  const parsed = schema.safeParse(form)
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const field = issue.path[0]
      if (field === 'name' || field === 'email' || field === 'password' || field === 'roles') formErrors[field] = issue.message
    }
    return
  }

  saving.value = true
  let error: { message?: string, status?: number } | null = null

  // Better Auth stores the multi-role selection as one comma-separated
  // string ("user,admin") in the user's `role` column.
  const role = formatRoles(parsed.data.roles)

  if (isEditing.value && editing.value) {
    const result = await authClient.admin.updateUser({
      userId: editing.value.id,
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        role
      }
    })
    error = result.error
    if (!error && parsed.data.password) {
      const passwordResult = await authClient.admin.setUserPassword({
        userId: editing.value.id,
        newPassword: parsed.data.password
      })
      error = passwordResult.error
    }
  } else {
    const result = await authClient.admin.createUser({
      name: parsed.data.name,
      email: parsed.data.email,
      password: parsed.data.password,
      // The plugin joins the array into the stored comma-separated string.
      // The client type only knows better-auth's default role union, hence
      // the cast for registry roles like 'super-admin'.
      role: parsed.data.roles as ('user' | 'admin')[]
    })
    error = result.error
  }
  saving.value = false

  if (error) {
    toast.error(isEditing.value ? 'Failed to update user' : 'Failed to create user', {
      description: error.message || 'Something went wrong'
    })
    return
  }

  toast.success(isEditing.value ? 'User updated' : 'User created')
  formOpen.value = false
  await refresh()
}

// ---- Ban / unban ----
const banOpen = ref(false)
const banning = ref(false)
const banTarget = ref<AuthUser | null>(null)
const banForm = reactive({
  reason: '',
  duration: '7' as 'never' | '1' | '7' | '30'
})

const banDurations = [
  { label: '1 day', value: '1' },
  { label: '7 days', value: '7' },
  { label: '30 days', value: '30' },
  { label: 'Permanent', value: 'never' }
]

const searchFieldOptions = [
  { label: 'Email', value: 'email' },
  { label: 'Name', value: 'name' }
]

// 'all' is the "no role filter" sentinel — ComboboxItem values must never be
// empty strings (reka-ui reserves '' for clearing the selection).
const ALL_ROLES = 'all'

const roleFilterOptions = [
  { label: 'All roles', value: ALL_ROLES },
  ...USER_ROLES.map(roleValue => ({ label: roleLabel(roleValue), value: roleValue }))
]

// ---- Filter modal ----
// Filters live in a modal so they never crowd the table toolbar, especially
// on phones. Selections are staged until "Apply" commits them.
const filtersOpen = ref(false)
const pendingSearchField = ref<string>('email')
const pendingRole = ref(ALL_ROLES)

const activeFilterCount = computed(() =>
  (role.value ? 1 : 0) + (searchField.value !== 'email' ? 1 : 0)
)

function openFilters() {
  pendingSearchField.value = searchField.value
  pendingRole.value = role.value || ALL_ROLES
  filtersOpen.value = true
}

function applyFilters() {
  searchField.value = pendingSearchField.value === 'name' ? 'name' : 'email'
  role.value = pendingRole.value === ALL_ROLES ? '' : pendingRole.value
  filtersOpen.value = false
}

function resetFilters() {
  pendingSearchField.value = 'email'
  pendingRole.value = ALL_ROLES
}

function openBan(user: AuthUser) {
  banTarget.value = user
  Object.assign(banForm, { reason: '', duration: '7' })
  banOpen.value = true
}

async function confirmBan() {
  if (!banTarget.value) return
  banning.value = true
  const { error } = await authClient.admin.banUser({
    userId: banTarget.value.id,
    banReason: banForm.reason || undefined,
    ...(banForm.duration === 'never'
      ? {}
      : { banExpiresIn: Number(banForm.duration) * 24 * 60 * 60 })
  })
  banning.value = false

  if (error) {
    toast.error('Failed to ban user', {
      description: error.message || 'Something went wrong'
    })
    return
  }

  toast.success('User banned')
  banOpen.value = false
  await refresh()
}

async function unban(user: AuthUser) {
  const { error } = await authClient.admin.unbanUser({ userId: user.id })

  if (error) {
    toast.error('Failed to unban user', {
      description: error.message || 'Something went wrong'
    })
    return
  }

  toast.success('User unbanned')
  await refresh()
}

// ---- Delete confirmation ----
const deleteOpen = ref(false)
const deleting = ref(false)
const deleteTarget = ref<AuthUser | null>(null)

function openDelete(user: AuthUser) {
  deleteTarget.value = user
  deleteOpen.value = true
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  const { error } = await authClient.admin.removeUser({ userId: deleteTarget.value.id })
  deleting.value = false

  if (error) {
    toast.error('Failed to delete user', {
      description: error.message || 'Something went wrong'
    })
    return
  }

  toast.success('User deleted')
  deleteOpen.value = false
  await refresh()
}
</script>

<template>
  <div>
    <AdminPageHeader
      title="User Management"
      :breadcrumbs="[{ text: 'User Management' }]"
    />

    <Alert
      v-if="loadError"
      variant="destructive"
      role="alert"
      class="mb-7"
    >
      <AlertTitle>Could not load users</AlertTitle>
      <AlertDescription>
        The request for the user list failed. Check the connection and try again.
      </AlertDescription>
      <AlertAction>
        <Button
          variant="outline"
          size="sm"
          @click="refresh()"
        >
          <RefreshCwIcon />
          Try again
        </Button>
      </AlertAction>
    </Alert>

    <ServerDataTable
      v-else
      v-model:page="page"
      v-model:page-size="pageSize"
      :rows="rows"
      :loading="loading"
      :total="total"
      :column-count="4"
      :search="search"
      search-placeholder="Search users..."
      @search="search = $event"
      @refresh="refresh()"
    >
      <template #head>
        <TableRow>
          <TableHead>
            <Button
              variant="ghost"
              size="sm"
              class="-ml-2 gap-1"
              @click="toggleSort('name')"
            >
              User
              <ArrowUpIcon
                v-if="sortBy === 'name' && sortDirection === 'asc'"
                class="size-3.5"
              />
              <ArrowDownIcon
                v-else-if="sortBy === 'name'"
                class="size-3.5"
              />
              <ArrowUpDownIcon
                v-else
                class="text-muted-foreground size-3.5"
              />
            </Button>
          </TableHead>
          <TableHead>
            <Button
              variant="ghost"
              size="sm"
              class="-ml-2 gap-1"
              @click="toggleSort('role')"
            >
              Role
              <ArrowUpIcon
                v-if="sortBy === 'role' && sortDirection === 'asc'"
                class="size-3.5"
              />
              <ArrowDownIcon
                v-else-if="sortBy === 'role'"
                class="size-3.5"
              />
              <ArrowUpDownIcon
                v-else
                class="text-muted-foreground size-3.5"
              />
            </Button>
          </TableHead>
          <TableHead>
            <Button
              variant="ghost"
              size="sm"
              class="-ml-2 gap-1"
              @click="toggleSort('createdAt')"
            >
              Created
              <ArrowUpIcon
                v-if="sortBy === 'createdAt' && sortDirection === 'asc'"
                class="size-3.5"
              />
              <ArrowDownIcon
                v-else-if="sortBy === 'createdAt'"
                class="size-3.5"
              />
              <ArrowUpDownIcon
                v-else
                class="text-muted-foreground size-3.5"
              />
            </Button>
          </TableHead>
          <TableHead class="w-px" />
        </TableRow>
      </template>

      <template
        #row="{ row }"
      >
        <TableRow class="hover:bg-muted/50">
          <TableCell>
            <div class="flex items-center gap-3">
              <Avatar>
                <AvatarImage
                  v-if="row.image"
                  :src="row.image"
                  :alt="row.name"
                />
                <AvatarFallback class="text-xs">
                  {{ row.name.slice(0, 2).toUpperCase() }}
                </AvatarFallback>
              </Avatar>
              <div class="min-w-0">
                <h6 class="truncate text-sm font-semibold">
                  {{ row.name }}
                </h6>
                <p class="text-muted-foreground truncate text-xs">
                  {{ row.email }}
                </p>
              </div>
            </div>
          </TableCell>
          <TableCell>
            <div class="flex flex-wrap items-center gap-1.5">
              <Badge
                v-for="userRole in parseRoles(row.role)"
                :key="userRole"
                :variant="userRole === 'admin' ? 'default' : 'secondary'"
                class="font-semibold text-xs"
              >
                {{ userRole }}
              </Badge>
              <Badge
                v-if="row.banned"
                variant="destructive"
                class="font-semibold text-xs"
                :title="row.banReason ?? undefined"
              >
                banned
              </Badge>
            </div>
          </TableCell>
          <TableCell class="text-muted-foreground text-sm whitespace-nowrap">
            {{ formatDate(row.createdAt) }}
          </TableCell>
          <TableCell class="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Row actions"
                >
                  <EllipsisVerticalIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                class="w-36"
              >
                <DropdownMenuItem @click="openEdit(row)">
                  <PencilIcon />
                  Edit
                </DropdownMenuItem>
                <template v-if="!isSelf(row)">
                  <DropdownMenuItem
                    v-if="!row.banned"
                    @click="openBan(row)"
                  >
                    <BanIcon />
                    Ban
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    v-else
                    @click="unban(row)"
                  >
                    <ShieldCheckIcon />
                    Unban
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    @click="openDelete(row)"
                  >
                    <Trash2Icon />
                    Delete
                  </DropdownMenuItem>
                </template>
              </DropdownMenuContent>
            </DropdownMenu>
          </TableCell>
        </TableRow>
      </template>

      <!-- Phone layout: one card per user (see ServerDataTable's card slot). -->
      <template
        #card="{ row }"
      >
        <Card class="p-4">
          <div class="flex items-start gap-3">
            <Avatar>
              <AvatarImage
                v-if="row.image"
                :src="row.image"
                :alt="row.name"
              />
              <AvatarFallback class="text-xs">
                {{ row.name.slice(0, 2).toUpperCase() }}
              </AvatarFallback>
            </Avatar>
            <div class="min-w-0 flex-1">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <h6 class="truncate text-sm font-semibold">
                    {{ row.name }}
                  </h6>
                  <p class="text-muted-foreground truncate text-xs">
                    {{ row.email }}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger as-child>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Row actions"
                    >
                      <EllipsisVerticalIcon />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem @click="openEdit(row)">
                      <PencilIcon />
                      Edit
                    </DropdownMenuItem>
                    <template v-if="!isSelf(row)">
                      <DropdownMenuItem
                        v-if="!row.banned"
                        @click="openBan(row)"
                      >
                        <BanIcon />
                        Ban
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        v-else
                        @click="unban(row)"
                      >
                        <ShieldCheckIcon />
                        Unban
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        @click="openDelete(row)"
                      >
                        <Trash2Icon />
                        Delete
                      </DropdownMenuItem>
                    </template>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div class="mt-2 flex flex-wrap items-center gap-1.5">
                <Badge
                  v-for="userRole in parseRoles(row.role)"
                  :key="userRole"
                  :variant="userRole === 'admin' ? 'default' : 'secondary'"
                  class="font-semibold text-xs"
                >
                  {{ userRole }}
                </Badge>
                <Badge
                  v-if="row.banned"
                  variant="destructive"
                  class="font-semibold text-xs"
                >
                  banned
                </Badge>
                <span class="text-muted-foreground ms-auto text-xs">
                  {{ formatDate(row.createdAt) }}
                </span>
              </div>
            </div>
          </div>
        </Card>
      </template>

      <template #toolbar="{ refresh: refreshTable }">
        <div class="flex items-center gap-2">
          <Button
            variant="outline"
            @click="openFilters()"
          >
            <ListFilterIcon />
            Filters
            <span
              v-if="activeFilterCount > 0"
              class="bg-primary text-primary-foreground ms-1 flex size-5 items-center justify-center rounded-full text-xs font-semibold"
              aria-label="Active filters"
            >
              {{ activeFilterCount }}
            </span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Refresh"
            @click="refreshTable()"
          >
            <RefreshCwIcon />
          </Button>
          <Button @click="openCreate()">
            <PlusIcon />
            Add user
          </Button>
        </div>
      </template>

      <template #empty>
        No users found
      </template>
    </ServerDataTable>

    <!-- Create / edit dialog -->
    <Dialog v-model:open="formOpen">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{{ isEditing ? 'Edit user' : 'Add user' }}</DialogTitle>
          <DialogDescription>
            {{ isEditing ? 'Update the user account details.' : 'Create a new user account.' }}
          </DialogDescription>
        </DialogHeader>

        <form
          id="user-form"
          class="space-y-4"
          @submit.prevent="submitForm()"
        >
          <FormField
            id="user-name"
            v-model="form.name"
            label="Name"
            placeholder="Jane Doe"
            :error="formErrors.name"
          />

          <FormField
            id="user-email"
            v-model="form.email"
            label="Email"
            type="email"
            placeholder="jane@example.com"
            :error="formErrors.email"
          />

          <div class="space-y-1.5">
            <span
              id="user-roles-label"
              class="text-sm leading-none font-medium"
            >Roles</span>
            <div
              class="flex flex-wrap gap-2"
              role="group"
              aria-labelledby="user-roles-label"
            >
              <Button
                v-for="roleValue in USER_ROLES"
                :key="roleValue"
                type="button"
                :variant="form.roles.includes(roleValue) ? 'default' : 'outline'"
                :aria-pressed="form.roles.includes(roleValue)"
                @click="toggleFormRole(roleValue)"
              >
                <CheckIcon
                  v-if="form.roles.includes(roleValue)"
                  class="size-4"
                />
                {{ roleLabel(roleValue) }}
              </Button>
            </div>
            <p
              v-if="formErrors.roles"
              class="text-destructive text-xs"
            >
              {{ formErrors.roles }}
            </p>
          </div>

          <FormField
            id="user-password"
            v-model="form.password"
            label="Password"
            type="password"
            placeholder="••••••••"
            autocomplete="new-password"
            :error="formErrors.password"
            :hint="isEditing ? 'Leave blank to keep the current password.' : undefined"
          />
        </form>

        <DialogFooter>
          <Button
            variant="ghost"
            @click="formOpen = false"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="user-form"
            :disabled="saving"
          >
            <Loader2Icon
              v-if="saving"
              class="animate-spin"
            />
            {{ isEditing ? 'Save changes' : 'Create user' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Filter modal -->
    <Dialog v-model:open="filtersOpen">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Filter users</DialogTitle>
          <DialogDescription>
            Narrow the list by search field and role.
          </DialogDescription>
        </DialogHeader>

        <div class="space-y-4">
          <div class="space-y-1.5">
            <Label for="filter-search-field">Search in</Label>
            <Combobox
              id="filter-search-field"
              v-model="pendingSearchField"
              :options="searchFieldOptions"
            />
          </div>

          <div class="space-y-1.5">
            <Label for="filter-role">Role</Label>
            <Combobox
              id="filter-role"
              v-model="pendingRole"
              :options="roleFilterOptions"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            @click="resetFilters()"
          >
            Reset
          </Button>
          <Button @click="applyFilters()">
            Apply filters
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Ban dialog -->
    <Dialog v-model:open="banOpen">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ban user</DialogTitle>
          <DialogDescription>
            Block {{ banTarget?.name ?? 'this user' }} from signing in.
          </DialogDescription>
        </DialogHeader>

        <div class="space-y-4">
          <FormField
            id="ban-reason"
            v-model="banForm.reason"
            label="Reason"
            placeholder="Shown to the user when they try to sign in"
          />

          <div class="space-y-1.5">
            <Label for="ban-duration">Duration</Label>
            <Combobox
              id="ban-duration"
              v-model="banForm.duration"
              :options="banDurations"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            @click="banOpen = false"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            :disabled="banning"
            @click="confirmBan()"
          >
            <Loader2Icon
              v-if="banning"
              class="animate-spin"
            />
            Ban user
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Delete confirmation -->
    <Dialog v-model:open="deleteOpen">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete user</DialogTitle>
          <DialogDescription>
            This will permanently remove {{ deleteTarget?.name ?? 'this user' }} and all
            of their sessions and accounts.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            variant="ghost"
            @click="deleteOpen = false"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            :disabled="deleting"
            @click="confirmDelete()"
          >
            <Loader2Icon
              v-if="deleting"
              class="animate-spin"
            />
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
