import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { config } from './config.js'
import {
  db,
  ensureWorkspaceForUser,
  getCategoryByColumnCode,
  getColumnCodeByCategory,
  getLaneByCategory,
  getPrimaryBoardIdForUser,
} from './db.js'
import {
  authMiddleware,
  getPublicUser,
  hashPassword,
  loginResponse,
  refreshAccessToken,
  revokeRefreshSession,
  verifyPassword,
} from './auth.js'

const app = express()

app.use(
  cors({
    origin: config.allowedOrigin,
    credentials: true,
  })
)
app.use(express.json())
app.use(cookieParser())

const getUserByUsername = db.prepare('SELECT * FROM users WHERE username = ? LIMIT 1')
const getUserCredentials = db.prepare(
  'SELECT * FROM user_password_credentials WHERE user_id = ? LIMIT 1'
)
const getUserById = db.prepare('SELECT * FROM users WHERE id = ? LIMIT 1')

const getColumnIdByCode = db.prepare(
  `SELECT id
   FROM board_columns
   WHERE board_id = ? AND code = ?
   LIMIT 1`
)

const parseTaskRow = (row) => {
  const category = getCategoryByColumnCode(row.column_code)
  return {
    id: Number(row.id),
    text: row.title,
    category,
    lane: getLaneByCategory(category),
    dueDate: row.due_date ?? '',
  }
}

const parseSubtaskRow = (row) => ({
  id: Number(row.id),
  taskId: Number(row.task_id),
  text: row.title,
  status: row.status,
  createdAt: Number(new Date(row.created_at)),
  dueDate: row.due_date ?? '',
})

const ensureTaskBelongsToUser = (taskId, userId) =>
  db
    .prepare(
      `SELECT t.id
       FROM tasks t
       JOIN boards b ON b.id = t.board_id
       JOIN projects p ON p.id = b.project_id
       JOIN project_members pm ON pm.project_id = p.id
       WHERE t.id = ? AND pm.user_id = ?
       LIMIT 1`
    )
    .get(taskId, userId)

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.post('/api/auth/register', (req, res) => {
  const username = String(req.body?.username ?? '')
    .trim()
    .toLowerCase()
  const displayName = String(req.body?.displayName ?? '').trim()
  const password = String(req.body?.password ?? '')
  const rememberMe = Boolean(req.body?.rememberMe)

  if (username.length < 3) {
    res.status(400).json({ error: 'Логин должен быть не короче 3 символов.' })
    return
  }

  if (displayName.length < 2) {
    res.status(400).json({ error: 'Имя должно быть не короче 2 символов.' })
    return
  }

  if (password.length < 6) {
    res.status(400).json({ error: 'Пароль должен быть не короче 6 символов.' })
    return
  }

  const existing = getUserByUsername.get(username)
  if (existing) {
    res.status(409).json({ error: 'Пользователь с таким логином уже существует.' })
    return
  }

  const tx = db.transaction(() => {
    const userInsert = db
      .prepare(
        `INSERT INTO users (username, display_name, is_active)
         VALUES (?, ?, 1)`
      )
      .run(username, displayName)
    const userId = Number(userInsert.lastInsertRowid)

    db.prepare(
      `INSERT INTO user_password_credentials (user_id, password_hash)
       VALUES (?, ?)`
    ).run(userId, hashPassword(password))

    ensureWorkspaceForUser(userId)

    return getUserById.get(userId)
  })

  const user = tx()
  const payload = loginResponse({
    res,
    user,
    rememberMe,
    userAgent: req.headers['user-agent'],
    ipAddress: req.ip,
  })

  res.status(201).json(payload)
})

