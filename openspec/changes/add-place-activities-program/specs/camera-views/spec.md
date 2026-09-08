## MODIFIED Requirements

### Requirement: Four camera views on one control
The camera control (C key and the on-screen Camera button) SHALL cycle through four views: the three existing isometric modes followed by first person, wrapping back to the first. Cycling SHALL work from both the keyboard and the button during ordinary world play, and each press SHALL switch the view immediately. The three isometric views SHALL behave exactly as before this change. During activity camera ownership, C and the Camera button SHALL not change the stored world view; the HUD SHALL identify the temporary activity view. Leaving the activity SHALL restore the stored world camera mode, yaw, pitch and zoom, with its transform recomputed at the current safe avatar location.

#### Scenario: Cycle reaches first person and wraps
- **WHEN** the player presses C repeatedly from the first isometric view
- **THEN** the view passes through the second and third isometric views into first person, and a further press returns to the first isometric view

#### Scenario: Keyboard parity
- **WHEN** the player activates the Camera button with the mouse
- **THEN** the resulting view sequence is identical to pressing C

#### Scenario: Activity view restores world camera
- **WHEN** a player enters pool from first person and then leaves or travels
- **THEN** pool temporarily owns the camera and the original first-person choice resumes at the resulting world position without a delayed follow animation
