## Purpose

Provide safe, prepared Kart Royale cabinet entry that preserves the Theater experience, supports fast repeat use, and exposes measurable loading and resource behavior.

## ADDED Requirements

### Requirement: Preparation precedes normal cabinet entry

The system SHALL prepare Kart Royale after Theater becomes interactive using budgeted background work, promote preparation as the player approaches, and reuse preparation for cabinet entry. Preparation SHALL NOT reserve a seat, start a race, emit game audio, consume player input, or replace the visible Theater. It SHALL NOT preload every other activity.

#### Scenario: Theater background preparation

- **WHEN** the Theater is interactive and resources and frame-time headroom permit
- **THEN** Kart Royale preparation progresses without requiring E
- **AND** Theater remains controllable and visibly unchanged.

#### Scenario: Approach repeatedly

- **WHEN** the player approaches, leaves and approaches the cabinet again
- **THEN** preparation priority follows proximity without duplicate runtime construction or admission requests.

#### Scenario: Preparation is constrained

- **WHEN** the document is hidden, another activity owns presentation, or speculative work would violate resource or frame-time limits
- **THEN** new speculative work pauses or defers
- **AND** explicit entry retains a safe preparation path.

### Requirement: Ready destination before visible activation

The system SHALL present Kart Royale only after required world and collision data, valid supported kart transforms, a correctly posed camera, rendering resources and a successful hidden destination frame are ready. Input and simulation SHALL NOT operate on uninitialized state. Accepted cabinet admission and current activation ownership SHALL also be required before visible activation.

#### Scenario: Delayed initialization

- **WHEN** any world, camera or graphics preparation phase is delayed
- **THEN** no partial Kart scene, default camera, invalid spawn or under-map frame is presented
- **AND** the Theater remains visible or a bounded commit transition protects a fully ready destination.

#### Scenario: Ready and admitted

- **WHEN** preparation is ready and the current player is admitted for the current request
- **THEN** the system switches presentation, session UI and input coherently
- **AND** the first destination frame contains the complete valid selection scene.

#### Scenario: Final presentation fails

- **WHEN** the first destination presentation fails
- **THEN** the system releases the attempted session and restores source ownership before revealing an invalid destination
- **AND** a bounded failure message provides a way to retry or return.

### Requirement: Prepared entry performance

For an unoccupied cabinet with prepared resources within the retention budget, foreground execution and admission RTT at most 100 ms, the system SHALL achieve p95 E-to-first-complete-frame at most 500 ms and p95 E-to-selection-input-ready at most 1,000 ms. For retained suspended resources under the same conditions, p95 E-to-first-frame SHALL be at most 200 ms and input-ready at most 500 ms. Validation SHALL record at least 20 attempts per warm/repeat cohort with browser, build, GPU, quality and viewport identified.

#### Scenario: Warm entry

- **WHEN** the player enters a ready cabinet under the reference conditions
- **THEN** measured visible-frame and input-ready latency meet the prepared-entry budgets
- **AND** entry does not repeat immutable world generation or heavy GPU preparation.

#### Scenario: Ordinary first approach

- **WHEN** the reference desktop user walks normally to the cabinet after Theater becomes interactive in 20 measured fresh sessions
- **THEN** at least 19 entries find preparation ready
- **AND** the report includes preparation lead time and cold fallback frequency rather than reporting only manually pre-warmed results.

#### Scenario: Intentional race start

- **WHEN** the player confirms a character
- **THEN** additional initialization overhead is at most 100 ms under reference conditions
- **AND** the normal countdown and deliberate selection time remain intact and are reported separately from loading.

### Requirement: Safe cold and unavailable entry

When preparation or admission is pending, the system SHALL preserve a valid Theater view, show concise accurate pending or queue status, and provide cancellation. A stalled preparation/admission attempt SHALL reach a bounded error/retry state rather than silently waiting forever. Queue wait SHALL be identified separately from resource preparation. Cancellation SHALL release pending or accepted admission without losing Theater state.

#### Scenario: Immediate cold interaction

- **WHEN** the player presses E before preparation completes
- **THEN** entry reuses the pending preparation and waits safely without exposing an incomplete game
- **AND** cancellation responds within 100 ms when the main thread is available.

#### Scenario: Missing resource or initialization failure

- **WHEN** a required module/resource fails or initialization throws
- **THEN** the attempt fails with an honest message and explicit retry after safe cleanup
- **AND** no automatic per-frame recreation or retry storm occurs.

#### Scenario: Queued or disconnected

- **WHEN** the player is queued or loses connectivity while preparing
- **THEN** local readiness does not imply admission
- **AND** disconnection cancels the activation and preserves a safe return path.

### Requirement: Bounded reuse and session isolation

