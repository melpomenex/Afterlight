## MODIFIED Requirements

### Requirement: Avatar Differentiation and Remote Movement Interpolation
The system SHALL render distinctive procedural gardener avatars (with apron, hat, boots, and tools) with colors derived from player ID, and SHALL smoothly interpolate remote player positions and rotations at 8–15 Hz without visual teleportation. The shipped live configuration SHALL represent every remote player with their full gardener avatar and overhead nickname plate; proxy or instanced placeholder representations SHALL appear only when a player explicitly opts into the experimental WebGPU fast path at runtime, and committed build configuration SHALL NOT force that opt-in.

#### Scenario: Rendering remote players
- **WHEN** another player enters or moves within the same room
- **THEN** the client renders their custom procedural gardener avatar with an overhead nickname plate and smoothly interpolates their position and walking animation

#### Scenario: Shipped acceleration defaults keep full avatars
- **WHEN** the production or development build enables the benchmarked realtime data plane (binary frames, WASM decode, worker pipeline) without an explicit renderer opt-in
- **THEN** remote players still render as full gardener avatars with nickname plates, never as generic proxy orbs

#### Scenario: Explicit experimental opt-in
- **WHEN** a player explicitly enables the experimental WebGPU fast path through a runtime switch for that session
- **THEN** the instanced proxy representation is permitted, and clearing the switch restores full avatars on the next load

#### Scenario: Committed configuration never forces the proxy path
- **WHEN** the repository's committed build configuration is inspected or a default build is produced
- **THEN** no committed environment file enables the rejected WebGPU proxy renderer by default, and a repository test fails if one starts to
