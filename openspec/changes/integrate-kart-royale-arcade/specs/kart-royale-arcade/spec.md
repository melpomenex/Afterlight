## Purpose

The Orpheum's fourth upright arcade cabinet presents Kart Royale — a physically
distinct machine on the existing arcade row — discoverable, enterable and
observable like every other cabinet activity, with the expensive game code
loaded only on entry and the social world continuing around it.

## ADDED Requirements

### Requirement: Kart Royale cabinet identity

The Theater SHALL present exactly one arcade cabinet themed as Kart Royale,
reusing the canonical cabinet model and skinning system (marquee, side/front
artwork, control panel, LED, screen composite), at the east-wall position
previously occupied by the Sporefall machine. The cabinet's visible identity
SHALL include the title "KART ROYALE", a racing-appropriate tagline, artwork
evoking the game's golden-hour racing identity (checkered/road motifs, kart
silhouette, drift sparks or speed lines), and an LED color distinct from every
other Orpheum machine.

#### Scenario: Distinct machine on the row

- **WHEN** a player looks at the Orpheum arcade row
- **THEN** one upright cabinet visibly reads "KART ROYALE" with themed artwork
- **AND** its LED color differs from every other cabinet's LED
- **AND** the total number of upright cabinets remains five.

#### Scenario: Manifest and projection agreement

- **WHEN** the place manifest and its exported server projection are inspected
- **THEN** the Theater's activity list contains a Kart Royale activity
  definition at the repurposed position with one participant anchor and a
  walkable dismount point
- **AND** no definition for Sporefall is placed in the Theater
- **AND** Sporefall's activity definition and code remain present in the
  repository.

### Requirement: Cabinet discovery and prompt

Approaching the Kart Royale cabinet SHALL surface the standard activity
interaction affordances: within the definition's interaction radius, the action
panel SHALL show the activity's title and a "Press E" style sub-line consistent
with the other machines, and the on-screen interact button SHALL start the same
flow as the E key.

#### Scenario: Prompt at the machine

- **WHEN** the player walks within interaction range of the Kart Royale cabinet
- **THEN** the contextual interaction panel names Kart Royale with a race-oriented prompt
- **AND** leaving the range dismisses the prompt.

### Requirement: Lazy entry with bounded loading

Pressing E (or the interact button) at the Kart Royale cabinet SHALL begin
loading the Kart Royale game runtime lazily — the expensive game modules SHALL
NOT be loaded for players who merely visit the Theater or stand near the
cabinet. While loading, world locomotion input SHALL be suspended and a visible
loading indication SHALL appear. Loading SHALL be cancellable, and a second E
press or Escape during loading SHALL return the player to normal Theater play.

#### Scenario: Bystanders never download the game

- **WHEN** a player enters the Theater and does not activate the Kart Royale cabinet
- **THEN** no Kart Royale game chunk is fetched or initialized.

#### Scenario: Cancel during load

- **WHEN** the player activates the cabinet and cancels before loading completes
- **THEN** the Theater immediately resumes normal play
- **AND** a later asynchronous completion of the canceled load cannot seize the
  view, acquire the presentation lease, or alter game state.

#### Scenario: Load failure

- **WHEN** the game modules fail to load or initialize
- **THEN** the player receives a bounded error message
- **AND** the Theater remains fully playable and the player can retry.

### Requirement: Attract and occupied cabinet display

While no one is playing, the Kart Royale cabinet screen SHALL show an animated
attract mode built from inexpensive 2D canvas painting (title, track/kart
motif, "PRESS E TO RACE" copy) — never a live hidden 3D scene — and SHALL
respect the existing cabinet screen throttling for distant or hidden machines.
While a player is admitted, the display SHALL indicate the machine is occupied
and racing without claiming live race telemetry.

#### Scenario: Idle machine

- **WHEN** the Kart Royale cabinet is unoccupied and visible
- **THEN** its screen animates a Kart Royale attract presentation with a call
  to action
- **AND** no Kart Royale 3D scene is instantiated for the bystander view.

#### Scenario: Occupied machine

- **WHEN** another player is admitted to the Kart Royale session
- **THEN** the cabinet screen reflects an occupied/racing state derived from
  activity occupancy
- **AND** the display does not present fabricated live standings.

### Requirement: Social presence while racing

While a player races Kart Royale, their social avatar SHALL remain a member of
the Theater room, anchored at the cabinet's participant anchor, visible to
other players standing at the machine. Chat and Theater media synchronization
SHALL continue for everyone. A second player activating the occupied cabinet
SHALL be handled by the existing activity queue etiquette rather than a
machine-specific lock.

#### Scenario: Avatar waits at the cabinet

- **WHEN** a player is racing Kart Royale
- **THEN** other Theater occupants see the player's avatar standing at the
  cabinet
- **AND** the nearby-activities indicator reports the machine as occupied.

#### Scenario: Second player queues

- **WHEN** a second player presses E at the occupied Kart Royale cabinet
- **THEN** the existing activity queue behavior admits them when the machine
  frees up.

### Requirement: Other arcade activities unchanged

Repurposing the cabinet SHALL NOT change the behavior, availability, or
presentation of the Orpheum's other activities (Pong, Rain Runner, Signal Lost,
Summit Run, pool and the table games), and their regression suites SHALL
continue to pass.

#### Scenario: Neighboring cabinets

- **WHEN** the Kart Royale cabinet is added to the row
- **THEN** every other cabinet keeps its identity, position, prompts, and
  playable behavior.
