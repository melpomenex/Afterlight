## Purpose

Host the real Downhill Mayhem game inside Afterlight's shared renderer, frame
loop, activity view lease, input ownership, HUD and audio, with deterministic
lifecycle, staged preparation, safe failure and leak-free re-entry — while the
standalone game keeps working from the same implementation.

## ADDED Requirements

### Requirement: Single host ownership

Entering, playing and exiting Downhill Mayhem SHALL NOT create a second
top-level `WebGLRenderer`, a second WebGL/WebGPU context, a second permanent
canvas, a second `requestAnimationFrame` loop, a second application socket, an
iframe, a second activity registry, or an independent global keyboard
ownership system. The activity SHALL acquire the existing activity view lease
and render through the host renderer with an optional presenter; the host
SHALL remain the owner of the renderer, canvas, primary loop, composer, resize
events and network transport.

#### Scenario: No duplicate host primitives

- **WHEN** a player enters, plays and exits Downhill Mayhem
- **THEN** the page still has exactly one host renderer, one primary rendering
  context, one primary animation loop and one Afterlight transport connection
- **AND** no iframe or second canvas was added to the document.

### Requirement: Hosted runtime lifecycle contract

The hosted runtime SHALL expose lifecycle responsibilities equivalent to
`preload()`, `prepare({signal})`, a readiness signal, `enter(sessionContext)`,
`update(dt)`, `present()`, `resize(width, height)` and `dispose()`. It MAY own a
`Scene`, a `PerspectiveCamera`, game objects, a HUD subtree, session audio
voices and game-specific input interpretation. `dispose()` SHALL be idempotent
and SHALL tear down every owned system without disposing the shared renderer,
canvas, socket or host audio context.

#### Scenario: Host drives update and present

- **WHEN** the activity holds the view lease
- **THEN** the host frame loop calls the activity update and the lease presenter
  once per frame
- **AND** the runtime does not register its own `requestAnimationFrame`.

### Requirement: Readiness barrier and valid presentation

The runtime SHALL publish readiness only after all required systems are
initialized, rider/grid state is finite and grounded on valid course support,
the selection/lobby camera pose is explicitly initialized, required materials
and programs are prepared, and one hidden full-aspect frame has rendered
successfully. Before readiness the visible presenter SHALL be a no-op and the
Theater SHALL remain presentable; the runtime SHALL NOT expose an unposed
camera, an origin/under-map view, or a partially built world.

#### Scenario: Warm entry never shows an unfinished world

- **WHEN** preparation completes and the view is committed
- **THEN** the first visible frame is a complete, valid Downhill Mayhem frame
- **AND** no intermediate frame reveals an unposed camera or incomplete terrain.

#### Scenario: Cold fallback

- **WHEN** entry occurs before preparation has finished
- **THEN** the Theater stays visible with a cancellable status until readiness
  and admission both hold
- **AND** a failure produces a bounded error and an explicit retry, never an
  endless fade or an invalid game view.

### Requirement: Exclusive input ownership and safe exit

While the view lease is held, Downhill Mayhem input SHALL exclusively own
gameplay controls, and Theater interaction, click-to-walk, world locomotion,
conflicting camera controls and world zoom SHALL be suspended. `E` SHALL be
punch, not world interaction; `F` SHALL be kick. `Escape` (and an explicit
on-screen Exit control) SHALL leave the activity. Typing in chat/settings and
window blur SHALL neutralize game input without pausing other players' race.
`R` SHALL mean ready/rematch only in lobby/results and SHALL NOT restart a live
shared race.

#### Scenario: E punches, Escape exits

- **WHEN** a racing player presses E and then Escape
- **THEN** E performs the punch action and does not trigger the world interaction
- **AND** Escape leaves the activity and restores world controls.

#### Scenario: Typing does not control the game

- **WHEN** a player focuses chat and types WASD or Space
- **THEN** the game receives no movement or action input from typing.

### Requirement: HUD scoping

The activity HUD SHALL be a lifecycle-owned subtree scoped to Downhill Mayhem
classes, inserted on activation and removed on release. A body presentation
class MAY hide world HUD elements while held but SHALL keep chat reachable and
SHALL be removed on release, including on every failure and travel path. The
activity SHALL NOT permanently alter other activities' DOM.

