import fs from "fs";
import { MODEL_PRICING as DEFAULT_MODEL_PRICING, MODEL_ALIASES as DEFAULT_MODEL_ALIASES, type ModelPrice } from "./table.js";

interface PricingOverrideFile {
  models?: Record<string, ModelPrice>;
  aliases?: Record<string, string>;
}

let pricingPath = "";
let lastCheckMs = 0;
let lastMtimeMs = -1;
let modelPricing: Record<string, ModelPrice> = { ...DEFAULT_MODEL_PRICING };
let modelAliases: Array<[string, string]> = [...DEFAULT_MODEL_ALIASES];

function normalizeModelMap(input?: Record<string, ModelPrice>): Record<string, ModelPrice> {
  const out: Record<string, ModelPrice> = {};
  if (!input) return out;
  for (const [key, value] of Object.entries(input)) {
    if (!key || value == null) continue;
    const inputPer1M = Number(value.inputPer1M);
    const outputPer1M = Number(value.outputPer1M);
    if (!Number.isFinite(inputPer1M) || !Number.isFinite(outputPer1M)) continue;
    out[key.toLowerCase().trim()] = { inputPer1M, outputPer1M };
  }
  return out;
}

function normalizeAliasMap(input?: Record<string, string>): Array<[string, string]> {
  if (!input) return [];
  return Object.entries(input)
    .map(([alias, canonical]) => [alias.toLowerCase().trim(), canonical.toLowerCase().trim()] as [string, string])
    .filter(([alias, canonical]) => Boolean(alias) && Boolean(canonical));
}

function ensurePricingFileExists(): void {
  if (!pricingPath || fs.existsSync(pricingPath)) return;
  const initial: PricingOverrideFile = {
    models: {},
    aliases: {},
  };
  fs.writeFileSync(pricingPath, `${JSON.stringify(initial, null, 2)}\n`, "utf8");
}

function loadOverridesFromDisk(): void {
  ensurePricingFileExists();

  let fileMtimeMs = -1;
  if (pricingPath && fs.existsSync(pricingPath)) {
    fileMtimeMs = fs.statSync(pricingPath).mtimeMs;
  }

  if (fileMtimeMs === lastMtimeMs) return;
  lastMtimeMs = fileMtimeMs;

  const baseModels = { ...DEFAULT_MODEL_PRICING };
  const baseAliases = [...DEFAULT_MODEL_ALIASES];

  if (fileMtimeMs < 0) {
    modelPricing = baseModels;
    modelAliases = baseAliases;
    return;
  }

  try {
    const raw = fs.readFileSync(pricingPath, "utf8");
    const parsed = JSON.parse(raw) as PricingOverrideFile;
    const overrideModels = normalizeModelMap(parsed.models);
    const overrideAliases = normalizeAliasMap(parsed.aliases);
    modelPricing = { ...baseModels, ...overrideModels };
    modelAliases = [...overrideAliases, ...baseAliases];
  } catch {
    // Fail open: keep defaults if override file is invalid.
    modelPricing = baseModels;
    modelAliases = baseAliases;
  }
}

export function initPricingRegistry(path: string): void {
  pricingPath = path;
  lastCheckMs = 0;
  lastMtimeMs = -1;
  loadOverridesFromDisk();
}

export function maybeReloadPricingRegistry(): void {
  const now = Date.now();
  if (now - lastCheckMs < 5000) return;
  lastCheckMs = now;
  loadOverridesFromDisk();
}

export function getModelPricing(): Record<string, ModelPrice> {
  return modelPricing;
}

export function getModelAliases(): Array<[string, string]> {
  return modelAliases;
}

export function getPricingOverridePath(): string {
  return pricingPath;
}
