# Design: parity fixture baseline

## Context

Current behavior: every deterministic rule a later phase must port lives in JS — `shared/theaterModel.js`, `shared/torrentModel.js`, `shared/gardenModel.js`, `shared/crops.js`, `shared/economy.js`, `shared/iptvModel.js`, `shared/xmltv.js`, `shared/identity.js`, `shared/protocol.js`, plus pure logic embedded in managers: `OrderBook` (`server/orderbook.js`, constructor takes a storage object), `NodesManager` (`server/nodes.js`), `MachinesManager` (`server/machines.js`), `parseRange` (`server/torrents.js`), and the YouTube playlist extractors (`server/youtubePlaylist.js`). The existing `node --test` suite pins them, but only from inside JavaScript. `docs/architecture/elixir/parity-notes.md` ranks the porting hazards (Math.round half-toward-+∞, `toFixed(3)` binary-float formatting, UTF-16 code-unit slicing, WHATWG-vs-RFC URL parsing, semantic key iteration order, `Number` coercion, null/undefined/absent conflation, 32-bit arithmetic, `Date.UTC` rollover, stable-sort tie order). `docs/architecture/elixir/runtime.md` records that no throughput baseline has been measured. There is no Elixir code in the repo yet; `server_elixir/` will be created by `add-elixir-phoenix-foundation`, which depends on this change.

Desired behavior: a committed, byte-reproducible corpus of language-neutral fixtures exported from the JS implementations themselves, a determinism test that keeps the corpus honest, an honestly measured Node baseline, and a runner contract the Elixir app (P1) can implement without reinterpretation — so every later cutover change can point at green fixtures instead of intuition.

Note on the existing scaffold: a partial exporter scaffold already exists at `scripts/parity/` (harness plus per-domain builders — `harness.mjs`, `catalog.mjs`, `garden.mjs`, `market.mjs`, `misc.mjs`, `theater.mjs`, `torrent.mjs`). Implementation of this change reconciles with that scaffold — extending/reusing its harness and builders as the seed of the exporter — rather than forking a second harness alongside it.

## Goals / Non-Goals

**Goals:**

- The exporter runs clean from a pinned repo revision and regenerates the corpus byte-identically.
- Every hazard class in `parity-notes.md` §1 is covered by at least one pinned case, traceable through a fixture manifest.
- Baseline measurements recorded with method, environment, and revision; explicit and honest about what was not measured.
- The Elixir runner contract (`Afterlight.Parity`) is defined precisely enough that `add-elixir-phoenix-foundation` can land it as its seed test suite.

**Non-Goals:**

- No authority flip of any domain; the Node server keeps serving the game exclusively.
- No production Elixir ports of game rules in this change — the runner's reference implementations are test-side parity assets, never authority (domain changes P4–P6 supersede them as real domains land).
- No fixtures for `Math.random` id generators (masked as `"<generated>"`), the `toLocaleDateString` list-name fallback in `iptvModel.js` (locale-dependent; fixtures construct names that never trigger it), or anything requiring live network access (YouTube extraction is tested over synthetic HTML; no torrent swarms, no fetches, no IRC).
- No load/soak suite — that is the P10 change; here we only capture a first honest baseline.
- No protocol, persistence, or gameplay changes.

## Data Model

None. The harness adds no persisted game state and no database surface; fixtures are committed test artifacts under `tests/fixtures/parity/`, and the baseline document records measurements, not state.

## Decisions

### D1 — Export from the implementations, not hand-transcription
*Decision:* `scripts/export-parity-fixtures.mjs` imports the real modules and records their observed outputs as `expected`: `shared/*.js` directly; the manager logic through instances constructed with a stub storage object (`OrderBook`, `NodesManager`, `MachinesManager` already accept one); `parseRange` as a free function import; `extractPlaylistVideos` over committed synthetic HTML strings. `nowMs` is pinned everywhere (e.g. `1_700_000_000_000`); seeds are pinned where a function accepts one (`generateDefaultNickname(0 | 0.1 | 0.5 | 0.999)`).
*Alternative Considered:* hand-written expected vectors. Rejected: transcription errors would manufacture false parity failures and erode trust in the harness; exporting from the source keeps fixtures mechanically tied to the code they pin.

### D2 — Case shape and comparator rules follow parity-notes §2 exactly
*Decision:* per case `{fn, args, state, nowMs, seed?, expected, error?}` where `expected` carries the full output object (including reducer outputs that are themselves `{state, error}` shapes) and `error?` carries the exact reason string when the outcome is an error outcome — reason strings are wire protocol (`error` messages, `action_result.message`) and stay byte-identical. Multi-step reducers serialize as `{steps: [...]}` scripts threading state between steps (orderbook `placeOrder` sequences, `tickBed` runs, `updateMarketMultiplier` chains). Generated ids are masked `"<generated>"`. Comparators are numeric-tolerant for integer/float (JSON round-trip: `1.0` comes back as `1`), order-sensitive exactly where order is semantic (order books, EPG caps, file pickers, first-wins indexes, DFS collect order), order-insensitive otherwise.
*Alternative Considered:* one file per function. Rejected: hundreds of tiny files make drift review noisy; one file per module area with a manifest keeps review and the runner dispatch table simple.

