## Reconciliation with add-multiplayer-snowboard-arcade (Task 1.3)

The unarchived change keeps its authority: its lifecycle (D4), session
architecture (D3), protocol/rates (D7), prediction/interpolation/clock (D8),
view lease (D1), cabinet identity (D2), lazy-loading/resource ownership and
exit restoration (D9), and verification gates (D10 + snowboard-verification
spec) all remain dependencies of this change. Its proposal.md, design.md and
both affected specs now carry partial-supersession banners (2026-09-09).
Superseded product decisions, replaced by the frozen source baseline
(`SSXTricky` rev `e87f6c7d…`, see `baseline.md`):

| Old decision | Replaced by |
| --- | --- |
| SSXTricky used as "movement and mountain reference" only | Actual `engine.js`/`rules.mjs` port baseline; extraction, not re-design |
| "One original night mountain" (D6 layout, lit lodge, 2 jumps) | Alpine Rush daylight course: winding centerline, banks/peaks/pines, 13 ramps, cyan speed zones, pickups, banners, chairlift |
| Robot maintenance-rider rigs | Source humanoid snowboarder rigs (orange player + rival colors) with pivot/stance trick rig |
| "No boost inventory/trick bonus" (D5 tuning) | Source `stepMotion`/TRICKS/boost/charge rules as the shared simulation contract (fixed-step, seeded port) |
| "without requiring trick scoring" (racing spec) | Server-authoritative trick scores/best combo displayed alongside finish order; pickups per-rider per-race |
| `summit-night` course id/version 1 | Versioned Alpine Rush course document + content hash with capability-gated rollout |
| D9 asset rows "SSX technical inspiration only / original robot parts" | Extraction from the user-owned SSXTricky repo with recorded provenance/attribution (baseline.md) |

Retained explicitly: no SSX branding (cabinet stays Summit Run), no
soundtrack, no persistent rewards, no peer collisions, no AI in the shared
race, session-local results only. The old change's remaining unchecked tasks
(8.3, 9.4, 9.5, 9.7, 10.3) are verification gates that remain in force
against the new baseline; this change's phase 5 executes them.

## Source-to-port fidelity checklist (Task 1.4)

