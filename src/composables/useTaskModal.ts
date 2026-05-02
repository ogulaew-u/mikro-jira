import { computed, ref } from 'vue'
import { categories, categoryToLane, laneName } from '../types/task'
import type { Category, LaneId, Subtask, Task } from '../types/task'

interface SaveTaskPayload {
  id: number | null
  text: string
  category: Category
  dueDate: string
}

interface SaveTaskResult {
  ok: boolean
  error?: string
}

interface UseTaskModalOptions {
  saveTask: (payload: SaveTaskPayload) => Promise<SaveTaskResult>
  deleteTask: (id: number) => Promise<void>
  getSubtasksByTaskId: (taskId: number) => Subtask[]
  ensureTaskSubtasksLoaded: (taskId: number) => Promise<void>
  createSubtask: (taskId: number, text: string) => Promise<void>
  toggleSubtask: (id: number) => Promise<void>
  deleteSubtask: (id: number) => Promise<void>
  setSubtaskDueDate: (id: number, dueDate: string) => Promise<void>
  updateSubtaskText: (id: number, text: string) => Promise<void>
}

const getDatePlusDays = (days: number) => {
  const date = new Date()
  date.setDate(date.getDate() + days)

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export const useTaskModal = ({
  saveTask,
  deleteTask,
  getSubtasksByTaskId,
  ensureTaskSubtasksLoaded,
  createSubtask,
  toggleSubtask,
  deleteSubtask,
  setSubtaskDueDate,
  updateSubtaskText,
}: UseTaskModalOptions) => {
  const isModalOpen = ref(false)
  const draftCategory = ref<Category>(categories[0])
  const draftText = ref('')
  const draftDueDate = ref('')
  const newSubtaskText = ref('')
  const formError = ref('')
  const editingTaskId = ref<number | null>(null)
  const editingOriginalCategory = ref<Category | null>(null)

  const isEditMode = computed(() => editingTaskId.value !== null)
  const laneHint = computed(() => laneName(categoryToLane[draftCategory.value]))
  const createModalTitle = computed(() => {
    if (draftCategory.value === 'Текущие') {
      return 'Новая текущая задача'
    }

    if (draftCategory.value === 'Отложенные') {
      return 'Новая отложенная задача'
    }

    return 'Новая задача'
  })

  const activeSubtasks = computed(() => {
    if (editingTaskId.value === null) {
      return []
    }

    return getSubtasksByTaskId(editingTaskId.value)
  })

  const subtaskProgress = computed(() => {
    const total = activeSubtasks.value.length
    const done = activeSubtasks.value.filter((subtask) => subtask.status === 'done').length
    return `${done}/${total} выполнено`
  })

  const moveOptions = computed(() => {
    const currentCategory = editingOriginalCategory.value
    if (currentCategory === 'Текущие') {
      return [
        { label: 'Отложить', category: 'Отложенные' as Category },
        { label: 'Решить', category: 'Решенные' as Category },
      ]
    }

    if (currentCategory === 'Отложенные') {
      return [
        { label: 'В текущие', category: 'Текущие' as Category },
        { label: 'Решить', category: 'Решенные' as Category },
      ]
    }

    if (currentCategory === 'Решенные') {
      return [
        { label: 'Вернуть в текущие', category: 'Текущие' as Category },
        { label: 'В отложенные', category: 'Отложенные' as Category },
      ]
    }

    return []
  })

  const openCreateModal = (lane: LaneId) => {
    editingTaskId.value = null
    editingOriginalCategory.value = null
    draftCategory.value =
      categories.find((category) => categoryToLane[category] === lane) ?? categories[0]
    draftText.value = ''
    draftDueDate.value = getDatePlusDays(3)
    newSubtaskText.value = ''
    formError.value = ''
    isModalOpen.value = true
  }

  const openEditModal = async (task: Task) => {
    editingTaskId.value = task.id
    editingOriginalCategory.value = task.category
    draftCategory.value = task.category
    draftText.value = task.text
    draftDueDate.value = task.dueDate || getDatePlusDays(3)
    newSubtaskText.value = ''
    formError.value = ''
    isModalOpen.value = true
    try {
      await ensureTaskSubtasksLoaded(task.id)
    } catch {
      formError.value = 'Не удалось загрузить подзадачи.'
    }
  }

  const closeModal = () => {
    isModalOpen.value = false
  }

  const save = async () => {
    if (!draftText.value.trim()) {
      return
    }

    if (!draftDueDate.value) {
      formError.value = 'Укажите срок задачи.'
      return
    }

    const result = await saveTask({
      id: editingTaskId.value,
      text: draftText.value,
      category: draftCategory.value,
      dueDate: draftDueDate.value,
    })

    if (!result.ok) {
      formError.value = result.error ?? 'Не удалось сохранить задачу.'
      return
    }

    formError.value = ''
    closeModal()
  }

  const remove = async () => {
    if (editingTaskId.value === null) {
      return
    }

    try {
      await deleteTask(editingTaskId.value)
    } catch {
      formError.value = 'Не удалось удалить задачу.'
      return
    }
    formError.value = ''
    closeModal()
  }

  const addSubtask = async () => {
    if (editingTaskId.value === null) {
      return
    }

    try {
      await createSubtask(editingTaskId.value, newSubtaskText.value)
      newSubtaskText.value = ''
    } catch {
      formError.value = 'Не удалось добавить подзадачу.'
    }
  }

  const toggleSubtaskStatus = async (id: number) => {
    try {
      await toggleSubtask(id)
    } catch {
      formError.value = 'Не удалось обновить подзадачу.'
    }
  }

  const removeSubtask = async (id: number) => {
    try {
      await deleteSubtask(id)
    } catch {
      formError.value = 'Не удалось удалить подзадачу.'
    }
  }

  const updateSubtaskDueDate = async (id: number, dueDate: string) => {
    try {
      await setSubtaskDueDate(id, dueDate)
    } catch {
      formError.value = 'Не удалось обновить срок подзадачи.'
    }
  }

  const editSubtaskText = async (id: number, text: string) => {
    try {
      await updateSubtaskText(id, text)
    } catch {
      formError.value = 'Не удалось обновить текст подзадачи.'
    }
  }

  return {
    isModalOpen,
    draftCategory,
    draftText,
    draftDueDate,
    newSubtaskText,
    formError,
    isEditMode,
    laneHint,
    createModalTitle,
    activeSubtasks,
    subtaskProgress,
    moveOptions,
    openCreateModal,
    openEditModal,
    closeModal,
    save,
    remove,
    addSubtask,
    toggleSubtaskStatus,
    removeSubtask,
    updateSubtaskDueDate,
    editSubtaskText,
  }
}
