## Purpose

Make billiards sound like a physical table through material-specific contacts, continuous ball motion and synchronized local presentation for players and nearby witnesses.

## ADDED Requirements

### Requirement: Recognizable physical contacts
Billiards SHALL audibly distinguish cue-tip contact, resin ball collisions, rubber cushions and pocket drops. Impact intensity SHALL follow contact strength with bounded gain and natural variation; soft contacts SHALL remain softer than hard contacts. Pocket sounds SHALL include a short hollow drop and settling character. Physical impacts SHALL not be represented by pitched notification tones.

#### Scenario: Reference listening set
- **WHEN** a listener plays a soft shot, full break, cushion bank and pocketed shot at the same effects setting
- **THEN** each material is distinguishable, the break has stronger impact than the soft shot, and the pocket produces an audible physical drop.

#### Scenario: Repeated contacts and dense break
- **WHEN** comparable contacts repeat or many different balls collide during a break
- **THEN** the sound has restrained variation, distinct salient impacts remain audible, and the mix does not clip or collapse into a sustained electronic tone.

### Requirement: Motion follows the balls
Billiards SHALL provide quiet cloth movement sound driven by visible ball speed and sliding or rolling state. It SHALL smoothly fade as motion settles and SHALL be silent for stationary or pocketed balls.

#### Scenario: Ball rolls to rest
- **WHEN** an isolated ball slows across the cloth and stops
- **THEN** its movement sound decreases smoothly and is silent within 200ms of settling, without a looping seam or abrupt click.

### Requirement: Synchronized and nonrepeating shot presentation
Players and nearby spectators SHALL hear contacts corresponding to the shot being presented. Receiving a duplicate event or correcting a predicted snapshot SHALL NOT replay an already heard contact. Distinct subsequent contacts SHALL remain eligible. Cue sound SHALL occur once at the presented cue impact or observed accepted shot start, and canceled aiming SHALL remain silent. Audio SHALL NOT change authoritative physics or results.

#### Scenario: Predicted collision followed by correction
- **WHEN** a locally presented collision is subsequently received in a server snapshot or activity event
- **THEN** that contact is heard once and a later distinct collision between the same balls can still sound.

#### Scenario: Pocket event compatibility
- **WHEN** a current physics pocket event or a supported legacy pocket event is presented
- **THEN** the corresponding ball drop is heard once using the available pocket location.

#### Scenario: Spectator and reconnect
- **WHEN** a nearby spectator observes a new shot or reconnects midway through one
- **THEN** new presented contacts are audible, and reconnect does not replay the earlier cue strike or historical collisions.

#### Scenario: Canceled or refused stroke
- **WHEN** aiming is canceled before impact or a shot is refused before its presented impact
- **THEN** no cue strike sounds; a refusal after a local strike does not generate an additional strike.

### Requirement: Spatial sound under local controls
Billiards SHALL follow the existing Sound and effects controls, attenuate with listener distance, and position contacts consistently with the visible table and current view. Stereo positioning SHALL remain subtle and preserve mono intelligibility. Media, voice and room playback state SHALL retain their existing behavior.

#### Scenario: Rotate view and walk away
- **WHEN** a visitor rotates the view or walks away from the table
- **THEN** directional sound remains aligned with the visible table and becomes inaudible beyond the configured listening range.

#### Scenario: Local mute with floating media
- **WHEN** a player changes effects volume or disables Sound while a floating stream is present
- **THEN** billiards follows those local settings without changing the shared stream timeline or another visitor's sound preferences.

### Requirement: Bounded and safe audio lifecycle
Billiards audio SHALL use bounded resources and SHALL NOT block gameplay while audio is unavailable or loading. It SHALL respect explicit audio enabling and autoplay denial. Leaving the active table's place or disposing its presentation SHALL stop its sounds within 200ms and cancel pending work. Returning SHALL not replay missed events or multiply sources.

#### Scenario: Missing assets or suspended audio
- **WHEN** sample loading fails or the browser denies audio startup
- **THEN** the table remains playable, no alternate ungoverned audio output starts, and a later successful enable or retry plays only fresh events.

#### Scenario: Leave during loading or rolling
- **WHEN** a visitor travels away during sample loading, pocket decay or ball movement
- **THEN** old table audio stops within 200ms, late loading completion remains silent, and returning creates no duplicate playback.
