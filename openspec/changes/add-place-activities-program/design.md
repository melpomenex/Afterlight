## Context

See proposal.md for motivation and the complete six-phase scope. This is a program change with independently testable phases, not a framework-only milestone.

Repository evidence inspected on 2026-09-08:

- `shared/placeDefinitions.js` owns frozen definitions; `shared/socialPlaceDefinitions.js` supplies social overrides. Public wire IDs include `theater`, `court`, `rooftops`, `desert-camp`, `canal`, `frost-spire`, `archives`, `foundry`, `mangrove`, `delta`, `understory`. Do not invent display-name-derived wire IDs.
- `src/places/registry.js` has a single specialized controller per key, with duplicate registration rejected. Activities must compose with the theater adapter, not register over it.
- `src/places/runtime.js` owns preparation, commit and activation generations. `src/social/interactions.js` has a bounded known-context dispatcher and retains legacy fallback.
- `server_elixir/lib/afterlight/world/supervisor.ex` already uses a Registry/DynamicSupervisor and lazy room processes. `world/place_definitions.ex` reads `priv/place_definitions.json`, exported from JavaScript; server validation cannot import JS directly.
- `world/rooms.ex` keeps stable public/personal-room identity. `room-atmosphere/spec.md` defines semantic weather, ownership epochs and full snapshots. Activities consume that authority; visual rain is not a physics source.
- `src/realtime/gpu/backend.js` describes the WebGPU backend as harness-only. `package.json` uses Three.js and Phoenix; no activity physics library is installed.
- README defines the Orpheum cinema spawn, four camera modes, E interaction, chat and travel. Pending theater/room-epoch edits are present in the working tree. Integrate against their final contracts during apply.

## Goals / Non-Goals

**Goals:** Keep gameplay and spectators in one shared place; establish one authority for each match; isolate fast simulation from durable records; make all six phases independently verifiable; retain predictable keyboard, touch and controller escape paths.

**Non-Goals:** Replace the world renderer, unify every legacy interaction under a new framework, migrate gardens/economy, persist live physics, implement internet-wide matchmaking, promise esports-grade simulation or require WebGPU. The broader brainstorm remains recorded below; it does not silently enlarge the first ruleset of every game.

## Decisions

### D1 — Plain definitions, small adapters, composed lifecycle

Add a bounded `activities` list and additive capability to the existing manifest. Each definition has ID, type, rules version, transform, footprint, participant anchors, interaction radius, capacities, environment policy and renderer/controller keys. Keep functions/assets out of the data. Extend the existing export/check script and Elixir reader together; cap 16 activities per public place. Validate exact server/client projection agreement before enabling content.

Use `src/activities/` for a registry and runtime, with per-game modules implementing initialize, acceptSnapshot, enter, leave, update and dispose. Define these as contracts during implementation, using existing patterns first. New world builders attach props/items/obstacles to their local group. The active place controller composes theater and activity lifecycle hooks; no duplicate controller registration and no second animation loop. Reject a universal rigid-body abstraction until two games demonstrate a reusable need.

Alternative: hardcode every cabinet in main.js. Rejected because travel and cleanup would diverge. Alternative: a generic plugin loader. Rejected because this is a bounded first-party catalog.

### D2 — Participation is distinct from camera mode

Client states: idle → joining → participating or focused-spectating → leaving → idle; any failure returns to world control. The server owns acceptance and slots. While joining, show pending feedback and allow cancel; do not report a player seated before acceptance. For play, validate proximity and anchor the avatar at a collision-safe stance; maintain a safe dismount using the existing seat logic. Passersby remain free to walk; focused spectators optionally own a camera but never a player slot. Queue membership alone does not capture input.