app.post('/api/auth/login', (req, res) => {
  const username = String(req.body?.username ?? '')
    .trim()
    .toLowerCase()
  const password = String(req.body?.password ?? '')
  const rememberMe = Boolean(req.body?.rememberMe)

  const user = getUserByUsername.get(username)
  if (!user || Number(user.is_active) !== 1) {
    res.status(401).json({ error: 'Неверный логин или пароль.' })
    return
  }

  const credentials = getUserCredentials.get(Number(user.id))
  if (!credentials || !verifyPassword(password, credentials.password_hash)) {
    res.status(401).json({ error: 'Неверный логин или пароль.' })
    return
  }

  ensureWorkspaceForUser(Number(user.id))

  const payload = loginResponse({
    res,
    user,
    rememberMe,
    userAgent: req.headers['user-agent'],
    ipAddress: req.ip,
  })

  res.json(payload)
})

app.post('/api/auth/refresh', (req, res) => {
  const payload = refreshAccessToken({ req, res })
  if (!payload) {
    res.status(401).json({ error: 'Сессия не найдена.' })
    return
  }

  res.json(payload)
})

app.post('/api/auth/logout', (req, res) => {
  revokeRefreshSession({ req, res })
  res.status(204).end()
})

app.get('/api/me', authMiddleware, (req, res) => {
  const user = getUserById.get(req.auth.userId)
  if (!user) {
    res.status(404).json({ error: 'Пользователь не найден.' })
    return
  }

  res.json({ user: getPublicUser(user) })
})

app.get('/api/tasks', authMiddleware, (req, res) => {
  const boardId = getPrimaryBoardIdForUser(req.auth.userId)
  if (!boardId) {
    res.json({ tasks: [] })
    return
  }

  const rows = db
    .prepare(
      `SELECT t.id, t.title, t.due_date, c.code AS column_code
       FROM tasks t
       JOIN board_columns c ON c.id = t.column_id
       WHERE t.board_id = ? AND t.archived_at IS NULL
       ORDER BY c.position ASC, t.sort_order ASC, t.id ASC`
    )
    .all(boardId)

  res.json({ tasks: rows.map(parseTaskRow) })
})

app.post('/api/tasks', authMiddleware, (req, res) => {
  const text = String(req.body?.text ?? '').trim()
  const category = String(req.body?.category ?? '')
  const dueDate = String(req.body?.dueDate ?? '')

  if (!text) {
    res.status(400).json({ error: 'Текст задачи обязателен.' })
    return
  }

  const boardId = getPrimaryBoardIdForUser(req.auth.userId)
  if (!boardId) {
    res.status(400).json({ error: 'Board not found.' })
    return
  }

  const columnCode = getColumnCodeByCategory(category)
  const column = getColumnIdByCode.get(boardId, columnCode)
  if (!column?.id) {
    res.status(400).json({ error: 'Колонка не найдена.' })
    return
  }

  const duplicate = db
    .prepare(
      `SELECT id
       FROM tasks
       WHERE board_id = ? AND column_id = ? AND lower(title) = lower(?) AND archived_at IS NULL
       LIMIT 1`
    )
    .get(boardId, Number(column.id), text)
  if (duplicate) {
    res.status(409).json({ error: 'Такая задача с этой категорией уже существует. Измените текст.' })
    return
  }

  const maxSortRow = db
    .prepare('SELECT COALESCE(MAX(sort_order), 0) AS max_order FROM tasks WHERE board_id = ? AND column_id = ?')
    .get(boardId, Number(column.id))
  const nextSort = Number(maxSortRow.max_order ?? 0) + 1

  const insert = db
    .prepare(
      `INSERT INTO tasks (board_id, column_id, creator_user_id, title, due_date, sort_order)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(boardId, Number(column.id), req.auth.userId, text, dueDate || null, nextSort)

  const row = db
    .prepare(
      `SELECT t.id, t.title, t.due_date, c.code AS column_code
       FROM tasks t
       JOIN board_columns c ON c.id = t.column_id
       WHERE t.id = ?`
    )
    .get(Number(insert.lastInsertRowid))

  res.status(201).json({ task: parseTaskRow(row) })
})

app.patch('/api/tasks/:taskId', authMiddleware, (req, res) => {
  const taskId = Number(req.params.taskId)
  if (!Number.isFinite(taskId)) {
    res.status(400).json({ error: 'Неверный task id.' })
    return
  }

  const ownsTask = ensureTaskBelongsToUser(taskId, req.auth.userId)
  if (!ownsTask) {
    res.status(404).json({ error: 'Задача не найдена.' })
    return
  }

  const text = String(req.body?.text ?? '').trim()
  const category = String(req.body?.category ?? '')
  const dueDate = String(req.body?.dueDate ?? '')

  if (!text) {
    res.status(400).json({ error: 'Текст задачи обязателен.' })
    return
  }

  const boardId = getPrimaryBoardIdForUser(req.auth.userId)
  const columnCode = getColumnCodeByCategory(category)
  const column = getColumnIdByCode.get(boardId, columnCode)
  if (!column?.id) {
    res.status(400).json({ error: 'Колонка не найдена.' })
    return
  }

  const duplicate = db
    .prepare(
      `SELECT id
       FROM tasks
       WHERE board_id = ? AND column_id = ? AND lower(title) = lower(?) AND id <> ? AND archived_at IS NULL
       LIMIT 1`
    )
    .get(boardId, Number(column.id), text, taskId)
  if (duplicate) {
    res.status(409).json({ error: 'Такая задача с этой категорией уже существует. Измените текст.' })
    return
  }

  db.prepare(
    `UPDATE tasks
     SET title = ?, due_date = ?, column_id = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).run(text, dueDate || null, Number(column.id), taskId)

  const row = db
    .prepare(
      `SELECT t.id, t.title, t.due_date, c.code AS column_code
       FROM tasks t
       JOIN board_columns c ON c.id = t.column_id
       WHERE t.id = ?`
    )
    .get(taskId)
  res.json({ task: parseTaskRow(row) })
})