Every item must be verifiable in the integrated cabinet (phase 2–5 evidence).
Source references are `SSXTricky/lib/game/engine.js` (L##) / `rules.mjs`.

**Scene & course (2.1, 2.2, 3.2)**
- [ ] Daylight sky `#a4cede`, fog `#b6d5e0` (125–510), NOT night palette
- [ ] Terrain: 440 m wide × 2200 m grid, `courseCenter`/`groundHeight`
      composition, vertex-colored snow (groomed .94–1.0 tone, banks .72–.97),
      DoubleSide, receiveShadow
- [ ] Bank noise beyond |x−center|>29 (sin composition, ≤18 amplitude) —
      cosmetic outside corridor, none inside (render/contact agreement)
- [ ] 70 layered jagged peaks (cones + snow caps, alternating sides, seeded)
- [ ] 420 instanced pines (trunk + pine cone + snow cap) flanking ≥30 m out
- [ ] 4 label banner gates: ALPINE RUSH (−12), GO BIG. (600), FULL SEND.
      (1200), FINISH (1800, lime) with posts/feet
- [ ] Orange slalom gate poles every 22 m at ±23 m, flags every 3rd
- [ ] 13 ramps `createRamps()` (center 95+i·124, x offsets (i%3−1)·11, width
      12, height 5) with lime lips + side rails; contact = `surfaceHeight`
- [ ] Cyan speed zones (start−41 … start−19, width 10) with arrow chevrons
      and BOOST signs, `#139ab5`/`#b2ffff`
- [ ] Chairlift down left shoulder: masts every 125 m (20–1700), crossbars,
      cables, hanging orange chairs
- [ ] 22 pickups (octahedra, `#e6ff6e` emissive, +1.5 m) at 70+i·76, sin
      lane offsets
- [ ] Snow-spray particles (160 pooled points) + soft contact shadow disc
- [ ] Hemisphere (0xe6f8ff/0x7890a6, 2.5) + directional sun (0xfff4dc, 3.2,
      2048 shadows) following the rider; ACES exposure 1.25 preserved by host

**Riders & animation (2.2)**
- [ ] Source rider rig: board + lime tip, boots, legs, torso (accent color),
      vest, goggled head, arms/hands; pivot/stance/body hierarchy
- [ ] Trick poses: y-axis spin (Q), grab dip (E: z-rot + y-dip), x-axis flip
      (X), bail tilt (z 1.3 + drop), carve roll `−lateral·0.014`, crouch
      (tuck/charge lerp), lean (z −0.32)
- [ ] Rider yaw `−atan2(lateral, max(8,speed))`; ramp pitch; ground pitch −0.18
- [ ] Player accent `#ff7043`; remotes use source rival palette (adapted to
      profile accents where available)

**Camera (2.2)**
- [ ] Ready framing: (x+10, base+7.5, 17) look (x, base+2, −20)
- [ ] Chase: x·0.8+center·0.2, max(base+6.5, y+5), −distance+13(+2 boosting),
      look (x+lateral·0.15, y+1.2, −distance−13); lerp `1−e^(−dt·5)`
- [ ] FOV 64 → 76 while boosting (lerp dt·3); sun follows rider

**Mechanics (3.1, 3.3, 3.4 — source-equivalent, fixed-step 30 Hz)**
- [ ] `stepMotion` port: tuck/lean/aero targets (29/35/33/42), brake 10, pad
      56, manual 48, boost −23/s spent / +1.8/s regen, clamp 0–100
- [ ] Carve: |steer|>0.5, grounded, speed>20, |u|<20 → charge 0.5/s → +12
      boost; lateral approach (20/13 air/14 tuck)·dt·5
- [ ] Edge: |x−center|>23 → 0.65^dt bleed; clamp ±35
- [ ] Charge jump `popVelocity` 7+6·charge (+4 super pop tuck+≥0.8), charge
      rate 1.2/s; ramp-edge crossing launch `10+0.17·v+4·charge`
- [ ] Gravity 20, airTime accumulation, `remainingAirTime` with slope term
- [ ] TRICKS: Q 360 SPIN 800/0.72 s, E INDY GRAB 500/0.58 s, X BACKFLIP
      1200/0.92 s; buffer 0.8 s; hold-to-repeat semantics
- [ ] `land`: bail at <82% trick progress (speed·0.3, bail 1.2 s), combo
      `sum·(1+0.5·min(n−1,4)) + airTime·100`, boost +points/75, landings++
- [ ] Speed zone entry (grounded, no bail, in zone, |x−zone.x|≤5): zoneBoost
      2.4 s, speed ≥46
- [ ] Pickups: |Δd|<2.2, |Δx|<2.1, y−ground<3 → +250 score, +10 boost; per
      rider per race in shared mode
- [ ] Multiplayer adaptations (documented differences, not silent): AI rivals
      and rival-bump collisions replaced by human riders; RACE/FREE RIDE
      switch replaced by Ready/Rematch lifecycle; pause neutralizes input but
      never pauses the shared clock

**HUD (2.4 — scoped DOM/CSS port of page.tsx/globals.css)**
- [ ] Position/RUN TIME top block; TRICK SCORE + PERSONAL BEST right
- [ ] Course map SVG with progress dot + KM remaining
- [ ] Start panel (GO BIG. GET TRICKY. + rider card THE MAVERICK), countdown
      (READY TO DROP? + number), toast (skew, bail variant)
- [ ] Air hint / trick callout (AIR COMBO ×n, name, PTS)
- [ ] Bottom: speed KM/H + boost bar (SPEED LANE / SUPER TRICKY / TRICKY
      BOOST labels, B kbd), stance status (AERO TUCK/LOW TUCK/FORWARD
      LEAN/FLOW CARVE), jump charge bar, conditions block
- [ ] Results: PLACE heading, POINTS, position/time/best combo/clean
      landings grid, Rematch/Exit; session-only honesty preserved
- [ ] Boosting speed-lines overlay; touch controls equivalents

**Host lifecycle (2.3, 4.x)**
- [ ] Lazy load on participation only; no second renderer/RAF/socket/app
- [ ] Host renderer settings restored on exit (tone mapping/exposure/
      shadows/camera); view lease + frame loop integration
- [ ] E is Indy grab during racing; R Ready/Rematch in lobby/results only;
      Escape exits; typing/blur neutralize; touch equivalents same action path
- [ ] Load handshake per seat identity; first Ready loads then readies
- [ ] Rematch resets prediction/pickups/boost/tricks/results; finish order +
      trick scores authoritative

**Evidence (5.x)**: paired captures vs `captures/source/01–08`, source rules
tests green (13/13 at freeze), JS↔Elixir parity fixtures, two-client
playtest frames, 2/4/8-rider perf record.

## Context

See proposal.md for motivation. `SSXTricky/` is a complete local Alpine Rush prototype: `lib/game/engine.js` owns rendering, course construction, rider models, input, audio and simulation; `rules.mjs` owns motion/trick helpers; `app/page.tsx` and `globals.css` own React presentation. The current Summit Run is a separate implementation, not that game running in Afterlight.

Afterlight already supplies membership, host view leasing, transport, prediction, remote interpolation and authoritative race lifecycle. The old OpenSpec explicitly chose an original night mountain and reference-only reuse. This proposal reverses that product decision; do not interpret those earlier restrictions as a reason to recreate a different game again.

## Goals / Non-Goals

**Goals:** use the actual source implementation as the port baseline; preserve its recognizable visual composition and arcade feel while placing human multiplayer authority behind its rules. Keep one production source for each course/rule definition, owned by the integrated implementation and traceable to the frozen source revision.

**Non-Goals:** original commercial SSX assets, Next.js inside Afterlight, AI or Free Ride in the shared race, unrelated activity rewrites, new persistent economy rewards. Source demo remains available for comparison. Cabinet identity can remain Summit Run; that name does not authorize replacing Alpine Rush's presentation.

## Decisions

### 1. Freeze a real source baseline before extraction

Record the nested repository revision and dirty diff/hash, controls, deterministic seed and representative playable captures. Compare start, first ramp/speed lane, airborne trick, mid-course chairlift, finish and results. Baseline assets are the locally generated Alpine Rush assets, not external footage. Preserve source provenance in the port and document each intentional multiplayer difference.

Alternative rejected: designing another scene from a prose summary. That produced the present mismatch.

### 2. Extract the real engine through host seams

Separate source scene/rider construction, pure simulation, rendering update and UI state. Adapt engine construction to receive the host renderer context/view lease; expose host-driven update, resize, input and dispose. Remove its autonomous animation loop, global input handlers, ResizeObserver and owned renderer from the integrated path. Preserve the source camera, daylight lighting, terrain width/peaks, ramps, speed lanes, lift and riders. Restore host tone mapping, exposure, shadows and camera on exit. Lazy load on participation; bystanders keep the cheap cabinet display.

Port the source HUD to scoped vanilla DOM/CSS, retaining speed, boost, score, combo/trick, progress and results feedback. Suppress unrelated world overlays during play while keeping chat/exit accessible. No iframe or second React/Next runtime. An iframe would preserve single-player behavior cheaply but bypass shared authority and lifecycle.

### 3. Port rules, not just scenery

Freeze `rules.mjs` behavior and extract any simulation currently inside `tick()` into a deterministic shared step. Use explicit fixed delta, seeded randomness and stable ramp/pickup IDs. Generate the canonical terrain/course from the source courseCenter/groundHeight/createRamps definitions rather than the old night course. Both client and Phoenix must agree on source geometry, launch physics, tricks and finish distance.

Port deterministic rules to the Phoenix authority with cross-language fixtures for steering, lean/tuck, boost depletion/reward, speed-zone entry, charge/super-pop, ramp edge crossing, airborne motion, trick completion/bail and pickup collection. Client predicts; server validates bounded inputs and owns results. Keep 2–8 human riders, replacing the five AI racers in shared mode. Pickups are per-rider per-race so one racer does not remove another's source-game opportunities. Finish order remains the primary shared race result, with authoritative trick score/best combo also displayed. No persistent rewards are added.

### 4. Resolve input and lifecycle conflicts explicitly

In the leased view, E is Indy grab and R is Ready/Rematch only in lobby/results; during racing R cannot restart the shared match. Escape exits safely; local pause/help neutralizes input but never pauses the shared clock. Space must reach jump charge/release, Q spin, X flip, B boost, Shift tuck and W lean. Chat focus/blur clears held inputs. Pointer and touch equivalents must use the same action path. Sound remains opt-in.

Use the existing seat/session/lease handshake and exact acknowledgement correlation. Reset loading on re-seat/promotion; retry unacknowledged sends; first Ready must load before readiness. Normalize actual Phoenix slot-keyed rider snapshots and self.slot, and supply authoritative race start time. Results must reset prediction for rematch. Preserve the black-terrain and camera regression fixes wherever their code survives the port.

### 5. Version and reconcile overlapping work

Introduce an explicit Alpine Rush course/simulation version and content hash. Server rejects mismatched clients before race readiness with a reload message. Finish existing races on their old version or drain admission before rollout; never swap geometry under a running race. New frontend capability is advertised only after matching server support. Reconcile old `snowboard-arcade`, `snowboard-racing`, and verification deltas during implementation, retaining membership/security/cleanup guarantees while replacing contradictory visual and physics requirements.

## Risks / Trade-offs

- Source engine is densely coupled → extract in runnable slices with paired captures and replay fixtures; do not reimplement from memory.
- Cross-language drift or different step rate changes feel → preserve source mechanics, record tolerances, compare deterministic trajectories and trick outcomes.
- Performance regression from larger mountain → instance repeated scenery and profile 2/4/8 riders without removing defining content; record desktop and low-quality results.
- Visual pass mistaken for completion → require playable ramp/trick/boost and multiplayer evidence in addition to screenshots.
- Concurrent working tree edits → record starting status; preserve other activity changes and generated output; scope commits explicitly.

## Migration Plan

1. Capture source baseline and reconcile conflicting planned contracts.
2. Extract and visually verify actual source presentation and deterministic rules.
3. Implement server parity, version negotiation and integrated client prediction/UI.
4. Run lifecycle, fidelity and multiplayer gates; review paired captures.
5. Deploy server capability first, then frontend, with old-race drain and smoke checks.
6. Roll back by disabling new admission and restoring matching frontend/server versions after active races drain. Preserve all original persisted snapshots.

## Implementation handoff

Prior bug work in this workspace repaired downward terrain winding, lobby/chase framing, loaded acknowledgement/re-seat handling and Phoenix snapshot consumption; it did not integrate SSXTricky. Full tests last passed at 1,080 and production build passed, but the interrupted live rematch verification was not completed. Do not cite `/tmp/sb-fixed-*.png` as source fidelity evidence. Inspect current dirty state before applying this proposal; never roll back concurrent work wholesale.
