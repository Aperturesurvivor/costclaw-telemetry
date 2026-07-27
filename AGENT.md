# CostClaw — Agent Guide

CostClaw is an external OpenClaw plugin for local, cache-aware LLM usage and
cost telemetry.

## Non-negotiable boundaries

- Do not store prompts, model responses, tool arguments, or tool results.
- Treat provider billing as authoritative; CostClaw is an observability aid.
- Prefer the normalized cost emitted by OpenClaw over copied price tables.
- Do not describe an unpriced model as free. Use cost source `estimated`.
- Preserve existing SQLite data through append-only migrations.
- Keep the dashboard bound to loopback unless a separate authenticated design
  is implemented and reviewed.

## Current data path

`llm_output` → usage normalization → host cost or fallback pricing → SQLite →
local API/dashboard.

OpenClaw exposes current cache fields as `cacheRead` and `cacheWrite`.
`src/usage.ts` also accepts common historical/provider spellings.

The host's normalized cost is read from:

```text
lastAssistant.usage.cost.total
```

Custom fallback prices live in:

```text
~/.openclaw/costclaw-pricing.json
```

## Important files

```text
src/index.ts                 Plugin definition and registration
src/usage.ts                 Token and telemetry-cost normalization
src/pricing/calculator.ts    Host-cost preference and fallback math
src/pricing/registry.ts      Runtime price-file loading
src/storage/db.ts            Append-only schema migrations
src/storage/queries.ts       Persistence and aggregation
src/server/                  Local dashboard and API
test/                        Unit and integration checks
```

## Required checks

```bash
npm ci
npm test
npm run build
npm pack --dry-run
```

When changing hook behavior, also test a linked install in an isolated
OpenClaw state directory and inspect the registered hooks, tools, and service.

## Adding a migration

Append the next integer version to `MIGRATIONS` in `src/storage/db.ts`. Never
edit or remove an existing migration. Add a test proving old data remains
readable and new aggregates include the new field correctly.

## Pricing changes

Avoid embedding a large global price table. OpenClaw already normalizes model
costs when it has catalog data. Fallback pricing is for custom providers or
older hosts and must support input, output, cache-read, and cache-write rates.

## Privacy note

OpenClaw requires
`plugins.entries.costclaw-telemetry.hooks.allowConversationAccess=true` for the
non-bundled `llm_output` hook. This grants the plugin access to raw hook fields.
CostClaw must continue reading and persisting metadata only.
