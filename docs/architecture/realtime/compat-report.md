# Realtime binary/GPU acceleration — compatibility report

Status: active, 2026-09-06. Author: parallel performance-architecture workstream
("the fast-path workstream"). Companion documents: `contract.md` (protocol v0
contract all experiments build against), `decisions.md` (benchmark-driven
technology verdicts, written when measurements land).

## 0. Relationship to the Elixir migration

The fast-path workstream is **additive**. The Elixir/Phoenix/OTP/Ash migration
(`openspec/changes/port-backend-to-elixir`, phases P0–P11 in
`docs/architecture/elixir/ownership.md`) owns the authoritative server
architecture and the current JSON wire. This workstream owns nothing durable,
nothing authoritative, and nothing the migration depends on. It designs an
optional, negotiated binary data plane **under** the existing abstractions:

- Three.js stays. The existing frontend stays. Phoenix/OTP room authority stays.
- Ash/PostgreSQL never enter the frame path.
- The Elixir migration can land in full with this workstream at zero.

## 1. Assumptions inherited from the migration (verified against its docs)

1. **Wire today is flat JSON text frames** `{type, ...fields}` over raw WS
   (`shared/protocol.js:152-162`); the Phoenix gateway (P2) unwraps
   `{topic, event, payload}` back to the same flat shape. Any binary frame must
   be sniffable without parsing JSON (leading magic u32 ≠ `{`).
2. **Presence is 10 Hz full-roster snapshots** (`presence_update`), client sends
   `movement` at ≤12.5 Hz; P3 freezes this as "no deltas" **on the JSON path**.
   The fast path is a separate negotiated capability — it does not modify the
   frozen catalog (`shared/protocol.js`) or P2/P3 requirements.
3. **Binary header fields are live on the negotiated path (2026-09-07).**
   Phoenix world runtime + Node direct server emit `rt_binary` as a **JSON
   channel event** `{tick, data: base64}` — not a raw WS binary frame — when
   the client negotiates `hello.rt.protocols` includes `afterlight-soa-v1`.
   Populated today: `server_tick`, `frame_sequence`, `baseline_sequence`;
   `room_epoch` stays **0** until P9 fencing. JSON `presence_update` remains
   the default for non-negotiating clients. See `shared/realtime/nodeBinaryFlush.js`
   and `Afterlight.World.BinaryFlush`.
4. **Identity is the guestId string** until P4; self-echo filtering and
   `garden:<guestId>` depend on it. Binary frames therefore carry u32 entity
   slots internally, but spawn records carry the string id once so client slot
   maps resolve back to guestIds.
5. **`NetworkClient` facade is pinned** (constructor shape, handler ordering,
   80 ms throttle, desiredRoom replay) by `tests/presence-race.test.js` and the
   gateway-transport spec. The fast path never changes facade behavior; it is
   off unless negotiated, and it degrades to the current path.
6. **The migration's load client (P10) will reuse `shared/protocol.js`.** Binary
   codecs live beside it under `shared/realtime/` so load tests can exercise
   both encodings later.
7. **OpenSpec discipline**: one spec system (`openspec/`), changes carry
   `proposal.md`/`design.md`/`tasks.md`/`specs/<capability>/spec.md`; nothing is
   archived yet (`openspec/specs/` empty). The fast path creates **new
   capabilities only**; it does not modify migration capabilities.

## 2. Interfaces this workstream consumes

| Interface | Source | How consumed |
|---|---|---|
| `presence_update {players:[{id,x,z,rotY,walking,sitting,airborne}]}` | current Node server; preserved by P2/P3 | semantic source of truth for the binary transform/flags payload (same fields, u32 slots instead of string ids) |
| `hello` / `welcome` | `server/index.js`, P2 gateway | capability negotiation via **additive fields only** (`rt` object); legacy peers ignore unknown JSON fields |
| `RemotePlayersManager.setPlayer({id,x,z,rotY,walking,sitting,airborne})` | `src/render/avatars.js:237` | the decode boundary: the fast path's client output is exactly this entry shape, so avatars need no change for the CPU fast path |
| three r0.180 `./webgpu` + `./tsl` exports | `node_modules/three` | WebGPU probes build on the installed version; no renderer flip without its own gated change |
| `activeCamera` | `src/main.js:47` | theater homography + raycast keep using it; accelerated renderers must keep it authoritative |
| Elixir availability | `/usr/bin/elixir`, mix | BEAM encoder prototypes are standalone `.exs` scripts (no Mix app — P1 owns the app skeleton) |

