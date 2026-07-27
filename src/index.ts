import { randomUUID } from "crypto";
import { execSync } from "child_process";
import { Type } from "@sinclair/typebox";
import { loadRules, redact } from "./redact/engine.js";
import { initDb, closeDb } from "./storage/db.js";
import { upsertLlmRecord, upsertToolRecord, getSummary } from "./storage/queries.js";
import { computeCost } from "./pricing/calculator.js";
import { initPricingRegistry, getPricingOverridePath } from "./pricing/registry.js";
import { startServer, stopServer } from "./server/http.js";

// Track which agentIds are subagents (populated via subagent_spawning hook)
const subagentIds = new Set<string>();

// Use `any` for api type — avoids needing to install openclaw as a dev dep
// The actual types come from openclaw at runtime
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function register(api: any) {
  const stateDir: string = api.runtime.state.resolveStateDir();
  const dbPath = `${stateDir}/costclaw.db`;
  const piiRulesPath = `${stateDir}/costclaw-pii-rules.json`;
  const pricingPath = `${stateDir}/costclaw-pricing.json`;
  const port: number = (api.pluginConfig?.port as number) ?? 3333;

  // Init DB and runtime config eagerly (synchronous, fast)
  initDb(dbPath);
  loadRules(piiRulesPath);
  initPricingRegistry(pricingPath);

  api.logger.info(`CostClaw initialized — db: ${dbPath}`);
  api.logger.info(`CostClaw pricing config: ${getPricingOverridePath()}`);

  // ── Hook: track which agents are subagents ─────────────────────────────────
  api.on(
    "subagent_spawning",
    (event: { agentId?: string; childSessionKey?: string }) => {
      if (event.agentId) subagentIds.add(event.agentId);
    }
  );

  // ── Hook: capture LLM usage directly from OpenClaw's event bus ─────────────
  // This fires after every LLM call, no telemetry plugin required.
  api.on(
    "llm_output",
    (
      event: {
        runId: string;
        model: string;
        usage?: { input?: number; output?: number };
      },
      ctx: {
        sessionKey?: string;
        agentId?: string;
        trigger?: string;
      }
    ) => {
      if (!event.usage) return;

      const inputTokens = event.usage.input ?? 0;
      const outputTokens = event.usage.output ?? 0;
      const { costUsd, source } = computeCost(event.model, inputTokens, outputTokens);
      const isSubagent = Boolean(ctx.sessionKey?.includes(":subagent:")) || (ctx.agentId ? subagentIds.has(ctx.agentId) : false);
      const trigger = isSubagent && (!ctx.trigger || ctx.trigger === "user") ? "subagent" : (ctx.trigger ?? "user");

      upsertLlmRecord({
        sourceId: `hook:${event.runId}:${randomUUID()}`,
        tsMs: Date.now(),
        sessionKey: ctx.sessionKey,
        agentId: ctx.agentId,
        trigger,
        isSubagent,
        model: event.model,
        inputTokens,
        outputTokens,
        costUsd,
        costSource: source,
      });
    }
  );

  // ── Hook: capture tool call results ────────────────────────────────────────
  api.on(
    "after_tool_call",
    (
      event: {
        toolName: string;
        runId?: string;
        durationMs?: number;
        error?: string;
      },
      ctx: { sessionKey?: string }
    ) => {
      upsertToolRecord({
        sourceId: `hook:tool:${event.runId ?? randomUUID()}:${event.toolName}`,
        tsMs: Date.now(),
        sessionKey: ctx.sessionKey,
        toolName: redact(event.toolName),
        eventType: "tool.end",
        success: !event.error,
        durationMs: event.durationMs,
      });
    }
  );

  // ── Service: run the HTTP dashboard server ─────────────────────────────────
  api.registerService({
    id: "costclaw-dashboard",
    start: async () => {
      startServer(port);
      api.logger.info(`CostClaw dashboard: http://localhost:${port}`);
    },
    stop: async () => {
      stopServer();
      closeDb();
    },
  });

  // ── Tool: costclaw_status ──────────────────────────────────────────────────
  api.registerTool({
    name: "costclaw_status",
    label: "CostClaw Status",
    description:
      "Returns your current LLM spend: today's cost, this month's cost, number of models used, and a link to the local cost dashboard.",
    parameters: Type.Object({}),
    async execute(_toolCallId: string, _params: Record<string, never>) {
      const s = getSummary();
      const lines = [
        `**LLM Cost Summary**`,
        `• Today: $${s.todayUsd.toFixed(4)}`,
        `• This month: $${s.monthUsd.toFixed(4)}`,
        `• Models used: ${s.modelCount}`,
        `• Sessions tracked: ${s.sessionCount}`,
        `• Total LLM calls: ${s.totalEvents}`,
        `• Dashboard: http://localhost:${port}`,
      ];
      return {
        content: [{ type: "text" as const, text: lines.join("\n") }],
        details: { ...s, dashboardUrl: `http://localhost:${port}` },
      };
    },
  });

  // ── Tool: costclaw_dashboard ───────────────────────────────────────────────
  api.registerTool({
    name: "costclaw_dashboard",
    label: "CostClaw Dashboard",
    description:
      "Opens your local CostClaw cost dashboard in the browser. Shows spend trends, model breakdown, per-session costs, and saving recommendations.",
    parameters: Type.Object({}),
    async execute(_toolCallId: string, _params: Record<string, never>) {
      const url = `http://localhost:${port}`;
      try {
        const cmd =
          process.platform === "darwin"
            ? `open "${url}"`
            : process.platform === "win32"
              ? `start "${url}"`
              : `xdg-open "${url}"`;
        execSync(cmd, { stdio: "ignore" });
      } catch {
        // Best effort — user can open manually
      }
      return {
        content: [{ type: "text" as const, text: `Dashboard opened: ${url}` }],
        details: { url },
      };
    },
  });
}
