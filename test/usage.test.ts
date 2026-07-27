import assert from "node:assert/strict";
import test from "node:test";
import { normalizeUsage, readTelemetryCostUsd } from "../src/usage.js";

test("normalizes current OpenClaw cache fields", () => {
  assert.deepEqual(
    normalizeUsage({
      input: 100,
      output: 20,
      cacheRead: 900,
      cacheWrite: 40,
    }),
    {
      inputTokens: 100,
      outputTokens: 20,
      cacheReadTokens: 900,
      cacheWriteTokens: 40,
    }
  );
});

test("accepts legacy and provider cache field names", () => {
  assert.deepEqual(
    normalizeUsage({
      input: 3,
      output: 2,
      cache_read_input_tokens: 4000,
      cacheCreationInputTokens: 500,
    }),
    {
      inputTokens: 3,
      outputTokens: 2,
      cacheReadTokens: 4000,
      cacheWriteTokens: 500,
    }
  );
});

test("reads the normalized cost emitted on OpenClaw assistant messages", () => {
  assert.equal(
    readTelemetryCostUsd({
      usage: {
        cost: {
          input: 0.1,
          output: 0.2,
          cacheRead: 0.03,
          total: 0.33,
        },
      },
    }),
    0.33
  );
  assert.equal(readTelemetryCostUsd({ usage: {} }), undefined);
});
