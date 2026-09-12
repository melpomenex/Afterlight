## Purpose

Allow a player to keep watching the theater's current media while playing a mini-game, using one continuous playback session and local floating controls that preserve gameplay and room authority.

## ADDED Requirements

### Requirement: Automatic shared activity presentation
For an eligible play entry with a current media item in the active theater room, the client SHALL display the existing stream in a floating presentation before asynchronous game loading or admission begins. The shared behavior SHALL apply to Pool, air hockey, foosball, classic cabinets, Kart Royale, Summit Run, Downhill Mayhem and future playable activities by default, with explicit local activity opt-out. Current paused, loading and recoverable-error items SHALL retain their existing state in the floating presentation. No current item SHALL produce no empty floating player.

#### Scenario: Enter and load a game (AC1, AC7, AC13)
- **WHEN** a player enters Pool or a cold-loading Kart cabinet while media is playing
- **THEN** the stream floats as the transition starts and remains available through loading and gameplay

#### Scenario: No media (AC2)
- **WHEN** a player enters with no current media item
- **THEN** no empty player or restore chip appears, and media that subsequently becomes current is presented automatically

#### Scenario: Queue and promotion
- **WHEN** a play request is queued or becomes spectating
- **THEN** the provisional floating presentation restores primary mode; later promotion to play starts a new muted entry

### Requirement: Presentation preserves one playback session
Enter, leave, move, hide, restore, enlarge and reduce actions SHALL NOT create a second media pipeline, recreate or reconnect the existing source, reinsert its frame, change source identity, restart playback or trigger a seek. Existing synchronization and legitimate source changes SHALL continue independently of presentation. Same-room game changes SHALL reuse playback. Leaving the theater SHALL retain existing room-bound teardown and authorization behavior.

#### Scenario: Continuous transition (AC5, AC6)
- **WHEN** playing media transitions from primary to floating and back
- **THEN** its player and surface identities remain unchanged, playing time continues forward, and no presentation-triggered load or reconnect occurs

#### Scenario: Direct game replacement
- **WHEN** an active game is replaced by another eligible game in the same room
- **THEN** media remains continuous and the new game receives a fresh entry mute policy without duplicating the session

#### Scenario: Leave room
- **WHEN** the player travels out of the theater
- **THEN** floating presentation ends and existing room-bound media/grant teardown still occurs

### Requirement: Entry mute and explicit local audio restoration
For programmatically controllable providers, every distinct game entry SHALL start muted regardless of prior audibility. Duplicate lifecycle events for that entry SHALL NOT remute a user who explicitly unmuted. One obvious action SHALL unmute, with a truthful combined label when enabling the master Sound gate or restoring a zero volume is necessary. On final exit, automatic entry mute SHALL be removed, unchanged prior media preferences SHALL be restored, and explicit user mute/volume changes made during play SHALL take precedence. Master Sound changes and live audio ducking SHALL NOT be reverted by exit.

#### Scenario: Audible source enters game (AC3, AC4)
- **WHEN** an audible controllable stream enters a game
- **THEN** it becomes locally muted before the game starts loading and one labeled action can unmute it

#### Scenario: Exit without audio edits (AC12)
- **WHEN** a player enters with audible media and exits without editing audio
- **THEN** the earlier media preference returns under the current master gate and mix gain

#### Scenario: Explicit edit wins
- **WHEN** a player explicitly unmutes then mutes in PiP and leaves
- **THEN** the stream remains user-muted; entering the next game still applies a fresh automatic mute

#### Scenario: Master sound off or volume zero
- **WHEN** unmute requires enabling app Sound or restoring nonzero media volume
- **THEN** the labeled user action performs that change explicitly and never claims audibility while an audio gate still prevents it

### Requirement: Provider limitations are honest
A source without reliable programmatic audio control SHALL keep the same playback session and allow gameplay, but SHALL show a persistent automatic-mute-unavailable notice and native player audio controls instead of claiming Afterlight muted it. Such providers are explicit exceptions to automatic mute, one-action application unmute and exact audio restoration; full compliance SHALL only be claimed for controllable providers. An unsupported control SHALL NOT cause a reload or a room-wide playback action.

#### Scenario: Clip or degraded embed enters
- **WHEN** the active provider cannot apply local mute reliably
- **THEN** the existing player floats with the audio limitation visible and native controls usable, with no invented mute state or reload

#### Scenario: SDK becomes ready
- **WHEN** a controllable provider finishes initialization during game loading
- **THEN** the current activity mute policy is applied before playback starts and late acknowledgements for an old source are ignored

### Requirement: Hide and enlarge are presentation controls
The player SHALL provide labeled mute/unmute (where supported), hide and enlarge/reduce controls. Hiding SHALL retain playback and audio policy and expose a compact restore control while a current item exists. Enlarging SHALL preserve the game session and stream; reducing SHALL restore compact placement. Neither operation SHALL imply pause, stop, leaving the stream or leaving the game.

#### Scenario: Hide and restore (AC15)
- **WHEN** a player hides then restores floating media
- **THEN** the same session continues at its current timeline with the same audio choice and position

#### Scenario: Enlarge during play
- **WHEN** a player enlarges then reduces the stream
- **THEN** the game membership and media session remain unchanged and the prior compact position returns

