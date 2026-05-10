# mikro-jira

Vue 3 + TypeScript frontend и Node.js API на Express + SQLite.

## Запуск

1. Создайте `.env` на основе `.env.example`.
2. Запустите API:

```bash
npm run dev:api
```

3. В другом терминале запустите frontend:

```bash
npm run dev
```

Frontend: `http://localhost:5173`
API: `http://localhost:3001`

## Детали

- При старте API автоматически применяет SQL-схему из `docs/database/schema.sql`.
- База по умолчанию создается в `data/mikro-jira.sqlite`.
- Frontend ходит к API через Vite proxy по пути `/api`.
- Авторизация: `register/login/refresh/logout` с access token и refresh cookie.
- Опция "Запомнить меня" хранится как постоянная сессия в `auth_sessions`.
