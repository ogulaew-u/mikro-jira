<script setup lang="ts">
import { ref } from 'vue'
import AuthScreen from './components/AuthScreen.vue'
import BoardView from './components/BoardView.vue'
import { useAuth } from './composables/useAuth'

const { currentUser, isReady, isAuthenticated, register, login, logout } = useAuth()
const authError = ref('')
const isSubmitting = ref(false)

const handleRegister = async (payload: {
  username: string
  displayName: string
  password: string
  rememberMe: boolean
}) => {
  authError.value = ''
  isSubmitting.value = true

  const result = await register(payload)
  isSubmitting.value = false
  if (!result.ok) {
    authError.value = result.error ?? 'Не удалось зарегистрироваться.'
  }
}

const handleLogin = async (payload: { username: string; password: string; rememberMe: boolean }) => {
  authError.value = ''
  isSubmitting.value = true

  const result = await login(payload)
  isSubmitting.value = false
  if (!result.ok) {
    authError.value = result.error ?? 'Не удалось войти.'
  }
}

const handleLogout = async () => {
  await logout()
  authError.value = ''
}
</script>

<template>
  <div v-if="!isReady" class="splash">Загрузка...</div>

  <AuthScreen
    v-else-if="!isAuthenticated"
    :error-message="authError"
    :is-submitting="isSubmitting"
    @register="handleRegister"
    @login="handleLogin"
  />

  <BoardView v-else-if="currentUser" :key="currentUser.id" :user="currentUser" @logout="handleLogout" />
</template>

<style scoped>
.splash {
  min-height: 100vh;
  display: grid;
  place-items: center;
  color: #675f52;
}
</style>
