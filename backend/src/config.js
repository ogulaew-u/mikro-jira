import path from 'node:path'

const resolveFromRoot = (...segments) => path.resolve(process.cwd(), ...segments)

export const config = {
  port: Number(process.env.API_PORT ?? 3001),
  jwtSecret: process.env.JWT_SECRET ?? 'dev-only-change-me',
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL ?? '20m',
  dbPath: process.env.DB_PATH ?? resolveFromRoot('data', 'mikro-jira.sqlite'),
  schemaPath: resolveFromRoot('docs', 'database', 'schema.sql'),
  allowedOrigin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173',
}
