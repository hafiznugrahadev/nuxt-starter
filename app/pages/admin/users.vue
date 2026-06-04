<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import { z } from 'zod'
import type { TableColumn } from '@nuxt/ui'
import type { Column } from '@tanstack/vue-table'

definePageMeta({ middleware: 'auth' })
useHead({ title: 'Users · Admin' })

interface UserRow {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'USER'
  createdAt: string
  updatedAt: string
}

const UButton = resolveComponent('UButton')
const UBadge = resolveComponent('UBadge')
const UDropdownMenu = resolveComponent('UDropdownMenu')

const toast = useToast()
const table = useTemplateRef('table')

function sortableHeader(label: string) {
  return ({ column }: { column: Column<UserRow> }) => {
    const isSorted = column.getIsSorted()
    return h(UButton, {
      color: 'neutral',
      variant: 'ghost',
      label,
      icon: isSorted
        ? (isSorted === 'asc' ? 'i-lucide-arrow-up-narrow-wide' : 'i-lucide-arrow-down-wide-narrow')
        : 'i-lucide-arrow-up-down',
      class: '-mx-2.5',
      onClick: () => column.toggleSorting(column.getIsSorted() === 'asc')
    })
  }
}

const columns: TableColumn<UserRow>[] = [
  {
    accessorKey: 'name',
    header: sortableHeader('Name'),
    cell: ({ row }) => h('span', { class: 'font-medium text-highlighted' }, row.getValue('name'))
  },
  {
    accessorKey: 'email',
    header: sortableHeader('Email')
  },
  {
    accessorKey: 'role',
    header: sortableHeader('Role'),
    cell: ({ row }) => h(UBadge, {
      variant: 'subtle',
      color: row.getValue('role') === 'ADMIN' ? 'primary' : 'neutral'
    }, () => row.getValue('role'))
  },
  {
    accessorKey: 'createdAt',
    header: sortableHeader('Created'),
    cell: ({ row }) => new Date(row.getValue('createdAt')).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  },
  {
    id: 'actions',
    meta: { class: { th: 'w-px', td: 'w-px' } },
    cell: ({ row }) => h('div', { class: 'text-right' }, h(UDropdownMenu, {
      content: { align: 'end' },
      items: [
        { label: 'Edit', icon: 'i-lucide-pencil', onSelect: () => openEdit(row.original) },
        { type: 'separator' },
        { label: 'Delete', icon: 'i-lucide-trash-2', color: 'error', onSelect: () => openDelete(row.original) }
      ]
    }, () => h(UButton, {
      'icon': 'i-lucide-ellipsis-vertical',
      'color': 'neutral',
      'variant': 'ghost',
      'aria-label': 'Row actions'
    })))
  }
]

// ---- Create / edit modal ----
const formOpen = ref(false)
const editingId = ref<string | null>(null)
const saving = ref(false)
const state = reactive({
  name: '',
  email: '',
  role: 'USER' as 'ADMIN' | 'USER',
  password: ''
})

const roleItems = [
  { label: 'User', value: 'USER' },
  { label: 'Admin', value: 'ADMIN' }
]

const isEditing = computed(() => editingId.value !== null)

const schema = computed(() => z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.email('Enter a valid email'),
  role: z.enum(['ADMIN', 'USER']),
  password: isEditing.value
    ? z.union([z.string().min(8, 'At least 8 characters'), z.literal('')])
    : z.string().min(8, 'At least 8 characters')
}))

function openCreate() {
  editingId.value = null
  Object.assign(state, { name: '', email: '', role: 'USER', password: '' })
  formOpen.value = true
}

function openEdit(user: UserRow) {
  editingId.value = user.id
  Object.assign(state, { name: user.name, email: user.email, role: user.role, password: '' })
  formOpen.value = true
}

async function onSubmit() {
  saving.value = true
  try {
    if (isEditing.value) {
      const body: Record<string, unknown> = { name: state.name, email: state.email, role: state.role }
      if (state.password) body.password = state.password
      await $fetch(`/api/users/${editingId.value}`, { method: 'PATCH', body })
      toast.add({ title: 'User updated', color: 'success', icon: 'i-lucide-circle-check' })
    } else {
      await $fetch('/api/users', { method: 'POST', body: { ...state } })
      toast.add({ title: 'User created', color: 'success', icon: 'i-lucide-circle-check' })
    }
    formOpen.value = false
    table.value?.refresh()
  } catch (error: unknown) {
    const message = (error as { data?: { statusMessage?: string } })?.data?.statusMessage
    toast.add({ title: 'Error', description: message || 'Something went wrong', color: 'error', icon: 'i-lucide-circle-x' })
  } finally {
    saving.value = false
  }
}

