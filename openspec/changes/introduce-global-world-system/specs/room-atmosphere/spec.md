## MODIFIED Requirements

### Requirement: Semantic atmosphere authority

A supported room SHALL have exactly one authoritative semantic atmosphere owned by its existing room authority. Only preset, mode, seed, bounded intensity/wind, timing, transition and significant event metadata SHALL be synchronized. Individual particle transforms SHALL NEVER be transmitted. Personal World selection SHALL remain a separate local cosmetic preference: accepted room atmosphere SHALL NOT overwrite that preference, and the personal World picker SHALL NOT send room atmosphere mutations. Authoritative activity conditions SHALL continue to derive from shared semantic state, never from personal World visuals. Existing room keys, membership, snapshot ordering and legacy atmosphere control compatibility SHALL remain unchanged.

#### Scenario: Two occupants

- **WHEN** two clients join court during heavy rain
- **THEN** both receive the same semantic snapshot while generating their own rain locally.

#### Scenario: Agricultural rain

- **WHEN** court changes its atmospheric preset or a visitor changes personal World
- **THEN** no cultivation, inventory, economy or crop simulation is introduced or updated.

#### Scenario: Different personal Worlds in one room
- **WHEN** coastal and rainforest visitors join the same theater
- **THEN** both receive the same authoritative semantic snapshot, retain their personal World choices and share the same players, activities and coordinates.

#### Scenario: Legacy client changes atmosphere
- **WHEN** an older client sends an accepted room atmosphere mutation
- **THEN** semantic state updates normally while migrated clients retain their World preferences and preserve authoritative activity conditions.

#### Scenario: Local choice sends no authority mutation
- **WHEN** a migrated client selects another World
- **THEN** room atmosphere revision, room membership and activity physics do not change because of that selection.
