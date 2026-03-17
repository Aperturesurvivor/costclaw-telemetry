# CostClaw — Reduce Your OpenClaw Agent Costs

**The fastest way to see, understand, and reduce what your OpenClaw agents spend on LLM API calls.**

CostClaw is a free, open-source OpenClaw plugin that tracks every LLM call your agents make, calculates the real cost in USD, and serves a live local dashboard at `http://localhost:3333`. No external services. No data leaves your machine.

> Most OpenClaw users don't realize they're spending $50–300/mo on API calls until they get the bill. CostClaw shows you in real time — and tells you exactly where to cut.

---

## Why OpenClaw costs get out of control

OpenClaw agents run continuously. They respond to user messages, fire on heartbeat timers, run cron jobs, and spin up subagents. Every one of those runs makes LLM API calls. Without visibility:

- **Heartbeat agents** run every few minutes on expensive models — even when there's nothing to do
- **Subagents** multiply costs: one user message can trigger 5–10 downstream LLM calls
- **Wrong model selection** — running GPT-4o for tasks that Claude Haiku handles equally well costs 10–20x more
- **No per-session visibility** — you can't tell which conversation cost $0.12 vs $4.00

CostClaw fixes all of this.

---

## How to reduce your OpenClaw costs (step by step)

1. **Install CostClaw** (60 seconds, see below)
2. **Open the dashboard** at `http://localhost:3333`
3. **Check "Usage by Source"** — if `heartbeat` is your biggest spend, your polling interval is too aggressive or your model is too expensive for keep-alive checks
4. **Check "Model Breakdown"** — switch to a cheaper model for tasks that don't need top-tier reasoning
5. **Check "Sessions by Cost"** — identify which conversation patterns are the most expensive
6. **Read the Recommendations panel** — CostClaw auto-generates specific suggestions based on your actual usage

---

## Features

- **Real-time cost dashboard** at `http://localhost:3333`
- **Per-model breakdown** with cost, tokens, and share of total spend
- **Usage by source** — separate costs for user messages, heartbeat, cron jobs, memory runs, and subagents
- **Session cost tracking** — see exactly which conversations cost the most
- **Today / 7-day / 30-day views** with hourly drill-down for today
- **Automatic saving recommendations** based on your actual usage patterns
- **Runtime pricing config** via `~/.openclaw/costclaw-pricing.json`
- **Persistent SQLite storage** with auto-migrations — survives restarts, no data loss
- **PII redaction** — sensitive data scrubbed before storage
- **Privacy-first** — all data stays in `~/.openclaw/costclaw.db`, zero external requests

---

## Install (2 commands)

```bash
openclaw plugins install costclaw-telemetry
openclaw gateway restart
```

Open **http://localhost:3333** in your browser. That's it.

