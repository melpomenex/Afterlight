## Purpose

Defines the authored-avatar catalog and its end-to-end pipeline: a validated manifest of
distinctive Blender-authored characters, server-authoritative weighted assignment that all
clients agree on, on-demand asset loading with a procedural fallback, a shared rig
contract that keeps walk/sit/hop/emote animation working for authored avatars, cosmetic
personality effects, and the asset budgets that keep multiplayer scenes performant.

## ADDED Requirements

### Requirement: Avatar Definitions Manifest
The system SHALL keep a pure, version-controlled manifest of authored avatar definitions
as the single editable source. Each definition SHALL declare a stable unique id, a display
name, the runtime asset location, the rig kind, a scale, a nameplate height, the material
names eligible for per-player accent tinting, any declared cosmetic effect, an optional
rarity tier with a positive assignment weight, and tags. The manifest SHALL be frozen
after definition and SHALL reject entries with duplicate ids, non-positive weights,
invalid rig kinds, or asset paths that escape the avatar asset directory. Append-only
stability SHALL apply: existing avatar ids are never renamed or reweighted in a way that
silently changes what a persisted assignment resolves to.

#### Scenario: Manifest validation rejects malformed entries
- **WHEN** the manifest is loaded with a duplicate id, a non-positive weight, an unknown
  rig kind, or an asset path containing parent-directory traversal
- **THEN** validation fails with a named error identifying the offending entry, and no
  partial registry is exposed to callers

#### Scenario: Append-only stability
- **WHEN** a new avatar is appended to the manifest
- **THEN** existing avatar ids, definitions and assignment outcomes are unchanged, and a
  player whose persisted avatar id still exists resolves to the same avatar

### Requirement: Server-Authoritative Avatar Assignment
The server stack that owns the hello handshake SHALL assign each player exactly one avatar
from the manifest at their first hello: a weighted-random pick among avatars flagged
assignable, using server-side randomness, persisted on the player record alongside the
nickname, and returned to that player on every subsequent hello without re-rolling. An
assignment SHALL be stable across sessions, reconnects, room travel and server restarts.
A stored avatar id that is no longer in the manifest SHALL be re-assigned (and persisted)
rather than propagated. Clients SHALL NOT be able to choose, change or forge their avatar
in v1; the assignment rides server-owned identity, never client input.

#### Scenario: First-time player receives an avatar
- **WHEN** a player completes their first hello with no stored avatar
- **THEN** the server assigns a weighted-random avatar from the assignable set, persists
  it on the player record, and the welcome reply's player object carries the avatar id

#### Scenario: Returning player keeps their avatar
- **WHEN** a player reconnects, reloads, or returns in a later session with a stored
  avatar that still exists in the manifest
- **THEN** the server returns the stored avatar unchanged and performs no new random pick

#### Scenario: Retired avatar id is healed
- **WHEN** a stored avatar id is absent from the current manifest
- **THEN** the server assigns a fresh valid avatar, persists it, and returns the new id

#### Scenario: Assignment is server-side only
- **WHEN** a client sends hello or any other message with an avatar field attached
- **THEN** the server ignores the client-supplied value for assignment purposes

### Requirement: Avatar Replication Through Presence
The player's assigned avatar id SHALL travel additively on the existing identity and
presence shapes that already carry the nickname: the welcome player object, the
room-broadcast presence-join player object, and the join roster entries delivered to a
joining player. The avatar id SHALL NOT be added to movement flushes, movement input, or
the negotiated binary realtime data plane, because an avatar is session-stable identity.
Both server stacks (Node sidecar and Phoenix) SHALL emit the same field on the same
shapes. Receivers SHALL treat a missing or unknown avatar id as "no authored avatar" and
render the fallback.

#### Scenario: Joiner learns every occupant's avatar
- **WHEN** a player joins a room that already contains other players
- **THEN** the join roster delivered to the joiner carries each occupant's avatar id
  alongside their nickname

#### Scenario: Occupants learn the joiner's avatar
- **WHEN** a player joins a room
- **THEN** the presence-join broadcast carries the joiner's avatar id

#### Scenario: Movement traffic is unchanged
- **WHEN** players move, jump or sit
- **THEN** movement updates and any binary realtime frames carry no avatar data, and their
  shapes remain byte-compatible with clients that predate this capability

### Requirement: Authored Avatar Rendering With Fallback
The client SHALL render each player (local and remote) as their assigned authored avatar
when its definition resolves and its asset loads; otherwise it SHALL render the existing
procedural maintenance-robot avatar. Authored avatars SHALL honor the game's established
avatar behavior: ground origin between the feet, facing +Z at zero rotation, the world
scale declared by the definition, an overhead nameplate at the definition's height,
shadow casting, walk/idle/sit/airborne-hop locomotion, emote poses, seated leg fold, and
nickname updates — all equivalent to the procedural avatar. If an authored asset fails to
load or parse, the client SHALL surface the fallback immediately (never a missing or
half-constructed avatar), retry the fetch at most once, and keep the fallback on failure.

#### Scenario: Local player renders their assigned avatar
- **WHEN** the welcome reply carries an avatar id whose asset is available
- **THEN** the local player's avatar becomes the authored character at the same position,
  rotation, seat and camera state, with the nameplate above it

