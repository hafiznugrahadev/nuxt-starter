<script setup lang="ts">
import {
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  EllipsisVerticalIcon,
  Loader2Icon,
  ListFilterIcon,
  PencilIcon,
  PlusIcon,
  RefreshCwIcon,
  Trash2Icon
} from '@lucide/vue'
import { toast } from 'vue-sonner'
import { z } from 'zod'
import {
  DEV_TASK_PRIORITIES,
  DEV_TASK_STATUSES,
  devTaskPriorityLabel,
  devTaskStatusLabel
} from '#shared/utils/dev-tasks'
import type { DevTaskPriority, DevTaskStatus } from '#shared/utils/dev-tasks'
import type { BadgeVariants } from '@/components/ui/badge'

// Reference CRUD implementation: paged table (ServerDataTable) + filter
// modal + create/edit/delete dialogs on the /api/admin/dev-tasks endpoints.
definePageMeta({ layout: 'admin', middleware: 'super-admin' })
useHead({ title: 'Task Manager · Admin' })

const {
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
} = useDevTasks()

const statusVariant = (value: string): BadgeVariants['variant'] =>
  value === 'done' ? 'secondary' : value === 'in_progress' ? 'default' : 'outline'

const priorityVariant = (value: string): BadgeVariants['variant'] =>
  value === 'high' ? 'destructive' : value === 'medium' ? 'secondary' : 'outline'

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

// ---- Create / edit dialog ----
const formOpen = ref(false)
const editing = ref<DevTask | null>(null)
const saving = ref(false)
const form = reactive({
  title: '',
  description: '',
  status: 'todo' as DevTaskStatus,
  priority: 'medium' as DevTaskPriority,
  dueDate: '' // yyyy-mm-dd from the date input; '' = no due date
})
const formErrors = reactive<{ title?: string }>({})

const isEditing = computed(() => editing.value !== null)

const formSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  description: z.string().trim().max(2000),
  status: z.enum(DEV_TASK_STATUSES),
  priority: z.enum(DEV_TASK_PRIORITIES),
  dueDate: z.string()
})

const statusOptions = DEV_TASK_STATUSES.map(value => ({ label: devTaskStatusLabel(value), value }))
const priorityOptions = DEV_TASK_PRIORITIES.map(value => ({ label: devTaskPriorityLabel(value), value }))

function openCreate() {
  editing.value = null
  Object.assign(form, { title: '', description: '', status: 'todo' as const, priority: 'medium' as const, dueDate: '' })
  formOpen.value = true
}

function openEdit(task: DevTask) {
  editing.value = task
  Object.assign(form, {
    title: task.title,
    description: task.description ?? '',
    status: (DEV_TASK_STATUSES as readonly string[]).includes(task.status)
      ? task.status as DevTaskStatus
      : 'todo',
    priority: (DEV_TASK_PRIORITIES as readonly string[]).includes(task.priority)
      ? task.priority as DevTaskPriority
      : 'medium',
    dueDate: task.dueDate ? task.dueDate.slice(0, 10) : ''
  })
  formOpen.value = true
}

async function submitForm() {
  formErrors.title = undefined

  const parsed = formSchema.safeParse(form)
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      if (issue.path[0] === 'title') formErrors.title = issue.message
    }
    return
  }

  const body = {
    title: parsed.data.title,
    description: parsed.data.description || undefined,
    status: parsed.data.status,
    priority: parsed.data.priority,
    dueDate: parsed.data.dueDate || null
  }

  saving.value = true
  try {
    if (isEditing.value && editing.value) {
      await $fetch(`/api/admin/dev-tasks/${editing.value.id}`, { method: 'PATCH', body })
    } else {
      await $fetch('/api/admin/dev-tasks', { method: 'POST', body })
    }
    toast.success(isEditing.value ? 'Task updated' : 'Task created')
    formOpen.value = false
    await refresh()
  } catch (err) {
    toast.error(isEditing.value ? 'Failed to update task' : 'Failed to create task', {
      description: (err as { message?: string }).message || 'Something went wrong'
    })
  } finally {
    saving.value = false
  }
}

