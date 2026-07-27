import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { computeCost } from "../src/pricing/calculator.js";
import { initPricingRegistry } from "../src/pricing/registry.js";

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "costclaw-pricing-"));
const pricingPath = path.join(tempDir, "pricing.json");

fs.writeFileSync(
  pricingPath,
  JSON.stringify({
    models: {
      "test/model": {
        inputPer1M: 2,
        outputPer1M: 4,
        cacheReadPer1M: 0.2,
        cacheWritePer1M: 2.5,
      },
    },
    aliases: {
      "provider/test-model": "test/model",
    },
  })
);
initPricingRegistry(pricingPath);

test.after(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});

test("calculates cache-aware fallback pricing", () => {
  const result = computeCost("test/model", {
    inputTokens: 1_000_000,
    outputTokens: 1_000_000,
    cacheReadTokens: 1_000_000,
    cacheWriteTokens: 1_000_000,
  });

  assert.equal(result.source, "calculated");
  assert.equal(result.costUsd, 8.7);
});

test("resolves configured aliases", () => {
  const result = computeCost("provider/test-model:v1", {
    inputTokens: 1_000_000,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
  });

  assert.equal(result.source, "calculated");
  assert.equal(result.costUsd, 2);
});

test("prefers OpenClaw telemetry cost, including zero-cost local models", () => {
  const usage = {
    inputTokens: 1_000_000,
    outputTokens: 1_000_000,
    cacheReadTokens: 1_000_000,
    cacheWriteTokens: 0,
  };

  assert.deepEqual(computeCost("test/model", usage, 0.42), {
    costUsd: 0.42,
    source: "telemetry",
  });
  assert.deepEqual(computeCost("local/model", usage, 0), {
    costUsd: 0,
    source: "telemetry",
  });
});

test("marks models without telemetry or configured prices as estimated", () => {
  const result = computeCost("unknown/model", {
    inputTokens: 1000,
    outputTokens: 500,
    cacheReadTokens: 10_000,
    cacheWriteTokens: 0,
  });

  assert.deepEqual(result, { costUsd: 0, source: "estimated" });
});
