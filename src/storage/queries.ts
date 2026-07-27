import { getDb } from "./db.js";
import type {
  DailySpend,
  ModelBreakdown,
  SessionBreakdown,
  Summary,
} from "../types.js";
import type { CostSource } from "../pricing/calculator.js";

export interface LlmRecord {
  sourceId: string;
  tsMs: number;
  sessionKey?: string | null;
  agentId?: string | null;
  trigger?: string | null;
  isSubagent?: boolean;
  provider?: string | null;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  costUsd: number;
  costSource: CostSource;
}

export interface TriggerBreakdown {
  trigger: string;
  isSubagent: number;
  costUsd: number;
  tokens: number;
  eventCount: number;
}

export interface ToolRecord {
  sourceId: string;
  tsMs: number;
  sessionKey?: string | null;
  toolName?: string | null;
  eventType: string;
  success?: boolean | null;
  durationMs?: number | null;
}

// ─── LLM Events ─────────────────────────────────────────────────────────────

export function upsertLlmRecord(r: LlmRecord): void {
  const db = getDb();
  const tsIso = new Date(r.tsMs).toISOString().slice(0, 10);
  db.prepare(`
    INSERT OR IGNORE INTO llm_events
      (source_id, ts_ms, ts_iso, session_key, agent_id, trigger, is_subagent,
       provider, model, input_tokens, output_tokens, cache_read_tokens,
       cache_write_tokens, cost_usd, cost_source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    r.sourceId, r.tsMs, tsIso,
    r.sessionKey ?? null,
    r.agentId ?? null,
    r.trigger ?? null,
    r.isSubagent ? 1 : 0,
    r.provider ?? null,
    r.model,
    r.inputTokens, r.outputTokens, r.cacheReadTokens, r.cacheWriteTokens,
    r.costUsd, r.costSource
  );
}

export function getTriggerBreakdown(): TriggerBreakdown[] {
  const db = getDb();
  const monthPrefix = new Date().toISOString().slice(0, 7);
  return db.prepare(`
    SELECT
      COALESCE(trigger, 'user')        AS trigger,
      is_subagent                       AS isSubagent,
      SUM(cost_usd)                     AS costUsd,
      SUM(input_tokens + output_tokens + cache_read_tokens + cache_write_tokens) AS tokens,
      COUNT(*)                          AS eventCount
    FROM llm_events
    WHERE ts_iso LIKE ?
    GROUP BY trigger, is_subagent
    ORDER BY costUsd DESC
  `).all(`${monthPrefix}%`) as TriggerBreakdown[];
}

export function upsertToolRecord(r: ToolRecord): void {
  const db = getDb();
  db.prepare(`
    INSERT OR IGNORE INTO tool_events
      (source_id, ts_ms, session_key, tool_name, event_type, success, duration_ms)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    r.sourceId, r.tsMs,
    r.sessionKey ?? null,
    r.toolName ?? null,
    r.eventType,
    r.success != null ? (r.success ? 1 : 0) : null,
    r.durationMs ?? null
  );
}

// ─── Aggregation Queries ─────────────────────────────────────────────────────

export function getTodaySpend(): number {
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);
  const row = db.prepare(
    `SELECT COALESCE(SUM(cost_usd), 0) AS total FROM llm_events WHERE ts_iso = ?`
  ).get(today) as { total: number };
  return row.total;
}

export function getMonthSpend(): number {
  const db = getDb();
  const monthPrefix = new Date().toISOString().slice(0, 7);
  const row = db.prepare(
    `SELECT COALESCE(SUM(cost_usd), 0) AS total FROM llm_events WHERE ts_iso LIKE ?`
  ).get(`${monthPrefix}%`) as { total: number };
  return row.total;
}

export function getLast7DaysDailySpend(): DailySpend[] {
  const db = getDb();
  return db.prepare(`
    SELECT ts_iso AS date, COALESCE(SUM(cost_usd), 0) AS costUsd
    FROM llm_events
    WHERE ts_iso >= date('now', '-6 days')
    GROUP BY ts_iso
    ORDER BY ts_iso ASC
  `).all() as DailySpend[];
}

export function getModelBreakdown(): ModelBreakdown[] {
  const db = getDb();
  const monthPrefix = new Date().toISOString().slice(0, 7);
  const rows = db.prepare(`
    SELECT
      model,
      SUM(cost_usd)      AS costUsd,
      SUM(input_tokens)  AS inputTokens,
      SUM(output_tokens) AS outputTokens,
      SUM(cache_read_tokens)  AS cacheReadTokens,
      SUM(cache_write_tokens) AS cacheWriteTokens
    FROM llm_events
    WHERE ts_iso LIKE ?
    GROUP BY model
    ORDER BY costUsd DESC
  `).all(`${monthPrefix}%`) as Omit<ModelBreakdown, "pct">[];

  const total = rows.reduce((s, r) => s + r.costUsd, 0);
  return rows.map((r) => ({
    ...r,
    pct: total > 0 ? Math.round((r.costUsd / total) * 100) : 0,
  }));
}

