# Summit Run — multiplayer snowboard arcade

Summit Run is the Orpheum's fifth arcade machine and Afterlight's first
multiplayer 3D activity: one polished 1–8 rider downhill race on the daylight
Alpine Rush course (integrate-ssxtricky-snowboard), entered
and exited inside the same application. No reload, second socket, browser
host or separate window — the mountain renders through Afterlight's existing
renderer while your social avatar waits at the cabinet and chat keeps
flowing.

This document covers controls, lifecycle, the honest limits of v1, asset
provenance and the operations runbook. Provenance table:
`docs/summit-run-assets.md`. Architecture and decisions:
`openspec/changes/add-multiplayer-snowboard-arcade/design.md`.

## The cabinet

Summit Run stands alone on the Orpheum's east wall, just south of the travel
gate, in its own floodlit bay — the four classic machines keep their row on
the north stretch. The cabinet screen shows the public race state to
bystanders at a glance: idle attract, lobby rider counts, live ranked
progress, and final results (labeled honestly as session records).

Walk up, press **E** (or the on-screen interact button): the mountain loads
with a cancellable loading state, you take a seat, and the lobby appears.
Riders queue along the wall-side markers.

## Controls

| Input | Action |
| --- | --- |
| A / D or ← / → | Carve |
| W / ↑ or Shift | Tuck (faster, less turn) |
| S / ↓ | Brake |
| Space (hold, release) | Charged jump |
| R | Ready / Rematch (explicit — nothing auto-starts) |
| Esc | Exit the race |
| E or Exit button | Exit the race |

Riding over a ramp lip launches you automatically (once per crossing).
Chat focus, typing, dialogs and window blur neutralize your controls and
cancel a charged jump — other racers keep racing. Local movement is
predicted for immediate response and reconciled against the authoritative
server simulation; remote riders are interpolated.

## Race lifecycle

- **Lobby** — one rider waits ("Waiting for another rider"); there is no AI
  with no AI — and a lone ready rider starts a solo run on the same shared
  authority (user decision 2026-09-09, manifest minPlayers: 1). Ready expires
  after 60 s.
- **Countdown** — every seated, connected, loaded rider ready with at least
  two riders locks the roster and starts a 3-second synchronized countdown.
  An unready, leave or disconnect during countdown returns everyone to the
  lobby with readiness cleared.
- **Racing** — 30 Hz authoritative simulation; eight ordered checkpoint
  gates, two ramp jumps, readable hazards, floodlit lodge finish. The race
  NEVER pauses: a disconnect freezes that rider at its last valid state and,
  after the 30-second reconnect grace, marks them DNF (disconnect) while
  everyone else keeps racing. Leaving mid-race is DNF (leave).
- **Results** — server-ordered finish places computed from simulation ticks
  (sub-millisecond differences tie for place); DNF sorts after finishes
  without a fabricated time. Results are SESSION-LOCAL records only.
  Rematch is explicit readiness from results: the match identity rotates,
  race state resets, no reconnect or scene rebuild.
- **Deadlines** — 180 s race cap (unfinished riders DNF by deadline) and a
  30-second finish window after the first valid finish.

## Limitations (honest v1)

- Records are session-local: there is no global ladder or personal-best
  persistence for Summit Run.
- No mobile/touch controls; desktop keyboard only (gamepad mapping is
  documented future work in the design).
- One course. Spectating is the cabinet display; full 3D spectating is not
  included.
- Racers do not collide with each other.
- The WebGL baseline is required and sufficient; no WebGPU dependency.

## Enabling and rollout (operations)

The race ships **disabled**. Admission and capability advertisement are
gated by the backend flag:

```sh
AFTERLIGHT_SNOWBOARD_ENABLED=1   # enable admission (default: disabled)
```

- When disabled (or on a backend without the type), the cabinet reports the
  race unavailable, no session is created, and the rest of the world,
  theater and other cabinets work unchanged. Clients treat the flag as
  presentation only — it is not a security boundary; the server fails
  admission closed with a typed `race_unavailable` error.
- **Emergency abort/drain**: disable the flag, then let active races finish
  within the 180 s deadline (they are unaffected by the flag) or restart the
  Phoenix node for an immediate abort — transient races produce no winner
  and clients recover to world controls; successor sessions use fresh
  identities.
- **Rollback**: disabling the flag is sufficient. No database migration is
  involved and no world snapshot data (`data/game-state.json`, IPTV/EPG) is
  touched.
- **Single-owner-node constraint**: duplicate-connection prevention is a
  node-local admission registry. Release v1 is supported only on the
  current single-owner-node deployment; a multi-owner-node rollout requires
  a global admission/fencing gate first (documented in
  `Afterlight.Activities.Admission`).

## Verification

- Pure parity: golden movement fixtures
  (`tests/fixtures/snowboard/golden-movement.json`) are reproduced by the
  Elixir authority within ≤1 cm / 0.01 m/s with exact gate/finish outcomes
  (`Afterlight.Activities.SnowboardTest`).
- Browser gate: `node scripts/snowboard-gate-browser.mjs [phase]` —
  two-browser walk-up E entry, shared lobby, explicit readiness, race,
  rematch and exit using real controls (requires Chromedriver on :9515 and
  the dev stack).
- Load characterization was NOT yet performed (see the change's task list):
  capacity claims are deliberately absent.
