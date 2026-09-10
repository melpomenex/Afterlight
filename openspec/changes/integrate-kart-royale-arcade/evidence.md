# Evidence — integrate-kart-royale-arcade

## Phase 1 — build boundary (three 0.180 → 0.185)

- Root deps installed: `three@0.185.1`, `postprocessing@6.39.5`, `n8ao@2.0.1`,
  `simplex-noise@4.0.3`. `tests/kart-royale-deps.test.js` asserts the installed
  version satisfies BOTH root and `games/kart-royale` declared ranges.
- `npm test`: **1099/1099 pass** on three 0.185.1 (pre-integration baseline).
- `npx vite build`: succeeds (known >500 kB warning unchanged, not silenced).
  `npm run build`'s wasm step is unavailable in this environment
  (`wasm32-unknown-unknown` rustup target not installed — pre-existing; the
  committed `public/wasm` artifact is untouched by this change).

## Phase 2 — cabinet manifest

- `ORPHEUM_ACTIVITIES` now `[pong, rain-runner, signal-lost, kart-royale,
  summit-run]`; Sporefall definition retained but dormant. Projection
  regenerated; `export-place-definitions.mjs --check` clean.
- Full suite after Phase 2: **1100/1100 pass**.

## Phase 3 — Kart Royale runtime adaptation

All in `games/kart-royale` (single source, no copy):

- `src/host/runtime.ts` extracted from `main.ts` (systems/boot/ladder/resize;
  update+present split; no RAF). `main.ts` is now the standalone shell.
- `RenderPipeline` external-renderer mode (no canvas/no context-loss
  listeners/no `__render`, dispose never touches the host renderer).
- `Input` hosted mode (no window listeners, `handleKeyDown/Up/neutralize`,
  `enter/leave` touch-pad lifecycle, removable gesture blocks).
- `Synth`/`Audio` external-context support (`ownsContext`; visibility mutes
  master instead of suspending a host context).
- `HUD`/`Menus` explicit host element, hosted exit actions ("Leave cabinet" /
  "Back to the arcade"), hosted skips `?ui=` URL forcing, `startScreen`.
- `createSettings(host?)` overrides; hosted never reads `location.search`.
- `src/host/index.ts` `createKartRoyaleHost()`.

Standalone gates after the refactor (`games/kart-royale`, port 5199):

| Gate | Result |
| --- | --- |
| `npx tsc --noEmit` | PASS (0 errors) |
| `npm run build` | PASS |
| `tools/shot.mjs` (all 10 vantages) | PASS — 60fps capture, no console errors |
| `tools/drift-bench.mjs` | PASS — drifting lap measurably faster |
| `tools/autoplay.mjs` | **PASS** — full 3-lap race, 19060 frames, all 8 item kinds fired/expired/cleaned, 0 console errors |
| `tools/context-loss-test.mjs` | **FAIL — known issue, see below** |

### Known issue: standalone context-loss restore degrades to the direct rung

`tools/context-loss-test.mjs` fails its "composer was rebuilt" assertion after
the refactor. Investigation summary (full traces in the session log):

- The game DOES recover: context restored, 93 programs recompiled
  (`[restore] re-warmed 1 -> 93`), pipeline renders, gameplay continues.
- The first ~150+ post-restore frames present through the composer as BLACK
  (readback `luma 6.8, 0% lit`; a puppeteer screenshot confirms the canvas is
  black under the DOM menus). The `Diagnostics` image watchdog then degrades
  hdr→ldr→direct (runig ladder is downward-only), after which the picture
  returns (`luma 93, 97% lit`) and racing is playable at 60fps.
- Baseline (pre-refactor) verified passing on the same machine/harness, twice.
- Not reproduced by: moving recovery wiring into `boot()`, restoring baseline
  boot order (feel/listeners), reverting every other file — the delta is in
  the `runtime.ts`/`main.ts` composition. GL traces of the first post-restore
  frame are call-for-call identical between trees except one shadow-cascade
  update landing one frame later in the refactored tree.