app.delete('/api/tasks/:taskId', authMiddleware, (req, res) => {
  const taskId = Number(req.params.taskId)
  if (!Number.isFinite(taskId)) {
    res.status(400).json({ error: 'Неверный task id.' })
    return
  }

  const ownsTask = ensureTaskBelongsToUser(taskId, req.auth.userId)
  if (!ownsTask) {
    res.status(404).json({ error: 'Задача не найдена.' })
    return
  }

  db.prepare('DELETE FROM tasks WHERE id = ?').run(taskId)
  res.status(204).end()
})

app.get('/api/tasks/:taskId/subtasks', authMiddleware, (req, res) => {
  const taskId = Number(req.params.taskId)
  if (!Number.isFinite(taskId)) {
    res.status(400).json({ error: 'Неверный task id.' })
    return
  }

  const ownsTask = ensureTaskBelongsToUser(taskId, req.auth.userId)
  if (!ownsTask) {
    res.status(404).json({ error: 'Задача не найдена.' })
    return
  }

  const rows = db
    .prepare(
      `SELECT id, task_id, title, status, due_date, created_at
       FROM subtasks
       WHERE task_id = ?
       ORDER BY CASE WHEN status = 'todo' THEN 0 ELSE 1 END, sort_order ASC, id ASC`
    )
    .all(taskId)

  res.json({ subtasks: rows.map(parseSubtaskRow) })
})

