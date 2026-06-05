PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE COLLATE NOCASE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE COLLATE NOCASE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  custom_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  source_type TEXT NOT NULL DEFAULT 'chatgpt',
  project_name TEXT,
  topic TEXT,
  tags_cache TEXT NOT NULL DEFAULT '',
  conversation_date TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  favorite INTEGER NOT NULL DEFAULT 0 CHECK(favorite IN (0, 1))
);

CREATE TABLE IF NOT EXISTS capture_inbox (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  source_type TEXT NOT NULL DEFAULT 'chatgpt',
  project_name TEXT,
  topic TEXT,
  tags_json TEXT NOT NULL DEFAULT '[]',
  conversation_date TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  favorite INTEGER NOT NULL DEFAULT 0 CHECK(favorite IN (0, 1)),
  source_context TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS entry_tags (
  entry_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  PRIMARY KEY (entry_id, tag_id),
  FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS saved_filters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  filter_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS import_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  rows INTEGER NOT NULL DEFAULT 0,
  skipped_rows INTEGER NOT NULL DEFAULT 0,
  error_report TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS export_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  rows INTEGER NOT NULL DEFAULT 0,
  target_path TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS recent_searches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  query TEXT NOT NULL,
  filters_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS recent_accesses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entry_id INTEGER NOT NULL,
  accessed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS entry_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entry_id INTEGER NOT NULL,
  action TEXT NOT NULL,
  snapshot_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_entries_conversation_date ON entries(conversation_date);
CREATE INDEX IF NOT EXISTS idx_entries_updated_at ON entries(updated_at);
CREATE INDEX IF NOT EXISTS idx_entries_custom_id ON entries(custom_id);
CREATE INDEX IF NOT EXISTS idx_entries_title ON entries(title);
CREATE INDEX IF NOT EXISTS idx_entries_project_name ON entries(project_name);
CREATE INDEX IF NOT EXISTS idx_entries_status ON entries(status);
CREATE INDEX IF NOT EXISTS idx_capture_inbox_updated_at ON capture_inbox(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_capture_inbox_conversation_date ON capture_inbox(conversation_date);
CREATE INDEX IF NOT EXISTS idx_entry_tags_tag_id ON entry_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_recent_accesses_accessed_at ON recent_accesses(accessed_at DESC);
CREATE INDEX IF NOT EXISTS idx_recent_searches_created_at ON recent_searches(created_at DESC);

CREATE VIRTUAL TABLE IF NOT EXISTS entries_fts USING fts5(
  title,
  summary,
  notes,
  topic,
  tags_cache,
  content='entries',
  content_rowid='id',
  tokenize='unicode61'
);

CREATE TRIGGER IF NOT EXISTS entries_ai AFTER INSERT ON entries BEGIN
  INSERT INTO entries_fts(rowid, title, summary, notes, topic, tags_cache)
  VALUES (new.id, new.title, new.summary, COALESCE(new.notes, ''), COALESCE(new.topic, ''), COALESCE(new.tags_cache, ''));
END;

CREATE TRIGGER IF NOT EXISTS entries_ad AFTER DELETE ON entries BEGIN
  INSERT INTO entries_fts(entries_fts, rowid, title, summary, notes, topic, tags_cache)
  VALUES ('delete', old.id, old.title, old.summary, COALESCE(old.notes, ''), COALESCE(old.topic, ''), COALESCE(old.tags_cache, ''));
END;

CREATE TRIGGER IF NOT EXISTS entries_au AFTER UPDATE ON entries BEGIN
  INSERT INTO entries_fts(entries_fts, rowid, title, summary, notes, topic, tags_cache)
  VALUES ('delete', old.id, old.title, old.summary, COALESCE(old.notes, ''), COALESCE(old.topic, ''), COALESCE(old.tags_cache, ''));
  INSERT INTO entries_fts(rowid, title, summary, notes, topic, tags_cache)
  VALUES (new.id, new.title, new.summary, COALESCE(new.notes, ''), COALESCE(new.topic, ''), COALESCE(new.tags_cache, ''));
END;

INSERT OR IGNORE INTO app_settings (key, value) VALUES ('exportDirectory', '');
INSERT OR IGNORE INTO app_settings (key, value) VALUES ('dateFormat', 'yyyy-MM-dd');
INSERT OR IGNORE INTO app_settings (key, value) VALUES ('statuses', 'pending,done,key,archived');
INSERT OR IGNORE INTO app_settings (key, value) VALUES ('sourceTypes', 'chatgpt,claude,gemini,manual');
INSERT OR IGNORE INTO app_settings (key, value) VALUES ('aiEndpoint', '');
INSERT OR IGNORE INTO app_settings (key, value) VALUES ('aiModel', '');
