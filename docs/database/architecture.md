# Database Architecture (SQLite) for mikro-jira

## Goals
- Prepare the project for username/password authentication.
- Keep the data model normalized for safe future scaling.
- Preserve compatibility with the current task/subtask domain.

## Normalization Summary
- **1NF**: atomic fields only (`title`, `status`, `due_date`), no list values in a single column.
- **2NF**: junction tables (`project_members`, `task_tags`) depend on full composite keys.
- **3NF**: lookup values are isolated (`project_roles`, `task_priorities`) to avoid duplication.

## Entity Structure
- `users`: base user profile.
- `user_password_credentials`: password hash and login state (failed attempts, lock window).
- `auth_sessions`: refresh-session storage for JWT/cookie auth, including persistent "remember me" sessions.
- `projects`: top-level workspace container.
- `project_members` + `project_roles`: project membership and permissions.
- `boards`: boards inside a project.
- `board_columns`: board columns (maps current/deferred/solved states).
- `tasks`: tasks assigned to a board column.
- `subtasks`: child items for tasks.
- `tags` + `task_tags`: project tags and many-to-many task tagging.

## Why This Scales
- New auth providers can be added without breaking `users`.
- Multiple boards and custom column sets are naturally supported.
- Roles and priorities grow through lookup tables, not schema rewrites.

## Current UI Mapping -> DB
- `Category` -> `board_columns.code/title`
- `Task` -> `tasks` (`column_id` replaces `lane/category`)
- `Subtask` -> `subtasks`
- `localStorage` -> SQLite via backend API

## Next Steps
1. Add backend runtime (Node.js + Fastify/Express) and SQLite driver (`better-sqlite3` or `sqlite`).
2. Run `docs/database/schema.sql` on startup or via migrations.
3. Implement auth endpoints: `POST /auth/register`, `POST /auth/login` (with `remember_me` flag), `POST /auth/refresh`, `POST /auth/logout`.
4. Add auth middleware and access checks by `project_id`.
5. Move current task/subtask operations from localStorage into REST endpoints.
6. Optionally add a one-time import from existing localStorage data.