// ---- Filter modal ----
// Filters live in a modal so they never crowd the table toolbar. Combobox
// values must never be empty strings (reka-ui reserves '' to clear the
// selection), so "all" maps to an explicit sentinel.
const ALL = 'all'

const statusFilterOptions = [
  { label: 'All statuses', value: ALL },
  ...statusOptions
]
const priorityFilterOptions = [
  { label: 'All priorities', value: ALL },
  ...priorityOptions
]

const filtersOpen = ref(false)
const pendingStatus = ref(ALL)
const pendingPriority = ref(ALL)

const activeFilterCount = computed(() =>
  (status.value ? 1 : 0) + (priority.value ? 1 : 0)
)

function openFilters() {
  pendingStatus.value = status.value || ALL
  pendingPriority.value = priority.value || ALL
  filtersOpen.value = true
}

function applyFilters() {
  status.value = pendingStatus.value === ALL ? '' : pendingStatus.value
  priority.value = pendingPriority.value === ALL ? '' : pendingPriority.value
  filtersOpen.value = false
}

function resetFilters() {
  pendingStatus.value = ALL
  pendingPriority.value = ALL
}

// ---- Delete confirmation ----
const deleteOpen = ref(false)
const deleting = ref(false)
const deleteTarget = ref<DevTask | null>(null)

