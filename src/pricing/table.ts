export interface ModelPrice {
  inputPer1M: number;
  outputPer1M: number;
  cacheReadPer1M?: number;
  cacheWritePer1M?: number;
}

// OpenClaw's normalized per-call cost is preferred whenever the host provides
// it. Runtime overrides cover custom providers or hosts without cost metadata.
export const MODEL_PRICING: Record<string, ModelPrice> = {};

export const MODEL_ALIASES: Array<[string, string]> = [];
