import { z } from 'zod'

// Task manager domain constants shared by the app and the server (import
// from `#shared/utils/dev-tasks`). Values are stored as plain strings in the
// `dev_task` table and validated with zod against these registries on both
// sides.
export const DEV_TASK_STATUSES = ['todo', 'in_progress', 'done'] as const

export type DevTaskStatus = (typeof DEV_TASK_STATUSES)[number]

export const DEV_TASK_PRIORITIES = ['low', 'medium', 'high'] as const

export type DevTaskPriority = (typeof DEV_TASK_PRIORITIES)[number]

// Field-level rules are the API contract: the admin form (FE) and the
// dev-task endpoints (BE) compose these so limits and error messages cannot
// drift apart. Each side overrides with transport-specific concerns
// (defaults, Date coercion, optionality) via .extend().
export const devTaskTitleSchema = z.string().trim().min(1, 'Title is required').max(200)
export const devTaskDescriptionSchema = z.string().trim().max(2000)
export const devTaskStatusSchema = z.enum(DEV_TASK_STATUSES)
export const devTaskPrioritySchema = z.enum(DEV_TASK_PRIORITIES)

export const devTaskBaseSchema = z.object({
  title: devTaskTitleSchema,
  description: devTaskDescriptionSchema,
  status: devTaskStatusSchema,
  priority: devTaskPrioritySchema
})

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
