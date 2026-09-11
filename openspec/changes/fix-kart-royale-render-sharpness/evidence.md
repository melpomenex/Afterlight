# Evidence — fix-kart-royale-render-sharpness (apply session, 2026-09-11)

## Verified in this session

- `npm test` (repo root): **1362 tests, 0 failures**, including the new
  `tests/kart-royale-render-policy.test.js` (22 tests: policy tables, hosted
  clamp tighten-only, ×CSS floors incl. handheld 1.0×CSS and desktop 0.85,
  sustained-window descent, emergency window, LIFO recovery, EMA-gap
  attribution, effective-pixel-ratio arithmetic incl. the 4 K DPR1 backstop
  case, and the architecture source contracts).
- `games/kart-royale`: `tsc --noEmit` clean; `vite build` clean.
- Root `npm run build`: green (Vite bundle + wasm step) — with the machine
  note below. The documented >500 kB chunk warning is unchanged.
- Design/tasks amended during apply (recorded above in design.md D2/D3):
  policy module placed at `shared/kart-royale/renderPolicy.js` (the game
  package is CommonJS-typed; `shared/` ESM is importable by tests and game —
  `shared/downhill` precedent), aoSamples correction (High and Ultra both
  ship 16), shadow-cascade/particle stages replaced with the runtime-reachable
  levers (renderer shadow flag; particle stage dropped), recovery order
  spelled out as LIFO.

## Not verified in this session (blocked by the apply environment)

- All browser-observable tasks (1.2 browser half, 1.3–1.5 before-captures,
  5.5, 6.1–6.3, 7.3, 8.1–8.2, 9.1–9.4): the available in-app browser cannot
  boot the application in either the dev graph or the production preview —
  the initial `#loading` overlay (whose text is only replaced at the END of
  `main.js` module evaluation) never cleared after several minutes, on both
  `:5173` (dev) and `:4173` (bundled preview), while all Vite transforms of
  the touched modules return 200. The webview therefore never executes the
  boot graph — an environment limitation (likely GPU/WebGL2 or module
  execution in the embedded browser), not a regression: none of the changed
  modules are in the boot graph, and `npm test`/builds are green.
- The Kart Royale browser gate (`scripts/kart-royale-gate-browser.mjs`) and
  `games/kart-royale/tools/fps-bench.mjs` require chromedriver (:9515) or
  puppeteer with a hardware GL device; neither is present on this machine
  (only snap chromium, no chromedriver), and fps-bench deliberately hard-exits
  on software rasterisers.
- Consequence: the numeric benchmark/screenshot matrix (before AND after) and
  the final motion-blur/DoF constant confirmations remain open work for a
  chromedriver-equipped machine. The implemented retune constants are the
  design's initial values inside the committed 40–60% band, marked as
  provisional in tasks 5.1/6.2 until captures confirm them.
- No behavioural baseline was reset: `data/` was not touched, no dev server
  was started or stopped beyond a temporary `vite preview` on :4173 (stopped
  after the attempt).
