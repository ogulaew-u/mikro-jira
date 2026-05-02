PRAGMA foreign_keys = ON;

-- -----------------------------
-- AUTH / USERS
-- -----------------------------

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  email TEXT UNIQUE,
  display_name TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Passwords are stored separately so auth methods can be extended later.
CREATE TABLE IF NOT EXISTS user_password_credentials (
  user_id INTEGER PRIMARY KEY,
  password_hash TEXT NOT NULL,
  password_algo TEXT NOT NULL DEFAULT 'argon2id',
  password_changed_at TEXT NOT NULL DEFAULT (datetime('now')),
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Refresh-session storage for JWT/cookie auth and remember-me sessions.
CREATE TABLE IF NOT EXISTS auth_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  refresh_token_hash TEXT NOT NULL UNIQUE,
  is_persistent INTEGER NOT NULL DEFAULT 0 CHECK (is_persistent IN (0, 1)),
  user_agent TEXT,
  ip_address TEXT,
  expires_at TEXT NOT NULL,
  last_used_at TEXT,
  revoked_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires_at ON auth_sessions(expires_at);

-- -----------------------------
-- PROJECT STRUCTURE
-- -----------------------------

CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  project_key TEXT NOT NULL UNIQUE,
  is_archived INTEGER NOT NULL DEFAULT 0 CHECK (is_archived IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS project_roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE, -- owner, admin, member, viewer
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS project_members (
  project_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  role_id INTEGER NOT NULL,
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (project_id, user_id),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES project_roles(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_project_members_role_id ON project_members(role_id);

CREATE TABLE IF NOT EXISTS boards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_boards_project_id ON boards(project_id);

-- Current UI categories map naturally into board columns:
-- current, deferred, solved
CREATE TABLE IF NOT EXISTS board_columns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  board_id INTEGER NOT NULL,
  code TEXT NOT NULL, -- current, deferred, solved
  title TEXT NOT NULL,
  position INTEGER NOT NULL CHECK (position >= 0),
  is_done_column INTEGER NOT NULL DEFAULT 0 CHECK (is_done_column IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (board_id, code),
  UNIQUE (board_id, position),
  FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_board_columns_board_id ON board_columns(board_id);

-- -----------------------------
-- TASK DOMAIN
-- -----------------------------

CREATE TABLE IF NOT EXISTS task_priorities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE, -- low, medium, high, urgent
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  board_id INTEGER NOT NULL,
  column_id INTEGER NOT NULL,
  creator_user_id INTEGER NOT NULL,
  assignee_user_id INTEGER,
  priority_id INTEGER,
  title TEXT NOT NULL,
  description TEXT,
  due_date TEXT, -- YYYY-MM-DD
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  archived_at TEXT,
  FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE,
  FOREIGN KEY (column_id) REFERENCES board_columns(id) ON DELETE RESTRICT,
  FOREIGN KEY (creator_user_id) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (assignee_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (priority_id) REFERENCES task_priorities(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_tasks_board_id ON tasks(board_id);
CREATE INDEX IF NOT EXISTS idx_tasks_column_id ON tasks(column_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_user_id ON tasks(assignee_user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_sort_order ON tasks(board_id, column_id, sort_order);

-- Optional duplicate prevention similar to current UI behavior:
-- task title must be unique inside one board column while not archived.
CREATE UNIQUE INDEX IF NOT EXISTS uq_tasks_active_title_per_column
ON tasks(board_id, column_id, title)
WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS subtasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('todo', 'done')),
  due_date TEXT, -- YYYY-MM-DD
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_subtasks_task_id ON subtasks(task_id);
CREATE INDEX IF NOT EXISTS idx_subtasks_sort_order ON subtasks(task_id, sort_order);

CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  color_hex TEXT,
  UNIQUE (project_id, name),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS task_tags (
  task_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  PRIMARY KEY (task_id, tag_id),
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- -----------------------------
-- SEED LOOKUPS
-- -----------------------------

INSERT OR IGNORE INTO project_roles (code, name) VALUES
  ('owner', 'Owner'),
  ('admin', 'Admin'),
  ('member', 'Member'),
  ('viewer', 'Viewer');

INSERT OR IGNORE INTO task_priorities (code, name, sort_order) VALUES
  ('low', 'Low', 10),
  ('medium', 'Medium', 20),
  ('high', 'High', 30),
  ('urgent', 'Urgent', 40);