### D3 — Determinism is enforced by a committed test
*Decision:* `tests/parity-fixtures.test.js` (plain `node --test`, picked up by the existing `npm test` glob) invokes the exporter twice into temporary directories and requires byte-identical output, and compares the committed `tests/fixtures/parity/*.json` against a fresh export so fixtures cannot silently drift from the code. The exporter writes stable JSON (fixed key insertion order, sorted manifest, no timestamps or environment data in output).
*Alternative Considered:* a CI-only drift check. Rejected: determinism must hold on contributor machines too, and the node test suite is the project's only automated gate at this point.

### D4 — Baseline measurements use a scripted two-client harness plus an opt-in in-process probe
*Decision:* room broadcast bytes are measured by `scripts/measure-node-baseline.mjs`, which boots the real server on a scratch port with throwaway state, connects two scripted WS clients, drives hello/join/movement, and records broadcast frame byte sizes over a fixed window (p50/p95/max per flush and per second per room). Save latency and event-loop lag require in-process visibility, so a tiny opt-in probe (`server/baselineProbe.js`, active only with `AFTERLIGHT_BASELINE_PROBE=1`) wraps `storage.save()` timing and samples `perf_hooks.monitorEventLoopDelay`, emitting batched JSONL to stderr; it is dead code when unset and changes no gameplay behavior. Results go to `docs/architecture/elixir/baseline-node.md` with method, environment, revision, and raw distributions.
*Alternative Considered:* purely external measurement. Rejected for save latency and event-loop lag: neither is observable from outside the process, and an honest number requires the probe.

### D5 — Elixir runner reads fixtures unchanged and dispatches through a manifest
*Decision:* `server_elixir/test/parity/` hosts `Afterlight.Parity`: it reads `tests/fixtures/parity/manifest.json` and the case files from the repo root (path resolved relative to the Mix project, configurable), walks the manifest, and dispatches each case file → Elixir reference module (`Afterlight.Parity.Reference.*`), applying the D2 comparator rules. The reference ports exist solely to pass fixtures and are clearly named as non-authority; domain changes may later point the dispatch at real domain implementations. The runner tasks in this change reference `add-elixir-phoenix-foundation` for the Mix app and are written to be executable once that app exists.
*Alternative Considered:* each domain change writes its own fixture loader. Rejected: one loader with one comparator is the single place to get JSON-number, key-order, and tie-order semantics right.

### D6 — Hazard coverage is explicit and manifest-traced
*Decision:* the exporter emits `tests/fixtures/parity/manifest.json` listing, per fixture file, the functions covered and a `hazards` map from the `parity-notes.md` §1 classes (js_round, tofixed3, utf16_slicing, url_parsing, key_order, number_coercion, null_undefined_absent, bits32, date_utc_rollover, stable_sort_ties) to representative case ids. The determinism test asserts every class maps to at least one existing case id, so coverage cannot rot quietly.
*Alternative Considered:* relying on reviewer vigilance. Rejected: the acceptance criterion is mechanical and should be checked mechanically.

## Risks / Trade-offs

- *[Exporter imports pull heavy module graphs]* → `server/torrents.js` is imported only for `parseRange`; if its import graph proves heavy, the task list allows moving `parseRange` verbatim into `shared/torrentModel.js` with a re-export from `server/torrents.js` — a pure, zero-behavior-change move — so the fixture source stays light.
- *[JSON round-trip hides int/float distinctions]* → comparators are numeric-tolerant by design (parity-notes §3); where the int/float distinction is itself the hazard (e.g. float `moistureChecks` accumulation, integer coins), fixtures pin the arithmetic through sequences whose intermediate values diverge between correct and incorrect typed implementations.
- *[Fixtures rot when JS rules change]* → committed fixtures are regenerated by the same change that modifies a rule; the drift check makes stale fixtures fail loudly. That friction is intended: during the migration, any change to a pinned rule is a parity event.
- *[Baseline numbers misread as targets]* → `baseline-node.md` states method and environment and is framed as a pre-migration reference point, not a capacity claim; capacity targets remain deferred to P10.
- *[Measurement probe skews what it measures]* → the probe writes JSONL in batches, and the harness runs a no-probe pass to confirm broadcast-byte numbers are not distorted by the probe's own overhead.
- *[Fixtures leak real data]* → all fixture inputs are synthetic (hand-built URLs, HTML, nicknames); a review checklist item confirms no real playlist/guide/player content is committed.

## Migration Plan

This change moves no authority and migrates no data; it is purely additive test/tooling/docs surface. Order of work: exporter + fixture sets → determinism test → baseline probe + harness + baseline document → runner contract (executable once `add-elixir-phoenix-foundation` provides the Mix app; that change owns wiring the runner into `mix test`). Protocol changes: none. Persistence changes: none. Data model: none. Rollback: delete the new files; nothing in the game references them, so there is nothing to roll back operationally.

## Open Questions

None material. Exact case counts per table (e.g. ~40 `classifySource` URLs) are guidance in the tasks and may grow during export without a spec change, provided the manifest's hazard coverage stays complete.
