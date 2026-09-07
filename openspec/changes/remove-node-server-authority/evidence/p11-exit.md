# P11 exit evidence (`port-backend-to-elixir` umbrella gate)

Recorded: 2026-09-07. Change: `remove-node-server-authority`.

## Artifacts

| Artifact | Path |
|---|---|
| Authority audit checklist | `evidence/authority-audit.md` |
| Snapshot hashes | `evidence/snapshot-hashes.md` |
| Router retirement record | `evidence/router-retirement.md` |
| E2E sweep | `evidence/e2e-sweep.md` (from `npm run verify:p11`) |
| Load re-baseline | `evidence/load-rebaseline.md` (from `node scripts/p11-load-rebaseline.mjs`) |

## Gate status

| Criterion | Status |
|---|---|
| No silent Node fallback for game domains | **Done** — `:unrouted` default |
| Sidecars intact | **Done** — torrent/IRC tests green |
| Full Node proxy deletion | **Blocked** — P5/P6 handlers + remaining relay rows |
| Node storage writes retired | **Blocked** — economy/theater/catalog still relay |
| P9 multi-node fencing | **May be in progress** — retirement proceeds on P10 single-node evidence |