#### Scenario: Repeat entry leaves no HUD residue

- **WHEN** the activity is entered and exited repeatedly
- **THEN** no Downhill Mayhem HUD nodes or presentation classes remain after exit.

### Requirement: Audio ownership

The hosted runtime SHALL accept the host audio mixer (`context` + destination)
when available; when it creates its own context it SHALL do so only on the entry
gesture and SHALL close only its own context on dispose. On exit it SHALL stop
music and transient voices, disconnect its nodes, and restore the prior host
audio state. It SHALL NOT change persistent player mute settings or stop
Theater/chat/voice audio.

#### Scenario: No leaked or stolen audio

- **WHEN** the activity exits
- **THEN** its music and voices are stopped and its nodes disconnected
- **AND** a host-injected AudioContext is not closed
- **AND** Theater and chat audio continue unaffected.

### Requirement: Renderer state restoration

Acquiring the view SHALL capture the host renderer policy and SHALL restore it
on release, including tone mapping and exposure, output color space, shadow
configuration, pixel ratio, size, viewport/scissor, clear color/alpha,
`autoClear` flags and render-target/XR state touched by the activity. After
exit the Theater SHALL render with the exact pre-entry policy. Background
preparation work SHALL run as a renderer-state transaction that restores the
host state in `finally` before any await.

#### Scenario: Policy restored

- **WHEN** the activity releases the lease on any exit path
- **THEN** the host renderer policy matches the pre-entry snapshot.

### Requirement: Cancellation, failure and context loss

Every asynchronous step (import, preparation, admission, activation) SHALL be
fenced by a place-generation and activation-attempt token; late results SHALL
attach to nothing and SHALL be disposed exactly once. A frame exception SHALL
be caught once and exit rather than loop-restart. Transport disconnect and
WebGL context loss on the host canvas while held SHALL exit safely and return
control; the runtime SHALL NOT falsely claim to recover the shared context.
Travel before acceptance or during activation SHALL release any view and
membership and restore world controls.

#### Scenario: Travel during preparation

- **WHEN** the player travels away while the activity is preparing
- **THEN** the pending attempt is invalidated, no view is taken, and normal
  world play resumes without leaked resources.

#### Scenario: Fatal frame error

- **WHEN** the runtime throws during update or present
- **THEN** the activity exits with a bounded message and does not enter a restart loop.

### Requirement: Bounded preparation and resource lifecycle

Preparation SHALL be cancellable and SHALL retain at most one prepared runtime
in a bounded, refcounted cache with an idle eviction window; travel, context
loss, quality/world change and explicit disposal SHALL invalidate it. Repeated
enter/exit cycles SHALL NOT accumulate canvases, contexts, listeners, timers,
intervals, animation loops, audio nodes, DOM nodes, scene children, textures,
render targets, subscriptions or prediction buffers. Disposal SHALL release
only the activity's own resources, never shared cache resources owned by
another live user.

#### Scenario: Many cycles are flat

- **WHEN** the activity is entered and exited many times over a soak
- **THEN** listener, context, timer, DOM, audio and GPU resource counts return
  toward baseline and remain bounded.

### Requirement: Standalone preservation and shared dependency

Downhill Mayhem SHALL remain playable standalone from the same game
implementation. The standalone entry SHALL remain a thin host with its own
renderer, animation loop, local simulation/AI and `localStorage` PB/ghost/
challenge features, and the original self-contained offline file SHALL be
preserved. The hosted code SHALL use the application's shared Three.js
dependency rather than an inlined copy, and a test SHALL assert version
agreement between root and the game package so they cannot drift silently.

#### Scenario: Standalone still runs

- **WHEN** the game is started from its standalone shell
- **THEN** a full local race against AI remains playable with PB/ghost/challenge
  behavior
- **AND** the hosted path does not depend on the standalone renderer or RAF.

### Requirement: Provenance and attribution

The port SHALL preserve the original `LICENSE` (Apache-2.0), `THREE.LICENSE`
(MIT), the original author/tribute credit and the no-original-assets provenance
documented by the game README. The change SHALL document what source was
adapted and how attribution is retained, and SHALL NOT strip notices.

#### Scenario: Notices retained

- **WHEN** the game directory and `docs/` are inspected
- **THEN** the original licenses, credit and provenance notes are present and unmodified.
