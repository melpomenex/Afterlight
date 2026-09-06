# Design: realtime binary protocol

## Context

The full wire contract is `docs/architecture/realtime/contract.md` (byte
offsets, section table, encodings, semantics). This design records why the
format is shaped the way it is and what lands in this repository now.

## Key decisions

### Byte-exact v0, sections over schemas

A fixed 24-byte header plus self-describing sections lets every experiment
(harness encoders B–H, the WASM decoder, the future Arrow section encoding)
share one envelope and differ only in section payloads. Schema evolution is
section-level: unknown section ids and encodings are rejected, not guessed,
and `protocol_version` bumps wholesale on breaking changes. `header_size` in
the header makes additive header fields non-breaking.

### Ids on the wire, slots in the store

Frames carry sparse u32 server ids; the client store maps them to dense u16
slots (free-list recycling). Slots are never on the wire — the server does not
know client slot state. String guestIds ride the spawn section once (string
table + reference) so self-echo filtering and `garden:<guestId>` keep working;
transform/flags sections stay fixed-width and id-addressed.

### Density selection is measured, not aesthetic

The benchmark harness (mask study + core bench) yields thresholds of the form:
tiny changed sets → SORTED_IDS; moderately sparse at scale → ROARING; very
dense → DENSE (omit the mask). `shared/realtime/chooseEncoding.mjs` encodes the
measured rules with their numbers in comments; both writer and reader accept
any valid encoding per section, so the policy can evolve without a protocol
bump.

### Fencing now, not after P9

`room_epoch` is carried from v0 (0 in the single-owner era). When P9 lands,
the field already means `room_leases.epoch` and stale-owner frames are
discarded by an existing client rule instead of a retrofit. `server_tick`
rides the existing 100 ms flush grid; `frame_sequence` is per-owner monotonic
and doubles as the delta baseline anchor.

### The Elixir side is a behaviour, not an implementation

This repo has no Mix app (P1 creates it). The change therefore commits the
behaviour contract — `RealtimeFrame` struct from a delta extractor,
`FrameEncoder` with JSON/BinarySoA/Arrow implementations, encode-once-per-
capability-class fanout — as spec + reference notes, and validates the binary
arm with standalone `.exs` reference scripts in the benchmark harness. Channel
handlers stay byte-free.

### Nothing is wired

The codecs land in `shared/realtime/` with full test coverage; the negotiation
fields are specified but sent by no current server; the client fast path is
not imported by `src/main.js`. Live enablement is a future gated change that
inherits the governance capability's parity and fallback requirements.

## Risks / Trade-offs

- Dual-maintenance of JSON and binary paths until adoption: bounded because
  the JSON path is the frozen migration baseline and the binary path is pure
  and isolated.
- A JS-only decoder may prove fast enough to skip WASM entirely — that is the
  `add-realtime-wasm-decoder` change's question, answered by `run-wasm.mjs` on
  these exact frames.
- Fixed f32 columns cost bytes vs quantized transforms; quantization is a
  deliberately deferred additive section encoding, not v0 complexity.

## Migration Plan

Land codecs + tests + tooling + spec. The gateway adopts negotiation when the
migration's P2/P3 implementers take it; the client integration change (future)
flips flags only with parity evidence per governance.

## Open Questions

- Should `welcome.rt.snapshot_hz` become a server-tunable (adaptive rate)?
  Deferred; the field exists so the answer can be additive.
- Interest-management-driven frame classes (per-client relevance) are a
  server-side concern the section model already accommodates.
