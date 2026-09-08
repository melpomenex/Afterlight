## Why

Afterlight's shared places need reasons for people to gather, play, and linger together. Activities should be visible parts of the world: a passerby can walk over and understand what other people are playing without entering a separate game screen.

## What Changes

Deliver the **full six-phase activity program**, as requested on 2026-09-08. Every phase has its own release gate; completion of the framework does not complete this change.

1. **Activity framework:** manifest definitions, runtime registry, contextual interaction, camera/input ownership, Phoenix/OTP sessions, seats, bounded spectators and queues, reconnect/leave cleanup; prove the whole loop with a physical two-player Pong cabinet.
2. **Orpheum arcade:** a coherent lobby wing containing Rain Runner, Signal Lost and Sporefall, live material-backed cabinet screens, attract modes, local best scores and server-verified leaderboards.
3. **Flagship pool:** polished in-world 8-ball with specialist rolling/spin physics, aiming, fouls, turns, spectators, queue and winner-stays, reconnect, mouse/keyboard/touch/controller support.
4. **Air hockey and foosball:** authoritative continuous games with interpolation, local control prediction and reconciliation, latency tests, visible opponents and spectators.
5. **Place-specific activities:** rooftop drones and paper airplanes; Rain Court chess/checkers and gutter boats; Desert Camp horseshoes and telescope; Sluiceworks RC boats; Glacial Glasshouse curling; Paper Catacombs chess/puzzles; Foundry hammer/forge challenges; Basin/Marsh fishing and skipping stones; Understory cooperative light/music puzzle. Add Orpheum darts, piano and photo booth. See design for the bounded rules of each first release.
6. **Social layer:** direct challenges, polished queue/winner-stays discovery, player stats, leaderboards, a tournament board, activity presence and truthful Places summaries. This extends phase-one spectators/queues and phase-two verified scores rather than deferring their foundations.

Keep activities free to enter, optional and social; no XP/currency treadmill. WebGPU is an optional visual enhancement, not a prerequisite for gameplay. Preserve the wider brainstorm as explicit follow-on ideas, including linked racing cabinets, table tennis/doubles, Go/backgammon/cards/dice/Mancala, larger curling teams, additional arcade titles and ensemble instruments.

## Capabilities

### New Capabilities

- `place-activities`: manifest declarations, physical placement, activity lifecycle, input ownership and in-world spectators.
- `activity-sessions`: authoritative protocol, room ownership, slots/queues, reconnect, bounded simulation and resource cleanup.
- `orpheum-arcade`: three original arcade games, Pong proof, live cabinet materials and verified scores.
- `social-billiards`: accessible, visually detailed 8-ball with spin and full match rules.
- `continuous-table-games`: air hockey and foosball gameplay, prediction and reconciliation.
- `signature-place-activities`: place-specific competitive and cooperative activities, environmental effects, instruments and photo booth.
- `activity-social-layer`: challenges, winner-stays, stats, tournament board and discovery.

### Modified Capabilities

- `camera-views`: ordinary four-view cycling yields to a temporary activity camera and is restored on exit.

## Impact

Client: `shared/placeDefinitions.js`, its export projection, `src/places/`, `src/social/`, `src/main.js`, network facade/protocol, atmosphere consumers, world builders and compact HUD/Places UI; new isolated activity adapters and renderers. Server: Phoenix channel validation and room fencing, an activity OTP supervisor, Ash/Postgres results/stat resources and migrations. Physics dependency selection requires a measured pool/continuous-game spike; no runtime library is selected by this proposal.

The existing WebGPU backend is described in code as a harness-only fast path; production render compatibility must be proved. Extend the existing Three.js path first. Coordinate with pending theater fixes and social-place changes; do not overwrite them. P6 gardens/economy production cutover remains unfinished and is independent. Never migrate transient physics through Ash or modify the original data snapshots. No deployment or game implementation is part of creating this proposal.
