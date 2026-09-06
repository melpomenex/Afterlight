# Design: realtime worker decode pipeline

## Context

The pipeline is the bridge between the protocol capability's pure codecs and
the renderer. Its design constraints come from the renderer audit: the frame
loop is allocation-sensitive; presence cadence is 10 Hz with full-roster JSON
today; the accelerated path must produce setPlayer()-shaped entries so avatars
are untouched.

## Threading and transfer model

- One dedicated worker; the socket stays on the main thread in v0 (the worker
  receives transferred ArrayBuffers of raw frames). This keeps `NetworkClient`
  untouched — its facade is pinned — while moving the expensive step.
- Transferables, not copies: each frame's ArrayBuffer is transferred to the
  worker and recycled through a small pool after decode. SharedArrayBuffer is
  explicitly out of scope (COOP/COEP embedding cost documented in
  compat-report §6 and deferred to a future decision).
- Back-pressure: the worker keeps the last state per entity (its store), so a
  backlog of transform-only frames is collapsed — only the newest per entity
  matters. Lifecycle frames are never dropped; if a baseline gap appears, the
  worker signals resync and the consumer triggers the existing re-join flow.

## Zero-churn discipline

The store's columns grow geometrically and are reused; a decoded tick produces
offset/length views into persistent arrays. The main thread receives a
transferable "delta pack" (ids + columns + counts) that it consumes before the
next frame boundary; the pack buffers are pooled on both sides. The harness
asserts allocations/tick stays flat over a 600-tick run.

## Consumer seam

`consumer.js` writes entries into the existing `RemotePlayersManager` (entry
shape `{id, x, z, rotY, walking, sitting, airborne}`) and, for non-avatar
archetypes, updates an instanced-matrix scratch — both are the legacy renderer's
own contracts. Interpolation stays where it is today (exponential lerp in
avatars) for this change; moving interpolation into WASM/compute is a later
milestone per the umbrella.

## Failure model

Worker construction failure, worker error/crash, or a stalled handshake (no
ack within a bounded window) falls back to main-thread legacy decoding of the
same socket. Room travel resets the store: slots freed, baselines cleared, ID
maps dropped — mirrors `remotePlayers.clear()` today. The flags
(`realtime_binary`, `realtime_worker`) compose: binary without worker decodes
on-thread; worker without binary is a no-op passthrough of legacy JSON.

## Risks / Trade-offs

- Worker postMessage latency at 10 Hz is trivially small vs decode savings at
  scale, but at 50-entity rooms the whole pipeline may be slower than JSON —
  the bench records where the crossover is, and the flag exists precisely so
  small rooms can stay legacy.
- Vite worker bundling may need minimal config (documented exception).

## Migration Plan

Prototype page demonstrates both paths side by side (JSON vs binary+worker)
against the echo server; parity asserted on the store level; live wiring is a
future gated change per governance.

## Open Questions

- Does the worker eventually own the socket entirely (DedicatedWorkerTransport
  inside NetworkClient)? Deferred — the facade is migration-pinned; revisit
  with the gateway implementers.