#### Scenario: Remote player renders their assigned avatar
- **WHEN** a presence event or roster entry for another player carries a loadable avatar id
- **THEN** the remote avatar renders as that character and keeps interpolating position,
  rotation, walk animation, hop and emotes exactly like the procedural avatar

#### Scenario: Unknown avatar id falls back
- **WHEN** a player's avatar id is missing from the local manifest
- **THEN** that player renders the procedural avatar and no error state is visible

#### Scenario: Asset failure falls back without breaking the room
- **WHEN** an avatar's asset request fails or the file does not parse
- **THEN** the player renders the procedural avatar, gameplay and presence continue
  unaffected, and other players' avatars are not impacted

### Requirement: Shared Rig and Animation Contract
Every authored avatar SHALL ship with the shared hierarchical rig: named root, head, arm
and leg pivot nodes at contract heights, so the existing locomotion and emote driving
(leg swing, seated fold, hop tuck, arm and rig emote poses) applies to authored avatars
without per-avatar animation code. Avatars that cannot use the shared rig (for example
wheel-legged or floating forms) SHALL declare an alternate supported rig kind in the
manifest, and the set of rig kinds SHALL stay small and enumerated in the manifest
validation. A missing or misnamed rig node SHALL degrade to a whole-body idle bob for
that avatar, never to an error or a frozen T-pose.

#### Scenario: Walk and sit work through the shared rig
- **WHEN** a shared-rig authored avatar walks and then takes a seat
- **THEN** its legs swing while walking and fold to the seated pose at the chair, matching
  the procedural avatar's motion

#### Scenario: Emotes work through the shared rig
- **WHEN** a shared-rig authored avatar performs any emote from the allow-list
- **THEN** its arm and body nodes pose through the same emote driving used for
  procedural avatars

#### Scenario: Missing rig node degrades gracefully
- **WHEN** an avatar asset lacks a contract-named leg or arm node
- **THEN** the avatar still renders and moves with a subtle whole-body idle bob, and the
  session logs a single named validation note

### Requirement: Per-Player Accent Tinting
For avatars that declare tintable materials, the client SHALL derive a deterministic
accent color from the player id — the same derivation on every client — and apply it only
to the declared materials, so players sharing an avatar still read as individuals.
Tinting SHALL leave non-declared materials untouched and SHALL be pure presentation: it
never affects assignment, the wire, or persistence.

#### Scenario: Two players with the same avatar differ
- **WHEN** two players in a room carry the same authored avatar with tintable materials
- **THEN** each renders with their own deterministic accent color on those materials and
  identical elsewhere

### Requirement: Cosmetic Personality Effects
The system SHALL support cheap, purely cosmetic per-avatar idle flourishes declared by the
manifest (for example screen static, glow pulsing, reel rotation, internal lightning),
driven by the existing frame loop with elapsed time and bounded to the avatar's declared
materials or nodes. Effects SHALL be emissive/material/transform-only for remote players
— they SHALL NOT add per-avatar scene lights beyond a declared budget of zero by default
— and SHALL be ignorable: disabling or dropping an effect changes nothing about presence,
movement, or interaction.

#### Scenario: Declared effect animates the avatar
- **WHEN** an avatar with a declared glow-pulse effect stands idle in view
- **THEN** its declared emissive material pulses gently without affecting any other
  avatar, the lighting rig, or gameplay systems

#### Scenario: Effects add no per-player scene lights
- **WHEN** multiple effect-declaring avatars share a room
- **THEN** the scene's light count does not grow per avatar

### Requirement: Avatar Asset Pipeline and Budgets
Authored avatar assets SHALL be produced as GLB files under the game's static avatar
asset directory, one directory per avatar id, loadable on demand, with committed
Blender-compatible source material and a written authoring guide covering the rig
contract, naming, orientation, scale, materials and export settings. Each avatar SHALL
stay within the performance budget: at most 8,000 triangles, at most 4 materials, at most
two 1024² textures, and a GLB file at most 3 MB (1.5 MB target). Assets exceeding budget
or violating the naming/orientation contract SHALL fail pipeline verification with a
named error before being registered as assignable.

#### Scenario: Budget enforcement
- **WHEN** pipeline verification inspects an avatar whose GLB exceeds the triangle,
  material, texture or file-size budget
- **THEN** verification reports a named failure for that avatar id and the avatar is not
  exposed as assignable until fixed

#### Scenario: On-demand loading
- **WHEN** a room contains players assigned to avatars A and B
- **THEN** only avatars A and B are fetched and cached; unassigned catalog entries are
  never speculatively downloaded

### Requirement: Adding a New Avatar Is Content Work
Adding a new avatar to the population SHALL require only: a manifest entry, an exported
GLB satisfying the contracts above in the avatar asset directory, and a re-run of
manifest validation and pipeline verification — with the server projection regenerated
and committed. No client or server code changes SHALL be required for a standard
shared-rig avatar with no novel effect.

#### Scenario: Content-only addition
- **WHEN** a developer adds a valid manifest entry and GLB and regenerates the projection
- **THEN** new players can be assigned the avatar, all clients that know the manifest
  render it, and no source file outside the manifest, assets and projection changed
