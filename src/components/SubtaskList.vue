<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Subtask } from '../types/task'

const props = defineProps<{
  subtasks: Subtask[]
  progressText: string
  newSubtaskText: string
}>()

const emit = defineEmits<{
  add: []
  toggle: [id: number]
  remove: [id: number]
  dueDateChange: [payload: { id: number; dueDate: string }]
  textChange: [payload: { id: number; text: string }]
  'update:newSubtaskText': [value: string]
}>()

const newSubtaskModel = computed({
  get: () => props.newSubtaskText,
  set: (value: string) => emit('update:newSubtaskText', value),
})

const canAdd = computed(() => !!props.newSubtaskText.trim())

const editingSubtaskId = ref<number | null>(null)
const editingText = ref('')

const startEdit = (subtask: Subtask) => {
  editingSubtaskId.value = subtask.id
  editingText.value = subtask.text
}

const cancelEdit = () => {
  editingSubtaskId.value = null
  editingText.value = ''
}

const saveEdit = () => {
  if (editingSubtaskId.value === null) {
    return
  }

  const text = editingText.value.trim()
  if (!text) {
    cancelEdit()
    return
  }

  emit('textChange', { id: editingSubtaskId.value, text })
  cancelEdit()
}
</script>

<template>
  <div class="subtasks">
    <div class="subtasks-head">
      <span>Подзадачи</span>
      <small>{{ progressText }}</small>
    </div>

    <div class="subtask-create">
      <input
        v-model="newSubtaskModel"
        type="text"
        placeholder="Новая подзадача"
        @keydown.enter.prevent="emit('add')"
      />
      <button type="button" class="btn add" :disabled="!canAdd" @click="emit('add')">Добавить</button>
    </div>

    <ul v-if="subtasks.length" class="subtask-list">
      <li v-for="subtask in subtasks" :key="subtask.id" class="subtask-item">
        <div class="subtask-row">
          <div class="subtask-main">
            <input
              :id="`subtask-toggle-${subtask.id}`"
              type="checkbox"
              :checked="subtask.status === 'done'"
              @change="emit('toggle', subtask.id)"
            />
            <span
              v-if="editingSubtaskId !== subtask.id"
              :class="{ done: subtask.status === 'done' }"
              class="editable-text"
              @click="startEdit(subtask)"
            >
              {{ subtask.text }}
            </span>
            <input
              v-else
              v-model="editingText"
              type="text"
              class="edit-input"
              @keydown.enter.prevent="saveEdit"
              @keydown.esc.prevent="cancelEdit"
              @blur="saveEdit"
            />
          </div>
          <button type="button" class="btn delete-mini" @click="emit('remove', subtask.id)">Удалить</button>
        </div>

        <div class="subtask-date">
          <small>Срок (необязательно):</small>
          <input
            type="date"
            :value="subtask.dueDate"
            @input="emit('dueDateChange', { id: subtask.id, dueDate: ($event.target as HTMLInputElement).value })"
          />
        </div>
      </li>
    </ul>
    <p v-else class="subtask-empty">Пока нет подзадач.</p>
  </div>
</template>

<style scoped>
.subtasks {
  border: 1px solid #202020;
  border-radius: 12px;
  padding: 10px;
  display: grid;
  gap: 10px;
  background: #fff;
}

.subtasks-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-weight: 600;
}

.subtask-create {
  display: flex;
  gap: 8px;
}

.subtask-create input {
  flex: 1;
  min-width: 0;
  border-radius: 10px;
  border: 1px solid #202020;
  padding: 8px 10px;
  font: inherit;
}

.subtask-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 10px;
}

.subtask-item {
  border: 1px solid #ddd;
  border-radius: 10px;
  padding: 8px;
  display: grid;
  gap: 6px;
}

.subtask-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.subtask-main {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex: 1;
}

.subtask-main span {
  word-break: break-word;
}

.subtask-main span.done {
  text-decoration: line-through;
  opacity: 0.7;
}

.editable-text {
  cursor: text;
}

.edit-input {
  border-radius: 8px;
  border: 1px solid #202020;
  padding: 4px 8px;
  font: inherit;
  width: 100%;
}

.subtask-date {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.subtask-date input {
  border-radius: 8px;
  border: 1px solid #202020;
  padding: 4px 8px;
  font: inherit;
}

.subtask-empty {
  margin: 0;
  opacity: 0.7;
}

.btn.add {
  background: #e6f5df;
}

.btn.delete-mini {
  background: #f7d6d6;
  padding: 5px 10px;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn {
  border-radius: 10px;
  border: 1px solid #202020;
  padding: 8px 10px;
  font-size: 13px;
  cursor: pointer;
}
</style>
