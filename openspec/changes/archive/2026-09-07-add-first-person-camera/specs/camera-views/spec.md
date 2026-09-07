## Purpose

The camera system lets a player choose how they see the city: three fixed isometric angles and a ground-level first-person view, all reachable from a single camera control. This capability covers the view cycle, first-person presentation and movement, drag-to-look input, seated first person, and how the view coexists with travel, dialogs, and the theater screen.

## ADDED Requirements

### Requirement: Four camera views on one control
The camera control (C key and the on-screen Camera button) SHALL cycle through four views: the three existing isometric modes followed by first person, wrapping back to the first. Cycling SHALL work from both the keyboard and the button at any time during play, and each press SHALL switch the view immediately. The three isometric views SHALL behave exactly as before this change.

#### Scenario: Cycle reaches first person and wraps
- **WHEN** the player presses C repeatedly from the first isometric view
- **THEN** the view passes through the second and third isometric views into first person, and a further press returns to the first isometric view

#### Scenario: Keyboard parity
- **WHEN** the player activates the Camera button with the mouse
- **THEN** the resulting view sequence is identical to pressing C

### Requirement: First-person presentation
In first person, the game SHALL render from a perspective camera positioned at the player's eye height at the player's location, oriented by the player's look direction. The player's own avatar SHALL be hidden while in first person and restored when leaving it; Kiln, remote players, collectibles, lighting, fog, and post-processing SHALL remain visible and unchanged. The HUD, minimap, and interaction controls SHALL remain usable in first person.

#### Scenario: Walk in first person with Kiln
- **WHEN** the player switches to first person and walks toward a landmark
- **THEN** the world renders from ground level, the player's own avatar is not visible, Kiln still follows, and the HUD/minimap keep tracking the player

#### Scenario: Leaving first person restores the avatar
- **WHEN** the player cycles back to any isometric view
- **THEN** the player's avatar is visible again at the player's current position

### Requirement: Drag to look, click to walk
In first person, pressing and dragging on the world SHALL turn the view: horizontal drag changes yaw and vertical drag changes pitch within fixed system-defined limits. A press released with movement below a small system-defined threshold SHALL plant a walk target exactly as a click does today, and a press that dragged SHALL NOT plant a walk target. This input split SHALL work for both mouse and touch. Other views keep plain click-to-walk with no look-drag behavior change.

#### Scenario: Drag turns without walking
- **WHEN** the player presses on the world in first person and drags the pointer a noticeable distance before releasing
- **THEN** the view direction follows the drag and no walk target is created

#### Scenario: Tap or click still walks
- **WHEN** the player presses and releases on the ground in first person without meaningful movement
- **THEN** a walk target is planted and the player walks there, as in the isometric views

#### Scenario: Pitch stays in bounds
- **WHEN** the player drags far up or down repeatedly
- **THEN** the pitch saturates at its limit instead of flipping the view upside down

### Requirement: View-relative movement in first person
In first person, WASD and arrow keys SHALL move relative to the current view heading: W/Up moves toward where the player looks, S/Down away, A/D strafe. Running with Shift, click-to-walk targets, collision, and world bounds SHALL behave as they do in the other views. In the isometric views, movement SHALL remain relative to the selected camera angle as before.

#### Scenario: Forward follows the view
- **WHEN** the player in first person turns the view 180 degrees and holds W
- **THEN** the player walks in the newly faced direction, and holding A strafes to that view's left

### Requirement: Seated first person
When a player in first person sits in a seat, the camera SHALL move to seated eye height at the seat location, initially facing the seat's facing direction, and drag-to-look SHALL still allow looking around from the chair. Standing up SHALL return the camera to standing first person at the player's position. Seated remote players SHALL appear as they do today regardless of the local camera.

#### Scenario: Watch from a chair in first person
- **WHEN** a player in first person interacts with a theater seat
- **THEN** the camera settles into the chair facing the screen, the player can still look around by dragging, and standing up (movement keys or the stand interaction) restores standing first person

### Requirement: First person coexists with existing systems
The camera choice SHALL be a local, per-client presentation setting: it SHALL NOT change any multiplayer message, server state, or other players' views. First person SHALL work in every district and SHALL persist across district travel (the view stays first person at the new entrance). Interactions (E and the on-screen button), dialogs, chat input, pause/settings, and the anchored theater screen overlay SHALL keep working in first person; the theater screen SHALL remain correctly anchored to the in-world screen when viewed in first person.

#### Scenario: Travel keeps the view
- **WHEN** the player travels to another district while in first person
- **THEN** the destination renders in first person from the new entrance, with correct collision, interactions, and HUD

#### Scenario: Theater screen stays anchored
- **WHEN** a player in first person looks at the Orpheum screen while media plays
- **THEN** the screen overlay stays aligned with the in-world screen while playing, and all theater controls remain reachable

#### Scenario: Local-only choice
- **WHEN** one of two players in the same room switches to first person
- **THEN** the other player's view and the shared room state are unaffected