export function getSessionBreakdown(limit = 20): SessionBreakdown[] {
  const db = getDb();
  return db.prepare(`
    SELECT
      COALESCE(session_key, 'unknown') AS sessionKey,
      SUM(cost_usd) AS costUsd,
      COUNT(*)      AS eventCount,
      MIN(ts_ms)    AS startTs,
      MAX(ts_ms)    AS endTs
    FROM llm_events
    GROUP BY session_key
    ORDER BY costUsd DESC
    LIMIT ?
  `).all(limit) as SessionBreakdown[];
}

export function getSummary(): Summary {
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);
  const monthPrefix = new Date().toISOString().slice(0, 7);

  const todayRow = db.prepare(
    `SELECT COALESCE(SUM(cost_usd), 0) AS v,
            COALESCE(SUM(input_tokens + output_tokens + cache_read_tokens + cache_write_tokens), 0) AS t
     FROM llm_events WHERE ts_iso = ?`
  ).get(today) as { v: number; t: number };

  const monthRow = db.prepare(
    `SELECT COALESCE(SUM(cost_usd), 0) AS v,
            COALESCE(SUM(input_tokens + output_tokens + cache_read_tokens + cache_write_tokens), 0) AS t
     FROM llm_events WHERE ts_iso LIKE ?`
  ).get(`${monthPrefix}%`) as { v: number; t: number };

  const modelRow = db.prepare(
    `SELECT COUNT(DISTINCT model) AS v FROM llm_events`
  ).get() as { v: number };

  const sessionRow = db.prepare(
    `SELECT COUNT(DISTINCT session_key) AS v FROM llm_events WHERE session_key IS NOT NULL`
  ).get() as { v: number };

  const totalRow = db.prepare(
    `SELECT COUNT(*) AS v FROM llm_events`
  ).get() as { v: number };

  const lastRow = db.prepare(
    `SELECT MAX(ts_ms) AS v FROM llm_events`
  ).get() as { v: number | null };

  return {
    todayUsd: todayRow.v,
    monthUsd: monthRow.v,
    todayTokens: todayRow.t,
    monthTokens: monthRow.t,
    modelCount: modelRow.v,
    sessionCount: sessionRow.v,
    totalEvents: totalRow.v,
    lastEventTs: lastRow.v,
  };
}

export interface HourlySpend {
  hour: string; // "00"–"23"
  costUsd: number;
  tokens: number;
}

export function getHourlySpend(): HourlySpend[] {
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);
  return db.prepare(`
    SELECT
      strftime('%H', ts_ms / 1000, 'unixepoch', 'localtime') AS hour,
      COALESCE(SUM(cost_usd), 0)                              AS costUsd,
      COALESCE(SUM(input_tokens + output_tokens + cache_read_tokens + cache_write_tokens), 0) AS tokens
    FROM llm_events
    WHERE ts_iso = ?
    GROUP BY hour
    ORDER BY hour ASC
  `).all(today) as HourlySpend[];
}

export interface YesterdaySpend {
  totalUsd: number;
  totalTokens: number;
  eventCount: number;
}

export function getYesterdaySpend(): YesterdaySpend {
  const db = getDb();
  const row = db.prepare(`
    SELECT
      COALESCE(SUM(cost_usd), 0)                     AS totalUsd,
      COALESCE(SUM(input_tokens + output_tokens + cache_read_tokens + cache_write_tokens), 0) AS totalTokens,
      COUNT(*)                                         AS eventCount
    FROM llm_events
    WHERE ts_iso = date('now', '-1 day')
  `).get() as YesterdaySpend;
  return row;
}

export function getLast30DaysDailySpend(): DailySpend[] {
  const db = getDb();
  return db.prepare(`
    SELECT ts_iso AS date, COALESCE(SUM(cost_usd), 0) AS costUsd
    FROM llm_events
    WHERE ts_iso >= date('now', '-29 days')
    GROUP BY ts_iso
    ORDER BY ts_iso ASC
  `).all() as DailySpend[];
}

// ─── Ingestion State ─────────────────────────────────────────────────────────

export function getIngestionState(key: string): unknown {
  const db = getDb();
  const row = db.prepare(`SELECT value FROM ingestion_state WHERE key = ?`).get(key) as
    | { value: string }
    | undefined;
  return row ? JSON.parse(row.value) : undefined;
}

export function setIngestionState(key: string, value: unknown): void {
  const db = getDb();
  db.prepare(`
    INSERT OR REPLACE INTO ingestion_state (key, value) VALUES (?, ?)
  `).run(key, JSON.stringify(value));
}
