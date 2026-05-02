<script setup lang="ts">
import TaskItem from './TaskItem.vue'
import type { Subtask, Task } from '../types/task'

withDefaults(
  defineProps<{
    title: string
    tasks: Task[]
    emptyText: string
    showAdd?: boolean
    cardClass?: string
    compact?: boolean
    getTaskSubtasks?: (taskId: number) => Subtask[]
  }>(),
  {
    showAdd: false,
    cardClass: '',
    compact: false,
    getTaskSubtasks: () => [],
  }
)

defineEmits<{
  add: []
  taskClick: [task: Task]
}>()
</script>

<template>
  <article class="card" :class="cardClass">
    <header v-if="showAdd" class="card-header">
      <h2>{{ title }}</h2>
      <button class="plus-btn" type="button" @click="$emit('add')">+</button>
    </header>
    <h2 v-else>{{ title }}</h2>

    <ul v-if="tasks.length" class="task-list" :class="{ compact }">
      <TaskItem
        v-for="task in tasks"
        :key="task.id"
        :task="task"
        :subtasks="getTaskSubtasks(task.id)"
        @click="$emit('taskClick', task)"
      />
    </ul>

    <p v-else class="empty">{{ emptyText }}</p>
  </article>
</template>

<style scoped>
.card {
  border-radius: 20px;
  border: 2px solid #202020;
  padding: 18px;
  box-sizing: border-box;
  min-height: 260px;
}

.card-red {
  background: #f2c0bc;
}

.card-yellow {
  background: #f6e79b;
}

.card-green {
  background: #c9e9ba;
}

.bottom-card {
  grid-column: 1 / -1;
  min-height: 230px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

h2,
p {
  margin: 0;
}

.plus-btn {
  width: 84px;
  height: 84px;
  border-radius: 20px;
  border: 2px solid #202020;
  background: #ffffffc7;
  font-size: 54px;
  line-height: 1;
  cursor: pointer;
}

.task-list {
  list-style: none;
  margin: 14px 0 0;
  padding: 0;
  display: grid;
  gap: 10px;
}

.empty {
  margin-top: 14px;
  opacity: 0.75;
}

@media (max-width: 760px) {
  .bottom-card {
    grid-column: auto;
  }

  .plus-btn {
    width: 72px;
    height: 72px;
    font-size: 48px;
  }
}
</style>
