<script setup lang="ts">
import { computed, ref } from 'vue'

interface LoginPayload {
  username: string
  password: string
  rememberMe: boolean
}

interface RegisterPayload extends LoginPayload {
  displayName: string
}

const props = defineProps<{
  errorMessage: string
  isSubmitting: boolean
}>()

const emit = defineEmits<{
  login: [payload: LoginPayload]
  register: [payload: RegisterPayload]
}>()

const mode = ref<'login' | 'register'>('login')
const username = ref('')
const displayName = ref('')
const password = ref('')
const confirmPassword = ref('')
const rememberMe = ref(true)
const localError = ref('')

const title = computed(() => (mode.value === 'login' ? 'Вход в mikro-jira' : 'Регистрация'))

const resetErrors = () => {
  localError.value = ''
}

const switchMode = (nextMode: 'login' | 'register') => {
  mode.value = nextMode
  resetErrors()
}

const submit = () => {
  resetErrors()

  const normalizedUsername = username.value.trim().toLocaleLowerCase()
  if (!normalizedUsername) {
    localError.value = 'Укажите логин.'
    return
  }

  if (!password.value) {
    localError.value = 'Укажите пароль.'
    return
  }

  if (mode.value === 'register') {
    const normalizedDisplayName = displayName.value.trim()
    if (!normalizedDisplayName) {
      localError.value = 'Укажите имя.'
      return
    }

    if (password.value !== confirmPassword.value) {
      localError.value = 'Пароли не совпадают.'
      return
    }

    emit('register', {
      username: normalizedUsername,
      displayName: normalizedDisplayName,
      password: password.value,
      rememberMe: rememberMe.value,
    })
    return
  }

  emit('login', {
    username: normalizedUsername,
    password: password.value,
    rememberMe: rememberMe.value,
  })
}
</script>

<template>
  <main class="auth-page">
    <section class="auth-card">
      <div class="mode-switch">
        <button
          type="button"
          class="switch-btn"
          :class="{ active: mode === 'login' }"
          @click="switchMode('login')"
        >
          Вход
        </button>
        <button
          type="button"
          class="switch-btn"
          :class="{ active: mode === 'register' }"
          @click="switchMode('register')"
        >
          Регистрация
        </button>
      </div>

      <h1>{{ title }}</h1>

      <form class="auth-form" @submit.prevent="submit">
        <label>
          Логин
          <input v-model.trim="username" type="text" autocomplete="username" />
        </label>

        <label v-if="mode === 'register'">
          Имя
          <input v-model.trim="displayName" type="text" autocomplete="name" />
        </label>

        <label>
          Пароль
          <input v-model="password" type="password" autocomplete="current-password" />
        </label>

        <label v-if="mode === 'register'">
          Подтверждение пароля
          <input v-model="confirmPassword" type="password" autocomplete="new-password" />
        </label>

        <label class="remember-row">
          <input v-model="rememberMe" type="checkbox" />
          <span>Запомнить меня</span>
        </label>

        <p v-if="localError || props.errorMessage" class="error-text">
          {{ localError || props.errorMessage }}
        </p>

        <button type="submit" class="submit-btn" :disabled="props.isSubmitting">
          {{ props.isSubmitting ? 'Проверяем...' : mode === 'login' ? 'Войти' : 'Создать аккаунт' }}
        </button>
      </form>
    </section>
  </main>
</template>

<style scoped>
.auth-page {
  min-height: 100vh;
  padding: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.auth-card {
  width: 100%;
  max-width: 420px;
  padding: 28px;
  border-radius: 20px;
  background: #fffaf0;
  box-shadow: 0 16px 40px rgba(89, 62, 26, 0.18);
  border: 1px solid #f1dfbf;
}

h1 {
  margin: 0 0 18px;
  font-size: 24px;
}

.mode-switch {
  display: grid;
  grid-template-columns: 1fr 1fr;
  background: #f5ead2;
  border-radius: 12px;
  padding: 4px;
  margin-bottom: 16px;
}

.switch-btn {
  border: 0;
  border-radius: 10px;
  padding: 8px 10px;
  font-size: 14px;
  background: transparent;
  cursor: pointer;
}

.switch-btn.active {
  background: #f0ce8c;
  color: #472f09;
  font-weight: 600;
}

.auth-form {
  display: grid;
  gap: 12px;
}

label {
  display: grid;
  gap: 6px;
  font-size: 14px;
  color: #463d2f;
}

input[type='text'],
input[type='password'] {
  width: 100%;
  border: 1px solid #d8c7a5;
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 14px;
}

.remember-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.error-text {
  margin: 0;
  color: #a92020;
  font-size: 13px;
}

.submit-btn {
  border: 0;
  border-radius: 10px;
  padding: 10px 12px;
  background: #c97e1a;
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.submit-btn:disabled {
  cursor: default;
  opacity: 0.7;
}
</style>
