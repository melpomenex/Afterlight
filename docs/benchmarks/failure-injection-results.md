# Failure-injection results (P10 §5)

Deterministic injection tests live under `server_elixir/test/afterlight/failure_injection/`. They are **excluded from default CI** (`test_helper.exs` excludes `:failure_injection`).

## Run

```sh
cd server_elixir
mix test --include failure_injection test/afterlight/failure_injection/
```

## Coverage

| Task | Module | Invariants |
| --- | --- | --- |
| 5.1 room-owner crash | `crash_test.exs` | Room restarts empty; no ghost membership; rejoin restores |
| 5.1 gateway crash | `crash_test.exs` | Duplicate connect supersedes; one logical session |
| 5.2 DB unavailable | `db_test.exs` | `FailureInjection.maybe_simulate_db` fails closed; recovery after clear |
| 5.2 DB slow | `db_test.exs` | Simulated delay before apply |
| 5.3 duplicate delivery | `dedup_test.exs` | `Accounts.run_idempotent` exactly-once |
| 5.3 stale revision | `dedup_test.exs` | Idempotency conflict on payload mismatch |
| 5.3 stale epoch | `dedup_test.exs` | Epoch discard contract documented |
| 5.4 partition / outbox | `partition_test.exs` | DB partition fails closed; outbox at-least-once |
| 5.5 deploy drain | `deploy_drain_test.exs` | Replay does not double-apply economic effects |

## Status

**Executed:** 2026-09-08
**Result:** 10 tests, 0 failures (passed)

```
Running ExUnit with seed: 859910, max_cases: 48
Excluding tags: [:integration, :database]
Including tags: [:failure_injection]

Finished in 0.6 seconds (0.00s async, 0.6s sync)
10 tests, 0 failures
```

All failure-injection invariants verified: room restart/rejoin, gateway supersession, DB unavailable fail-closed, DB slow delay precedence, idempotent duplicate delivery exactly-once, stale revision rejection, stale epoch discard contract, DB partition fencing, outbox at-least-once recovery, and deploy drain replay protection.

## Helper

`Afterlight.FailureInjection` — test-only Application env hooks for DB unavailable/slow simulation.