The system SHALL retain at most one prepared Kart runtime, subject to explicit memory caps and a default 60-second idle window. It SHALL release active admission, presentation, input, HUD listeners and audio voices on exit, while retaining only reusable resources within policy. Reentry SHALL show a fresh selection state using those resources, without retaining an old seat or restarting an old countdown accidentally.

#### Scenario: Repeat visit within retention window

- **WHEN** the player exits and re-enters before eligible cached resources expire
- **THEN** immutable assets are not fetched or generated again
- **AND** selection, race state and input are clean with no stale race advancement.

#### Scenario: Eviction

- **WHEN** the idle window expires, the player leaves Theater, resource caps are exceeded, or preparation becomes incompatible
- **THEN** inactive resources are disposed safely and readiness is invalidated
- **AND** a later entry uses the safe preparation path.

#### Scenario: Device cannot retain the world

- **WHEN** estimated prepared resource usage exceeds the device policy
- **THEN** the system does not keep rebuilding speculative runtimes or retain an unbounded cache
- **AND** explicit play remains available through safe uncached entry with its performance identified separately.

### Requirement: Cancellation and stale work cannot take ownership

Preparation and activation SHALL be idempotent for a given generation. Canceled, superseded or disposed work SHALL NOT later join a cabinet, mount session UI, acquire presentation or modify the visible world. Multiple requests SHALL NOT create duplicate worlds, loops, seats or listeners. Noncancelable asynchronous work SHALL be fenced and bounded to one outstanding resource generation.

#### Scenario: Repeated E while warming

- **WHEN** the player presses E repeatedly during the same pending attempt
- **THEN** the request reuses existing preparation and admission
- **AND** Escape or explicit cancel can terminate the pending activation.

#### Scenario: Travel during import or boot

- **WHEN** the player travels or cancels while import, initialization or compilation is pending
- **THEN** subsequent completion cannot seize the view or join the former cabinet
- **AND** partial resources are cleaned exactly once when safe.

#### Scenario: Ownership disappears during activation

- **WHEN** admission is cleared, the player is ejected, or connectivity is lost during commit or active play
- **THEN** the system releases game ownership even if the current activity identifier has already been cleared.

#### Scenario: Graphics context is lost

- **WHEN** the shared graphics context is lost or a graphics operation cannot settle
- **THEN** game input, audio and admission ownership are released and readiness is invalidated
- **AND** the user is told when reload is necessary without a loop of new runtime attempts or a false claim of recovered graphics.

### Requirement: Preserve Theater performance and shared services

Preparation SHALL preserve the host's single renderer, canvas, recurring frame loop, connection and injected audio ownership. Relative to a matched no-preparation baseline, Theater TTI median and p95 increase SHALL be at most both 5% and 100 ms, and walking p95 frame-interval increase SHALL be at most 2 ms. Preparation SHALL introduce no CPU task exceeding 50 ms in the reference performance cohorts. Presentation policy SHALL be restored after every background graphics job and exit, using the current viewport.

#### Scenario: Theater renders between preparation stages

- **WHEN** the Theater renders while graphics preparation is asynchronously pending
- **THEN** its camera, colors, clear state, targets, shadows, sizing and controls remain correct
- **AND** recorded TTI and frame timing meet the preservation budgets.

#### Scenario: Exit after resize

- **WHEN** the player resizes during Kart play and exits
- **THEN** Theater presentation and controls restore correctly at the current viewport size.

### Requirement: Resource stability across repeated use

Twenty entry/exit cycles SHALL produce one renderer, one canvas and one recurring frame loop, no accumulated session listeners/subscriptions or simulation instances, and stable retained resource counts after priming. After eviction, owned graphics resources SHALL return to baseline and forced-GC heap SHALL return within the greater of 10% or 20 MiB of the module-prefetched baseline, without sustained growth. Shared host resources SHALL NOT be destroyed by Kart cleanup.

#### Scenario: Retained cycle soak

- **WHEN** twenty entries and exits reuse the prepared runtime
- **THEN** session resources return to baseline each exit and retained resource counts stay stable.

#### Scenario: Eviction and rebuild soak

- **WHEN** repeated entry, eviction and rebuild complete on a healthy graphics context
- **THEN** resource/heap measurements meet cleanup budgets
- **AND** no host renderer, audio context or connection is closed.

### Requirement: Observable loading evidence

Optional development diagnostics SHALL distinguish module acquisition, generated assets/world, graphics preparation, collision/spawn readiness, admission, first visible frame and input readiness. They SHALL distinguish cold, prefetched, ready and retained entry, and report unavailable measurements honestly. CPU submission time SHALL NOT be represented as GPU execution time, and HUD insertion SHALL NOT be treated as first-frame proof.

#### Scenario: Baseline and optimized comparison

- **WHEN** a performance validation run is recorded
- **THEN** evidence includes total latency, contributing/overlapping phases, Theater frame timing, resource counts, environment and cache state
- **AND** user-driven selection/countdown and network queue waits are distinguishable from initialization.
