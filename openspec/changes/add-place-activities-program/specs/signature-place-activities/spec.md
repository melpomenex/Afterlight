## Purpose

Give individual places distinctive competitive and cooperative activities grounded in their architecture and shared environmental conditions.

## ADDED Requirements

### Requirement: Rooftop flight
High Awnings SHALL offer drones for one to four racers on an ordered checkpoint course with lap time, missed-checkpoint rejection, collision recovery and visible world drones. Paper airplanes SHALL offer angle/pitch/power launches and server-measured distance; identical initial conditions SHALL reproduce the same wind-influenced result.

#### Scenario: Drone race
- **WHEN** two visitors race and one skips a checkpoint
- **THEN** the skipped lap is not scored and other visitors see both drones.

#### Scenario: Airplane
- **WHEN** two equal launches use different server wind conditions
- **THEN** their trajectories and distances reflect those conditions consistently across clients.

### Requirement: Rain and water activities
Rain Court SHALL offer up to four gutter boats released from a common start with rain/current-influenced progress and a finish order. Sluiceworks SHALL offer one-to-four-player RC boat racing with steering/throttle, ordered buoys, collision recovery and lap timing. Boats SHALL remain in reachable visible waterways.

#### Scenario: Shared finish
- **WHEN** two boats cross the line close together
- **THEN** server finish order and tie policy are the same for every observer.

#### Scenario: RC control
- **WHEN** a pilot leaves during a race
- **THEN** their boat stops/returns safely and their avatar regains world control.

### Requirement: Quiet board games and puzzles
Rain Court SHALL offer two-player chess and English draughts/checkers; Paper Catacombs SHALL offer chess and a shared tile-arrangement puzzle. Chess SHALL enforce legal moves, check, mate, stalemate, castling, en passant, promotion and declared repetition/50-move draws. Checkers SHALL enforce mandatory captures, chained jumps, kings and no-legal-move loss. Boards SHALL show whose turn it is and support resignation and agreed draw. The puzzle SHALL converge after concurrent moves and expose a shared solved state.

#### Scenario: Illegal board move
- **WHEN** a player moves out of turn or leaves their king in check
- **THEN** the move is rejected and both boards retain the same position.

#### Scenario: Puzzle collaboration
- **WHEN** two visitors move tiles concurrently
- **THEN** one authoritative ordering produces the same board and completion state for both.

### Requirement: Camp and ice games
Desert Camp SHALL offer two-player horseshoes: alternate four shoes per round, ringers three points and closest shoe within one shoe-width one point, cancellation scoring, first to 21. Its telescope SHALL let visitors find a shared seeded sky object, mark it for companions and exit without a winner requirement. Glacial Glasshouse SHALL offer 1v1 and 2v2 curling over four ends, four stones per side per end, launch/curl/sweep control, closest-stone scoring and an extra end on ties.

#### Scenario: Horseshoes round
- **WHEN** both sides finish four throws
- **THEN** distance/ringer cancellation produces the same round total for all clients.

#### Scenario: Telescope
- **WHEN** a visitor marks a constellation
- **THEN** another observer can locate the same object without being forced into a competition.

#### Scenario: Curling end
- **WHEN** all stones stop after the final throw
- **THEN** only stones of the closest side nearer than the opposing closest stone score and the next end begins.

### Requirement: Foundry and marsh activities
Rustfall Foundry SHALL provide a timing-based hammer strike and a forge challenge with bounded strikes against a common target profile and deterministic error score. Brackish Basin and Reclaimed Marshes SHALL offer casting, bobber/bite and reel/release fishing plus angle/power skipping stones. Catch/skip outcomes SHALL use shared weather/time and bounded server inputs, without adding economy rewards or crop effects.

#### Scenario: Forge
- **WHEN** two players strike the same target with identical inputs
- **THEN** the same final profile and score result.

#### Scenario: Fishing together
- **WHEN** two visitors cast beside each other
- **THEN** each sees both lines/bobbers and can chat, reel or leave independently without earning required progression.

### Requirement: Cooperative light music and photographs
Spore Understory SHALL offer a shared light/music sequence puzzle for one to four people with visible progress and a cooperative completion. Orpheum SHALL include a playable spatial piano with note-off/mute/rate limits and a two-to-three-avatar photo booth with countdown, four poses and a locally downloadable strip. Every pictured participant SHALL opt in before capture; no chat, media screen or unrelated visitor SHALL be included. Captures SHALL NOT upload automatically.

#### Scenario: Piano cleanup
- **WHEN** a pianist loses focus while holding a note
- **THEN** the note stops, nearby players do not hear a stuck tone, and mute remains respected.

#### Scenario: Photo consent
- **WHEN** one of three proposed participants declines
- **THEN** capture waits or proceeds only after composition excludes that participant; no image is uploaded.

#### Scenario: Shared puzzle
- **WHEN** visitors finish the required light/music sequence
- **THEN** each sees the same cooperative completion without ranking one participant above another.

### Requirement: Orpheum darts
Orpheum darts SHALL provide two-player 301 double-out with three darts per turn, standard board scoring, bust restoration and a visible turn total. Pointer/touch flick and keyboard/controller aim-power alternatives SHALL support the same bounded throw model.

#### Scenario: Bust
- **WHEN** a turn overshoots zero or leaves one
- **THEN** the score returns to its start-of-turn value and play passes to the opponent.

### Requirement: Authoritative environment contract
Affected activities SHALL use server-owned semantic wind, rain, time and surface conditions, versioned with the match/run. Competitive runs SHALL freeze the conditions at start; fishing/telescope SHALL use timestamped current state. Client visual particles SHALL never decide outcomes. Missing authoritative conditions SHALL use a declared shared default or refuse readiness visibly.

#### Scenario: Different graphics settings
- **WHEN** two racers use different rain/particle quality
- **THEN** their shared boat outcomes remain identical.

#### Scenario: Weather change
- **WHEN** the place weather changes during a ranked airplane attempt
- **THEN** the attempt keeps its recorded start conditions and the next attempt uses new conditions.
