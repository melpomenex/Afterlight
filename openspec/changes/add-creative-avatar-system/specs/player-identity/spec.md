## MODIFIED Requirements

### Requirement: Avatar Differentiation and Remote Movement Interpolation
The system SHALL render each player as their server-assigned authored avatar from the
avatar catalog when one is assigned, resolves in the local manifest, and loads
successfully; otherwise it SHALL render the distinctive procedural maintenance-robot
silhouette (outfit colors derived from player ID) with no farming tools or gardener
props attached. All clients in a room SHALL agree on the same avatar for a given player
id, sourcing it from the server-replicated assignment rather than local derivation. The
system SHALL smoothly interpolate remote player positions and rotations at 8–15 Hz
without visual teleportation. On the negotiated live binary path, remote avatars SHALL be
driven by the ongoing entity stream rather than only by join-time messages, and a
decode-session reset (room travel, rejoin, or renderer/worker start) SHALL NOT remove and
recreate remote avatars in a loop. Each remote guest SHALL own exactly one avatar keyed
to that guest's identity, and the local player and Kiln SHALL NOT be rendered as remote
avatars.

#### Scenario: Rendering remote players
- **WHEN** another player enters or moves within the same room
- **THEN** the client renders their assigned avatar — authored character when available,
  otherwise the procedural avatar — with an overhead nickname plate and smoothly
  interpolates their position and walking animation

#### Scenario: All clients agree on an avatar
- **WHEN** two clients observe the same third player whose assignment is avatar X
- **THEN** both render avatar X for that player, and neither substitutes a locally
  derived different avatar

#### Scenario: Remote movement on the negotiated binary path
- **WHEN** the binary data plane is negotiated and another player moves through the place
- **THEN** that player's avatar receives position, rotation, and pose-flag updates from
  the binary entity stream after the join roster and interpolates smoothly, instead of
  freezing at the join-roster position

#### Scenario: Room travel never flickers remote avatars
- **WHEN** the local player travels to another place while a remote player is present, or
  the decoder session otherwise re-establishes itself
- **THEN** the remote avatar is not repeatedly cleared and recreated, and after the
  destination roster applies it remains stable and keeps receiving movement updates

#### Scenario: Stable avatar identity
- **WHEN** binary entity rows for a remote player arrive, including spawn rows that are
  not accompanied by a resolved guest id (for example the WASM decode path)
- **THEN** the client updates the single avatar keyed to that player's guest id, creates
  no placeholder avatar under the numeric entity id, and never creates remote avatars for
  the local guest or Kiln

#### Scenario: Fallback preserves the prior silhouette
- **WHEN** a player's avatar is unassigned, unknown to the local manifest, or fails to
  load
- **THEN** that player renders the procedural maintenance-robot avatar exactly as before
  this capability, and presence, movement and emotes continue to work for them
