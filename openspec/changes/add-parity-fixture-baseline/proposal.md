# Add Parity Fixture Baseline

## Why

The migration contract (`port-backend-to-elixir`) makes parity the admission test: no Elixir code may take authority over a domain until it reproduces that domain's deterministic rules exactly. Today those rules live only in JavaScript — `shared/*.js` and the pure logic embedded in `server/*.js` — and the only tests that encode them (`tests/*.test.js`, the existing `node --test` suite) are JS-internal: a non-JS implementation cannot execute them, so nothing currently exists that an Elixir port could be validated against. At the same time, the runtime audit records that no performance baseline has been measured for the Node server; before a second backend exists, today's room broadcast sizes, save latency, and event-loop lag must be recorded so later phases make honest comparisons instead of invented claims.

## What Changes

- **Fixture exporter**: new `scripts/export-parity-fixtures.mjs` executes the actual JS implementations under pinned inputs and writes deterministic JSON to `tests/fixtures/parity/*.json`. Per-case shape `{fn, args, state, nowMs, seed?, expected, error?}`; multi-step reducer behavior as `{steps: [...]}` scripts; generated ids masked as `"<generated>"`.
- **Fixture sets** covering priorities 1–10 of `docs/architecture/elixir/parity-notes.md` §3: theaterModel (`applyTheaterAction` op matrix, `classifySource` ~40-case URL table, `parseM3U`, `normalizeTheaterState`, `effectivePositionSec` at fixed nowMs values such as `1_700_000_000_000`), torrentModel (`parseMagnet` hex + base32, `sanitizeTorrentPick` boundaries including `fileIndex` 1,000,000 and float `fileBytes`, `orderFilesForPicker` tie stability, `normalizeTorrentStatus`, `torrents.parseRange`), gardenModel + crops (`tickBed` dt=1 sequences, `harvestBed` quality boundaries 0.9/0.75/0.55, `sprinklerCoverage` corners/edges, `getGrowthStage` millisecond boundaries, `calculateQuality`), shared/economy (`calculateNpcSellPrice` across all goods × qualities × multipliers {0.4, 0.85, 1.0, 1.0005, 2.5}, `calculateNpcSeedPrice`, `updateMarketMultiplier` chains pinning `Number(x.toFixed(3))` semantics), orderbook (`placeOrder` scripts with injected `createdAt`: price-time priority, partial fills, maker-price execution, fee `Math.max(1, Math.round(value*0.02))` including the tradeValue=25 edge, crop-mismatch break-not-skip, self-match allowed, `cancelOrder`, `getBookSnapshot`), iptvModel + xmltv (`applyAddPlaylist` at fixed nowMs with non-fallback names, `sanitizeChannels`, `applySetEpg`/`sanitizeGuideProgrammes` unsorted → sorted, `serializeM3U` ↔ `parseM3U` round-trip, `catalogSnapshot`, `parseXmltvTime` timezone table including `Date.UTC` rollover, `normalizeChannelKey`, `createEpgIndex` first-wins, `nowNextForId` boundaries, `lookupNowNext` cap + order), identity (`generateDefaultNickname` seeds {0, 0.1, 0.5, 0.999}, `sanitizeNickname` including UTF-16 truncation + emoji, `resolveDuplicateNickname` ladder to 99, `generatePlayerPalette` including astral characters + the 32-bit mask), nodes/machines (harvest/isDepleted/tick at fixed now, contribute clamp matrix + restore-in-same-step, `millWheat` C→B→A→A+ order, sprinkler craft), youtubePlaylist (`extractPlaylistVideos` over synthetic HTML, `isYouTubeMixId`, `looksLikePlaylistId`), and `protocol.parse` (bad JSON → null).
- **Determinism gate**: new `node --test tests/parity-fixtures.test.js` runs the exporter twice and requires byte-identical output, and requires the committed fixtures to match a fresh export.
- **Node baseline measurements**: a measurement harness records — honestly, with method, environment, and repo revision — room broadcast bytes from a scripted two-client run, save latency, and event-loop lag into `docs/architecture/elixir/baseline-node.md`. No numbers are invented; anything not measurable in an environment is recorded as "not measured" with the reason.
- **Elixir runner scaffold**: `server_elixir/test/parity/` with an `Afterlight.Parity` runner that consumes the same JSON files unchanged; the implementation tasks reference `add-elixir-phoenix-foundation` for the Mix app itself and become executable once that app exists.
- **No authority flip, no behavior change**: the Node server remains the only server; no game behavior, wire protocol, or persistence format changes.

Depends on: none — this is phase P0, the first subordinate change of `port-backend-to-elixir`, whose governance spec (parity before authority) this change implements.

## Capabilities

### New Capabilities

- `parity-harness`: the deterministic, language-neutral fixture corpus exported from the JS rule implementations, the export pipeline that produces it, the determinism gate that keeps it from drifting, the measured Node performance baseline, and the Elixir runner contract that must pass the corpus before any domain cutover.

### Modified Capabilities

- (none — no capability has been archived yet; this change creates its own capability and alters no existing spec.)

## Impact

- **Shared / Server**: no behavior changes. `shared/*.js` and `server/*.js` are frozen as the parity reference and only read by the exporter. The sole allowed server touch is measurement instrumentation: a new opt-in, env-gated probe (`server/baselineProbe.js`, active only with `AFTERLIGHT_BASELINE_PROBE=1`) plus a few wiring lines in `server/index.js`; gameplay-neutral when disabled.
- **New files**: `scripts/export-parity-fixtures.mjs`; `tests/parity-fixtures.test.js`; `tests/fixtures/parity/*.json` (theater-model, torrent-model, garden-crops, economy, orderbook, iptv-xmltv, identity, nodes-machines, youtube-playlist, protocol, manifest); `docs/architecture/elixir/baseline-node.md`; `scripts/measure-node-baseline.mjs`; `server/baselineProbe.js`; `server_elixir/test/parity/` runner (executable once `add-elixir-phoenix-foundation` provides the Mix app).
- **Compatibility**: `npm test` (the existing `node --test` suite) stays green; the game, its protocol, its developer workflow, and the `data/*.json` formats are untouched.
- **Protocol changes**: none.
- **Persistence / data model**: none — fixtures are committed test artifacts, not game state.
- **Security**: the measurement harness runs against a scratch-port server with throwaway state; no secrets are committed; fixtures contain only synthetic URLs/HTML/names, never real player data.
- **Load tests**: none in this change — the baseline capture is a one-shot honest measurement, not a load suite (load/soak/failure suites are the P10 change per the umbrella).
- **Docs**: `docs/architecture/elixir/baseline-node.md` is new; `docs/architecture/elixir/parity-notes.md` remains the hazard reference the fixture manifest cross-links.
- **Rollback**: delete the new files; nothing in the game references them.