### Requirement: Dragging and responsive bounds
Floating media SHALL support mouse and touch dragging through a dedicated handle, keyboard repositioning and position reset. The player SHALL remain within the available visual viewport with safe margins after drag, resize, orientation and virtual-keyboard changes. Placement SHALL consider bounded host/game HUD reservations, prefer bottom-right when safe, preserve aspect ratio and maintain usable controls. Provider minimum visible sizes SHALL be respected; if they cannot fit, the session SHALL remain alive with a restore affordance and an explanation.

#### Scenario: Drag outside viewport (AC9)
- **WHEN** the drag pointer moves beyond a viewport edge or is cancelled
- **THEN** the player remains fully retrievable inside the viewport and gameplay receives no stuck pointer action

#### Scenario: Narrow viewport and HUD collision (AC10)
- **WHEN** the viewport narrows or bottom-right contains essential game controls
- **THEN** the player fits a safe alternative position/size or exposes a compact restore affordance without hiding essential controls

#### Scenario: Provider minimum cannot fit
- **WHEN** the viewport cannot fit the provider's minimum displayed dimensions
- **THEN** the app explains the size limitation and retains playback without scaling a provider frame below its minimum

### Requirement: Input and accessibility isolation
Only floating controls/media bounds SHALL accept overlay pointer events. Gameplay pointer, keyboard and controller input outside the media UI SHALL remain available. Focusing or dragging media UI SHALL neutralize held game actions; media UI key events SHALL not fire game commands, including capture-phase commands. Controls SHALL have accessible names, visible focus, keyboard operation and at least 44 CSS-pixel touch targets. Existing modal and gameplay Escape behavior SHALL remain in force outside focused media chrome.

#### Scenario: Gameplay and PiP interaction (AC8)
- **WHEN** the user steers or charges a shot, focuses media controls, operates a button with Space, then returns to the canvas
- **THEN** held game input is neutralized, Space does not shoot/leave, and gameplay resumes without stuck actions

#### Scenario: Pointer lock
- **WHEN** a game holds pointer lock and floating state changes automatically
- **THEN** lock is not released or reacquired by the floating system; the normal unlock gesture allows access to media controls without also leaving the game

#### Scenario: Keyboard and touch controls
- **WHEN** a user navigates controls by Tab or drags the handle by touch
- **THEN** labels/focus remain usable and no unrelated gameplay input or page gesture is captured

### Requirement: Fullscreen and layering preserve access
Floating media SHALL appear above game rendering, HUD and nonblocking game loading, with menus and modal dialogs above it. Supported application fullscreen SHALL include the entire application root, including media and controls. A rejected fullscreen request SHALL preserve functional in-window gameplay. Canvas-only and provider-native fullscreen SHALL NOT be represented as supporting simultaneous app overlays.

#### Scenario: Application fullscreen (AC16)
- **WHEN** application-root fullscreen is entered or exited during gameplay
- **THEN** the same stream and controls remain accessible, bounded and above gameplay without reparenting

#### Scenario: Game menu and loading
- **WHEN** game loading is visible or a game menu/native dialog opens
- **THEN** media remains above nonblocking loading but essential menu/dialog controls appear above media

### Requirement: Exit and failure cleanup are generation safe
Cancellation, failed loading/admission, leave, ejection, deactivation and disposal SHALL release floating ownership once, restore appropriate current primary presentation and apply audio restoration. Stale completion from an older game SHALL NOT revive or terminate a newer floating session. Restoration SHALL not recreate a seat or force cinema view over ongoing gameplay.

#### Scenario: Exit restoration (AC11)
- **WHEN** the player leaves a mini-game
- **THEN** the stream returns to the current primary theater presentation without restarting or restoring a stale seating pose

#### Scenario: Cancel followed by another game
- **WHEN** a lazy game is cancelled, another game begins, and the first load finishes late
- **THEN** only the new game's presentation remains active and the old completion has no media effect

### Requirement: Source evolution and recovery remain shared
Floating presentation SHALL follow authoritative source replacements, preserve local presentation state across reconnects, and use existing local error/autoplay recovery. An empty authoritative bill SHALL remove the player and restore chip. Natural end reporting SHALL remain once per item; offline or blocked autoplay SHALL not be mistaken for room-wide source failure.

#### Scenario: End or next item (AC14)
- **WHEN** a current item ends and the bill advances
- **THEN** the floating surface follows the next item or disappears cleanly for an empty bill

#### Scenario: Source changes while hidden
- **WHEN** another occupant changes the source while this player's PiP is hidden
- **THEN** the one playback owner loads the replacement normally and restoring PiP shows it with retained position and local audio policy

#### Scenario: Network trouble or autoplay block
- **WHEN** playback needs recovery during a game
- **THEN** the existing local recovery/error affordance appears in the floating surface, game input remains usable, and presentation state survives any source-authorized retry

### Requirement: Locality and bounded overhead
Floating mute, visibility, size, position and activity presentation state SHALL remain local and SHALL NOT mutate the shared media timeline or add multiplayer synchronization. The feature SHALL use one active playback pipeline per stream, no new renderer or animation loop, bounded UI listeners/state, and no material frame-time regression under the design's matched benchmark gate.

#### Scenario: Two occupants (AC17)
- **WHEN** one occupant mutes, moves, hides or enlarges PiP
- **THEN** another occupant's media and UI are unchanged and no shared media action is sent

#### Scenario: Repeated entry performance (AC18)
- **WHEN** 20 enter/exit cycles and matched representative gameplay benchmarks are run
- **THEN** media/renderer/animation-loop counts do not grow, detached nodes/listeners remain bounded, and the documented frame-time gate passes
