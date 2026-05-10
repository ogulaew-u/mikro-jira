import path from 'node:path'

const resolveFromRoot = (...segments) => path.resolve(process.cwd(), ...segments)
const isProduction = process.env.NODE_ENV === 'production'
const jwtSecret = process.env.JWT_SECRET ?? (isProduction ? '' : 'dev-only-change-me')

if (!jwtSecret) {
  throw new Error('JWT_SECRET is required in production.')
}

export const config = {
  port: Number(process.env.API_PORT ?? 3001),
  isProduction,
  jwtSecret,
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL ?? '20m',
  dbPath: process.env.DB_PATH ?? resolveFromRoot('data', 'mikro-jira.sqlite'),
  schemaPath: resolveFromRoot('docs', 'database', 'schema.sql'),
  allowedOrigin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173',
}
