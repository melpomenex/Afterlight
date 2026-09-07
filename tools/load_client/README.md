# Load client (`tools/load_client/`)

Headless Node tooling for protocol-aware soak tests. **Not bundled** into the game client.

## Quick start

```sh
npm run dev:stack          # gateway + Node
npm run load:smoke         # 2-session smoke → docs/benchmarks/
node tools/load_client/cli.js run smoke-mini --report
```

## Layout

| File | Role |
| --- | --- |
| `client.js` | Phoenix Channels `LoadClient` (10 Hz consume, backpressure, durable envelopes) |
| `durable.js` | `request_id` / `expected_revision` tracking |
| `metrics.js` | p50/p95/p99 histograms |
| `runner.js` | Scenario orchestration |
| `report.js` | Markdown reports → `docs/benchmarks/` |
| `liveview.js` | LiveView placeholder (0 sessions until UI mounts) |
| `scenarios/*.json` | Fixed scenario matrix |

Protocol constants: `shared/protocol.js`. Channel framing: `src/net/phoenixClient.js`.

Full runbook: [docs/benchmarks/runbook.md](../../docs/benchmarks/runbook.md).
