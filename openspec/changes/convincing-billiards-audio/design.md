## Context

See proposal.md for motivation. `src/activities/pool/audio.js` creates short sine/triangle sweeps and falls back to constructing an AudioContext when the shared mixer has none. Its output can consequently bypass the intended effects graph. There is no audio disposal hook in `createPoolInstance.dispose()`.

The client advances `rulesStep` between authoritative snapshots. Audio is called from this stepping path, snapshot events, activity events and the local cue animation. The 45ms pair-only refractory map cannot reliably reconcile those sources. JS physics emits ball collisions with `speed`, cushions without speed, and pockets as `pocketed`; the audio consumer reads `relativeSpeed`, defaults rail strength and handles `pocket`. Elixir implements matching pool physics and must remain compatible. The existing `environment-audio` spec owns local mixing and gesture policy; the pending `social-billiards` spec already expects synchronized spectator audio.

## Goals / Non-Goals

**Goals:** Keep sound a presentation layer over existing pool motion, use one effects graph, and make material quality auditable through listening captures. Bound event history, decoding and source counts independently of match length.

**Non-Goals:** Changes to shot mechanics, collision responses, rules, input controls, music, crowd ambience, other activities, or an app-wide audio rewrite. No synthetic long ball-return mechanism unsupported by the table. No additional socket, animation loop or saved sound-event history.

## Decisions

### 1. Small sample palette with motion synthesis

Use locally hosted, redistribution-compatible recordings under `public/audio/pool/`, with source/license/edits recorded in an adjacent manifest. The implementation task includes sourcing and auditioning; no recordings have been selected or acquired by this proposal. Use at least three variants per impact family and soft/hard layers for cue and ball impacts, with restrained pitch variation (initial ceiling ±3%). Trim leading silence and normalize families together while retaining relative dynamics. Target at most 2 MB transferred and 12 MB decoded; measure actual asset totals.

Cue contact should have a dry tip transient and short body, ball contact a sharp resin click, cushion contact a dull rubber/wood knock, and pockets a brief lip/drop/settle sequence. Quiet filtered noise or a seamless cloth recording can supply rolling/sliding texture driven by speed, never a tonal motor sound. Keep foul feedback separate and restrained.

Pure oscillator redesign was considered but rejected as the primary impact source because real transients and irregular decay are the principal quality gap. A large general-purpose sound library adds unnecessary payload and dependencies.

### 2. One normalized event boundary

Add a pure pool audio event adapter (proposed `src/activities/pool/audioEvents.js`) called by all existing ingestion paths. Normalize `pocketed` and legacy `pocket`, prefer finite `speed` and accept `relativeSpeed` as an alias, preserve zero, reject malformed contacts, and cap unreasonable values. Add pre-impact normal speed and contact position to cushion/pocket metadata where absent, in JS and Elixir, without modifying physical calculations. Positions fall back to known balls/pockets or table center for old payloads.

Use session/rack identity plus a monotonic shot identity, simulation step and contact identity (pair, rail, or pocket) for bounded replay tracking. Add these as optional presentation metadata where existing envelopes do not provide reliable identity; trace the actual pool session serializer before editing. Keep JS and Elixir metadata definitions aligned and preserve existing keys. A joining client establishes a watermark and does not replay the snapshot's historical events.

Prediction and authority can disagree on contact step. Within a shot, reconcile authoritative contacts against a bounded queue of already presented predicted contacts of the same kind/entities using a small simulation-time tolerance; consume each match once. Test genuine rapid recontacts explicitly. Never use wall-clock pair cooldown alone as the identity. Once an authoritative snapshot replaces the prediction baseline, discard stale queued audio; do not play all snapshot events again. Schedule events against the rendered simulation time, with substep offsets where available, rather than a packet-arrival burst. Missing identity on legacy payloads uses bounded contact matching without rejecting the payload or claiming exact reconciliation.

Local cue sound stays tied to the animation impact and is associated with the pending accepted shot to suppress its echo. Remote cue sound follows the first newly observed accepted shot start. Joining during motion establishes a baseline without cue playback. Error/cancel clears a pending stroke; it cannot undo sound already played.

Authoritative-only audio was considered but would delay impacts relative to the client's moving balls. Unfiltered local prediction would repeat contacts after reconciliation. This adapter keeps the existing prediction while containing its audible artifacts.