Priority: focused native dialog/chat → activity controls → cinema → ordinary world input. Opening chat/settings neutralizes control but does not pause other people. A server input watchdog neutralizes after 250 ms without a fresh control sample. AFK readiness expires after 60 seconds. E is edge-triggered so the entry keystroke cannot immediately act inside the game. Escape closes the highest focus layer, otherwise exits the activity locally immediately; send idempotent leave. Travel cancellation is generation-bound. On entry clear walk target, jump/momentum, emotes, gestures and held keys; restore world camera preference on exit, recomputing position rather than replaying a stale transform. The theater homography, raycast and render pass keep using the active camera. Do not stop shared theater playback when someone plays pool.

Alternative: an HTML minigame modal with hidden avatars. Rejected because it loses the central walk-up-and-watch behavior.

### D3 — OTP sessions follow existing room authority

Introduce an activity DynamicSupervisor/Registry on the authoritative room owner's node. Session key: `{room_key, room_epoch, activity_id}`; match/session ID changes on restart. The room owner creates and monitors sessions and supplies an unforgeable local ownership handle. Every command and publication checks the current fence; losing the room lease stops session inputs, ticks and broadcasts. Do not create independently leased activity owners competing with room ownership.

An identity-keyed admission reservation atomically allows one playing slot across all room owners, with the room-owned participant index tracking the accepted local slot. Implement admission as a fenced short-lived identity lease at join/leave (never in simulation ticks); fail closed if it cannot be acquired. Duplicate tabs cannot bypass it by joining different rooms. Reuse existing signed identity and ownership lease patterns and test concurrent cross-room claims. Monitor connection and owner processes. Reconnect grace is 30 seconds; explicit travel/leave releases immediately. Two-player games pause during grace, then forfeit when exactly one player remains or abort if both leave. Races mark disconnected competitors DNF after grace and continue for remaining racers; cooperative activities release their slot after grace without a competitive result. For team curling, pause during grace, then forfeit an incomplete side to a complete side; abort if both sides are incomplete. A crash/owner failover aborts live matches visibly; no live physics migration is claimed. Idle sessions stop within 60 seconds after grace. Queues have 16 entries, focused spectators 32; passersby can view room-scoped public snapshots within the room's existing membership limits.

Alternative: a single room process simulating every game. Rejected because a slow physics tick would delay chat/presence. Alternative: one permanent process per declared cabinet. Rejected because idle worlds should be cheap.

### D4 — Versioned inputs and full state first

Extend the Phoenix transport/protocol allowlists and network facade with activity events. Do not add activity authority to the transitional Node sidecar. Advertise feature/protocol support; unsupported transports retain world play and label activities unavailable.

Client commands: join (play/watch/queue), leave, ready, input and resnapshot. Server responses: state, event, result and typed action error with request ID. Shared envelope fields: version, roomId, roomEpoch, activityId, sessionId, revision, serverNow. Join acceptance additionally issues a participant lease; inputs carry it plus monotonically increasing sequence and bounded game-specific controls. No client-supplied identity is trusted. Snapshot acknowledgments carry last accepted input sequence. Wrong room/epoch/session/revision frames are dropped; ordered full snapshots tolerate gaps. On reconnect wait for accepted room membership and obtain a new lease/snapshot; never replay old shots or input queues.

Start with 60 Hz bounded simulation, at most four catch-up steps, 20 Hz full snapshots for active motion and event/low-rate state while idle. Enforce the spec's 2 KiB input/32 KiB snapshot, input/control/resnapshot limits before mailbox enqueue. Active activity count is capped by declarations (16); add per-room aggregate byte/tick budgets, measured during P1/P4 load gates. Under overload reduce spectator update frequency and reject new starts with retryable busy status; never silently change competitive rules. Existing room population limits also apply. Snapshot events have IDs so sounds/celebrations play once, not on late join.

Alternative: extend the binary entity protocol immediately. Rejected until activity traffic measurements justify the added compatibility burden.

### D5 — Simulation authority and physics selection

Pong, arcade rules, board games, score/turn reducers and low-dimensional continuous physics use pure server logic. The browser predicts only local controls and renders interpolation; it cannot decide collisions, scores or winners. Arcade sessions simulate bounded seeded runs server-side, sharing compact semantic state for client cabinet renderers. Runs stop at ten minutes and update local bests even if durable storage is unavailable, clearly labeled.