## 3. Interfaces this workstream proposes extending (by its own changes, additively)

1. `hello` gains an optional `rt` capability object; `welcome` gains an optional
   `rt` mode reply. Unknown-field tolerance is today's behavior on both ends
   (handlers destructure known fields only).
2. A new binary frame family `afterlight-soa-v1` / `afterlight-arrow-v1` on the
   same socket (text JSON + binary frames coexist; WS supports both).
3. An `Afterlight.Realtime.FrameEncoder` behaviour (Elixir) with
   JSON / BinarySoA / Arrow implementations, so the gateway can serve both
   capability classes from one room state (encode once per capability class,
   fan out the iodata).
4. An `EntityRenderBackend` seam in the client (`CPUThreeBackend` first,
   `WebGPUThreeBackend` experimental) that both consume the same decoded entity
   store — the legacy path remains the default until parity is proven.

## 4. Files this workstream owns (creates/edits)

- `docs/architecture/realtime/**` — this workstream's architecture docs.
- `benchmarks/realtime/**` — fixture generator, encoders, bench runners,
  results, WebGPU/BEAM probes (self-contained; no new root dependencies —
  nested `package.json` if needed).
- `shared/realtime/**` — pure JS codec modules (frame schema, encoders,
  decoders, density selection). Import-safe under Node like `shared/*` today.
- `tests/realtime/*.test.js` — codec, snapshot/delta semantics, fallback tests.
- `wasm/afterlight-realtime/**` — Rust crate (decoder, entity store, fuzz
  targets) + generated wasm + hand-rolled JS glue (no wasm-pack dependency).
- `tools/realtime/**` — standalone prototype server/client harness (never
  imported by `server/index.js`; the game binary path is opt-in by flag).
- `src/realtime/**` — client fast-path modules (worker, store, GPU backend
  prototypes), **unwired by default**; wiring lands only with its own gated
  change after parity evidence.
- `openspec/changes/realtime-binary-gpu-acceleration` + decomposed
  `add-realtime-*` changes.

## 5. Files this workstream deliberately does not touch

- `docs/architecture/elixir/**` — the migration's coordination point
  (`ownership.md` is its single source of truth for authority).
- `openspec/changes/add-*`, `port-backend-to-elixir`,
  `remove-node-server-authority` — migration-owned proposals.
- `shared/protocol.js` — message catalog frozen by P2/P3 specs.
- `src/net/client.js` facade behavior — pinned by tests + gateway spec.
- `server/index.js`, `server/world.js` — the parity reference baseline;
  binary support enters the real server only via the migration's own gateway
  phase or a later explicitly-scoped change.
- `src/main.js`, `src/render/avatars.js` — gameplay/rendering baseline; the
  CPU fast path's output contract is chosen precisely so neither must change.
- `serviceradar/` — untracked third-party tree of unknown provenance; left
  strictly alone.
- `data/**`, `dist/**`, `.vercel` files.

## 6. Potential merge/conflict points and their resolutions

| Point | Risk | Resolution |
|---|---|---|
| Migration P3 lands while binary specs are open | Presence semantics fork (JSON full-roster vs binary deltas) | Binary path is a negotiated overlay; JSON path unchanged; convergence fields (tick/epoch/seq) already reserved in both designs |
| P2 envelope unwrap vs binary frames | Gateway might strip/mangle binary frames | Fast path requires an explicit gateway disposition (relay binary frames unmodified for negotiating clients); recorded as a requirement in the realtime-protocol capability, not a change to P2 |
| P9 epochs vs frame epochs | Two epoch notions drift | Frame `room_epoch` is defined to be the `room_leases.epoch` value once P9 exists (u32 cast documented); before P9 it is 0 (single owner) |
| `package.json` dependency additions | Root deps are migration-sensitive | Benchmark/prototype deps live in `benchmarks/realtime/package.json`; nothing new is added to the root manifest by this workstream |
| Three.js version drift (WebGPU APIs) | Probes break on upgrade | Probes pin to the installed r0.180 capabilities and are version-checked at start |
| Concurrent edits to `openspec/changes/` | Name collisions | All fast-path changes are namespaced `realtime-*` / `add-realtime-*`; migration uses `add-<domain>` / port names — disjoint |
