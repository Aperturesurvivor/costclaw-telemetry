import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { register } from "../src/index.js";
import { closeDb, getDb } from "../src/storage/db.js";

test("the llm_output hook persists cache tokens and normalized telemetry cost", async () => {
  const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), "costclaw-plugin-"));
  const hooks = new Map<string, (...args: any[]) => unknown>();

  register({
    runtime: {
      state: {
        resolveStateDir: () => stateDir,
      },
    },
    pluginConfig: { port: 3333 },
    logger: { info: () => undefined },
    on: (name: string, handler: (...args: any[]) => unknown) => hooks.set(name, handler),
    registerService: () => undefined,
    registerTool: () => undefined,
  });

  const handler = hooks.get("llm_output");
  assert.ok(handler, "llm_output hook should be registered");

  await handler(
    {
      runId: "run-1",
      provider: "anthropic",
      model: "claude-test",
      resolvedRef: "anthropic/claude-test",
      usage: {
        input: 100,
        output: 20,
        cacheRead: 900,
        cacheWrite: 40,
      },
      lastAssistant: {
        usage: {
          cost: {
            input: 0.01,
            output: 0.02,
            cacheRead: 0.003,
            cacheWrite: 0.004,
            total: 0.037,
          },
        },
      },
    },
    {
      sessionKey: "agent:main:subagent:test",
      agentId: "worker",
      trigger: "user",
    }
  );

  const row = getDb()
    .prepare(`
      SELECT provider, model, input_tokens, output_tokens, cache_read_tokens,
             cache_write_tokens, cost_usd, cost_source, trigger, is_subagent
      FROM llm_events
    `)
    .get() as Record<string, unknown>;

  assert.deepEqual(row, {
    provider: "anthropic",
    model: "claude-test",
    input_tokens: 100,
    output_tokens: 20,
    cache_read_tokens: 900,
    cache_write_tokens: 40,
    cost_usd: 0.037,
    cost_source: "telemetry",
    trigger: "subagent",
    is_subagent: 1,
  });

  closeDb();
  fs.rmSync(stateDir, { recursive: true, force: true });
});
