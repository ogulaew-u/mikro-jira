import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'
import { config } from './config.js'

const ensureDirForFile = (filePath) => {
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

ensureDirForFile(config.dbPath)

export const db = new Database(config.dbPath)
db.pragma('foreign_keys = ON')

const schemaSql = fs.readFileSync(config.schemaPath, 'utf-8')
db.exec(schemaSql)

const getOwnerRoleId = () => {
  const row = db.prepare('SELECT id FROM project_roles WHERE code = ?').get('owner')
  if (!row) {
    throw new Error('Role owner not found in DB seed data.')
  }

  return Number(row.id)
}

const createProjectKey = (userId) => `USR${String(userId).padStart(4, '0')}`

const createDefaultColumns = (boardId) => {
  const stmt = db.prepare(
    `INSERT OR IGNORE INTO board_columns (board_id, code, title, position, is_done_column)
     VALUES
       (?, 'current', 'Current', 0, 0),
       (?, 'deferred', 'Deferred', 1, 0),
       (?, 'solved', 'Solved', 2, 1)`
  )
  stmt.run(boardId, boardId, boardId)
}

export const ensureWorkspaceForUser = (userId) => {
  const existing = db
    .prepare(
      `SELECT b.id AS board_id
       FROM boards b
       JOIN projects p ON p.id = b.project_id
       JOIN project_members pm ON pm.project_id = p.id
       WHERE pm.user_id = ?
       ORDER BY b.id
       LIMIT 1`
    )
    .get(userId)

  if (existing?.board_id) {
    return Number(existing.board_id)
  }

  const tx = db.transaction(() => {
    const projectInsert = db
      .prepare(
        `INSERT INTO projects (owner_user_id, name, project_key)
         VALUES (?, ?, ?)`
      )
      .run(userId, 'My Project', createProjectKey(userId))

    const projectId = Number(projectInsert.lastInsertRowid)
    const roleId = getOwnerRoleId()

    db.prepare(
      `INSERT OR IGNORE INTO project_members (project_id, user_id, role_id)
       VALUES (?, ?, ?)`
    ).run(projectId, userId, roleId)

    const boardInsert = db
      .prepare(
        `INSERT INTO boards (project_id, name)
         VALUES (?, ?)`
      )
      .run(projectId, 'Main Board')
    const boardId = Number(boardInsert.lastInsertRowid)
    createDefaultColumns(boardId)

    return boardId
  })

  return tx()
}

export const getPrimaryBoardIdForUser = (userId) => {
  ensureWorkspaceForUser(userId)

  const row = db
    .prepare(
      `SELECT b.id AS board_id
       FROM boards b
       JOIN projects p ON p.id = b.project_id
       JOIN project_members pm ON pm.project_id = p.id
       WHERE pm.user_id = ?
       ORDER BY b.id
       LIMIT 1`
    )
    .get(userId)

  return row?.board_id ? Number(row.board_id) : null
}

export const columnCodes = new Set(['current', 'deferred', 'solved'])

export const normalizeColumnCode = (code) => (columnCodes.has(code) ? code : null)

export const getLaneByColumnCode = (code) => {
  if (code === 'current') return 'left'
  if (code === 'deferred') return 'right'
  return 'bottom'
}
