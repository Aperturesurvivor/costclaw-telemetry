import { getModelAliases, getModelPricing, maybeReloadPricingRegistry } from "./registry.js";
import type { NormalizedUsage } from "../usage.js";

export type CostSource = "telemetry" | "calculated" | "estimated";

export interface CostResult {
  costUsd: number;
  source: CostSource;
}

function resolveModel(raw: string): string | null {
  maybeReloadPricingRegistry();

  const modelPricing = getModelPricing();
  const modelAliases = getModelAliases();
  const lower = raw.toLowerCase().trim();

  // Exact match
  if (modelPricing[lower]) return lower;

  // Alias match
  for (const [alias, canonical] of modelAliases) {
    if (lower.startsWith(alias)) return canonical;
  }

  // Prefix scan (longest matching key wins)
  const keys = Object.keys(modelPricing).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (lower.startsWith(key) || key.startsWith(lower)) return key;
  }

  return null;
}

export function computeCost(
  model: string,
  usage: NormalizedUsage,
  telemetryCostUsd?: number
): CostResult {
  if (
    telemetryCostUsd != null &&
    Number.isFinite(telemetryCostUsd) &&
    telemetryCostUsd >= 0
  ) {
    return { costUsd: telemetryCostUsd, source: "telemetry" };
  }

  const resolved = resolveModel(model);
  if (!resolved) {
    return { costUsd: 0, source: "estimated" };
  }

  const price = getModelPricing()[resolved];
  const cacheReadPer1M = price.cacheReadPer1M ?? price.inputPer1M;
  const cacheWritePer1M = price.cacheWritePer1M ?? price.inputPer1M;
  const costUsd =
    (usage.inputTokens / 1_000_000) * price.inputPer1M +
    (usage.outputTokens / 1_000_000) * price.outputPer1M +
    (usage.cacheReadTokens / 1_000_000) * cacheReadPer1M +
    (usage.cacheWriteTokens / 1_000_000) * cacheWritePer1M;

  return { costUsd, source: "calculated" };
}