app.post('/api/tasks/:taskId/subtasks', authMiddleware, (req, res) => {
  const taskId = Number(req.params.taskId)
  const text = String(req.body?.text ?? '').trim()
  if (!Number.isFinite(taskId)) {
    res.status(400).json({ error: 'Неверный task id.' })
    return
  }
  if (!text) {
    res.status(400).json({ error: 'Текст подзадачи обязателен.' })
    return
  }

  const ownsTask = ensureTaskBelongsToUser(taskId, req.auth.userId)
  if (!ownsTask) {
    res.status(404).json({ error: 'Задача не найдена.' })
    return
  }

  const maxSortRow = db
    .prepare('SELECT COALESCE(MAX(sort_order), 0) AS max_order FROM subtasks WHERE task_id = ?')
    .get(taskId)
  const nextSort = Number(maxSortRow.max_order ?? 0) + 1

  const insert = db
    .prepare(
      `INSERT INTO subtasks (task_id, title, status, due_date, sort_order)
       VALUES (?, ?, 'todo', NULL, ?)`
    )
    .run(taskId, text, nextSort)

  const row = db
    .prepare(
      `SELECT id, task_id, title, status, due_date, created_at
       FROM subtasks
       WHERE id = ?`
    )
    .get(Number(insert.lastInsertRowid))

  res.status(201).json({ subtask: parseSubtaskRow(row) })
})

app.patch('/api/subtasks/:subtaskId', authMiddleware, (req, res) => {
  const subtaskId = Number(req.params.subtaskId)
  if (!Number.isFinite(subtaskId)) {
    res.status(400).json({ error: 'Неверный subtask id.' })
    return
  }

  const row = db
    .prepare(
      `SELECT s.id, s.task_id
       FROM subtasks s
       JOIN tasks t ON t.id = s.task_id
       JOIN boards b ON b.id = t.board_id
       JOIN projects p ON p.id = b.project_id
       JOIN project_members pm ON pm.project_id = p.id
       WHERE s.id = ? AND pm.user_id = ?
       LIMIT 1`
    )
    .get(subtaskId, req.auth.userId)

  if (!row) {
    res.status(404).json({ error: 'Подзадача не найдена.' })
    return
  }

  const text = req.body?.text
  const status = req.body?.status
  const dueDate = req.body?.dueDate

  const updates = []
  const params = []

  if (typeof text === 'string' && text.trim()) {
    updates.push('title = ?')
    params.push(text.trim())
  }

  if (status === 'todo' || status === 'done') {
    updates.push('status = ?')
    params.push(status)
    updates.push(`completed_at = ${status === 'done' ? "datetime('now')" : 'NULL'}`)
  }

  if (typeof dueDate === 'string') {
    updates.push('due_date = ?')
    params.push(dueDate || null)
  }

  if (!updates.length) {
    res.status(400).json({ error: 'Нет данных для обновления.' })
    return
  }

  updates.push("updated_at = datetime('now')")

  db.prepare(
    `UPDATE subtasks
     SET ${updates.join(', ')}
     WHERE id = ?`
  ).run(...params, subtaskId)

  const updated = db
    .prepare(
      `SELECT id, task_id, title, status, due_date, created_at
       FROM subtasks
       WHERE id = ?`
    )
    .get(subtaskId)

  res.json({ subtask: parseSubtaskRow(updated) })
})

app.delete('/api/subtasks/:subtaskId', authMiddleware, (req, res) => {
  const subtaskId = Number(req.params.subtaskId)
  if (!Number.isFinite(subtaskId)) {
    res.status(400).json({ error: 'Неверный subtask id.' })
    return
  }

  const row = db
    .prepare(
      `SELECT s.id
       FROM subtasks s
       JOIN tasks t ON t.id = s.task_id
       JOIN boards b ON b.id = t.board_id
       JOIN projects p ON p.id = b.project_id
       JOIN project_members pm ON pm.project_id = p.id
       WHERE s.id = ? AND pm.user_id = ?
       LIMIT 1`
    )
    .get(subtaskId, req.auth.userId)

  if (!row) {
    res.status(404).json({ error: 'Подзадача не найдена.' })
    return
  }

  db.prepare('DELETE FROM subtasks WHERE id = ?').run(subtaskId)
  res.status(204).end()
})

app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: 'Internal server error' })
})

app.listen(config.port, () => {
  console.log(`API listening on http://localhost:${config.port}`)
  console.log(`SQLite DB: ${config.dbPath}`)
})
