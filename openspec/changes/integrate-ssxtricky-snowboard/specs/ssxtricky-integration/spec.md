## Purpose

Integrate the actual local Alpine Rush snowboarding experience into Afterlight's shared arcade while preserving its recognizable presentation and gameplay.

## ADDED Requirements

### Requirement: Source-game visual fidelity
The cabinet SHALL present Alpine Rush's daylight alpine course, broad snowy banks, peaks, pines, chairlift, banners, ramps, cyan speed lanes, pickups and snowboard riders with its chase-camera presentation. A sparse night slope or robot-rider replacement SHALL NOT satisfy this requirement.

#### Scenario: Enter and traverse the source course
- **WHEN** a player enters the cabinet and travels through the start, ramp, chairlift and finish sections
- **THEN** the integrated scene retains the corresponding source game's composition and recognizable landmarks, verified with paired source and integrated captures

### Requirement: Source arcade mechanics
Players SHALL retain carving, tuck and lean, charge and super-pop jumps, ramp launches, boost, speed zones, pickups, spin/grab/flip tricks, combos and bails, with visible speed, boost and score feedback.

#### Scenario: Complete a ramp trick
- **WHEN** a rider enters a speed lane, charges a ramp jump and completes an aerial trick before landing
- **THEN** the rider launches from the ramp, receives the source-equivalent clean-landing score and boost reward, and sees trick/combo feedback

#### Scenario: Bail on an unfinished trick
- **WHEN** a rider lands before completing a trick
- **THEN** the combo is not banked and source-equivalent bail feedback and movement penalty apply

### Requirement: Authoritative shared race
The system SHALL support 2–8 human riders with a common countdown and server-authoritative course contact, movement, boost, pickup claims, tricks, finish order and scores. Local prediction SHALL reconcile to accepted server state. AI SHALL NOT be presented as connected humans.

#### Scenario: Two clients race and collect the same pickup
- **WHEN** two riders complete the shared countdown and each crosses a pickup
- **THEN** both see synchronized human opponents and each may receive that pickup once per race, with duplicate claims unable to increase score

#### Scenario: Incompatible course version
- **WHEN** a client loads a different course or simulation version
- **THEN** readiness is refused with a reload explanation before that client enters the race

### Requirement: Reliable participation and rematch
Fresh entry, re-seat and promotion SHALL establish loading for the current seat. The first Ready or Rematch after assets are ready SHALL succeed without a repeated not_loaded error. Leaving SHALL restore the social world and release game input, audio and visual resources.

#### Scenario: Re-seat then ready
- **WHEN** a loaded player exits, takes a new seat and presses Ready once
- **THEN** the new seat receives its load handshake before readiness and the player becomes ready without a second press

#### Scenario: Results to rematch
- **WHEN** a completed race displays results and riders select Rematch
- **THEN** the next race resets motion, trick score, pickups and boost to their defined initial state and starts a new shared countdown

### Requirement: Contextual controls and continuity
The integrated activity SHALL preserve source trick inputs, opt-in sound and touch equivalents while retaining accessible chat and safe exit. Local pause or typing SHALL NOT pause other racers or send held gameplay inputs.

#### Scenario: Grab and exit have distinct actions
- **WHEN** an airborne rider presses E and later presses Escape
- **THEN** E performs the grab action and Escape returns safely to the cabinet without also triggering world interactions

### Requirement: Evidence-based acceptance
Completion SHALL require paired visual evidence, source-mechanics parity tests and real multi-client lifecycle playtests. A non-black canvas, a protocol-only pass or an unrelated green suite SHALL NOT establish source fidelity.

#### Scenario: Release review
- **WHEN** the change is proposed as complete
- **THEN** evidence includes source/integrated start, ramp, trick and finish comparisons, successful first Ready/re-seat/rematch, and recorded performance for 2/4/8 human-equivalent clients
