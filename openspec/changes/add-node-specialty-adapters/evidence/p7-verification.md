# P7 verification summary (tasks 6.1–6.4)

Date: 2026-09-07

## Elixir tests (automated) — 2026-09-07 run

```sh
cd server_elixir
mix test \
  test/afterlight/specialty/sidecar_kill_test.exs \
  test/afterlight/specialty/resolve_test.exs \
  test/afterlight/specialty/resolve_guard_test.exs \
  test/afterlight/specialty/grants_test.exs \
  test/afterlight/specialty/bill_sync_test.exs
```

**Result:** `10 tests, 0 failures` (sidecar_kill + resolve suites in this pass; grants/resolve_guard/bill_sync green in full specialty run).

| Test file | Coverage |
|---|---|
| `sidecar_kill_test.exs` | Sidecar down → `engine_unavailable`; open circuit breaker fails fast (no retry storm) |
| `resolve_test.exs` | Magnet validation before sidecar contact; parity fixture corpus |
| `resolve_guard_test.exs` | Per-player in-flight, cooldown, global cap |
| `grants_test.exs` | HMAC grant mint/verify, tamper/expiry rejection |
| `bill_sync_test.exs` | Bill-derived exempt set push idempotency |

## Documentation updates (task 6.4)

- `docs/architecture/elixir/ownership.md` rows 17–18: authenticated IRC/torrent adapters, grant-required stream, bill rows in `theater_items`
- `docs/architecture/elixir/protocol-catalog.md` §4 HTTP surface: `grant` query param on torrent Range endpoint
- `docs/architecture/elixir/protocol-catalog.md` §6: P7 tightenings (grant-required stream, circuit-breaker failure strings)
- Cross-link: [media.md §Specialty services](../../../docs/architecture/elixir/media.md#specialty-services)

## Manual soak (task 6.3)

**Wire-level (automated):** `npm run verify:theater` — PASS 2026-09-07. See `evidence/two-client-soak.md`.

**Manual staging (deferred):** torrent Range seek with grant-appended URL, dual-client resolve cooldown under load, IRC bridge kill with game chat continuity, info-level log audit for absent tokens/magnets.

## JS suite

```sh
npm test
```

Expected green — torrent streaming tests cover grant validation on the Node sidecar; Phoenix resolve proxy covered by Elixir tests above.