Pool gets a phase-three physics spike before its implementation: evaluate a specialist planar solver against a pinned rigid-body candidate such as Rapier, covering sliding-to-rolling, spin transfer, maximum-power collision tunneling, pockets and rails. A JS/WASM-only engine cannot simply execute inside BEAM. If selected, host the engine in a bounded supervised worker/port owned by the OTP session; avoid a blocking scheduler NIF and do not repurpose the Node specialty sidecar. Worker death aborts only its match. Record the dependency/license, version, build/deploy footprint, tolerances and timings in the spike evidence. Default fallback is a bounded server-side planar solver with specialist cloth/spin behavior. Keep a common shot-input/state wire contract whichever passes. No claims of accurate masse/jump shots: these are deferred.

Baseline pool acceptance includes head-on and grazing collisions, rail angles, pockets at low/high speed, follow/draw/side-spin reference shots, no permanent overlap or runaway energy, and settling. Record numerical tolerance fixtures before tuning visuals; user-facing feel also needs human playtesting. Rules are the explicit casual house rules in the spec, not an unsupported claim of tournament federation compliance.

### D6 — World rendering remains baseline-compatible

Use a CanvasTexture for 2D cabinet games or a Three.js render target for Rain Runner; both feed the physical screen mesh. The participating camera enlarges the same game view. Nearby visitors render the same semantic state locally, not a stream of another user's screen pixels. Keep the Orpheum movie screen's DOM homography path intact. Idle demos use deterministic seeds and explicit demo labels. Limit live cabinet textures to 512×512 by default, at most 1024×1024 for the focused game; reuse/dispose targets. Update focused screens at presentation rate, visible spectator screens up to 20 Hz, attract screens up to 10 Hz; hidden place screens do no work. Use spatial synthesized audio with voice caps, immediate note-off and existing volume/mute.

Pool materials, cue poses, motion and readable balls matter before optional reflections/particles. Add WebGPU effects only behind capability detection with a functioning fallback and measured parity; do not enable the existing harness flag globally. Screenshot checks cover wet stone/amber restraint, clear routes and readable screens in all four world views. Layout work expands the Orpheum lobby coherently inside validated bounds (or explicitly updates bounds/spawns/minimap together) while retaining cinema sightlines and gates.

### D7 — Bounded phase-five catalog

Wire IDs and first release placement are fixed: theater gets darts/piano/photo booth; court gets chess/checkers/gutter boats; rooftops gets drones/paper airplanes; desert-camp gets horseshoes/telescope; canal gets RC boats; frost-spire gets curling; archives gets chess/tile puzzle; foundry gets hammer/forge; mangrove and delta get fishing/skipping stones; understory gets cooperative light/music. Rules and controls are in the signature capability spec. Each is a vertical slice, including model, prop, controls, visible spectators, termination and recovery, not a named stub.

Reuse authoritative atmosphere semantic state. Competitive start snapshots freeze wind/rain/time/surface inputs with a version. Noncompetitive fishing/telescope consume timestamped updates. Derive current strength/ice friction from explicit bounded activity rules, not an imaginary global fluid simulation. Place defaults cover absent presets. No client clock or GPU particles determine outcomes, and no agriculture weather writer changes.

Photo strips render only consenting participants in a booth-specific offscreen scene. This avoids capturing cross-origin theater video, chat or unintended people; download stays local. Piano sends bounded note events (maximum 20/second, eight-note polyphony, two-second maximum note duration refreshed while held), respects existing mute/block policy and never synchronizes raw audio.

### D8 — Durable results and social discovery

