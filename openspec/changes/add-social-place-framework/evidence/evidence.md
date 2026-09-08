# Evidence — add-social-place-framework, tasks 4.1 + 4.2 (selector & vertical regression)

Recorded: 2026-09-08 (session implementing tasks 4.1 and 4.2 only; tasks 1.1–3.3 were already complete).

Baseline: commit `926a802` with a large pre-existing dirty working tree (103 modified/untracked paths: environment config, `index.html` icon work, `server/index.js` IRC-adapter work, `server_elixir/*`, `dist/`, icons). Nothing in that uncommitted work was overwritten; no git state was changed; the running dev stack was never started, stopped or restarted.

Environment inventory before any run: Node sidecar listening on `127.0.0.1:3001`, Phoenix gateway (beam.smp) on `127.0.0.1:4000`, Vite on `0.0.0.0:5173` (the already-running stack; Phoenix world routing observed `:phoenix` — the world-runtime flip is active). No browser automation tool was available in this session.

## What was run (all commands from repository root)

| Command | Result |
| --- | --- |
| `node --test tests/place-selector.test.js` | **PASS — 12/12 tests, 0 failures** (new suite for task 4.1: open/close polling cadence, 30 s staleness, honest occupancy text incl. unknown, hostile activity text rendered inert, malformed replies leave buttons usable, request-generation guard across close/reopen, legacy selection, cancel/close-button focus return, disconnect/reconnect polling, double-open guard) |
| `npm test` | **PASS on clean rerun — 475 tests, 475 pass, 0 failures, exit 0**. The first full-suite run stalled >40 min inside `tests/torrents.test.js`; see the note below |
| `npm run build` | **PASS** (cargo wasm step + Vite, 72 modules). Only the known non-fatal `chunk >500 kB` warning |
| `node scripts/verify-world-runtime.mjs --no-autostart --prefix guest_psel4` | **PASS — exit 0** against the already-running stack (`--no-autostart`: the script may not start or stop anything). Both legs green: direct Node leg (movement coalescing, OOB probe, emotes, travel presence_leave, forced disconnect, reconnect desiredRoom replay, snapshots) and gateway leg; `gateway world routing observed: phoenix (world runtime owns presence — flip active)`. The semantic Node-vs-gateway stream diff was skipped by the script itself as a declared divergence while world routing is `:phoenix` (per-leg ledger + §5 regressions are the gate in that mode) |
| Live read-only `place_directory_get` probe against `:4000` | **PASS** — isolated guest identity; reply carried `entries=17` in projection order (court…theater), occupancy `0` for all empty rooms and `1` for `theater` (the probe's own session), `observedAt` set, no `atmosphereLabel` (all presets are `null` in change A, so none is invented); an immediate second request was answered `error rate_limited` (1 per 5 s enforced live). No theater/gameplay mutation was sent |

### Note: intermittent `tests/torrents.test.js` process-exit hang (pre-existing)

- First `npm test` run: every other test file completed green, but the runner waited indefinitely on `tests/torrents.test.js` (40+ min wall, ~4 s CPU). Killed by this session.
- Standalone reruns: in every run that completed its assertions, all 29 `torrents.test.js` tests **pass**; in some runs the process then lingers (never exits) and in others it exits cleanly immediately (observed 3 consecutive clean exits + 1 hang across standalone attempts). The hang is in process teardown, not in any assertion.
- The file imports `server/index.js`, which carries **uncommitted concurrent work** (IRC Phoenix adapter etc.); this session did not modify that file and did not attempt to fix its teardown. The clean `npm test` rerun above (475/475, exit 0) is the recorded full-suite result.
- Full suite excluding that one file was also run as a cross-check: 446/446 pass, exit 0.

## Documentation delivered (task 4.2)

- `docs/places.md` (new): the definition → builder → shell/bounds/spawns/gates → seats/interactions → **server projection step** (`node scripts/export-place-definitions.mjs`, `--check` for drift, committed `server_elixir/priv/place_definitions.json` consumed by `Afterlight.World.PlaceDefinitions`) → tests → optional specialized controller authoring guide, written against the implemented module surfaces (`shared/placeDefinitions.js`, `src/places/{registry,worldFactory,runtime,travelState,theaterAdapter}.js`, `src/social/{seating,interactions}.js`, `src/ui/placeSelector.js`, `MSG_TYPES.PLACE_DIRECTORY_GET/PLACE_DIRECTORY`).
- `README.md`: T/Travel row and district-travel paragraph now describe the **Places** selector (featured first, "Legacy areas" retention, "—" = unknown occupancy); district count corrected to 17; town chat described as the global `#afterlight` channel (not Market-Court-scoped, not private); the outdated "optional Phoenix transport / default build connects to Node" section replaced with the supported-stack description (gateway + sidecar; legacy Node transport deprecated, removal 2026-12-01). Product/tool/coin/farming descriptions were intentionally left untouched (owned by change F).
- `AGENTS.md`: repo map updated for the place framework modules (including `src/ui/placeSelector.js` and `docs/places.md` pointers); "What travel must do" rewritten around the implemented `setRoom`/place-runtime order; key mapping corrected (T opens Places, M opens the Market Exchange); §5 recipe updated for the manifest/registry world (no more if/else builder fallback) and the mandatory projection step; §9/§10 wording updated to the Places selector and native-dialog rules.

## What remains unverified (browser and provider matrix)

This session had **no browser tooling**, so the following are explicitly **pending orchestrator verification** and are not claimed anywhere as passing:

- The full verification.md §A travel/input/Theater regression matrix in a real browser: cold load without/with valid/invalid `?room=`, personal-garden shortcut, Theater→garden→court→Theater and rapid A→B→C travel, injected build rejection, every Theater seat, four camera modes, drag/click/wheel, media engines (MP4/HLS/YouTube/Vimeo/torrent/IPTV/EPG/playlist import), booth flows, provider cleanup.
- Visual check of the Places selector itself: compact modal layout over the full-window world, hover/focus indicators, native-`<details>` "Legacy areas" behavior, occupancy line wrapping, and the 1100/930/900/560 breakpoints (narrow viewport scrolling, no overlap with footer/HUD). The unit suite covers structure and behavior with injected DOM, not pixels.
- Two-client directory behavior in a browser (live counts updating while the selector is open on two identities) — the protocol is verified live at the frame level (above), not visually.
- Conferencing absence: no permission prompt/capture on travel (P8 adapter is absent by design; unit-level no-op coverage exists).
- `verify-theater-cutover` (`npm run verify:theater`) was **deliberately not run**: it performs `theater_queue` clear/add/playNow/seek and IPTV operations, i.e. it writes Theater queue data — forbidden against the running stack's real, persistent bill. It requires the isolated test stack per verification.md.
- `mix test` was not run in this session (isolated test database setup out of scope here; the running Phoenix process may also predate the newest Elixir working-tree changes, which is why live verification was limited to read-only queries and the world-runtime script).

No production Theater queue data was written; no deployment actions were taken; no snapshot files were touched.
