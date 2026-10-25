// Task manager domain constants shared by the app and the server (import
// from `#shared/utils/dev-tasks`). Values are stored as plain strings in the
// `dev_task` table and validated with zod against these registries on both
// sides.
export const DEV_TASK_STATUSES = ['todo', 'in_progress', 'done'] as const

export type DevTaskStatus = (typeof DEV_TASK_STATUSES)[number]

export const DEV_TASK_PRIORITIES = ['low', 'medium', 'high'] as const

export type DevTaskPriority = (typeof DEV_TASK_PRIORITIES)[number]

export function devTaskStatusLabel(status: string) {
  switch (status) {
    case 'in_progress': return 'In progress'
    case 'done': return 'Done'
    default: return 'To do'
  }
}

export function devTaskPriorityLabel(priority: string) {
  return priority.charAt(0).toUpperCase() + priority.slice(1)
}
