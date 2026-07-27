import { randomUUID } from "crypto";
import { Type } from "@sinclair/typebox";
import { loadRules, redact } from "./redact/engine.js";
import { initDb, closeDb } from "./storage/db.js";
import { upsertLlmRecord, upsertToolRecord, getSummary } from "./storage/queries.js";
import { computeCost } from "./pricing/calculator.js";
import { initPricingRegistry, getPricingOverridePath } from "./pricing/registry.js";
import { startServer, stopServer } from "./server/http.js";
import { normalizeUsage, readTelemetryCostUsd, type RawUsage } from "./usage.js";

// Use `any` for api type — avoids needing to install openclaw as a dev dep
// The actual types come from openclaw at runtime
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function register(api: any) {
  const subagentIds = new Set<string>();
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
        provider?: string;
        model: string;
        resolvedRef?: string;
        lastAssistant?: unknown;
        usage?: RawUsage;
      },
      ctx: {
        sessionKey?: string;
        agentId?: string;
        trigger?: string;
      }
    ) => {
      if (!event.usage) return;

      const usage = normalizeUsage(event.usage);
      const telemetryCostUsd = readTelemetryCostUsd(event.lastAssistant);
      const { costUsd, source } = computeCost(
        event.resolvedRef ?? event.model,
        usage,
        telemetryCostUsd
      );
      const isSubagent = Boolean(ctx.sessionKey?.includes(":subagent:")) || (ctx.agentId ? subagentIds.has(ctx.agentId) : false);
      const trigger = isSubagent && (!ctx.trigger || ctx.trigger === "user") ? "subagent" : (ctx.trigger ?? "user");

      upsertLlmRecord({
        sourceId: `hook:${event.runId}:${randomUUID()}`,
        tsMs: Date.now(),
        sessionKey: ctx.sessionKey,
        agentId: ctx.agentId,
        trigger,
        isSubagent,
        provider: event.provider,
        model: event.model,
        ...usage,
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
      "Returns the local CostClaw dashboard URL. The dashboard shows spend trends, model breakdown, per-session costs, and saving recommendations.",
    parameters: Type.Object({}),
    async execute(_toolCallId: string, _params: Record<string, never>) {
      const url = `http://localhost:${port}`;
      return {
        content: [{ type: "text" as const, text: `Open the CostClaw dashboard: ${url}` }],
        details: { url },
      };
    },
  });
}

export default {
  id: "costclaw-telemetry",
  name: "CostClaw",
  description: "Local, cache-aware LLM usage and cost telemetry for OpenClaw.",
  register,
};
