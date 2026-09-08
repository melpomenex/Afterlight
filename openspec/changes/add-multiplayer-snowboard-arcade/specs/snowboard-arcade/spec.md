## Purpose

Provide a seamless, original snowboarding cabinet experience within Afterlight while preserving its social world, existing games and communication.

## ADDED Requirements

### Requirement: Original cabinet using existing hardware
The game SHALL expose one Summit Run cabinet in the Orpheum using the existing canonical upright GLB and skin system, with original snow/mountain/Afterlight artwork. It SHALL provide E and equivalent accessible button entry, readable availability and safe participant anchors for up to eight riders without blocking existing routes or theater sightlines.

#### Scenario: Walk-up entry
- **WHEN** a nearby user presses E or the interaction button
- **THEN** cancellable loading and lobby admission begin within the current application without reload, route change, new window, iframe or new authentication.

#### Scenario: Model fallback
- **WHEN** the shared cabinet GLB cannot load
- **THEN** the existing primitive fallback remains interactive and the mountain can still load.

### Requirement: Shared application presentation
The race SHALL use the existing application renderer and frame loop. Its active view SHALL retain accepted social-room membership and cached social scene, suspend hidden visual work, and preserve communication and theater playback synchronization. Social avatars SHALL remain at the cabinet and identify accepted participants as playing; Kiln SHALL remain in the world. Race riders SHALL use existing nicknames and profile accents without duplicate social presence entities.

#### Scenario: Other people remain social
- **WHEN** two users race while a third stays beside the cabinet
- **THEN** the third sees their social avatars and canonical progress display, and can continue chat and theater use.

### Requirement: Cancellable lazy loading and resource ownership
Mountain-specific code and assets SHALL load on demand rather than inflate initial world loading. Entry SHALL remain cancellable and readiness SHALL require the server's course version/hash. Late async completion after exit, travel or disposal SHALL neither capture controls nor create a retained scene. Rematches SHALL reuse loaded resources.

#### Scenario: Travel during preparation
- **WHEN** a user travels while the mountain import is pending
- **THEN** the completion cannot capture the destination camera or controls, and any obsolete resources are released.

#### Scenario: Load failure
- **WHEN** required race assets fail
- **THEN** the user sees Retry and Exit, stays or returns in usable Afterlight controls, and cannot be counted ready.

### Requirement: Exclusive controls and safe exit
Desktop controls SHALL support carve, tuck, brake and charge-release jump. Chat/dialog focus and blur SHALL neutralize controls and cancel jump charge without pausing other racers. Escape SHALL follow existing focus priority and otherwise exit immediately locally. Exit, travel, error and disconnect SHALL release the activity view and restore safe world movement, camera preference, player visibility and theater overlay behavior without replaying stale input.

#### Scenario: Typing
- **WHEN** an active rider types WASD or Space in chat
- **THEN** neither the social avatar nor snowboard responds to those typing events.

#### Scenario: Exit from any view
- **WHEN** the user exits a race entered from any of the four world camera modes
- **THEN** the saved mode is restored and the avatar is safely dismounted near the cabinet.

### Requirement: Useful bounded presentation
Lobby SHALL display riders, readiness, waiting state and Exit. Race HUD SHALL display provisional position, elapsed time and checkpoint progress. Results SHALL display authoritative places, times or DNF, Rematch and Exit and honestly identify records as session-local. The physical cabinet SHALL show idle, waiting, live race progress and final outcome from server state. Full 3D spectator cameras SHALL NOT be required for v1.

#### Scenario: Race already active
- **WHEN** a visitor interacts during a race
- **THEN** watch-progress and queue-next-race choices are available with no mid-race playing slot.

### Requirement: Baseline performance and original assets
The complete race SHALL work on the current WebGL baseline without WebGPU. Reduced quality SHALL preserve course/gate/rider readability while reducing optional effects. Audio SHALL respect existing mute/volume and resource ownership. Production SHALL require no SSX branding, soundtrack or third-party asset without compatible rights and recorded provenance.

#### Scenario: Low capability browser
- **WHEN** WebGPU is absent or optional effects are disabled
- **THEN** all racing, checkpoints, lobby/results and exit behavior remain available.

#### Scenario: Existing communication
- **WHEN** a player enters and leaves while chat or an established call is active
- **THEN** the existing communication session and mute state continue without a second chat/voice system.
