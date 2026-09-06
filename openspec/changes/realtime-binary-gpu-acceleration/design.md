# Design: realtime-binary-gpu-acceleration (umbrella)

## Context

The migration owns authority and durability; this program owns only the
realtime data plane. The full layering and the v0 protocol live in
`docs/architecture/realtime/contract.md`; the compatibility analysis lives in
`docs/architecture/realtime/compat-report.md`. This design records the
program-level decisions that outlive individual changes.

## Program structure

```
evidence:   add-realtime-benchmark-harness      (benchmarks/realtime/**)
protocol:   add-realtime-binary-protocol        (shared/realtime/**, negotiation)
decode:     add-realtime-wasm-decoder           (wasm/afterlight-realtime/**)
pipeline:   add-realtime-worker-pipeline        (src/realtime/worker/**)
rendering:  add-realtime-gpu-rendering          (src/realtime/gpu/**)
```

Dependency order: harness → protocol → (decode, pipeline) → rendering. The
decode and pipeline changes can proceed in parallel once the protocol's codec
exists; rendering requires a working pipeline. Every change ends in an
adopt/select/reject decision record in `docs/architecture/realtime/decisions.md`.

## Decision 1: Technologies must earn their place

Each technology gets a standing verdict with this shape (filled as evidence
lands):

| Technology | Benefit (hypothesis) | Cost | Benchmark | Decision |
|---|---|---|---|---|
| Binary SoA vs JSON | 5–20× smaller deltas, decode without per-entity objects | dual-path maintenance | benchmarks/realtime core | pending |
| Roaring masks | compact sparse changed-sets at scale | wasm dep, complexity | masks study | pending |
| Arrow IPC | schema'd bulk state, interop, debuggability | metadata overhead at small N | arrow study | pending |
| Rust/WASM decode | predictable memory, faster at volume | build toolchain, ABI | wasm study | pending |
| Web Worker | main-thread protection | transfer discipline | pipeline bench | pending |
| WebGPU scatter | O(changed) GPU updates, render from persistent state | big compatibility surface | webgpu probe | pending |
| WebTransport | datagrams for supersedable state | new transport + fallback | out of scope until binary works | not started |

A `reject` verdict is a successful outcome; the harness and records remain as
the proof. No prototype graduates into the live game without its decision
record showing measured benefit at Afterlight-realistic populations.

## Decision 2: Fallback ladder

Accelerated WebGPU → binary CPU (worker+WASM, Three.js as today) → legacy
(current JSON + current renderer). Every mode must reach the same visible
game state. Failure tests are part of each child change (wasm compile failure,
device lost, worker crash, malformed frames, stale epochs). A player on
unsupported hardware plays the legacy path, full stop.

## Decision 3: Flags, not one experimental mode

`realtime_binary`, `realtime_wasm`, `realtime_worker`, `renderer_webgpu_fastpath`
(env/URL/localStorage dev switches, following the `VITE_TRANSPORT` precedent).
Defaults off. Each flag maps to one capability so failures are attributable.
No flag combination may produce a state the legacy path cannot reach.

## Decision 4: Relationship with the migration (convergence points)

- Frame `room_epoch` is 0 until P9 `room_leases` exists, then it is that value;
  `server_tick` rides the P3 100 ms grid; `frame_sequence` is per-owner monotonic.
- The `FrameEncoder` behaviour is specified here (protocol change) so the P2/P3
  gateway can adopt it without redesign; implementing it server-side remains
  the migration's call.
- Capability negotiation is additive JSON fields on `hello`/`welcome` only —
  no new JSON message types, per the P2/P3 freeze.

## Risks / Trade-offs

- Dual-path drift: mitigated by the governance requirement that accelerated
  and legacy paths must produce identical semantic state on shared fixtures,
  tested continuously.
- Benchmark noise on shared hardware: min-of-runs reporting, results committed
  with environment metadata.
- three.js WebGPU instability: GPU backend is last in the ladder and behind
  its own flag; the program does not flip any default.

## Migration Plan

Umbrella lands with governance + harness changes first; protocol change lands
with codecs + tests but no live wiring; decode/pipeline/rendering changes land
prototypes behind flags. The final wiring change (out of scope here) flips
defaults only after visual + semantic parity evidence.

## Open Questions

- Does interest management (server-side relevance filtering) beat compression
  at Afterlight populations? Parked for the load-testing coordination with P10;
  the frame format's section model accommodates per-class fanout later.
- Quantized transforms (octahedral yaw etc.) — deferred until the fixed-point
  baseline is measured; additive via a new section encoding.
