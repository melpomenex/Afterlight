## 1. P1 — Contracts and integration seams

- [x] 1.1 Reinspect active theater/social-place changes and record compatible integration points; baseline existing tests and current renderer on identified hardware/settings.
- [x] 1.2 Add validated activity definitions, bounds/anchors/capacities and capability defaults to the manifest; test duplicate/unknown/nonfinite declarations and unchanged legacy definitions.
- [x] 1.3 Extend the existing place export and Phoenix reader with matching bounded activity projection; add drift and backwards-compatibility fixtures.
- [x] 1.4 Add versioned activity commands/events, input validators, request IDs, feature support negotiation and network-facade handlers; test unsupported Node transport and old clients.
- [x] 1.5 Compose activity runtime with existing place/theater controllers; verify prepare failure, stale generation, active-only update and idempotent disposal.

## 2. P1 — Authority and world controls

- [x] 2.1 Implement room-owned activity supervisor/session lookup and fencing; verify owner-loss shutdown and session restart identity.
- [x] 2.2 Implement atomic cross-room identity admission leases/slots, duplicate-tab policy, readiness, bounded watch/queue roles and FIFO timed offers with room/proximity revalidation.
- [x] 2.3 Implement monitored disconnect grace, explicit leave, abort/forfeit rules, input watchdog and idle reaping; test every terminal path.
- [x] 2.4 Implement sequence/lease validation, full snapshots, event deduplication, rate/size limits and bounded mailbox/tick catch-up; test malformed and malicious inputs.
- [x] 2.5 Add contextual E/button entry and participation poses/anchors with safe dismount and visible remote avatars/Kiln.
- [x] 2.6 Implement input/camera ownership and restoration through the active camera seam; cover all four world views, cinema, chat, settings, blur, jumps and travel-during-join.
- [x] 2.7 Add the physical Pong proof with authoritative scoring, ready/rematch, controls, live screen, spectators and queue feedback.
- [x] 2.8 P1 gate: record two-player/one-observer browser proof, same-result assertions, reconnect/failover, slot races and twenty-cycle travel cleanup. Record aggregate room byte/tick/mailbox limits under 16 declared activities and existing room population cap; busy rejection must keep chat/presence responsive.

## 3. P2 — Arcade and verified scores

- [x] 3.1 Compose an Orpheum lobby/arcade wing with three named cabinets plus Pong; validate accessible routes, collision, seats, gates, minimap and movie screen sightlines.
- [x] 3.2 Implement shared cabinet material rendering, focused reframing, attract demos, visibility throttling, target budgets and spatial/muted audio.
- [x] 3.3 Implement Rain Runner server rules/seeded obstacle and score model with fixtures for steering, collision and run cap.
- [x] 3.4 Implement Rain Runner cabinet renderer and complete start/play/end/restart/exit flow with spectator parity.
- [x] 3.5 Implement Signal Lost server rules for thrust/rotation/fire, asteroid collisions, lives and score; add fixtures.
- [x] 3.6 Implement Signal Lost cabinet presentation and controls, including visible spectator runs and cleanup.
- [x] 3.7 Implement Sporefall server rules for pieces, rotations, drops, clears/chains and top-out; add fixtures.
- [x] 3.8 Implement Sporefall cabinet presentation and controls, including visible spectator runs and cleanup.
- [x] 3.9 Add Ash result/run resources and additive migrations with signed identity, rules version, unique completion keys and bounded retry recording status; prove duplicate and forged results cannot credit scores.
- [x] 3.10 Add local bests and verified leaderboard UI with pagination, version separation and clear local/pending/unrecorded labels.
- [x] 3.11 P2 gate: play every cabinet through completion with an observer, reject score forgery, test database outage, inspect no-WebGPU rendering and record baseline-relative frame/texture/audio costs in the live Orpheum while theater media plays.

## 4. P3 — Pool physics and rules