function openDelete(task: DevTask) {
  deleteTarget.value = task
  deleteOpen.value = true
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    await $fetch(`/api/admin/dev-tasks/${deleteTarget.value.id}`, { method: 'DELETE' })
    toast.success('Task deleted')
    deleteOpen.value = false
    await refresh()
  } catch (err) {
    toast.error('Failed to delete task', {
      description: (err as { message?: string }).message || 'Something went wrong'
    })
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <div>
    <AdminPageHeader
      title="Task Manager"
      :breadcrumbs="[{ text: 'Task Manager' }]"
    />

    <Alert
      v-if="loadError"
      variant="destructive"
      role="alert"
      class="mb-7"
    >
      <AlertTitle>Could not load tasks</AlertTitle>
      <AlertDescription>
        The request for the task list failed. Check the connection and try again.
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
      :column-count="6"
      :search="search"
      search-placeholder="Search tasks..."
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
              @click="toggleSort('title')"
            >
              Task
              <ArrowUpIcon
                v-if="sortBy === 'title' && sortDirection === 'asc'"
                class="size-3.5"
              />
              <ArrowDownIcon
                v-else-if="sortBy === 'title'"
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
              @click="toggleSort('status')"
            >
              Status
              <ArrowUpIcon
                v-if="sortBy === 'status' && sortDirection === 'asc'"
                class="size-3.5"
              />
              <ArrowDownIcon
                v-else-if="sortBy === 'status'"
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
              @click="toggleSort('priority')"
            >
              Priority
              <ArrowUpIcon
                v-if="sortBy === 'priority' && sortDirection === 'asc'"
                class="size-3.5"
              />
              <ArrowDownIcon
                v-else-if="sortBy === 'priority'"
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
              @click="toggleSort('dueDate')"
            >
              Due
              <ArrowUpIcon
                v-if="sortBy === 'dueDate' && sortDirection === 'asc'"
                class="size-3.5"
              />
              <ArrowDownIcon
                v-else-if="sortBy === 'dueDate'"
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

      <template #row="{ row }">
        <TableRow class="hover:bg-muted/50">
          <TableCell>
            <div class="max-w-md">
              <p class="truncate text-sm font-semibold">
                {{ row.title }}
              </p>
              <p
                v-if="row.description"
                class="text-muted-foreground truncate text-xs"
              >
                {{ row.description }}
              </p>
            </div>
          </TableCell>
          <TableCell>
            <Badge
              :variant="statusVariant(row.status)"
              class="font-semibold text-xs"
            >
              {{ devTaskStatusLabel(row.status) }}
            </Badge>
          </TableCell>
          <TableCell>
            <Badge
              :variant="priorityVariant(row.priority)"
              class="font-semibold text-xs"
            >
              {{ devTaskPriorityLabel(row.priority) }}
            </Badge>
          </TableCell>
          <TableCell class="text-muted-foreground text-sm whitespace-nowrap">
            {{ formatDate(row.dueDate) }}
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
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  @click="openDelete(row)"
                >
                  <Trash2Icon />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TableCell>
        </TableRow>
      </template>

      <!-- Phone layout: one card per task (see ServerDataTable's card slot). -->
      <template #card="{ row }">
        <Card class="p-4">
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <p class="truncate text-sm font-semibold">
                {{ row.title }}
              </p>
              <p
                v-if="row.description"
                class="text-muted-foreground line-clamp-2 text-xs"
              >
                {{ row.description }}
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
                <DropdownMenuItem
                  variant="destructive"
                  @click="openDelete(row)"
                >
                  <Trash2Icon />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div class="mt-2 flex flex-wrap items-center gap-1.5">
            <Badge
              :variant="statusVariant(row.status)"
              class="font-semibold text-xs"
            >
              {{ devTaskStatusLabel(row.status) }}
            </Badge>
            <Badge
              :variant="priorityVariant(row.priority)"
              class="font-semibold text-xs"
            >
              {{ devTaskPriorityLabel(row.priority) }}
            </Badge>
            <span class="text-muted-foreground ms-auto text-xs">
              Due {{ formatDate(row.dueDate) }}
            </span>
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
            Add task
          </Button>
        </div>
      </template>

      <template #empty>
        No tasks yet
      </template>
    </ServerDataTable>

    <!-- Create / edit dialog -->
    <Dialog v-model:open="formOpen">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{{ isEditing ? 'Edit task' : 'Add task' }}</DialogTitle>
          <DialogDescription>
            {{ isEditing ? 'Update the task details.' : 'Create a new task.' }}
          </DialogDescription>
        </DialogHeader>

        <form
          id="dev-task-form"
          class="space-y-4"
          @submit.prevent="submitForm()"
        >
          <FormField
            id="dev-task-title"
            v-model="form.title"
            label="Title"
            placeholder="Set up the CI pipeline"
            :error="formErrors.title"
          />

          <FormField
            id="dev-task-description"
            v-model="form.description"
            label="Description"
            placeholder="Optional notes"
          />

          <div class="space-y-1.5">
            <Label for="dev-task-status">Status</Label>
            <Combobox
              id="dev-task-status"
              v-model="form.status"
              :options="statusOptions"
            />
          </div>

          <div class="space-y-1.5">
            <Label for="dev-task-priority">Priority</Label>
            <Combobox
              id="dev-task-priority"
              v-model="form.priority"
              :options="priorityOptions"
            />
          </div>

          <FormField
            id="dev-task-due"
            v-model="form.dueDate"
            label="Due date"
            type="date"
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
            form="dev-task-form"
            :disabled="saving"
          >
            <Loader2Icon
              v-if="saving"
              class="animate-spin"
            />
            {{ isEditing ? 'Save changes' : 'Create task' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Filter modal -->
    <Dialog v-model:open="filtersOpen">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Filter tasks</DialogTitle>
          <DialogDescription>
            Narrow the list by status and priority.
          </DialogDescription>
        </DialogHeader>

        <div class="space-y-4">
          <div class="space-y-1.5">
            <Label for="filter-status">Status</Label>
            <Combobox
              id="filter-status"
              v-model="pendingStatus"
              :options="statusFilterOptions"
            />
          </div>

          <div class="space-y-1.5">
            <Label for="filter-priority">Priority</Label>
            <Combobox
              id="filter-priority"
              v-model="pendingPriority"
              :options="priorityFilterOptions"
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

    <!-- Delete confirmation -->
    <Dialog v-model:open="deleteOpen">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete task</DialogTitle>
          <DialogDescription>
            This will permanently remove "{{ deleteTarget?.title ?? 'this task' }}".
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
