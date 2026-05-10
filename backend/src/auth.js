import crypto from 'node:crypto'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { config } from './config.js'
import { db } from './db.js'

const hashToken = (value) => crypto.createHash('sha256').update(value).digest('hex')

const nowIso = () => new Date().toISOString()

const toIsoWithDays = (days) => {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString()
}

const issueAccessToken = (user) =>
  jwt.sign(
    {
      userId: user.id,
      username: user.username,
      displayName: user.display_name,
    },
    config.jwtSecret,
    {
      expiresIn: config.accessTokenTtl,
    }
  )

const buildPublicUser = (row) => ({
  id: Number(row.id),
  username: row.username,
  displayName: row.display_name,
  createdAt: Number(new Date(row.created_at)),
})

const setRefreshCookie = (res, token, rememberMe) => {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'lax',
    path: '/api/auth',
    ...(rememberMe ? { maxAge: 30 * 24 * 60 * 60 * 1000 } : {}),
  })
}

const clearRefreshCookie = (res) => {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'lax',
    path: '/api/auth',
  })
}

const createSession = ({ userId, rememberMe, userAgent, ipAddress }) => {
  const refreshToken = crypto.randomBytes(48).toString('hex')
  const refreshTokenHash = hashToken(refreshToken)
  const expiresAt = rememberMe ? toIsoWithDays(30) : toIsoWithDays(1)

  db.prepare(
    `INSERT INTO auth_sessions (user_id, refresh_token_hash, is_persistent, user_agent, ip_address, expires_at, last_used_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(userId, refreshTokenHash, rememberMe ? 1 : 0, userAgent ?? null, ipAddress ?? null, expiresAt, nowIso())

  return { refreshToken, expiresAt }
}

export const verifyPassword = (plainPassword, hash) => bcrypt.compareSync(plainPassword, hash)
export const hashPassword = (plainPassword) => bcrypt.hashSync(plainPassword, 10)
export const getPublicUser = buildPublicUser

export const loginResponse = ({ res, user, rememberMe, userAgent, ipAddress }) => {
  const session = createSession({
    userId: Number(user.id),
    rememberMe,
    userAgent,
    ipAddress,
  })
  setRefreshCookie(res, session.refreshToken, rememberMe)

  return {
    accessToken: issueAccessToken(user),
    user: buildPublicUser(user),
  }
}

export const refreshAccessToken = ({ req, res }) => {
  const refreshToken = req.cookies?.refreshToken
  if (!refreshToken) {
    return null
  }

  const refreshTokenHash = hashToken(refreshToken)
  const session = db
    .prepare(
      `SELECT s.id, s.user_id, s.is_persistent, s.expires_at, u.id AS user_real_id, u.username, u.display_name, u.created_at
       FROM auth_sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.refresh_token_hash = ?
         AND s.revoked_at IS NULL
         AND datetime(s.expires_at) > datetime('now')
         AND u.is_active = 1
       LIMIT 1`
    )
    .get(refreshTokenHash)

  if (!session) {
    clearRefreshCookie(res)
    return null
  }

  const nextToken = crypto.randomBytes(48).toString('hex')
  const nextTokenHash = hashToken(nextToken)
  const rememberMe = Number(session.is_persistent) === 1
  const nextExpiresAt = rememberMe ? toIsoWithDays(30) : toIsoWithDays(1)

  db.prepare(
    `UPDATE auth_sessions
     SET refresh_token_hash = ?, expires_at = ?, last_used_at = ?
     WHERE id = ?`
  ).run(nextTokenHash, nextExpiresAt, nowIso(), Number(session.id))

  setRefreshCookie(res, nextToken, rememberMe)

  const user = {
    id: Number(session.user_real_id),
    username: session.username,
    display_name: session.display_name,
    created_at: session.created_at,
  }

  return {
    accessToken: issueAccessToken(user),
    user: buildPublicUser(user),
  }
}

export const revokeRefreshSession = ({ req, res }) => {
  const refreshToken = req.cookies?.refreshToken
  if (refreshToken) {
    const refreshTokenHash = hashToken(refreshToken)
    db.prepare(
      `UPDATE auth_sessions
       SET revoked_at = COALESCE(revoked_at, ?)
       WHERE refresh_token_hash = ?`
    ).run(nowIso(), refreshTokenHash)
  }

  clearRefreshCookie(res)
}

export const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const token = authHeader.slice('Bearer '.length)

  try {
    const payload = jwt.verify(token, config.jwtSecret)
    req.auth = {
      userId: Number(payload.userId),
      username: String(payload.username ?? ''),
      displayName: String(payload.displayName ?? ''),
    }
    next()
  } catch {
    res.status(401).json({ error: 'Unauthorized' })
  }
}