**Requirements:** [OpenClaw](https://github.com/openclaw/openclaw) installed and running. Node.js 18+.

### Alternative: install from source

```bash
git clone https://github.com/Aperturesurvivor/costclaw-telemetry.git
cd costclaw-telemetry
npm install && npm run build
openclaw plugins install -l .
openclaw gateway restart
```

---

## Ask your agent directly

Once installed, your OpenClaw agent gets two new tools:

| Say this | What happens |
|---|---|
| "How much have I spent today?" | Agent calls `costclaw_status` and reports your spend |
| "Open the cost dashboard" | Agent opens `http://localhost:3333` in your browser |
| "Which model is costing me the most?" | Agent reads the model breakdown from `costclaw_status` |

---

## Dashboard sections

| Section | What it shows |
|---|---|
| KPI cards | Today's cost + tokens, monthly total, cost per 1K tokens, model count, session count, total calls |
| Spend trend | Hourly bars (today) or daily line chart (7D/30D) — switch with the tabs |
| Model breakdown | Doughnut chart + sortable table with share % and per-model cost |
| Usage by source | Horizontal bars for user / heartbeat / cron / memory / subagent spend |
| Sessions by cost | Sortable table of your most expensive conversations |
| Recommendations | Auto-generated cost-cutting suggestions with estimated monthly savings |

---

## Supported models and pricing

CostClaw now treats `~/.openclaw/costclaw-pricing.json` as the source of truth for pricing and aliases.

There are no built-in model prices in the local fork. If a model is not present in your pricing JSON (either directly or via an alias), the event is still tracked but cost falls back to `$0.00` with `estimated` source.

To add or change a model price, edit `~/.openclaw/costclaw-pricing.json` and restart the gateway.

---

## Configuration

Custom port in `~/.openclaw/openclaw.json`:

```json
{
  "plugins": {
    "entries": {
      "costclaw": {
        "config": { "port": 3333 }
      }
    }
  }
}
```

Custom PII redaction rules in `~/.openclaw/costclaw-pii-rules.json`:

```json
[
  { "name": "my-secret", "pattern": "MY_SECRET_[A-Z0-9]+" }
]
```

Pricing config in `~/.openclaw/costclaw-pricing.json`:

```json
{
  "models": {
    "moonshotai/kimi-k2.5": { "inputPer1M": 0.45, "outputPer1M": 2.2 },
    "google/gemini-3-flash-preview": { "inputPer1M": 0.5, "outputPer1M": 3.0 }
  },
  "aliases": {
    "openrouter/moonshotai/kimi-k2.5": "moonshotai/kimi-k2.5",
    "openrouter/google/gemini-3-flash-preview": "google/gemini-3-flash-preview"
  }
}
```

The pricing JSON is loaded at runtime from disk and is the only pricing source in this local fork. After editing the JSON file, you only need a gateway restart, not a code rebuild.

---

## FAQ

**How much can I actually save?**
Varies by usage, but the most common wins: switching heartbeat agents from GPT-4o to GPT-4o-mini saves ~20x on keep-alive costs. Routing low-complexity tasks to Claude Haiku instead of Sonnet typically cuts model costs by 50–80%.

**Does this slow down my agents?**
No. CostClaw captures data via OpenClaw's native event hooks — the same path used for every other plugin. There is no added latency to LLM calls.

**Is my data sent anywhere?**
No. Everything stays in `~/.openclaw/costclaw.db` on your local machine. The dashboard server only binds to localhost.

**What if a model shows $0.00 cost?**
The model name reported by the API isn't in your pricing config yet. Add it to `~/.openclaw/costclaw-pricing.json` directly or map it via an alias, then restart the gateway.

**Can I use this with multiple OpenClaw instances?**
Each instance needs its own plugin install. Multi-machine aggregation is on the roadmap.

**Does it work with self-hosted / local models (Ollama, LM Studio)?**
Yes — they'll show up with $0.00 cost (local models are free). Useful for tracking token volume even without a dollar cost.

---

## Troubleshooting

**Dashboard not loading:**
```bash
openclaw plugins list
# "costclaw" should show status "loaded"
# If not:
openclaw plugins enable costclaw && openclaw gateway restart
```

**Cost shows $0.00 for a model** — add it to `~/.openclaw/costclaw-pricing.json` and restart the gateway.

**Port conflict** — change port in `~/.openclaw/openclaw.json`.

---

## Project structure

```
src/
  index.ts                  Plugin entry — registers hooks, tools, HTTP service
  pricing/table.ts          Empty built-in placeholder (runtime pricing comes from JSON)
  pricing/registry.ts       Runtime pricing loader for ~/.openclaw/costclaw-pricing.json
  storage/db.ts             SQLite init and versioned migrations
  storage/queries.ts        All DB read/write functions
  redact/                   PII redaction engine + built-in rules
  recommendations/engine.ts Cost-saving recommendation logic
  server/dashboard-html.ts  Full dashboard UI (inlined TypeScript string)
  server/api.ts             HTTP API route handlers
  server/http.ts            HTTP server setup
```

---

## Roadmap

- [ ] Budget alerts — notify agent or email when daily spend exceeds threshold
- [ ] Smart cost routing — automatically switch to cheaper model when budget is low
- [ ] Export to CSV
- [ ] npm publish for one-line install (`openclaw plugins install costclaw`)
- [ ] Multi-machine aggregation

---

## Contributing

PRs welcome. To improve pricing behavior, update the runtime pricing architecture and `~/.openclaw/costclaw-pricing.json` flow documented above. To report a bug or request a feature, open an issue.

---

## License

MIT — free to use, modify, and distribute.

---

*Made for the OpenClaw community. If this saved you money, consider starring the repo — it helps others find it.*
ring the repo — it helps others find it.*
repo — it helps others find it.*
