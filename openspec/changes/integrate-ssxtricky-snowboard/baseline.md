# Source baseline (Task 1.1, 1.2)

Frozen before any port work. All fidelity claims in this change reference these
records.

## Nested source repository

- Path: `SSXTricky/` (untracked nested git checkout inside Afterlight)
- Remote: `git@github.com:melpomenex/SSXTricky.git`
- Revision at freeze: `e87f6c7dc80d1a3d440acbd8b44db8597b263c9d`
  ("Force Next.js framework preset on Vercel", 2026-09-06)
- Dirty state: clean except untracked `.zcode/plans/` (agent planning notes,
  not game code). No tracked-file modifications.

## Source file SHA-256 at freeze

| File | SHA-256 |
| --- | --- |
| `SSXTricky/lib/game/engine.js` | `4765c7e00d3a7cc174535d6079569f886f6e84b28af60a875703a46ad6c66ef6` |
| `SSXTricky/lib/game/rules.mjs` | `df8835730ec8b2121f749c06a0897bc3539582c398a915a82586d38916961fe7` |
| `SSXTricky/app/page.tsx` | `14d6fa334ab6441d6824a317b7865011ddfe4f2bc950f2a237fcf43fdb87b3ba` |
| `SSXTricky/app/globals.css` | `42edd013b444af6d1c586bfb1886285c7ac22410b4ec63966ebd5e2a96a1a6a0` |
| `SSXTricky/tests/rules.test.mjs` | `6f84a2fcd4dd163dc6818a4c40647bece90909fc3433d5c7fffcc7cf778c867d` |

## Host repository state at freeze

- Afterlight branch `main`, HEAD `e4f97002ad7174078a21131b516883266b4dcc7e`
  ("docs(snowboard): record Summit Run investigation notes and task checkoffs").
- Extensive concurrent working-tree modifications were present and are
  PRESERVED (never rolled back): ~40 modified `src/activities/*` +
  `server_elixir/*` files (place-activities program), modified
  `src/activities/snowboard*`, new `shared/snowboard/courseDocument.js`,
  `src/activities/sessionBind.js`, `tests/activity-session-bind.test.js`,
  rebuilt `dist/` + `dist-sb/` output. The unarchived
  `openspec/changes/add-multiplayer-snowboard-arcade/` and
  `openspec/changes/add-place-activities-program/` trees are also dirty.
- Commit scope for this change must be explicit (snowboard port files only);
  concurrent activity-program edits stay in their own commits.

## Source rules test results (run at freeze)

`node --test tests/rules.test.mjs` inside `SSXTricky/`:
**13 tests, 13 pass, 0 fail** (charged-jump bounds, combo math, boost/brake
motion, off-course constraint, race place/time determinism, ramp rise/lip
geometry, speed-zone gating, boosted launches + clean combos, unfinished-flip
bails, full ramp-to-landing simulation, tuck/lean/aero ordering, brake/air
overrides, super-pop + carve reward).

## Source game identity (from the code at freeze)

- Course "Alpine Rush": 1800 m winding descent (center `sin(d*.003)*24 +
  sin(d*.009)*7`), banks rise beyond |u|>22, daylight palette
  (`#a4cede` sky, `#b6d5e0` fog), broad snow terrain mesh 70×550 grid over
  440×2200 m, 70 layered peaks, 420 instanced pines, chairlift down the left
  shoulder, 4 label gates (ALPINE RUSH / GO BIG. / FULL SEND. / FINISH),
  orange slalom gates every 22 m, 13 ramps with lime lips + rails, cyan speed
  lanes with arrows feeding each ramp, 22 boost pickups, particle snow spray,
  soft contact shadow.
- Rider: orange (#ff7043) boxy humanoid on a dark board with lime tip, boots,
  legs, torso, vest, goggled head, arms/hands; rivals in
  `#7d5ecc #168fa4 #d6a631 #e34e73 #426dd5`.
- Rules (rules.mjs): `stepMotion` (tuck 29+6, lean +4, both +3; brake 10; pad
  boost 56; manual boost 48 at -23 boost/s; carve reward +12 boost at full
  carveCharge; lateral 20/14 airborne/tuck; edge clamp ±35 with 0.65^dt bleed),
  charge jump (`popVelocity = 7 + 6*charge (+4 super pop at tuck+charge≥.8)`),
  ramp launch (`10 + 0.17*speed + 4*charge`), TRICKS Q 360 SPIN 800/.72s,
  E INDY GRAB 500/.58s, X BACKFLIP 1200/.92s, combo
  `sum * (1 + 0.5*(n-1) capped 4) + airTime*100`, bail if current trick < 82%
  complete on landing (speed *= .3, 1.2 s bail), speed zones (2.4 s, min speed
  46), pickups +250 score +10 boost.
- Single-player phases: ready → countdown 3.2 s → running → finished; 5 AI
  rivals with sine-wave pacing; Enter starts, R restarts, Esc/P pauses.

## Baseline captures (Task 1.2)

Captured from the actual Next.js source app (`SSXTricky`, rev above) at
`http://localhost:3111/` on 2026-09-09, saved under `captures/source/`:

| Capture | Phase | File |
| --- | --- | --- |
| Start panel (ready) | `phase:'ready'` | `captures/source/01-start.png` |
| Countdown | `phase:'countdown'` | `captures/source/02-countdown.png` |
| Early run / slalom gates | running, ~120 m | `captures/source/03-early-run.png` |
| First speed lane + ramp (86 m) | running, ~90 m | `captures/source/04-speed-lane-ramp.png` |
| Airborne trick (Q spin) | running, airborne | `captures/source/05-airborne-trick.png` |
| Chairlift mid-course | running, ~700 m | `captures/source/06-chairlift.png` |
| Finish banner | running, ~1790 m | `captures/source/07-finish.png` |
| Results modal | `phase:'finished'` | `captures/source/08-results.png` |

Controls (from `app/page.tsx` help modal + engine input handler): A/D or ←/→
carve, SPACE hold-charge/release-jump, Q/E/X tricks (hold or tap, buffer .8 s),
SHIFT tuck, W/↑ lean, B boost, S/↓ brake, ESC/P pause, R restart, ENTER drop
in. Sound opt-in via the topbar toggle (default muted).

## Concurrent-work preservation checklist (per design.md Risks)

- [x] Baseline recorded before edits.
- [ ] Commits for the port touch only: `src/activities/snowboard*`,
      `shared/snowboard/*`, `server_elixir/lib/afterlight/activities/snowboard*`
      + related tests/README; never `git checkout --` other files.
- [ ] `data/game-state.json`, `data/iptv.json`, `data/epg.json` untouched.
