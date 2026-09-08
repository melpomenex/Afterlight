## Purpose

Provide original playable cabinets whose live screens and attract modes make the Orpheum a shared arcade as well as a cinema.

## ADDED Requirements

### Requirement: Pong vertical slice
Phase one SHALL include a physical two-player Pong cabinet: bounded paddles, ball/rail collisions, serve/reset and first-to-seven scoring, ready/rematch, spectators and leave/reconnect.

#### Scenario: Complete proof
- **WHEN** two clients finish Pong while a third watches
- **THEN** all three agree on points and winner and can subsequently return to normal world play.

### Requirement: Three original games
Phase two SHALL deliver Rain Runner (steering, throttle/brake, rain-city obstacles, increasing distance challenge and collision end), Signal Lost (rotate, thrust, fire, asteroids, three lives and score), and Sporefall (move/rotate/drop pieces, clears/chains, top-out and score). Each SHALL support start, instructions, restart and exit; each SHALL have a distinct playable loop and visual identity.

#### Scenario: Cabinet completeness
- **WHEN** a visitor plays each of the three cabinets to an end state
- **THEN** each accepts controls, applies its rules, shows a final score and can restart without reloading.

### Requirement: Material-backed live screens
Cabinets SHALL display local renderings of authoritative run state on their physical screen material; playing view SHALL reframe the same content. Idle cabinets SHALL show clearly labeled attract/demo content, without fabricated player records or coin requirements. Offscreen/hidden cabinets SHALL throttle or stop work, and sounds SHALL respect mute and spatial distance.

#### Scenario: Spectator sees gameplay
- **WHEN** a player changes direction or clears pieces
- **THEN** a nearby visitor sees the corresponding state on the cabinet screen.

#### Scenario: No WebGPU
- **WHEN** a browser has no WebGPU device
- **THEN** all three games and cabinet screens remain playable on the supported baseline renderer.

### Requirement: Verified arcade rankings
Local bests SHALL be labeled local. Shared rankings SHALL derive from server-simulated or server-replayed bounded seeded runs, never submitted score totals. Ranked runs SHALL have a 10-minute cap and a rules version; modified/out-of-order inputs SHALL be rejected.

#### Scenario: Score forgery
- **WHEN** a client sends an arbitrary high final score
- **THEN** no ranked entry is created.

#### Scenario: Valid run
- **WHEN** an eligible run ends and is recorded
- **THEN** its verified score appears under the correct game and rules version.
