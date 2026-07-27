import { getDb } from "../storage/db.js";
import { getModelPricing, maybeReloadPricingRegistry } from "../pricing/registry.js";
import type { Recommendation } from "../types.js";

// Cheaper alternatives for expensive models
const CHEAPER_ALTERNATIVES: Record<string, string> = {
  "claude-3-opus-20240229":     "claude-3-5-haiku-20241022",
  "claude-opus-4-6":            "claude-haiku-4-5",
  "claude-3-5-sonnet-20241022": "claude-3-5-haiku-20241022",
  "claude-sonnet-4-6":          "claude-haiku-4-5",
  "gpt-4":                      "gpt-4o-mini",
  "gpt-4-turbo":                "gpt-4o-mini",
  "gpt-4o":                     "gpt-4o-mini",
  "o1":                         "o3-mini",
  "grok-3":                     "grok-2-mini",
  "gemini-2.5-pro":             "gemini-2.5-flash",
};

export function generateRecommendations(): Recommendation[] {
  const recs: Recommendation[] = [];
  const db = getDb();
  const monthPrefix = new Date().toISOString().slice(0, 7);
  maybeReloadPricingRegistry();
  const modelPricing = getModelPricing();

  // Rec 1: Model downgrade opportunity
  try {
    const rows = db.prepare(`
      SELECT
        model,
        SUM(cost_usd)      AS costUsd,
        AVG(output_tokens) AS avgOutputTokens,
        COUNT(*)           AS eventCount
      FROM llm_events
      WHERE ts_iso LIKE ?
        AND cost_usd > 0
      GROUP BY model
      ORDER BY costUsd DESC
      LIMIT 1
    `).all(`${monthPrefix}%`) as Array<{
      model: string;
      costUsd: number;
      avgOutputTokens: number;
      eventCount: number;
    }>;

    if (rows.length > 0) {
      const top = rows[0];
      const alt = CHEAPER_ALTERNATIVES[top.model];
      if (alt && modelPricing[alt] && modelPricing[top.model]) {
        const currentPrice = modelPricing[top.model];
        const altPrice = modelPricing[alt];
        const avgInput = top.avgOutputTokens * 3; // rough estimate
        const currentPerCall =
          (avgInput / 1_000_000) * currentPrice.inputPer1M +
          (top.avgOutputTokens / 1_000_000) * currentPrice.outputPer1M;
        const altPerCall =
          (avgInput / 1_000_000) * altPrice.inputPer1M +
          (top.avgOutputTokens / 1_000_000) * altPrice.outputPer1M;
        const savingRatio = currentPerCall > 0 ? (currentPerCall - altPerCall) / currentPerCall : 0;
        const estimatedSavings = top.costUsd * savingRatio;

        if (estimatedSavings > 0.01) {
          recs.push({
            id: "model-downgrade",
            title: `Route tasks from ${top.model} to ${alt}`,
            description: `${top.model} accounts for $${top.costUsd.toFixed(2)} this month. For short-output tasks (avg ${Math.round(top.avgOutputTokens)} tokens out), ${alt} offers similar quality at lower cost.`,
            estimatedSavingsUsd: Math.round(estimatedSavings * 100) / 100,
            confidence: savingRatio > 0.5 ? "high" : "medium",
          });
        }
      }
    }
  } catch {
    // Skip if no data yet
  }

  // Rec 2: High failure rate
  try {
    const retryRow = db.prepare(`
      SELECT COUNT(*) AS total FROM tool_events WHERE success = 0 AND event_type = 'tool.end'
    `).get() as { total: number };

    const totalRow = db.prepare(`
      SELECT COUNT(*) AS total FROM tool_events WHERE event_type = 'tool.end'
    `).get() as { total: number };

    if (totalRow.total > 10 && retryRow.total / totalRow.total > 0.15) {
      recs.push({
        id: "high-failure-rate",
        title: "High tool failure rate detected",
        description: `${Math.round((retryRow.total / totalRow.total) * 100)}% of tool calls are failing, causing expensive retries. Review your agent's tool usage patterns to reduce wasted tokens.`,
        estimatedSavingsUsd: null,
        confidence: "medium",
      });
    }
  } catch {
    // Skip
  }

  // Rec 3: Generic tip if nothing else surfaced
  if (recs.length === 0) {
    recs.push({
      id: "keep-tracking",
      title: "Keep running agents to see insights",
      description: "CostClaw needs at least a few days of data to generate personalized recommendations. Check back soon!",
      estimatedSavingsUsd: null,
      confidence: "low",
    });
  }

  return recs.slice(0, 3);
}
