export interface RawUsage {
  input?: number;
  output?: number;
  cacheRead?: number;
  cacheWrite?: number;
  cacheCreation?: number;
  cache_read?: number;
  cache_write?: number;
  cache_creation?: number;
  cache_read_input_tokens?: number;
  cache_write_input_tokens?: number;
  cache_creation_input_tokens?: number;
  cacheReadInputTokens?: number;
  cacheWriteInputTokens?: number;
  cacheCreationInputTokens?: number;
  total?: number;
}

export interface NormalizedUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}

function firstTokenCount(...values: unknown[]): number {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
      return Math.floor(value);
    }
  }
  return 0;
}

export function normalizeUsage(usage: RawUsage | undefined): NormalizedUsage {
  return {
    inputTokens: firstTokenCount(usage?.input),
    outputTokens: firstTokenCount(usage?.output),
    cacheReadTokens: firstTokenCount(
      usage?.cacheRead,
      usage?.cache_read,
      usage?.cache_read_input_tokens,
      usage?.cacheReadInputTokens
    ),
    cacheWriteTokens: firstTokenCount(
      usage?.cacheWrite,
      usage?.cacheCreation,
      usage?.cache_write,
      usage?.cache_creation,
      usage?.cache_write_input_tokens,
      usage?.cache_creation_input_tokens,
      usage?.cacheWriteInputTokens,
      usage?.cacheCreationInputTokens
    ),
  };
}

function finiteNonNegative(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : undefined;
}

export function readTelemetryCostUsd(lastAssistant: unknown): number | undefined {
  if (!lastAssistant || typeof lastAssistant !== "object") return undefined;

  const usage = (lastAssistant as { usage?: unknown }).usage;
  if (!usage || typeof usage !== "object") return undefined;

  const cost = (usage as { cost?: unknown }).cost;
  if (!cost || typeof cost !== "object") return undefined;

  const record = cost as Record<string, unknown>;
  return finiteNonNegative(record.total) ?? finiteNonNegative(record.totalUsd);
}
