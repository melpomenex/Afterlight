# P10 Benchmark Regressions & Unmet Targets

**Recorded:** 2026-09-08  
**Gate:** Phase P10 Acceptance & Honesty Gate

Per the honest benchmark reporting protocol (`design.md` D7 / `spec.md`), all migration acceptance targets must be evaluated against actual measurements in committed benchmark reports. Any unmet target must produce a recorded regression issue referenced directly from the gate report without softening criteria or claiming unmeasured performance.

---

## REG-P10-001: 1,000-session room tick consume lag p99 exceeds 50 ms target

- **Target:** p99 room tick < 50 ms at 10 Hz
- **Measured Value:** p99 tick consume lag = 2570 ms (p50: 708 ms, p95: 2091 ms) in [steady-soak.md](./steady-soak.md)
- **Status:** **REGRESSION / UNMET TARGET**
- **Observed Conditions:** 1,000 concurrent client sessions on a single host (`linux/x64`, AMD Ryzen 9 5900X 24-core, 22.9 GB RAM) communicating over loopback WebSocket to the Phoenix gateway (`:4000`).
- **Telemetry Analysis:**
  - Server-side BEAM run queue stayed at 0 (`vm_total_run_queue_lengths_total = 0`, `vm_total_run_queue_lengths_cpu = 0`), indicating the BEAM scheduler did not saturate.
  - Server memory stabilized at ~3.4 GB (`vm_memory_total = 3422.004 MiB`) without monotonic growth.
  - The client-side Node process was responsible for consuming, serializing, and parsing 689,273 JSON frames across 1,000 concurrent WebSockets within a single Node.js event loop thread, introducing substantial client-side read queue latency.
- **Action / Follow-up:**
  1. Distribute load-client runners across multiple worker processes or hosts to isolate server tick latency from single-threaded Node event-loop starvation.
  2. Implement binary frame consumption (`VITE_RT_BINARY` path) in the load client to eliminate JSON serialization overhead at 1,000 sessions.

---

## REG-P10-002: Durable ack latency unmeasured during steady soak

- **Target:** p95 same-region durable-command acknowledgement < 250 ms
- **Measured Value:** `_no samples_` recorded in [steady-soak.md](./steady-soak.md)
- **Status:** **UNMET MEASUREMENT OBLIGATION**
- **Observed Conditions:** Durable commands issued in `steady-soak` (`garden_action`) lacked initialized garden plot ownership state for newly generated guest identities, resulting in pending durable envelopes without acknowledged state transitions from the authority.
- **Action / Follow-up:**
  1. Pre-seed guest player inventory and garden plots during the ramp phase of durable soak tests, or exercise session-scoped durable mutations (e.g. `set_nickname` / `contract_complete`) that succeed without pre-existing domain state.
  2. Re-measure durable command ack p95 with seeded accounts prior to production deployment.
