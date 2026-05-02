import { ref } from 'vue'
import { apiRequest } from '../lib/api'
import type { Subtask } from '../types/task'

interface SubtasksResponse {
  subtasks: Subtask[]
}

interface SubtaskResponse {
  subtask: Subtask
}

export const useSubtasks = () => {
  const subtasks = ref<Subtask[]>([])
  const loadedTaskIds = new Set<number>()

  const replaceTaskSubtasks = (taskId: number, taskSubtasks: Subtask[]) => {
    const withoutTask = subtasks.value.filter((subtask) => subtask.taskId !== taskId)
    subtasks.value = [...withoutTask, ...taskSubtasks]
  }

  const loadSubtasksForTask = async (taskId: number) => {
    const response = await apiRequest<SubtasksResponse>(`/tasks/${taskId}/subtasks`, { method: 'GET' })
    replaceTaskSubtasks(taskId, response.subtasks ?? [])
    loadedTaskIds.add(taskId)
  }

  const getSubtasksByTaskId = (taskId: number) =>
    subtasks.value
      .filter((subtask) => subtask.taskId === taskId)
      .slice()
      .sort((a, b) => {
        if (a.status !== b.status) {
          return a.status === 'todo' ? -1 : 1
        }

        return a.createdAt - b.createdAt
      })

  const ensureTaskSubtasksLoaded = async (taskId: number) => {
    if (loadedTaskIds.has(taskId)) {
      return
    }

    await loadSubtasksForTask(taskId)
  }

  const createSubtask = async (taskId: number, text: string) => {
    const normalizedText = text.trim()
    if (!normalizedText) {
      return
    }

    const response = await apiRequest<SubtaskResponse>(`/tasks/${taskId}/subtasks`, {
      method: 'POST',
      body: JSON.stringify({ text: normalizedText }),
    })

    subtasks.value.push(response.subtask)
  }

  const toggleSubtask = async (id: number) => {
    const target = subtasks.value.find((subtask) => subtask.id === id)
    if (!target) {
      return
    }

    const nextStatus = target.status === 'todo' ? 'done' : 'todo'
    const response = await apiRequest<SubtaskResponse>(`/subtasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: nextStatus }),
    })
    const index = subtasks.value.findIndex((subtask) => subtask.id === id)
    if (index !== -1) {
      subtasks.value[index] = response.subtask
    }
  }

  const deleteSubtask = async (id: number) => {
    await apiRequest(`/subtasks/${id}`, { method: 'DELETE' })
    subtasks.value = subtasks.value.filter((subtask) => subtask.id !== id)
  }

  const setSubtaskDueDate = async (id: number, dueDate: string) => {
    const response = await apiRequest<SubtaskResponse>(`/subtasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ dueDate }),
    })
    const index = subtasks.value.findIndex((subtask) => subtask.id === id)
    if (index !== -1) {
      subtasks.value[index] = response.subtask
    }
  }

  const updateSubtaskText = async (id: number, text: string) => {
    const normalizedText = text.trim()
    if (!normalizedText) {
      return
    }

    const response = await apiRequest<SubtaskResponse>(`/subtasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ text: normalizedText }),
    })
    const index = subtasks.value.findIndex((subtask) => subtask.id === id)
    if (index !== -1) {
      subtasks.value[index] = response.subtask
    }
  }

  const deleteSubtasksByTaskId = (taskId: number) => {
    loadedTaskIds.delete(taskId)
    subtasks.value = subtasks.value.filter((subtask) => subtask.taskId !== taskId)
  }

  return {
    subtasks,
    getSubtasksByTaskId,
    ensureTaskSubtasksLoaded,
    createSubtask,
    toggleSubtask,
    deleteSubtask,
    setSubtaskDueDate,
    updateSubtaskText,
    deleteSubtasksByTaskId,
  }
}
