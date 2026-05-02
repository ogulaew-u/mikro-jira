<script setup lang="ts">
import { computed } from 'vue'
import SubtaskList from './SubtaskList.vue'
import type { Category, Subtask } from '../types/task'

interface MoveOption {
  label: string
  category: Category
}

const props = defineProps<{
  isOpen: boolean
  isEditMode: boolean
  draftText: string
  draftCategory: Category
  draftDueDate: string
  newSubtaskText: string
  subtasks: Subtask[]
  subtaskProgress: string
  formError: string
  laneHint: string
  createModalTitle: string
  moveOptions: MoveOption[]
}>()

const emit = defineEmits<{
  close: []
  save: []
  remove: []
  addSubtask: []
  toggleSubtask: [id: number]
  removeSubtask: [id: number]
  subtaskDueDateChange: [payload: { id: number; dueDate: string }]
  subtaskTextChange: [payload: { id: number; text: string }]
  'update:draftText': [value: string]
  'update:draftCategory': [value: Category]
  'update:draftDueDate': [value: string]
  'update:newSubtaskText': [value: string]
}>()

const textModel = computed({
  get: () => props.draftText,
  set: (value: string) => emit('update:draftText', value),
})

const dueDateModel = computed({
  get: () => props.draftDueDate,
  set: (value: string) => emit('update:draftDueDate', value),
})

const isSaveDisabled = computed(() => !props.draftText.trim())
</script>

<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="emit('close')">
    <div class="modal" role="dialog" aria-modal="true" aria-label="Задача">
      <h3>{{ isEditMode ? 'Редактировать задачу' : createModalTitle }}</h3>

      <div v-if="isEditMode" class="field">
        Перенаправить в
        <div class="move-actions">
          <button
            v-for="option in moveOptions"
            :key="option.category"
            type="button"
            class="btn move"
            :class="{ active: draftCategory === option.category }"
            @click="emit('update:draftCategory', option.category)"
          >
            {{ option.label }}
          </button>
        </div>
      </div>
      <p class="lane-hint">Попадет в: {{ laneHint }}</p>

      <label class="field">
        Текст задачи
        <textarea v-model="textModel" placeholder="Например: Подготовить спринт" rows="4" />
      </label>

      <label class="field">
        Срок
        <input v-model="dueDateModel" type="date" />
      </label>

      <SubtaskList
        v-if="isEditMode"
        :subtasks="subtasks"
        :progress-text="subtaskProgress"
        :new-subtask-text="newSubtaskText"
        @update:new-subtask-text="emit('update:newSubtaskText', $event)"
        @add="emit('addSubtask')"
        @toggle="emit('toggleSubtask', $event)"
        @remove="emit('removeSubtask', $event)"
        @due-date-change="emit('subtaskDueDateChange', $event)"
        @text-change="emit('subtaskTextChange', $event)"
      />

      <p v-if="formError" class="form-error">{{ formError }}</p>

      <div class="actions">
        <button v-if="isEditMode" type="button" class="btn delete" @click="emit('remove')">
          Удалить
        </button>
        <button type="button" class="btn save" :disabled="isSaveDisabled" @click="emit('save')">
          {{ isEditMode ? 'Сохранить изменения' : 'Сохранить' }}
        </button>
        <button type="button" class="btn close" @click="emit('close')">Закрыть</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: #1010108f;
  display: grid;
  place-items: center;
  padding: 20px;
}

.modal {
  width: min(560px, 100%);
  border-radius: 18px;
  border: 2px solid #202020;
  background: #fffaf2;
  padding: 18px;
  display: grid;
  gap: 14px;
  max-height: calc(100vh - 40px);
  overflow: auto;
}

.field {
  display: grid;
  gap: 6px;
  font-weight: 600;
}

textarea,
input[type='date'] {
  border-radius: 10px;
  border: 1px solid #202020;
  padding: 10px;
  font: inherit;
  background: #fff;
}

.actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.move-actions {
  display: flex;
  gap: 10px;
}

.form-error {
  color: #9b1b1b;
  font-size: 14px;
}

.lane-hint {
  font-size: 13px;
  opacity: 0.8;
}

.btn {
  border-radius: 10px;
  border: 1px solid #202020;
  padding: 8px 14px;
  font-size: 14px;
  cursor: pointer;
}

.btn.save {
  background: #d4f0c8;
}

.btn.delete {
  background: #f7c7c7;
}

.btn.close {
  background: #f5e5cf;
}

.btn.move {
  background: #f0ede7;
}

.btn.move.active {
  background: #d6e8ff;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

h3,
p {
  margin: 0;
}
</style>
