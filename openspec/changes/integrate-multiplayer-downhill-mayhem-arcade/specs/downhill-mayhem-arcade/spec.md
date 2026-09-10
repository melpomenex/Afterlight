## Purpose

The Orpheum's former Signal Lost upright cabinet presents Downhill Mayhem — a
physically distinct machine on the existing arcade row, discoverable,
enterable and observable like every other cabinet activity, with the expensive
game code loaded only on entry and the social world continuing around it.

## ADDED Requirements

### Requirement: Downhill Mayhem cabinet identity

The Theater SHALL present exactly one arcade cabinet themed as Downhill Mayhem,
reusing the canonical cabinet model and skinning system (marquee, side/front
artwork, control panel, LED, screen composite) at the east-wall position
previously occupied by the Signal Lost machine
(`transform.position [10.42, 0, -3.85]`, `rotationY -Math.PI/2`). The cabinet's
visible identity SHALL include the title `DOWNHILL MAYHEM`, the tagline
`RIDE • TRICK • FIGHT`, artwork evoking downhill mountain-bike racing, and an
LED color distinct from every other placed Orpheum machine. The total number of
upright cabinets SHALL remain five and Theater geometry SHALL NOT change.

#### Scenario: Distinct machine on the row

- **WHEN** a player looks at the Orpheum arcade row
- **THEN** one upright cabinet visibly reads `DOWNHILL MAYHEM` with themed artwork
- **AND** its LED color differs from every other placed cabinet's LED
- **AND** the total number of upright cabinets remains five
- **AND** the cabinet stands at the former Signal Lost transform.

#### Scenario: Manifest and projection agreement

- **WHEN** the place manifest and its exported server projection are inspected
- **THEN** the Theater's activity list contains a `downhill-mayhem` activity
  definition at the repurposed position with six participant anchors and
  walkable dismount points
- **AND** the definition declares `capacities {players:6, spectators:32,
  queue:16}`, `minPlayers:1`, `readyPolicy:'explicit'` and course metadata
- **AND** no Signal Lost definition is placed in the Theater
- **AND** Signal Lost's manifest definition, client module and server module
  remain present in the repository.

### Requirement: Cabinet discovery and prompt

Approaching the Downhill Mayhem cabinet SHALL surface the standard activity
interaction affordances: within the definition's interaction radius the
contextual panel SHALL name Downhill Mayhem with a `Press E to ride` prompt,
and the on-screen interact button SHALL start the same flow as the E key.
Leaving the range SHALL dismiss the prompt.

#### Scenario: Prompt at the machine

- **WHEN** the player walks within interaction range of the Downhill Mayhem cabinet
- **THEN** the contextual interaction panel names Downhill Mayhem with a ride prompt
- **AND** leaving the range dismisses the prompt.

### Requirement: Lazy entry with bounded loading

Pressing E (or the interact button) at the cabinet SHALL begin the Downhill
Mayhem activity lazily; the expensive game modules SHALL NOT be loaded or
initialized for players who merely visit the Theater. Staged preparation MAY
fetch and prepare the runtime ahead of entry (D17), but only the runtime
intended for the current place generation may be used. While joining, world
locomotion input SHALL be suspended and a visible, cancellable status SHALL
appear; a second E press or Escape during joining SHALL return the player to
normal Theater play, and a later completion of the canceled attempt SHALL NOT
seize the view or alter game state. A load or initialization failure SHALL show
a bounded message and leave the Theater playable with retry.

#### Scenario: Bystanders and the canceled attempt

- **WHEN** a player activates the cabinet and cancels before loading completes
- **THEN** the Theater immediately resumes normal play
- **AND** any later asynchronous completion of the canceled load cannot acquire
  the view lease, mount the HUD, or alter game state.

#### Scenario: Load failure

- **WHEN** the game modules fail to load or initialize
- **THEN** the player receives a bounded error message
- **AND** the Theater remains fully playable and the player can retry.

### Requirement: Attract and occupied cabinet display

While no one is playing, the cabinet screen SHALL show an animated Downhill
Mayhem attract presentation built from inexpensive 2D canvas painting (title,
mountain/rider motif, `PRESS E TO RIDE`) and SHALL respect the existing cabinet
screen throttling for distant or hidden machines. When a session is active the
display SHALL reflect, from server summary state only, the lobby (human/ready
counts, mountain, difficulty), countdown, racing (race time, ranked progress,
human/AI distinction) and results (winner, time, standings). The display SHALL
NOT instantiate a second mountain renderer or present fabricated live
standings.

#### Scenario: Idle machine

- **WHEN** the cabinet is unoccupied and visible
- **THEN** its screen animates a Downhill Mayhem attract presentation with a call to action
- **AND** no Downhill Mayhem 3D scene is instantiated for the bystander view.

#### Scenario: Occupied machine states

- **WHEN** a session is seated and racing
- **THEN** the cabinet screen reflects the current server phase and bounded
  progress summary on the shared canvas pipeline
- **AND** no full 3D mountain is rendered into the cabinet screen.

### Requirement: Social presence while racing

While a player races Downhill Mayhem, their social avatar SHALL remain a member
of the Theater room anchored at a cabinet participant anchor, visible to other
players, and Kiln SHALL remain in the world. Chat and Theater media
synchronization SHALL continue for everyone. A second player activating the
cabinet SHALL use the existing activity queue/spectator etiquette rather than a
machine-specific lock.

#### Scenario: Avatar waits at the cabinet

- **WHEN** a player is racing Downhill Mayhem
- **THEN** other Theater occupants see the player's avatar standing at the cabinet
- **AND** the nearby-activities indicator reports the machine as occupied.

### Requirement: Other arcade activities and dormant Signal Lost

Repurposing the cabinet SHALL NOT change the behavior, availability or
presentation of the Orpheum's other activities (Pong, Rain Runner, Kart Royale,
Summit Run, pool and the table games), and their regression suites SHALL
continue to pass. Signal Lost SHALL remain a complete, tested, dormant
implementation that a future manifest edit can re-place without reconstruction.

#### Scenario: Neighboring cabinets

- **WHEN** the Downhill Mayhem cabinet is placed on the row
- **THEN** every other cabinet keeps its identity, position, prompts and playable behavior
- **AND** Signal Lost remains registered and its tests still pass.
