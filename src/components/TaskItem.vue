<script setup lang="ts">
import { categoryLabels } from '../types/task'
import type { Subtask, Task } from '../types/task'

withDefaults(
  defineProps<{
    task: Task
    subtasks?: Subtask[]
  }>(),
  {
    subtasks: () => [],
  }
)

defineEmits<{
  click: []
}>()

const formatDueDate = (value: string) => {
  if (!value) {
    return 'Не задан'
  }

  const [year, month, day] = value.split('-')
  if (!year || !month || !day) {
    return value
  }

  return `${day}.${month}.${year}`
}

const formatSubtaskDueDate = (value: string) => {
  if (!value) {
    return ''
  }

  return ` (до ${formatDueDate(value)})`
}
</script>

<template>
  <li class="task-item clickable" @click="$emit('click')">
    <span class="task-category">{{ categoryLabels[task.category] }}</span>
    <p>{{ task.text }}</p>
    <small>Срок: {{ formatDueDate(task.dueDate) }}</small>

    <div v-if="subtasks.length" class="subtasks-preview">
      <small class="subtasks-title">Подзадачи:</small>
      <ul>
        <li
          v-for="subtask in subtasks.slice(0, 3)"
          :key="subtask.id"
          :class="{ done: subtask.status === 'done' }"
        >
          {{ subtask.text }}{{ formatSubtaskDueDate(subtask.dueDate) }}
        </li>
      </ul>
      <small v-if="subtasks.length > 3">+ еще {{ subtasks.length - 3 }}</small>
    </div>
  </li>
</template>

<style scoped>
.task-item {
  border-radius: 14px;
  border: 1px solid #202020;
  background: #ffffffa8;
  padding: 10px;
  display: grid;
  gap: 6px;
}

.task-item.clickable {
  cursor: pointer;
}

.task-category {
  display: inline-block;
  width: fit-content;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid #202020;
  background: #fff;
  font-size: 12px;
}

p {
  margin: 0;
}

small {
  opacity: 0.75;
}

.subtasks-preview {
  margin-top: 4px;
}

.subtasks-title {
  display: block;
  margin-bottom: 4px;
}

.subtasks-preview ul {
  margin: 0;
  padding-left: 18px;
}

.subtasks-preview li {
  font-size: 12px;
}

.subtasks-preview li.done {
  text-decoration: line-through;
  opacity: 0.7;
}
</style>
