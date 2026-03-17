export interface ModelPrice {
  inputPer1M: number;  // USD per 1M input tokens
  outputPer1M: number; // USD per 1M output tokens
}

// Runtime pricing should come from ~/.openclaw/costclaw-pricing.json.
// Keep built-in defaults empty so local/user pricing is the single source of truth.
export const MODEL_PRICING: Record<string, ModelPrice> = {};

// Runtime aliases should come from ~/.openclaw/costclaw-pricing.json.
export const MODEL_ALIASES: Array<[string, string]> = [];