- [x] 4.1 Run the bounded physics selection spike described in D5; record planar-vs-worker results, numerical tolerances, maximum-power tunneling, spin reference behavior, CPU budget and any pinned dependency/build footprint.
- [x] 4.2 Implement the selected authoritative pool stepping boundary and worker failure isolation if needed; add reference fixtures for sliding/rolling, collisions, rails, pockets and settling.
- [x] 4.3 Implement the versioned casual 8-ball reducer with break/open-table/group assignment, fouls, ball-in-hand, called eight, win/loss, resignation and reconnect; cover rule edge cases independently of rendering.
- [x] 4.4 Implement server shot validation and input acknowledgments; test out-of-turn, moving-ball, overlap placement, repeated-shot and stale-session commands.
- [x] 4.5 Extend durable match records and stats to verified pool completion; distinguish aborts, forfeits and completed play.

## 5. P3 — Pool experience

- [x] 5.1 Build the detailed physical pool table, cue, readable numbered balls, pockets/materials/contact shadows and nonblocking spectator area.
- [x] 5.2 Implement aim/power/spin/cancel/shoot and ball-in-hand controls for mouse/keyboard, touch and controller, with compact readable rules/help.
- [x] 5.3 Implement standing/cue/follow cameras, reduced motion, synchronized cue/avatar poses, interpolation and deduplicated positional collision audio.
- [x] 5.4 Connect pool readiness, match status, spectator mode, queue, rematch and winner-stays to the P1 session contracts.
- [x] 5.5 P3 gate: record a full match with a third observer on each input family, foul/eight-ball cases, spin fixtures, disconnect mid-shot, owner loss and safe world return; include human playtest notes on aiming and motion feel.

## 6. P4 — Continuous games

- [x] 6.1 Implement air hockey authoritative puck/mallet constraints, goals, first-to-seven and selectable series, with high-speed collision and double-goal fixtures.
- [x] 6.2 Build air hockey table/scoreboard/effects and keyboard, pointer/touch and controller input with spectator rendering.
- [x] 6.3 Implement foosball rods/ball/serve/goals, bounded angular motion and first-to-five reducer with fixtures.
- [x] 6.4 Build foosball table and casual/advanced rod selection controls for keyboard, touch and controller with shared visual state.
- [x] 6.5 Implement local control prediction/ack reconciliation and remote interpolation; enforce neutral input watchdog and eliminate old-session replays.
- [x] 6.6 Connect both games to verified results, queue/winner-stays, reconnect and safe lifecycle cleanup.
- [x] 6.7 P4 gate: run ten-minute three-client tests at 150 ms RTT, 30 ms jitter and 2 percent dropped snapshots; verify identical score/results, no repeated goals and convergence within 500 ms after a new snapshot. Record responsive local input and bounded aggregate load.

## 7. P5 — Environment and flight/water

- [ ] 7.1 Implement the versioned activity environment projection/defaults from existing room atmosphere; prove frozen competitive conditions and unchanged crop/weather contracts.
- [ ] 7.2 Implement rooftop drone authority, checkpoints, lap times, collisions, DNF and one-to-four-player start/results with rule fixtures.
- [ ] 7.3 Build drone racks/course and flight camera/control/spectator presentation; complete a visible multiplayer race and return to the avatar.
- [ ] 7.4 Implement rooftop paper airplanes with angle/pitch/power, wind trajectories and server distance/tie scoring; verify reproducible launches across clients.
- [ ] 7.5 Implement Rain Court gutter boat starts/current/rain/finish ordering and physical props; test simultaneous finishes and weather snapshot parity.
- [ ] 7.6 Implement Sluiceworks RC boat rules/steering/buoys/recovery and visible world course; test missed checkpoints, leaving and DNF.

## 8. P5 — Quiet boards, camp and ice

- [ ] 8.1 Select/reuse a suitable board-rules implementation within the authoritative boundary and document its version; implement/test chess special moves, check/mate/stalemate, draws and resignation.
- [ ] 8.2 Build shared chess tables in Rain Court and Paper Catacombs with seated avatars, legal selection/turn feedback and lifecycle recovery.
- [ ] 8.3 Implement English draughts/checkers mandatory capture/chains/kings/end conditions and the Rain Court table; test illegal and concurrent moves.
- [ ] 8.4 Implement the Paper Catacombs shared tile puzzle, concurrent move ordering, visible progress and solved/reset behavior.
- [ ] 8.5 Implement Desert Camp horseshoes throws, distance/ringer cancellation, first-to-21 results and physical stakes; prove tied and overshoot cases.
- [ ] 8.6 Implement Desert Camp telescope shared seeded sky/marks, eye camera and noncompetitive exit; verify two users locate the same object.
- [ ] 8.7 Implement curling server launch/curl/sweep/collision/end scoring for 1v1 and 2v2, including tied end and final tie fixtures.
- [ ] 8.8 Build Glacial Glasshouse rink/stone/control/spectator presentation with safe routes; verify both team sizes and disconnected teammate handling.

