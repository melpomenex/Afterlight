## Purpose

The hosted Kart Royale lifecycle: one renderer and frame loop owned by the
social world, the game borrowing presentation through the activity view lease,
isolated input, lifecycle-owned HUD and audio, deterministic exit, clean
restoration, and honest failure behavior — so the race feels like the real game
inside a cabinet, never a second application pasted over the world.

## ADDED Requirements

### Requirement: Host-owned rendering

While Kart Royale is active, the game SHALL render through the host
application's single WebGL renderer and single frame loop. The game SHALL NOT
create its own WebGL context, canvas, or requestAnimationFrame loop. The game's
scene, camera and post-processing chain SHALL be presented through the activity
view lease, and any renderer settings the game changes SHALL be restored on
release so Theater rendering is indistinguishable from before entry.

#### Scenario: One renderer, one loop

- **WHEN** Kart Royale is racing
- **THEN** exactly one WebGL canvas and one frame loop exist in the page
- **AND** the game's post-processing chain (including its bloom, motion blur,
  ambient occlusion and grade passes) renders through the host renderer.

#### Scenario: Renderer state restored

- **WHEN** the player exits Kart Royale
- **THEN** tone mapping, exposure, output color space, shadow configuration,
  pixel ratio and drawing-buffer size are restored to the Theater's values
- **AND** the Theater renders identically to before entry.

### Requirement: Input ownership

While Kart Royale holds the game view, gameplay keys (steer, accelerate,
brake, drift, item, look back) SHALL drive the kart only. Theater locomotion,
click-to-walk, camera toggles, zoom, and cabinet re-interaction SHALL NOT fire.
The E key SHALL act as the game's item action while racing instead of exiting.
Held keys SHALL be neutralized on every transition (enter, pause, blur, exit),
and no keyboard, pointer, gamepad, touch or gesture listeners installed by the
game SHALL remain after exit.

#### Scenario: World does not move during the race

- **WHEN** the player holds movement keys while racing
- **THEN** the social avatar does not move and no world movement is broadcast
- **AND** releasing and re-entering the Theater restores normal locomotion.

#### Scenario: Key conflicts are resolved in the game's favor

- **WHEN** the player presses E, Space, arrows, or Escape during a race
- **THEN** the game receives them as item/fire/pause actions per its control
  map, except that Escape opens the game's pause menu
- **AND** none of them trigger Theater interactions, dialogs, or camera modes.

### Requirement: Deterministic exit

The player SHALL always have a deterministic path back to the Theater: the
pause menu SHALL offer a leave-the-cabinet action, the results screen SHALL
offer a return-to-arcade action, and travel, disconnect, ejection, or activity
shutdown SHALL exit the race automatically. Exiting SHALL release every leased
resource and place the player at the cabinet's dismount point.

#### Scenario: Exit through the pause menu

- **WHEN** the player opens the pause menu and chooses to leave the cabinet
- **THEN** the game releases the view, HUD, audio voices and input listeners
- **AND** the player stands next to the Kart Royale cabinet with Theater HUD,
  camera and controls restored.

#### Scenario: Travel while racing

- **WHEN** the player changes place while a race is active
- **THEN** the race exits cleanly without leaking the view lease or listeners,
  and the destination place presents normally.

### Requirement: Restart and reentry

The game SHALL support restarting a race (rematch) without leaving the cabinet,
and repeated enter → race → exit cycles SHALL each produce a fully working
session. Repeated sessions SHALL NOT accumulate duplicate DOM nodes, listeners,
frame loops, audio nodes, input state, or unbounded GPU or heap resources; a
warm cache may retain the game world for quick re-entry but MUST dispose it
after its idle window.

#### Scenario: Rematch

- **WHEN** the player finishes a race and chooses to race again
- **THEN** a new countdown starts with reset progress, items and effects
- **AND** the session remains admitted without a reload.

#### Scenario: Repeated sessions stay clean

- **WHEN** the player enters and exits Kart Royale many times in one page session
- **THEN** each session is playable
- **AND** listener, DOM node, audio node and RAF counts return to their
  pre-entry baseline after each exit.

### Requirement: Audio lifecycle

Game audio SHALL start only after the player's activation gesture. When the
host audio mixer is available, the game's master output SHALL route through it
so the host's global sound controls apply; otherwise the game may own a private
audio context. Exiting or disposing the session SHALL stop all game voices and
disconnect its output, and SHALL never close an injected host audio context or
permanently change the player's global audio settings.

#### Scenario: Audio starts on activation

- **WHEN** the player enters the cabinet and the race begins
- **THEN** race audio plays following the entry gesture, without autoplay
  policy failures.

#### Scenario: Audio restores on exit

- **WHEN** the player exits to the Theater
- **THEN** game audio stops and the world's ambient audio state is unchanged
- **AND** repeated sessions do not multiply audio nodes.

### Requirement: HUD ownership

The game's HUD and menus SHALL mount into a lifecycle-owned DOM root above the
game view while racing, SHALL hide the Theater's world HUD for the session, and
SHALL be removed completely on exit with no duplicate element identifiers or
stale styling after multiple entries.

#### Scenario: HUD during the race

- **WHEN** a race is active
- **THEN** the game HUD and menus are visible above the game view
- **AND** Theater interaction prompts and world HUD panels do not interfere.

#### Scenario: Clean teardown

- **WHEN** the session exits
- **THEN** the game HUD root and touch controls are removed and the Theater
  HUD reappears unchanged.

### Requirement: Racing quality preservation

The hosted game SHALL preserve Kart Royale's standalone racing experience:
kart physics and drift mechanics, the 8-kart AI field, items, course, camera
behavior, HUD, quality tiers with device-appropriate defaults, dynamic
resolution scaling, and the post-processing chain. Controls SHALL feel
equivalent to the standalone game except for documented host-specific key
mappings.

#### Scenario: Same race, different host

- **WHEN** the same device plays a race hosted in the cabinet and standalone
- **THEN** physics, AI, items, camera behavior and visual quality tiers match
  the standalone game.

### Requirement: Failure and cancellation behavior

Dynamic import failure, game initialization exceptions, stale asynchronous
initialization completing after the player left or canceled, place travel
during load or race, disconnection, session ejection, and WebGL context loss
SHALL each return the player to a functional Theater with a bounded, honest
message — the game SHALL never trap the player, seize a stale view, or leave
partial state behind.

#### Scenario: Stale load cannot seize the view

- **WHEN** a canceled or superseded load attempt completes after the player
  left the cabinet or the place
- **THEN** its result is discarded without acquiring presentation, input, or
  audio ownership.

#### Scenario: Context loss

- **WHEN** the WebGL context is lost while racing
- **THEN** the session exits with a bounded message advising a reload if the
  world appears broken, and no error loops or dead overlays remain.
