import { computed, ref } from 'vue'
import { apiRequest } from '../lib/api'
import type { Category, Task } from '../types/task'

interface UpsertTaskPayload {
  id: number | null
  text: string
  category: Category
  dueDate: string
}

interface UpsertTaskResult {
  ok: boolean
  error?: string
}

interface TasksResponse {
  tasks: Task[]
}

interface TaskResponse {
  task: Task
}

export const useTasks = () => {
  const tasks = ref<Task[]>([])

  const leftTasks = computed(() => tasks.value.filter((task) => task.lane === 'left'))
  const rightTasks = computed(() => tasks.value.filter((task) => task.lane === 'right'))
  const bottomTasks = computed(() => tasks.value.filter((task) => task.lane === 'bottom'))

  const loadTasks = async () => {
    const response = await apiRequest<TasksResponse>('/tasks', { method: 'GET' })
    tasks.value = response.tasks ?? []
  }

  const upsertTask = async ({ id, text, category, dueDate }: UpsertTaskPayload): Promise<UpsertTaskResult> => {
    try {
      const payload = JSON.stringify({
        text: text.trim(),
        category,
        dueDate,
      })

      const response = id === null
        ? await apiRequest<TaskResponse>('/tasks', { method: 'POST', body: payload })
        : await apiRequest<TaskResponse>(`/tasks/${id}`, { method: 'PATCH', body: payload })

      const idx = tasks.value.findIndex((task) => task.id === response.task.id)
      if (idx === -1) {
        tasks.value.push(response.task)
      } else {
        tasks.value[idx] = response.task
      }

      return { ok: true }
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Не удалось сохранить задачу.',
      }
    }
  }

  const deleteTaskById = async (id: number) => {
    await apiRequest(`/tasks/${id}`, { method: 'DELETE' })
    tasks.value = tasks.value.filter((task) => task.id !== id)
  }

  void loadTasks()

  return {
    tasks,
    leftTasks,
    rightTasks,
    bottomTasks,
    loadTasks,
    upsertTask,
    deleteTaskById,
  }
}