### 3. Shared graph and bounded voices

Only obtain the running context and effects bus from `audioMixer`; remove standalone-context and direct-destination fallbacks. Lazy fetch/decode the palette when the table is active and audio is enabled, sharing cached buffers per context. Use a generation check after every asynchronous completion. Failure drops that family's sounds for the current attempt and permits a bounded later retry; never queue a backlog while muted or loading.

Route table sources through a retained gain/compressor stage into effects. Start with 24 transient voices and four movement voices per table, prioritizing cue/pocket and strongest contacts when saturated; steal the quietest expendable voice with a short fade. Release ended nodes and limit dedupe history (initial cap 512 entries per active shot/session). Crossfade movement voices over 50–150ms, suppress pocketed/stationary balls, and preserve headroom on full breaks. Use the existing activity update for movement; no new RAF.

One loop for every ball was considered but is needlessly costly and can build a loud hiss during breaks. Four selected/aggregated voices preserve the soft cloth impression with predictable cost.

### 4. Position and active-place lifecycle

Transform contact-local X/Z through the existing table rotation and translation. Use player distance for the existing approximate 14m audibility range and the active camera orientation for restrained stereo pan; do not replace the shared listener state used by unrelated audio. Mono remains complete. Reuse `getActiveCamera`, already available to the pool instance, rather than hard-coding the pool camera.

Connect activate/deactivate/reset/dispose to the actual activity/place lifecycle, including cached worlds and the in-progress global-world owner. Leaving a player slot while remaining nearby changes to spectator listening; leaving the place cancels sources and pending work within 200ms. Dispose disconnects table nodes but never closes the shared context. Returning can reuse decoded buffers, never old event history.

### 5. Acceptance includes listening

Add pure event-normalization/reconciliation tests, fake-context lifecycle/voice-budget checks and JS/Elixir metadata parity fixtures. Preserve pool physics and rule outcomes. Capture the browser's actual pool audio/video for a soft cut, hard break, repeated banks, pocket/scratch and roll-to-rest; assess material distinction, variation, clipping, loop seams, sync, and balance with floating media. Verify two players plus a spectator, reconnect and travel. Target impact onset within 50ms of the presented contact on a stable local run, documenting capture method and observed timing. Automated signal tests cannot establish perceived realism: listening review must be recorded separately and honestly marked pending if unavailable.

## Verified seams (apply-time re-read, task 1.1)

Re-read against `src/activities/pool.js`, `src/activities/pool/{audio,controller,tableScene,camera}.js`,
`src/activities/runtime.js`, `src/activities/sessionBind.js`, `shared/pool/{physics,rules}.js`,
`server_elixir/lib/afterlight/activities/pool/physics.ex`, `.../pool/rules.ex`,
`.../session_server.ex`, `tests/pool-shot-lifecycle.test.js`, `tests/pool-physics.test.js`,
`server_elixir/test/afterlight/activities/pool_*_test.exs`, `src/audio/mixer.js`.

- **Shot identity (absent today).** No physics/rules field identifies a shot at strike time.
  `rules.shoot()` flips `status: 'aiming' → 'shooting'` and sets the `current_shot` tracker;
  `shot_count` increments only at resolution. `physics.tick` advances once per `step()`.
  Authoritative shot start reaches clients only via the `activity_state` snapshot's
  `state.sim` (`status === 'shooting'`, balls suddenly carrying velocity). Additive fix:
  `strikeCueBall`/`strike_cue_ball` stamp `physics.shot = (shot || 0) + 1` and
  `physics.shotTime = 0`; `step()` advances `shotTime` and stamps each emitted event with
  `shot`, `step` (post-increment tick) and `t` (seconds since strike, substep-resolved).
- **Client ingestion paths (all four funnel into raw audio today).**
  1. Local prediction: `update()` → `rulesStep(simState, delta)` → `audio.playEvents(events)` per frame while balls move (the primary audible path; client dt ≠ server 1/60 dt, so predicted contact ticks drift from authoritative ones).
  2. Snapshot: `acceptSnapshot()` replaces `simState` then plays `sim.physics.events` — the server's *last single step's* events only (server steps 60 Hz, snapshots 20 Hz; each `step()` overwrites `physics.events`), so snapshot events are a partial, usually-duplicate subset of what prediction already played. This is the duplicate-replay source the reconciler must own.
  3. Activity events: `acceptEvent()` switches on `ball_collision`/`rail_collision`/`pocket`/`foul`, but Phoenix never broadcasts per-contact pool events (only `match_ended`-class via `record_and_broadcast_event`) — compatibility path only, still routed through normalization.
  4. Local cue animation: `strokeAnim.impactFired` → `playCueStrike(power)` for the shooter only; witnesses hear no cue today.