// ---- Delete confirmation ----
const deleteOpen = ref(false)
const deleting = ref(false)
const target = ref<UserRow | null>(null)

function openDelete(user: UserRow) {
  target.value = user
  deleteOpen.value = true
}

async function confirmDelete() {
  if (!target.value) return
  deleting.value = true
  try {
    await $fetch(`/api/users/${target.value.id}`, { method: 'DELETE' })
    toast.add({ title: 'User deleted', color: 'success', icon: 'i-lucide-circle-check' })
    deleteOpen.value = false
    table.value?.refresh()
  } catch (error: unknown) {
    const message = (error as { data?: { statusMessage?: string } })?.data?.statusMessage
    toast.add({ title: 'Error', description: message || 'Failed to delete user', color: 'error', icon: 'i-lucide-circle-x' })
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <UContainer class="py-8 space-y-6">
    <div class="flex items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-highlighted">
          Users
        </h1>
        <p class="text-sm text-muted">
          Manage user accounts. Pagination, sorting and search run on the server.
        </p>
      </div>
    </div>

    <ServerDataTable
      ref="table"
      :url="'/api/users'"
      :columns="columns"
      search-placeholder="Search by name or email…"
      default-sort="createdAt"
      default-order="desc"
    >
      <template #toolbar="{ refresh }">
        <div class="flex items-center gap-2">
          <UButton
            icon="i-lucide-refresh-cw"
            color="neutral"
            variant="ghost"
            aria-label="Refresh"
            @click="refresh()"
          />
          <UButton
            icon="i-lucide-plus"
            label="Add user"
            @click="openCreate()"
          />
        </div>
      </template>
    </ServerDataTable>

    <!-- Create / edit modal -->
    <UModal
      v-model:open="formOpen"
      :title="isEditing ? 'Edit user' : 'Add user'"
      :description="isEditing ? 'Update the user account details.' : 'Create a new user account.'"
    >
      <template #body>
        <UForm
          id="user-form"
          :schema="schema"
          :state="state"
          class="space-y-4"
          @submit="onSubmit"
        >
          <UFormField
            label="Name"
            name="name"
            required
          >
            <UInput
              v-model="state.name"
              class="w-full"
              placeholder="Jane Doe"
            />
          </UFormField>

          <UFormField
            label="Email"
            name="email"
            required
          >
            <UInput
              v-model="state.email"
              type="email"
              class="w-full"
              placeholder="jane@example.com"
            />
          </UFormField>

          <UFormField
            label="Role"
            name="role"
            required
          >
            <USelect
              v-model="state.role"
              :items="roleItems"
              class="w-full"
            />
          </UFormField>

          <UFormField
            label="Password"
            name="password"
            :required="!isEditing"
            :hint="isEditing ? 'Leave blank to keep current' : undefined"
          >
            <UInput
              v-model="state.password"
              type="password"
              class="w-full"
              placeholder="••••••••"
              autocomplete="new-password"
            />
          </UFormField>
        </UForm>
      </template>

      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton
            label="Cancel"
            color="neutral"
            variant="ghost"
            @click="formOpen = false"
          />
          <UButton
            type="submit"
            form="user-form"
            :label="isEditing ? 'Save changes' : 'Create user'"
            :loading="saving"
          />
        </div>
      </template>
    </UModal>

    <!-- Delete confirmation -->
    <UModal
      v-model:open="deleteOpen"
      title="Delete user"
      :description="`This will permanently remove ${target?.name ?? 'this user'}.`"
    >
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton
            label="Cancel"
            color="neutral"
            variant="ghost"
            @click="deleteOpen = false"
          />
          <UButton
            label="Delete"
            color="error"
            :loading="deleting"
            @click="confirmDelete()"
          />
        </div>
      </template>
    </UModal>
  </UContainer>
</template>
