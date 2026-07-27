export interface CostClawConfig {
  port: number;
  telemetryPath: string;
  dbPath: string;
  piiRulesPath: string;
  redactEnabled: boolean;
}

export const DEFAULT_CONFIG: CostClawConfig = {
  port: 3333,
  telemetryPath: `${process.env.HOME}/.openclaw/logs/telemetry.jsonl`,
  dbPath: `${process.env.HOME}/.openclaw/costclaw.db`,
  piiRulesPath: `${process.env.HOME}/.openclaw/costclaw-pii-rules.json`,
  redactEnabled: true,
};

// Raw telemetry event as written by knostic/openclaw-telemetry
export interface RawTelemetryEvent {
  type: string;
  ts: number; // unix ms
  seq: number;
  sessionKey?: string;
  [key: string]: unknown;
}

export interface LlmUsageEvent extends RawTelemetryEvent {
  type: "llm.usage";
  model: string;
  input_tokens: number;
  output_tokens: number;
  costUsd?: number;
}

export interface ToolStartEvent extends RawTelemetryEvent {
  type: "tool.start";
  tool: string;
  params?: string; // JSON string, may contain PII
}

export interface ToolEndEvent extends RawTelemetryEvent {
  type: "tool.end";
  tool: string;
  success: boolean;
  durationMs?: number;
}

export interface AgentEvent extends RawTelemetryEvent {
  type: "agent.start" | "agent.end";
}

export interface MessageEvent extends RawTelemetryEvent {
  type: "message.in" | "message.out";
  content?: string; // may contain PII
}

export type TelemetryEvent =
  | LlmUsageEvent
  | ToolStartEvent
  | ToolEndEvent
  | AgentEvent
  | MessageEvent
  | RawTelemetryEvent;

// Storage types
export interface DailySpend {
  date: string; // YYYY-MM-DD
  costUsd: number;
}

export interface ModelBreakdown {
  model: string;
  costUsd: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  pct: number;
}

export interface SessionBreakdown {
  sessionKey: string;
  costUsd: number;
  eventCount: number;
  startTs: number;
  endTs: number;
}

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  estimatedSavingsUsd: number | null;
  confidence: "high" | "medium" | "low";
}

export interface Summary {
  todayUsd: number;
  monthUsd: number;
  todayTokens: number;
  monthTokens: number;
  modelCount: number;
  sessionCount: number;
  totalEvents: number;
  lastEventTs: number | null;
}

export interface RedactRule {
  name: string;
  pattern: RegExp;
  replacement: string;
}