## 9. P5 — Craft, nature and shared expression

- [ ] 9.1 Implement Foundry hammer timing/strike/bell with bounded spatial audio and deterministic score.
- [ ] 9.2 Implement Foundry forge target/strike/deformation scoring and readable hot-metal presentation; verify identical inputs yield identical profiles.
- [ ] 9.3 Implement fishing cast/bobber/bite/reel/release with authoritative environment/time and visible nearby lines; place in Basin and Marshes without economy writes.
- [ ] 9.4 Implement skipping stones angle/power/skip/distance behavior in Basin and Marshes with shared outcomes and cleanup.
- [ ] 9.5 Implement Understory light/music cooperative puzzle with bounded participant inputs, sequence/reset and shared completion.
- [ ] 9.6 Implement Orpheum darts 301 double-out scoring/bust rules and pointer/touch plus keyboard/controller throw controls; verify complete matches.
- [ ] 9.7 Implement Orpheum spatial piano, bounded polyphony/note events, input mapping, mute and all note-off/blur/travel paths.
- [ ] 9.8 Implement Orpheum photo booth opt-in roster, countdown, four poses, restricted capture scene and local download; verify declines, departures and exclusion of media/chat/bystanders.
- [ ] 9.9 P5 gate: inspect and play every listed activity in its actual destination with a second client and an observer where applicable; record rule outcomes, shared weather parity, accessible controls, safe exits, unchanged landmarks and no hidden-place resource work.

## 10. P6 — Invitations, discovery and records

- [ ] 10.1 Implement direct challenges with explicit accept/decline, expiry, per-sender limits, block/mute and stale-target handling; highlight destinations without teleportation.
- [ ] 10.2 Polish queue/next-player/winner-stays presentation across supported games, including winner departure, both-player departure, expired offers and fair FIFO replacement.
- [ ] 10.3 Add profile games/wins/streaks/bests and rules-versioned leaderboards with identity continuity, pagination, stable ties and honest recording states.
- [ ] 10.4 Extend public place-directory summaries with bounded activity counts/timestamps; test unknown/stale/offline data, overlapping categories and private-garden exclusion.
- [ ] 10.5 Add compact nearby activity status and Places discovery UI without displacing people/chat/travel or implying unavailable tables are empty.
- [ ] 10.6 Implement room-local four/eight-player pool bracket state, check-in/no-shows/walkovers, match assignment and idempotent advancement; test server-restart cancellation and slot conflicts.
- [ ] 10.7 Build the physical tournament board and enrollment/bracket/check-in UI; prove a complete bracket with verified results and clear cancellation.
- [ ] 10.8 P6 gate: record invitation decline/stale accept, winner-stays rotation, duplicate result handling, rename continuity, stale discovery and complete tournament evidence. Verify no XP/currency/paid-advantage writes.

## 11. Program completion and release readiness

- [ ] 11.1 Run relevant Node and Elixir suites plus production build; run projection drift and protocol compatibility checks and resolve failures caused by this change.
- [ ] 11.2 Run final browser regression over theater media/seats, all four camera views, chat, emotes, travel, jump resets, Kiln and retained legacy interactions alongside enabled activities.
- [ ] 11.3 Record reference hardware/browser/settings and activity performance: target 60 fps (p95 frame at most 20 ms) on the selected desktop baseline and p95 at most 33 ms on the selected touch baseline; document any unmet target and fix or explicitly revise the release scope before claiming readiness.
- [ ] 11.4 Verify per-type disable/rollback, process/port cleanup, database outage/retry and room lease failure under load; confirm original data snapshot hashes unchanged by activity migration.
- [ ] 11.5 Update README controls, actual game rules/availability, transport support and architecture ownership; record each phase's evidence and remaining follow-ons without implying gardens/economy P6 completion.
- [ ] 11.6 Run scoped Ripwire quality-delta/test-gate and independently review the final implementation against all capability scenarios. Complete the program only when every phase gate has evidence; deployment remains separately authorized.
