import assert from "node:assert/strict";
import test from "node:test";
import { loadRules, redact } from "../src/redact/engine.js";

loadRules("/nonexistent/path/rules.json");

test("redacts known sensitive patterns", () => {
  assert.equal(redact("Email john@example.com here"), "Email [REDACTED:EMAIL] here");
  assert.equal(
    redact("Use key sk-abcdefghijklmnopqrstuvwxyz12345 please"),
    "Use key [REDACTED:API_KEY] please"
  );
  assert.match(
    redact("sk-ant-api03-ABCDEFGHIJKLMNOPQRSTUVWXYZ12345678901234567890"),
    /\[REDACTED:API_KEY\]/
  );
  assert.equal(redact("SSN: 123-45-6789"), "SSN: [REDACTED:SSN]");
  assert.match(redact("/home/josiah/secret/file.txt"), /\[REDACTED:PATH\]/);
});

test("leaves ordinary and empty text unchanged", () => {
  const clean = "Hello, run a web search for AI news";
  assert.equal(redact(clean), clean);
  assert.equal(redact(""), "");
});