- **Field mismatches (confirmed).** JS/Elixir ball collisions emit `speed` (pre-impact normal
  closing speed) while audio reads `relativeSpeed`; rail events carry NO speed (audio defaults
  `ev.speed || 1.0`); physics emits `type: 'pocketed'` while `playEvents`/`acceptEvent` switch
  on `'pocket'` (pockets are silent today). None of the three event kinds carries a position.
- **Lifecycle seams.** Runtime `activate()` builds one pool instance per place entry
  (generation-fenced already at the runtime level); travel/`deactivate()` → `dispose()`
  (currently no audio disposal hook — confirmed design context). `update(time, delta)` is the
  only frame loop (movement voices live here; no new RAF). Player→spectator transitions run
  inside `update()` via participation polling (`handleExit()` keeps the visitor nearby as a
  listener). Fresh instance + first snapshot after activation is the join/mid-shot-reconnect
  watermark seam (snapshot's `physics.events` must be baselined, not played). Practice mode
  (`pool_practice?`) re-inits the rack via `init_game()` on `game_over` server-side; every
  shot passes through a non-`shooting` status before the next strike, so shot-scoped history
  cleared on shot/status transition is rerack-safe without extra rack identity.
- **Table transform.** `tableScene` root group sits at `position` with `rotation.y = rotationY`;
  local→world is rotate-Y + translate. `getActiveCamera` is already threaded into the pool
  instance; `getPlayer()` gives the listener. Events carry table-local x/z (new metadata).
- **Audio graph.** `audioMixer.context` is null until the Sound gesture; `buses.effects`
  exists only after `ensure()` builds the graph. Current pool audio's standalone
  `new AudioContext()` + direct-destination fallback (confirmed at `getContext()`/`connectOutput()`)
  bypasses the effects bus and must be removed. Effects volume rides `buses.effects.gain`
  (user pref 0..1, default 0.7) — sample playback must route through it and stay silent when
  the context is suspended/unavailable.
- **Snapshot cadence/limits.** 20 Hz snapshots, 32 KiB Jason cap (events trimmed first),
  60 Hz server steps with ≤4 catch-up steps. Dedupe history cap 512 comfortably exceeds
  per-shot event counts (a break is tens of contacts).
- **Existing tests held:** `pool-shot-lifecycle.test.js` drives `createPoolInstance` through
  aim/charge/shoot/ack/snapshot/settle/error paths headless (no audio assertions);
  `pool-physics.test.js` + Elixir `pool_physics_test.exs` mirror each other op-for-op and
  assert event `type`/`ballA/ballB`/`speed`/`pocketId` presence only — additive metadata keys
  are compatible. Baseline `npm test` 2026-09-13: 1664 pass, 0 fail.

## Risks / Trade-offs

- Sample quality or redistribution terms unsuitable → require asset provenance and an early audition before building the final palette; do not ship unlicensed placeholders as completion.
- Prediction diverges from authority → bounded shot-scoped matching, distinct recontact fixtures and delayed/duplicated packet playback tests; sound never influences rules.
- New metadata drifts across JS/Elixir → additive keys and parity tests; old payloads remain usable with reduced positioning precision.
- Dense break masks individual hits → voice priority, dynamics calibration and captured peak checks at maximum effects volume.
- Concurrent world changes move lifecycle seams → re-read runtime at apply time and test cached-place exit/return through its current owner.
- Muted browsers cannot decode/start as expected → deferred initialization and fresh-event-only resume; gameplay stays independent.

## Migration Plan

Implement and validate additive event metadata first, then the normalized presentation adapter, sample palette and graph. Ship compatible backend metadata before or alongside the client; old clients ignore added keys, and new clients tolerate older events. There is no save or database migration. Roll back the pool client/audio changes if necessary; additive backend metadata can remain. Deployment is a separate user action.
