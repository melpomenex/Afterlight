# Downhill Mayhem integration — verification evidence

Recorded 2026-09-10 on the local operator machine (Linux, 22 GB RAM;
Chromium via chromedriver `:9515`; Node 20; Elixir 1.18 / OTP 27). The app under
test was a production Vite build served locally
(`vite build --outDir /tmp/opencode/downhill-dist` + static server on `:4173`)
with `VITE_TRANSPORT=phoenix VITE_WS_URL=ws://localhost:4000/ws`, the Phoenix
gateway on `:4000` (dev flag `AFTERLIGHT_DOWNHILL_MAYHEM_ENABLED` defaulting
open in dev) and the Node sidecar on `:3001`.

## Automated suites

| Command | Result |
| --- | --- |
| `npm test` | **1249 pass, 0 fail** |
| `mix test` (server_elixir) | 895 tests, 0 deterministic failures. Two runs each showed one *different* pre-existing load-flaky test (`game_channel_test` relay, `theater/domain_test` outbox); each passed in isolation and on other runs, and the same flakiness was observed on the untouched baseline. |
| `vite build` | Green (13–14 s). The documented >500 kB chunk warning remains; it is not silenced. |

### Production bundle sizes (raw / gzip)

| Asset | Raw | Gzip |
| --- | --- | --- |
| `index-*.js` (main) | 1 924 985 B | 536 586 B |
| `index-*.js` (secondary) | 1 797 261 B | 617 963 B |
| `hls-*.js` | 592 426 B | 184 795 B |
| `courseDocument-*.js` (baked terrain) | 384 369 B | 136 573 B |
| `controller-*.js` (game controller) | 61 155 B | 23 140 B |
| `wire-*.js` | 39 737 B | 12 659 B |
| `index-*.css` | 48 516 B | 10 741 B |
| `hud-*.css` | 12 835 B | 3 281 B |

The bystander module statically imports none of the game/controller code; the
terrain and controller chunks are only fetched behind the single lazy import
(enforced by `tests/downhill-mayhem-cabinet.test.js`).

## Daily course delivery (4.3/4.4)

```
$ curl -s http://localhost:4000/api/downhill/course/daily | jq '{id,seed,hash,cy:(.cy|length)}'
{ "id": "daily", "seed": 20260910, "hash": "211edebe80b6…", "cy": 1301 }

$ curl -s -o /dev/null -w '%{http_code}' 'http://localhost:4000/api/downhill/course/daily?date=19990101'
400
```

- `server_elixir/test/afterlight/activities/downhill_daily_test.exs` pins the
  Elixir generator against the JS authoring oracle (`daily_20260910.json`,
  `daily_19930211.json`): `cy`/`ccurv`/`cgrade` **bit-for-bit**, ramps/drops/
  colliders/knobs/startLats exactly equal, render arrays within 1e-6.
- `server_elixir/test/afterlight_web/downhill_course_controller_test.exs`
  covers today, an explicit bounded date, determinism and named errors.
- `tests/downhill-controller.test.js` covers the client fetching the server
  document and sending its published hash in the `loaded` handshake, the
  `course_mismatch` retry, and the reload of a captain-selected mountain.

## Browser gate (`scripts/downhill-mayhem-gate-browser.mjs`)

Run against the production build (dev-HMR full reloads during a multi-minute
race are a test-harness flake source, not an app defect).

| Phase | Result | Evidence |
| --- | --- | --- |
| `doctor` | **PASS** | `window.__afterlight.downhill()` hook present at the cabinet |
| `entry` | **PASS** | two browsers, shared 2-human + 4-AI lobby, identical field/mountain/difficulty, prompt at the machine — `entry-lobby-rider-a.png`, `entry-lobby-rider-b.png` |
| `solo` | **PASS** | lone human locks 1 + 5 AI and races to results — `solo-lobby.png`, `solo-racing.png` |
| `captain` | **PASS** | captain reported; after the captain leaves, leadership transfers to the longest-seated remaining human |
| `exit` | **PASS** | Escape releases the lease; world controls, one WebGL context, no body class remain |
| `soak` | **PASS** | 4 enter/exit cycles: 1 canvas/context, `activityRoots=0`, no body class, stable `timeOrigin`, heap 34–85 MB (GC noise, no monotonic growth) |
| `race` | **not green** | one run reached a synchronized countdown (identical `startAt` on both clients) and results with matching standings after a real combat/trick window; the run then failed on a `timeOrigin` change caused by concurrent dev-server HMR, and later runs were killed by headless Chromium sessions dying mid-race under machine memory pressure. `GATE_REQUIRE_STRIKE` was not set; the combat window landed 0 authoritative strikes in the observed runs. |
| `rematch` | **not run green** | same environment; the first race of the run could not complete. |
| `queue` / `reconnect` / `grace` / `failedLoad` | **not run** | three-browser/quota-heavy phases; not attempted after the two-browser crashes. |

### Measured entry timing, frame budget and heap (16.1/16.2)

From the `solo` phase on this machine (headless SwiftShader software rendering;
not a hardware performance claim):

```
solo frame budget: {"p50": 27.8 ms, "p95": 48.7 ms, "worst": 55.9 ms, "heapBytes": 56 171 253}
solo readiness metrics:
  {"total":1,"readyHits":1,"hitRate":1,"retainedHits":0,
   "byWindow":{"2s":{"hitRate":1,"total":1},"5s":{"hitRate":1,"total":1}},
   "samples":[{"prepSeconds":1.714,"ready":true,"retained":false,"distance":1.75}]}
```

- Cold entry (no prepared host retained) took ~1.7 s from E to the first visible
  frame through the readiness barrier.
- `soak` cycle heap samples: 43.1 MB → 85.3 MB → 40.2 MB → 34.4 MB across four
  cycles (no monotonic growth; the 85 MB spike is the concurrent build/prepare
  cycle).
- WebGL contexts/canvases stayed at exactly one through every cycle and phase.

## Honest limitations

- The two-browser long-race and rematch phases, the queue/reconnect/grace/
  failed-load phases, and the six-riders-per-session server load
  characterization (§16.3–16.4) are **not proven** in this environment; the
  load client still drives presence/transport, not the activity protocol, as
  `docs/downhill-mayhem.md` states.
- `captain` proves leadership transfer; the captain settings control is
  exercised by client/server unit tests (`controller.configure`,
  `downhill_session_test` config/lock tests) rather than by the gate click.
