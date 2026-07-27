import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

let db: Database.Database;

// ─── Base schema (v0 — tables that must exist before migrations run) ──────────

const BASE_SCHEMA = `
CREATE TABLE IF NOT EXISTS llm_events (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id    TEXT NOT NULL UNIQUE,
  ts_ms        INTEGER NOT NULL,
  ts_iso       TEXT NOT NULL,
  session_key  TEXT,
  model        TEXT NOT NULL,
  input_tokens  INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cost_usd     REAL NOT NULL DEFAULT 0,
  cost_source  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tool_events (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id    TEXT NOT NULL UNIQUE,
  ts_ms        INTEGER NOT NULL,
  session_key  TEXT,
  tool_name    TEXT,
  event_type   TEXT,
  success      INTEGER,
  duration_ms  INTEGER
);

CREATE TABLE IF NOT EXISTS agent_events (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id    TEXT NOT NULL UNIQUE,
  ts_ms        INTEGER NOT NULL,
  session_key  TEXT,
  event_type   TEXT
);

CREATE TABLE IF NOT EXISTS ingestion_state (
  key   TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS schema_migrations (
  version    INTEGER PRIMARY KEY,
  applied_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_llm_ts_ms   ON llm_events(ts_ms);
CREATE INDEX IF NOT EXISTS idx_llm_ts_iso  ON llm_events(ts_iso);
CREATE INDEX IF NOT EXISTS idx_llm_model   ON llm_events(model);
CREATE INDEX IF NOT EXISTS idx_llm_session ON llm_events(session_key);
CREATE INDEX IF NOT EXISTS idx_tool_ts     ON tool_events(ts_ms);
`;

// ─── Migrations ───────────────────────────────────────────────────────────────
// Add new entries to the END of this array. Never edit or remove existing ones.
// Each migration runs exactly once and is recorded in schema_migrations.

const MIGRATIONS: Array<{ version: number; description: string; sql: string }> = [
  {
    version: 1,
    description: "Add agent_id, trigger, is_subagent to llm_events",
    sql: `
      ALTER TABLE llm_events ADD COLUMN agent_id    TEXT;
      ALTER TABLE llm_events ADD COLUMN trigger     TEXT;
      ALTER TABLE llm_events ADD COLUMN is_subagent INTEGER NOT NULL DEFAULT 0;
      CREATE INDEX IF NOT EXISTS idx_llm_trigger ON llm_events(trigger);
    `,
  },
  {
    version: 2,
    description: "Add provider and prompt-cache token columns to llm_events",
    sql: `
      ALTER TABLE llm_events ADD COLUMN provider           TEXT;
      ALTER TABLE llm_events ADD COLUMN cache_read_tokens  INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE llm_events ADD COLUMN cache_write_tokens INTEGER NOT NULL DEFAULT 0;
      CREATE INDEX IF NOT EXISTS idx_llm_provider ON llm_events(provider);
    `,
  },
];

function runMigrations(): void {
  const applied = new Set<number>(
    (db.prepare(`SELECT version FROM schema_migrations`).all() as { version: number }[])
      .map((r) => r.version)
  );

  for (const migration of MIGRATIONS) {
    if (applied.has(migration.version)) continue;

    console.log(`[costclaw] Running migration v${migration.version}: ${migration.description}`);

    // SQLite doesn't support multiple statements in ALTER TABLE — run line by line
    const statements = migration.sql
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean);

    db.transaction(() => {
      for (const stmt of statements) {
        try {
          db.prepare(stmt).run();
        } catch (err: unknown) {
          // "duplicate column" is safe to ignore — means migration was partially applied
          if (String(err).includes("duplicate column")) continue;
          throw err;
        }
      }
      db.prepare(`INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)`).run(
        migration.version,
        Date.now()
      );
    })();
  }
}

export function initDb(dbPath: string): void {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");
  db.exec(BASE_SCHEMA);
  runMigrations();
}

export function getDb(): Database.Database {
  if (!db) throw new Error("Database not initialized. Call initDb() first.");
  return db;
}

export function closeDb(): void {
  db?.close();
}
