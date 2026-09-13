## ADDED Requirements

### Requirement: World ambience follows the active presentation once

Environmental ambience SHALL derive from the selected World and active View interpretation through the existing local gain policy. Parent and in-place activity contexts SHALL not duplicate ambience. Separate game presentation SHALL suspend hidden social ambience and blend compatible World audio without changing game effects, authoritative cues, media timeline, user mute or voice policy. Failed or unavailable optional audio SHALL NOT block travel or gameplay. Departing View audio SHALL still stop within the existing 200 ms lifecycle bound; same-host World ambience changes SHALL crossfade retained sources.

#### Scenario: Table activity
- **WHEN** a visitor moves from the arcade into pool in the same theater
- **THEN** there is one World ambience mix and the pool's positional effects remain audible according to the user's settings.

#### Scenario: World switch during media
- **WHEN** a visitor changes World while floating theater media continues during a game
- **THEN** only local environmental ambience changes, playback remains one session and no shared timeline action is sent.

#### Scenario: Failed ambience
- **WHEN** optional World audio fails or audio startup is denied
- **THEN** visuals and gameplay continue and a later explicit sound gesture can retry without duplicating loops.
