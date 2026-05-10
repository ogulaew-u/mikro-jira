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

- on start API automatic applies SQL-scheme from `docs/database/schema.sql`.
- base by default it is created in `data/mikro-jira.sqlite`.
- the front end goes to the API via the `vite` proxy along the path `/api`.
- Authorization: `register/login/refresh/logout` с access token + refresh cookie.
- option  `Запомнить меня` stored as persistent session in `auth_sessions`.
add new user:
 - curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","displayName":"Test User","password":"123456","rememberMe":false}'

look table:
node --input-type=module -e "import Database from 'better-sqlite3'; const db = new Database('data/mikro-jira.sqlite'); console.table(db.prepare('SELECT * FROM users').all())"