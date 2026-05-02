<script setup lang="ts">
import { computed } from 'vue'
import { useTaskModal } from '../composables/useTaskModal'
import { useSubtasks } from '../composables/useSubtasks'
import { useTasks } from '../composables/useTasks'
import TaskColumn from './TaskColumn.vue'
import TaskModal from './TaskModal.vue'
import type { AuthUser } from '../types/auth'
import type { Category } from '../types/task'

const props = defineProps<{
  user: AuthUser
}>()

const emit = defineEmits<{
  logout: []
}>()

const { leftTasks, rightTasks, bottomTasks, upsertTask, deleteTaskById } = useTasks()
const {
  getSubtasksByTaskId,
  ensureTaskSubtasksLoaded,
  createSubtask,
  toggleSubtask,
  deleteSubtask,
  setSubtaskDueDate,
  updateSubtaskText,
  deleteSubtasksByTaskId,
} = useSubtasks()

const deleteTaskWithSubtasks = async (id: number) => {
  await deleteTaskById(id)
  deleteSubtasksByTaskId(id)
}

const {
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
} = useTaskModal({
  saveTask: upsertTask,
  deleteTask: deleteTaskWithSubtasks,
  getSubtasksByTaskId,
  ensureTaskSubtasksLoaded,
  createSubtask,
  toggleSubtask,
  deleteSubtask,
  setSubtaskDueDate,
  updateSubtaskText,
})

const updateDraftText = (value: string) => {
  draftText.value = value
}

const updateDraftCategory = (value: Category) => {
  draftCategory.value = value
}

const updateDraftDueDate = (value: string) => {
  draftDueDate.value = value
}

const updateNewSubtaskText = (value: string) => {
  newSubtaskText.value = value
}

const handleSubtaskDueDateChange = (payload: { id: number; dueDate: string }) => {
  updateSubtaskDueDate(payload.id, payload.dueDate)
}

const handleSubtaskTextChange = (payload: { id: number; text: string }) => {
  editSubtaskText(payload.id, payload.text)
}

const boardColumnsStyle = computed(() => {
  const currentCount = leftTasks.value.length
  const postponedCount = rightTasks.value.length

  if (currentCount <= postponedCount) {
    return {
      '--left-col': '1fr',
      '--right-col': '1fr',
    }
  }

  const shift = Math.min((currentCount - postponedCount) * 0.06, 0.3)
  const leftColumn = 1 + shift
  const rightColumn = 1 - shift

  return {
    '--left-col': `${leftColumn}fr`,
    '--right-col': `${rightColumn}fr`,
  }
})
</script>

<template>
  <main class="page">
    <header class="topbar">
      <div>
        <strong>{{ props.user.displayName }}</strong>
        <span class="login-name">@{{ props.user.username }}</span>
      </div>
      <button type="button" class="logout-btn" @click="emit('logout')">Выйти</button>
    </header>

    <section class="board" :style="boardColumnsStyle">
      <TaskColumn
        title="Текущие"
        :tasks="leftTasks"
        :get-task-subtasks="getSubtasksByTaskId"
        empty-text="Нажмите +, чтобы добавить задачу."
        show-add
        card-class="card-red"
        @add="openCreateModal('left')"
        @task-click="openEditModal"
      />

      <TaskColumn
        title="Отложенные"
        :tasks="rightTasks"
        :get-task-subtasks="getSubtasksByTaskId"
        empty-text="Нажмите +, чтобы добавить задачу."
        show-add
        card-class="card-yellow"
        @add="openCreateModal('right')"
        @task-click="openEditModal"
      />

      <TaskColumn
        title="решенные"
        :tasks="bottomTasks"
        :get-task-subtasks="getSubtasksByTaskId"
        empty-text="Пока задач нет."
        card-class="card-green bottom-card"
        compact
        @task-click="openEditModal"
      />
    </section>

    <TaskModal
      :is-open="isModalOpen"
      :is-edit-mode="isEditMode"
      :draft-text="draftText"
      :draft-category="draftCategory"
      :draft-due-date="draftDueDate"
      :new-subtask-text="newSubtaskText"
      :subtasks="activeSubtasks"
      :subtask-progress="subtaskProgress"
      :form-error="formError"
      :lane-hint="laneHint"
      :create-modal-title="createModalTitle"
      :move-options="moveOptions"
      @update:draft-text="updateDraftText"
      @update:draft-category="updateDraftCategory"
      @update:draft-due-date="updateDraftDueDate"
      @update:new-subtask-text="updateNewSubtaskText"
      @add-subtask="addSubtask"
      @toggle-subtask="toggleSubtaskStatus"
      @remove-subtask="removeSubtask"
      @subtask-due-date-change="handleSubtaskDueDateChange"
      @subtask-text-change="handleSubtaskTextChange"
      @save="save"
      @remove="remove"
      @close="closeModal"
    />
  </main>
</template>

<style scoped>
.page {
  min-height: 100vh;
  padding: 24px;
}

.topbar {
  max-width: 1100px;
  margin: 0 auto 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid #ddcda9;
  border-radius: 14px;
  padding: 12px 14px;
  background: #fffaf0;
}

.login-name {
  margin-left: 8px;
  color: #7a6f57;
  font-size: 13px;
}

.logout-btn {
  border: 1px solid #cfa468;
  border-radius: 10px;
  background: #f6e4c6;
  color: #55340f;
  padding: 8px 12px;
  cursor: pointer;
}

.board {
  max-width: 1100px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: minmax(0, var(--left-col, 1fr)) minmax(0, var(--right-col, 1fr));
  gap: 18px;
}

@media (max-width: 760px) {
  .page {
    padding: 12px;
  }

  .topbar {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .board {
    grid-template-columns: 1fr;
  }
}
</style>
