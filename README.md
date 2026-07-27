# CostClaw

Local, cache-aware LLM usage and cost telemetry for OpenClaw.

CostClaw records model usage, prompt-cache activity, normalized cost, session
and trigger metadata, and tool outcomes in a local SQLite database. It serves a
dashboard on `127.0.0.1` and registers two agent tools for checking spend or
opening the dashboard.

![CostClaw dashboard](CostClaw%20Dashboard.png)

## Status

Version 0.2 repairs the original March 2026 release:

- prompt-cache reads and writes are included in token totals;
- OpenClaw's normalized per-call cost is preferred when available;
- custom fallback pricing supports separate input, output, cache-read, and
  cache-write rates;
- subagent sessions are attributed correctly;
- current `better-sqlite3` supports modern Node versions;
- database migrations preserve existing installations;
- tests and CI cover pricing, cache fields, storage, redaction, and the
  `llm_output` hook.

CostClaw is an independent community plugin. It is not an official OpenClaw
component or a billing system of record. Compare estimates with provider bills
before making financial decisions.

## Requirements

- OpenClaw 2026.5.7 or newer
- Node.js 22 or newer

## Install

Download the v0.2 release package, install it, enable it, and explicitly allow
the conversation hook used to receive normalized usage metadata:

```bash
curl -fLO https://github.com/Aperturesurvivor/costclaw-telemetry/releases/download/v0.2.0/costclaw-telemetry-0.2.0.tgz
openclaw plugins install ./costclaw-telemetry-0.2.0.tgz
openclaw plugins enable costclaw-telemetry
openclaw config set plugins.entries.costclaw-telemetry.hooks.allowConversationAccess true --strict-json
openclaw gateway restart
```

Then open <http://localhost:3333>.

The npm registry still serves the original v0.1 package. Use the release
artifact or source installation until v0.2 is published there.

OpenClaw requires `allowConversationAccess` for non-bundled `llm_output`
hooks. That permission lets a plugin receive the model-output event, including
raw output fields. CostClaw reads usage, cost, model, session, agent, and
trigger metadata only; it does not store assistant text or prompts. Review
[`src/index.ts`](src/index.ts) before enabling the permission if this trust
boundary matters to you.

### Install from source

```bash
git clone https://github.com/Aperturesurvivor/costclaw-telemetry.git
cd costclaw-telemetry
npm ci
npm run check
openclaw plugins install -l .
openclaw plugins enable costclaw-telemetry
openclaw config set plugins.entries.costclaw-telemetry.hooks.allowConversationAccess true --strict-json
openclaw gateway restart
```

## What it records

For each observed LLM call:

- provider and model;
- uncached input and output tokens;
- cache-read and cache-write tokens;
- OpenClaw-normalized cost when supplied by the host;
- session, agent, trigger, and subagent attribution;
- timestamp and cost-source classification.

Tool records contain the tool name, success state, duration, session, and
timestamp. Prompts, model responses, tool arguments, and tool results are not
stored.

Data stays in:

```text
~/.openclaw/costclaw.db
```

The dashboard binds to `127.0.0.1` by default. CostClaw makes no outbound
network requests.

## Cost calculation

CostClaw uses this order:

1. Trust the normalized `usage.cost.total` emitted by OpenClaw.
2. If the host does not provide cost, look up a user-defined price.
3. If neither exists, record the call with `$0.00` and `estimated` as the
   cost source.

This avoids silently applying stale global price tables. Configure custom or
missing models in `~/.openclaw/costclaw-pricing.json`:

```json
{
  "models": {
    "provider/model": {
      "inputPer1M": 3,
      "outputPer1M": 15,
      "cacheReadPer1M": 0.3,
      "cacheWritePer1M": 3.75
    }
  },
  "aliases": {
    "provider/model-versioned": "provider/model"
  }
}
```

Rates are USD per million tokens. If cache-specific rates are omitted,
CostClaw conservatively uses the configured input rate for those tokens.
Restart the gateway after editing the file.

## Dashboard and tools

The local dashboard includes:

- today, month, seven-day, and thirty-day spend;
- token totals that include prompt-cache traffic;
- model, trigger, subagent, and session breakdowns;
- tool failure information;
- cautious recommendations when sufficient configured pricing exists.

CostClaw registers:

- `costclaw_status` — return current summary totals and the dashboard URL;
- `costclaw_dashboard` — return the local dashboard URL.

## Configuration

Change the dashboard port:

```json
{
  "plugins": {
    "entries": {
      "costclaw-telemetry": {
        "config": {
          "port": 3333
        },
        "hooks": {
          "allowConversationAccess": true
        }
      }
    }
  }
}
```

Custom redaction rules can be stored in
`~/.openclaw/costclaw-pii-rules.json`. Redaction is defense in depth for tool
names; CostClaw does not persist prompt or response content.

## Verify

```bash
npm ci
npm test
npm run build
npm pack --dry-run
```

CI runs the same checks on Node 22, 24, and 25.

For a local OpenClaw installation:

```bash
openclaw plugins inspect costclaw-telemetry --json
curl http://127.0.0.1:3333/api/health
```

## Project structure

```text
src/index.ts                 OpenClaw hooks, tools, and service registration
src/usage.ts                 Usage-field normalization and host-cost extraction
src/pricing/                 Optional fallback pricing and aliases
src/storage/                 SQLite schema, migrations, and queries
src/server/                  Local HTTP API and dashboard
src/recommendations/         Bounded cost and tool-failure suggestions
test/                        Unit and integration tests
```

## Contributing

Bug reports and pull requests are welcome. Include:

- OpenClaw and Node versions;
- the provider/model identifier;
- sanitized usage fields;
- expected and observed totals;
- a test when practical.

The Node 25, runtime-pricing, and subagent improvements in v0.2 incorporate
work contributed by [MY-BOT-TARS](https://github.com/MY-BOT-TARS) in
[PR #3](https://github.com/Aperturesurvivor/costclaw-telemetry/pull/3).

## License

[MIT](LICENSE)
