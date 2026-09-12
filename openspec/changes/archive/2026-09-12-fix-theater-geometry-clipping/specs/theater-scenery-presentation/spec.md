## Purpose

Defines the physical presentation of The Orpheum's scenery: solid forms block the actor and the first-person camera, scenery volumes do not interpenetrate, and wall trim stays visually stable under camera motion.

## ADDED Requirements

### Requirement: Solid theater scenery

Every Orpheum scenery form tall enough to enter the standing actor's eye band and placed inside the walkable area SHALL be represented in the place's collision set, so that neither the actor nor the first-person camera can occupy the same space as solid geometry. Low decorative litter and floor coverings below knee height SHALL remain non-blocking.

#### Scenario: Walking the east wall in first person

- **WHEN** the player walks the east promenade in first person past the sconce assemblies, marquee board, and gilded exit pilasters
- **THEN** movement stops the camera outside those volumes and no gold decoration is sliced by the near plane or flickers while the walking eye bob is active

#### Scenario: Walking into the theater shell

- **WHEN** the player walks into the theater's north, south, or west wall lines, the proscenium piers, the drapery, or the gate arches
- **THEN** movement stops at the scenery face with the actor and camera fully outside the solid form

#### Scenario: Low decoration stays walkable

- **WHEN** the player crosses floor runners, rugs, or the low stage steps
- **THEN** movement is unaffected

### Requirement: Non-interpenetrating scenery

Theater scenery volumes SHALL NOT visibly interpenetrate. Props orphaned by a relocated fixture SHALL be removed, accent floor runners SHALL each own their footprint, gate visuals SHALL NOT be embedded inside other solid geometry, and activity participant anchors SHALL be clear of scenic volumes.

#### Scenario: Summit Run bay owns its runner

- **WHEN** the theater is rebuilt
- **THEN** no orphaned lobby darts oche — or any other accent runner — overlaps the Summit Run bay runner or its brass border

#### Scenario: Market gate stands clear of the booth

- **WHEN** the player approaches the south market gate
- **THEN** the gate arch and portal stand clear of the projection booth, and the gate remains reachable and usable

#### Scenario: Pong anchor clear of the proscenium

- **WHEN** a player occupies the Pong cabinet's first standing anchor
- **THEN** the avatar is not inside proscenium pier or drapery geometry

### Requirement: Stable wall trim

Gilded and brass trim fastened to a wall surface SHALL be offset from that surface so that no two visible faces are coplanar, keeping the trim visually stable while the camera moves.

#### Scenario: Moving along the west gallery

- **WHEN** the camera moves along the west gallery wall in any view
- **THEN** the gilded panel mouldings do not flicker, alternate with the wall texture, or clip out

### Requirement: Preserved navigation and clearance

The added collision SHALL NOT make any seat, gate, activity anchor, spawn, or restoration landmark unreachable, SHALL preserve the existing route clearances, and SHALL leave every theater seat's stand-up position free of obstacles.

#### Scenario: Reachability after clearance

- **WHEN** the theater is rebuilt with the new collision
- **THEN** a walkable flood-fill from the entrance spawn reaches every seat, activity, and gate, and the projector landmark's interaction approach

#### Scenario: Standing up from any seat

- **WHEN** a player stands up from any theater seat
- **THEN** the stand-up position is outside every obstacle

#### Scenario: Arcade anchors and routes stay valid

- **WHEN** the arcade cabinet anchors are checked against the rebuilt theater
- **THEN** every participant anchor and dismount remains collision-free and each cabinet keeps its accessible approach
