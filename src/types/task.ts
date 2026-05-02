export type LaneId = 'left' | 'right' | 'bottom'

export const categories = ['Текущие', 'Отложенные', 'Решенные'] as const

export type Category = (typeof categories)[number]

export interface Task {
  id: number
  text: string
  category: Category
  lane: LaneId
  dueDate: string
}

export type SubtaskStatus = 'todo' | 'done'

export interface Subtask {
  id: number
  taskId: number
  text: string
  status: SubtaskStatus
  createdAt: number
  dueDate: string
}

export const TASKS_STORAGE_KEY = 'mikro-jira.tasks.v1'
export const SUBTASKS_STORAGE_KEY = 'mikro-jira.subtasks.v1'

export const categoryToLane: Record<Category, LaneId> = {
  Текущие: 'left',
  Отложенные: 'right',
  Решенные: 'bottom',
}

export const laneName = (lane: LaneId) => {
  if (lane === 'left') return 'Блок 1'
  if (lane === 'right') return 'Блок 2'
  return 'Блок 3'
}

export const isCategory = (value: unknown): value is Category => categories.includes(value as Category)

export const isLaneId = (value: unknown): value is LaneId =>
  value === 'left' || value === 'right' || value === 'bottom'

export const isDateInputValue = (value: unknown): value is string =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)


