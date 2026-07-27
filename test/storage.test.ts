import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { closeDb, getDb, initDb } from "../src/storage/db.js";
import { getSummary, upsertLlmRecord } from "../src/storage/queries.js";

test("fresh databases include cache columns and cache tokens in totals", () => {
  const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), "costclaw-db-"));
  initDb(path.join(stateDir, "costclaw.db"));

  upsertLlmRecord({
    sourceId: "test:1",
    tsMs: Date.now(),
    sessionKey: "session",
    provider: "provider",
    model: "model",
    inputTokens: 100,
    outputTokens: 20,
    cacheReadTokens: 900,
    cacheWriteTokens: 40,
    costUsd: 0.25,
    costSource: "telemetry",
  });

  assert.equal(getSummary().todayTokens, 1060);
  assert.deepEqual(
    (getDb()
      .prepare("SELECT version FROM schema_migrations ORDER BY version")
      .all() as Array<{ version: number }>).map((row) => row.version),
    [1, 2]
  );

  closeDb();
  fs.rmSync(stateDir, { recursive: true, force: true });
});