Ash/Postgres stores ActivityMatch/ArcadeRun terminal records and derived stats/rankings with signed identity references, game/rules version, match ID, participants, outcome and completion timestamp. Use an idempotent unique key and transactional stat updates or rebuildable aggregates. Results are accepted only from a fenced authoritative completion path; clients cannot call a create-score action. Retry through a bounded supervised completion worker (maximum 100 pending results per node, retry for five minutes); reject excess recording work honestly. A crash before persistence can leave a result unrecorded; UI says so. This design does not promise lossless score persistence through simultaneous session/database failure. No frame coordinates are written.

Phase two introduces these records for arcade verification; phase six extends presentation and match types. Public leaderboards paginate/cap results and separate incompatible rule versions. Profile identity survives rename; browser guest continuity is explicitly weaker than account recovery. Invitations require explicit recipient acceptance and respect block/mute/rate limits; acceptance highlights a physical destination. Tournament board v1 is room-local four/eight-player pool single elimination with no currency/prizes; unfinished brackets cancel on server restart, completed matches remain durable. Walkovers advance the bracket but do not fabricate played-match wins.

Activity summaries extend the existing bounded public place directory. Report playing/focused-watching/queued counts separately; physical passersby are not guessed as viewers. Cache with server timestamp and ten-second stale cutoff, never enumerate private gardens, and preserve unknown occupancy semantics. No requirement to promote legacy places into featured destinations when adding activities.

## Risks / Trade-offs

- [Program size] → Six explicit gates and game-by-game task checkboxes. Never mark the parent complete after only Pong or the arcade.
- [Specialist pool feel] → Physics spike, versioned fixtures and multi-input human playtest before pool release; advanced shots remain follow-on.
- [Realtime physics near room infrastructure] → Supervised isolation, fencing, tick/byte/mailbox budgets and chaos tests; no database writes inside ticks.
- [Crowded Orpheum/GPU cost] → Measured render targets, visibility throttling and spatial layout checks. Performance gate compares the same hardware/settings against a recorded baseline.
- [Cross-cutting input regressions] → Explicit ownership and tests for chat, theater seats, first person, jumps, blur and travel while join is pending.
- [Conflicting pending work] → Reinspect active changes during apply; theater fixes and place runtime contracts remain dependencies rather than overwritten copies.
- [Results during outages] → Bounded retries and honest unrecorded state; no claim of exactly-once network delivery or lossless volatile queues.

## Migration Plan

1. Implement P1 protocol/projection validation and additive server support disabled by default. Test exported metadata drift. Keep original data snapshots untouched and P6 evidence independent.
2. Deploy server compatibility before client feature activation. Existing clients ignore additive fields; new clients treat absent support as unavailable. A deploy is a separate user action, not part of proposal creation.
3. Enable the Pong proof for development/staging and require two players plus a third observer, reconnect, stale input, owner failure and cleanup evidence.
4. Release P2–P6 individually behind per-type enablement after their task gates. Add durable result schema before ranked cabinets. Pin any approved physics runtime and include it in the existing deployment packaging.
5. For rollback, disable new joins per activity type, abort affected live matches with an explanation, release controls/slots and stop workers. Roll back client/server only after compatibility checks; retain additive durable tables/results. Do not restore/delete legacy snapshots as an activity rollback.
6. Final gate: Node suite, relevant Elixir tests, production build, actual browser multiplayer validation, impaired-network and load evidence, and README controls/availability matching enabled content.

## Review choices and follow-on ideas

The user selected the full six-phase program. The defaults above make that program implementable without pretending every optional mode in the brainstorm is required. Review can refine house rules and art direction without starting implementation.

Preserved follow-ons: Sluice Panic and Kiln Attack; five-to-seven-cabinet expansion; paired/four-cabinet Rain Runner; table tennis and doubles; darts 501/Cricket/Around the Clock; Go/backgammon/cards/dice/Mancala; cornhole/kites/puddle skipping; larger drone courses and curling 4v4; waterwheel co-op; jukebox/drums/synth/guitar ensemble; train set/drawing board/kaleidoscope/bird feeding; pool masse; cosmetics/achievements and broader tournaments. They require later explicit scope changes. Tournament rewards, coins and XP grinding remain excluded by product intent.