- **Hosted mode is unaffected by construction**: the host adapter passes
  `contextRecovery: false` and `diagnostics: false`, and Afterlight exits the
  session on context loss (design D12). Boot, menus, racing, prewarm, resize
  and the gameplay gates are all unaffected.

Follow-up: root-cause the post-restore composer-black window in standalone
(likely a postprocessing buffer-state interaction during first-frame re-render
under SwiftShader). Tracked as the unchecked part of task 3.9.


## Phase 4–7 — integration and verification (in-browser)

Environment: existing dev stack (Vite :5173, Phoenix :4000 recompiled with
the new projection + type allowlist + tick clauses, chromedriver :9515).

### Browser gate — `scripts/kart-royale-gate-browser.mjs` (all PASS)

| Phase | Proof |
| --- | --- |
| entry | prompt "Kart Royale · Press E to race" at [9.3, -1.8]; real E seats; game boots under the lease; `body.kr-racing` + HUD root live; **exactly one WebGL canvas**; 0 page errors |
| race | Enter starts the race from roster select; real ArrowUp/Left/Right drive the kart; HUD live ("Lap 1/3 … 246 km/h … Mini-Turbo"); seat held; 0 page errors; screenshot luma 115.7 with 1139 unique colors (real rendering) |
| exit | Escape → pause → "Leave cabinet" exits; participation idle; `kr-racing` class gone; HUD root removed; WebGL canvas count still 1; **world movement restored** (real key displacement); screenshot shows restored theater (luma 34.5, 260 colors) |
| reentry | two full cycles, identical clean teardown, zero accumulating state |
| bystander | second isolated session at the occupied machine keeps the social prompt and HUD; racer keeps the seat |

Two real bugs found and fixed by the gate: (1) `main.js` presented a stale
lease captured before `activityRuntime.update()` could release it mid-frame;
(2) the controller updated the host before `boot()` initialized the systems
(`Sky.hazePoly` undefined). Both now guarded.

### Regression

- `scripts/snowboard-gate-browser.mjs entry|exit`: PASS (lease/`main.js`
  changes are additive for Summit Run).
- Full suite after integration: **1100/1100 pass** (incl. the new
  `tests/kart-royale-cabinet.test.js` 8 and `tests/kart-royale-controller.test.js` 7;
  `snowboard-host-view` expectation updated for the two additive lease fields).
- `npx vite build`: PASS. Chunks: the entire game is ONE lazy chunk
  (`index-DEABedUw.js`, 1.8 MB min) + the 4.2 kB Afterlight controller —
  bystanders download neither until E.

### Memory soak — PARTIAL (known issue)

4 enter/exit cycles via chromedriver with forced GC (`--js-flags=--expose-gc`)
before sampling: heap 222 → 371 → 880 → 672 MB. DOM roots, `kr-racing` class,
and WebGL canvas count are perfectly clean every cycle and page errors are
zero, but the RETAINED JS-heap floor rises per cycle (~150–400 MB under
SwiftShader). Prime suspects: the game's system `dispose()` implementations
were dead code before this change (never called anywhere in the standalone
app) and are likely incomplete, plus three.js-side retention through the
shared renderer's caches. Follow-up: dispose-completeness audit in
`games/kart-royale` (task 7.6 heap budget remains open).

### Known issue addendum

- Task 7.3's Node-side host-contract test is impossible on this Node build
  (no TypeScript loader; `--experimental-transform-types` unavailable —
  "Node.js is not compiled with TypeScript support"). The host contract is
  instead proven by the game's own `tsc --noEmit` + standalone harnesses and
  the browser gate above.


### Input-consumption fix (found by the gate's E-as-item assertion)

The first race-phase run with a mid-race <kbd>E</kbd> press DROPPED the seat:
the controller's capture listeners routed keys into the game but did not
consume them, so main.js's bubble-phase E still ran its leased-view exit.
Fixed in `controller.js` (`stopPropagation` + `preventDefault` at
window-capture while the game is live); the gate's race phase now asserts the
seat survives E and all other phases were re-verified green afterwards.
