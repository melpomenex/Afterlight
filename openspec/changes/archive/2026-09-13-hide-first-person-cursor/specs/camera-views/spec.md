## MODIFIED Requirements

### Requirement: First-person presentation
In first person, the game SHALL render from a perspective camera positioned at the player's eye height at the player's location, oriented by the player's look direction. The player's own avatar SHALL be hidden while in first person and restored when leaving it; Kiln, remote players, collectibles, lighting, fog, and post-processing SHALL remain visible and unchanged. While in first person, the mouse cursor SHALL be hidden on the game canvas, and the default visible cursor SHALL be restored upon exiting first person. The HUD, minimap, and interaction controls SHALL remain usable in first person.

#### Scenario: Walk in first person with Kiln
- **WHEN** the player switches to first person and walks toward a landmark
- **THEN** the world renders from ground level, the player's own avatar is not visible, Kiln still follows, and the HUD/minimap keep tracking the player

#### Scenario: Leaving first person restores the avatar
- **WHEN** the player cycles back to any isometric view
- **THEN** the player's avatar is visible again at the player's current position and the normal cursor is restored

#### Scenario: Cursor is hidden in first person
- **WHEN** the player enters first-person view
- **THEN** the mouse cursor is hidden on the canvas and does not display the default pointer or grab hand

### Requirement: Drag to look, click to walk
In first person, the game SHALL lock the pointer to the game canvas and turn the view following relative mouse movement by default: with no button held, mouse movement changes yaw and vertical mouse movement changes pitch within fixed system-defined limits using continuous relative deltas (`movementX`, `movementY`), allowing the player to look around freely without the pointer escaping the screen edges. A Settings control SHALL let the player disable this mouse look; when disabled, pressing and dragging on the world SHALL turn the view. In both modes, a press released with movement below a small system-defined threshold SHALL plant a walk target, a press that dragged SHALL NOT plant a walk target, and mouse-movement look without a held button SHALL NEVER plant a walk target. Touch input SHALL always use press-and-drag to look regardless of the setting, without requesting pointer lock. Other views keep plain click-to-walk with no look behavior change.

#### Scenario: Drag turns without walking
- **WHEN** mouse look is disabled and the player presses on the world in first person and drags the pointer a noticeable distance before releasing
- **THEN** the view direction follows the drag and no walk target is created

#### Scenario: Tap or click still walks
- **WHEN** the player presses and releases on the ground in first person without meaningful movement
- **THEN** a walk target is planted and the player walks there, as in the isometric views

#### Scenario: Pitch stays in bounds
- **WHEN** the player drags far up or down repeatedly, or moves the mouse vertically with mouse look enabled
- **THEN** the pitch saturates at its limit instead of flipping the view upside down

#### Scenario: Continuous look without cursor escaping
- **WHEN** the player is in first-person mode with mouse look enabled and moves the mouse continuously in any direction
- **THEN** the camera view rotates continuously following mouse deltas without the cursor moving off the screen or hitting viewport boundaries

#### Scenario: Pointer lock released on Escape or menu
- **WHEN** the pointer is locked in first person and the player presses Escape or opens a dialog (Settings, Places modal, Chat)
- **THEN** the pointer lock is released and the visible cursor is restored for UI navigation

#### Scenario: Canvas click re-locks pointer
- **WHEN** pointer lock was released while remaining in first person and the player clicks back on the world canvas
- **THEN** pointer lock is re-requested on the canvas and the cursor is hidden again

#### Scenario: Look movement never walks
- **WHEN** the player in first person with mouse look enabled moves the mouse to look around, then presses and releases on the ground without meaningful movement
- **THEN** the looking moved only the view and created no walk target, and the subsequent press-release plants a walk target as in the isometric views

#### Scenario: Touch keeps drag look without pointer lock
- **WHEN** a touch press drags on the world in first person, whether mouse look is enabled or disabled
- **THEN** the view follows the drag, pointer lock is not requested, and release does not plant a walk target
