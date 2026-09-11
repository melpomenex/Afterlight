## MODIFIED Requirements

### Requirement: Drag to look, click to walk
In first person, the view SHALL follow mouse movement over the game view by default: with no button held, mouse movement changes yaw and vertical mouse movement changes pitch within the fixed system-defined limits, using the same sensitivity and direction as the existing drag. A Settings control SHALL let the player disable this mouse look; when disabled, pressing and dragging on the world SHALL turn the view exactly as before. In both modes, a press released with movement below a small system-defined threshold SHALL plant a walk target exactly as a click does today, a press that dragged SHALL NOT plant a walk target, and mouse-movement look without a held button SHALL NEVER plant a walk target. Touch input SHALL always use press-and-drag to look regardless of the setting, because hover does not exist on touch. This input split SHALL work for both mouse and touch. Other views keep plain click-to-walk with no look behavior change.

#### Scenario: Mouse movement turns the view by default
- **WHEN** mouse look is enabled (the default) and the player in first person moves the mouse across the game view without pressing any button
- **THEN** the view direction follows the mouse movement, and repeated extreme movement saturates the pitch at its limit instead of flipping the view upside down

#### Scenario: Look movement never walks
- **WHEN** the player in first person with mouse look enabled moves the mouse to look around, then presses and releases on the ground without meaningful movement
- **THEN** the looking moved only the view and created no walk target, and the subsequent press-release plants a walk target as in the isometric views

#### Scenario: Disabling mouse look restores drag look
- **WHEN** the player disables mouse look in Settings and then moves the mouse over the game view in first person
- **THEN** the view does not turn while no button is held, and pressing and dragging turns the view exactly as before the change, with a dragged press still never planting a walk target

#### Scenario: Drag turns without walking
- **WHEN** mouse look is disabled in Settings, the player presses on the world in first person and drags the pointer a noticeable distance before releasing
- **THEN** the view direction follows the drag and no walk target is created

#### Scenario: Tap or click still walks
- **WHEN** the player presses and releases on the ground in first person without meaningful movement, whether mouse look is enabled or disabled
- **THEN** a walk target is planted and the player walks there, as in the isometric views

#### Scenario: Pitch stays in bounds
- **WHEN** the player drags far up or down repeatedly, or moves the mouse vertically with mouse look enabled
- **THEN** the pitch saturates at its limit instead of flipping the view upside down

#### Scenario: Touch keeps drag look in both modes
- **WHEN** a touch press drags on the world in first person, whether mouse look is enabled or disabled
- **THEN** the view follows the drag and the release does not plant a walk target, while a plain tap still walks

### Requirement: Seated first person
When a player in first person sits in a seat, the camera SHALL move to seated eye height at the seat location, initially facing the seat's facing direction, and the active look input — mouse look when enabled, press-and-drag otherwise — SHALL still allow looking around from the chair. Standing up SHALL return the camera to standing first person at the player's position. Seated remote players SHALL appear as they do today regardless of the local camera.

#### Scenario: Watch from a chair in first person
- **WHEN** a player in first person interacts with a theater seat
- **THEN** the camera settles into the chair facing the screen, the player can still look around using the active look input, and standing up (movement keys or the stand interaction) restores standing first person

## ADDED Requirements

### Requirement: Mouse look setting
The settings dialog SHALL offer a mouse-look control for first-person look input, enabled by default. Changing it SHALL take effect immediately in first person — including while seated — without changing the current camera mode, view direction, or player position, and without affecting any multiplayer message or server state. The preference SHALL persist across reloads; when persistence is unavailable, the choice SHALL hold for the session and the game SHALL continue without a false saved claim.

#### Scenario: Fresh profile defaults to mouse look
- **WHEN** a player with no stored preferences enters first person and moves the mouse over the game view
- **THEN** the view follows the mouse with no button held

#### Scenario: Toggle applies immediately
- **WHEN** the player flips the mouse-look control in Settings while in first person
- **THEN** the look input mode changes at once, the view direction and position are untouched, and closing Settings resumes play in the chosen mode

#### Scenario: Preference survives reload
- **WHEN** the player disables mouse look, reloads the page, and enters first person
- **THEN** mouse look is still disabled and drag-to-look is the active look input
