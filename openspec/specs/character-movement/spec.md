## Purpose

Gives the character vertical and momentum-based movement: jumping with Space and CS-style bunny hopping that rewards timed chaining with preserved — and modestly growing — horizontal speed, while the game's flat collision, level design, and grounded movement otherwise stay exactly as they are.

## Requirements

### Requirement: Jump input and vertical motion
Pressing Space while grounded SHALL launch the character into a jump: the avatar rises, then falls back to ground level under gravity, ending each jump at ground height. Horizontal movement (held keys or an active walk target) SHALL continue unchanged while airborne. The companion Kiln SHALL stay ground-bound and follow as it does today.

#### Scenario: Basic jump
- **WHEN** a grounded player presses Space
- **THEN** the avatar rises above ground height and lands back at ground height roughly half a second later, without any horizontal input required

#### Scenario: Jumping while moving
- **WHEN** a player jumps while walking, running, or click-to-walking toward a target
- **THEN** horizontal motion continues through the air along the same direction and the walk target survives the jump

#### Scenario: Companion unaffected
- **WHEN** the player jumps
- **THEN** Kiln remains on the ground and continues its normal follow behavior

### Requirement: Bunny hop chaining
Holding Space SHALL make the character jump again on the frame it lands, with no ground pause between hops, preserving the horizontal speed carried into each hop. The chain SHALL break — and momentum SHALL drop back to normal walk/run speed — when the player lands without Space held, stops moving, sits down, enters cinema view, travels, or the game pauses.

#### Scenario: Chained hops while holding Space
- **WHEN** a moving player holds Space across consecutive landings
- **THEN** each landing immediately launches the next hop with no visible ground pause

#### Scenario: Chain broken by releasing Space
- **WHEN** the player lands without Space held and then moves normally
- **THEN** movement speed is the normal walk or run speed again

#### Scenario: Chain broken by state change
- **WHEN** the player sits, travels to another district, opens a pausing dialog, or stops all movement
- **THEN** any accumulated hop momentum is discarded

### Requirement: Hop speed model
Each clean chained hop SHALL preserve the horizontal speed the character had mid-air and SHALL add a small speed bonus, so consecutive clean hops grow faster than run speed up to a fixed cap (target ≈1.5× run speed). Changing direction while airborne SHALL NOT bleed momentum (no air friction); grounded movement outside a chain SHALL NOT grant the bonus. Speed SHALL never exceed the cap.

#### Scenario: Speed grows with clean hops
- **WHEN** a player chains several hops without breaking the chain
- **THEN** each hop is at least as fast as the previous, up to the capped maximum

#### Scenario: Cap enforced
- **WHEN** the chain continues past the point where the cap is reached
- **THEN** hop speed stays at the cap and never exceeds it

#### Scenario: Air steering is free
- **WHEN** the player changes movement direction mid-air during a hop
- **THEN** the preserved momentum is not reduced for having steered

### Requirement: Collision invariant while airborne
Obstacles and world bounds SHALL block movement at all times, including mid-air: a jump SHALL NOT clear, hop onto, or pass through any obstacle, and world bounds SHALL clamp airborne movement exactly as grounded movement.

#### Scenario: Jumping at an obstacle
- **WHEN** a player jumps toward a crate, bench, seat row, or any other obstacle
- **THEN** horizontal progress into the obstacle is blocked mid-air exactly as it would be on the ground

#### Scenario: Jumping at the world edge
- **WHEN** a player jumps while moving into the walkable boundary
- **THEN** the character is clamped to the boundary and does not leave the walkable area

### Requirement: Jump and game states
Space while seated SHALL stand the player up (existing behavior) and SHALL NOT trigger a jump. Jump input SHALL be ignored while a pausing dialog is open or while typing in a text input. Traveling, sitting, or entering cinema view SHALL reset the jump state so the player is always grounded after a state transition.

#### Scenario: Space in a theater seat
- **WHEN** a seated player presses Space
- **THEN** the player stands up and does not jump

#### Scenario: Pause during a jump
- **WHEN** a jump is in progress and the player opens the settings or districts dialog
- **THEN** the world freezes as today and, on resume, the player is grounded with no active chain

### Requirement: Airborne state visible to other players
The local movement report SHALL include an additive airborne indicator so remote clients can render the player's hops. The server SHALL relay the indicator to the room without persisting it. Clients SHALL tolerate reports without the indicator (treat as grounded), so older clients and unaffected code paths keep working.

#### Scenario: Other players see a hop
- **WHEN** a player jumps in a room with other players present
- **THEN** the other clients render that player's avatar airborne during the jump

#### Scenario: Missing indicator tolerated
- **WHEN** a movement report arrives without the airborne indicator
- **THEN** the remote avatar is treated as grounded and no error occurs

### Requirement: Jump state is session-local
Jump phase, momentum, chain count, and speed bonuses SHALL NOT be saved to localStorage or to the server: reloading or rejoining always starts grounded with no chain, and existing save data is untouched.

#### Scenario: Reload resets jumping
- **WHEN** the player reloads the page mid-chain
- **THEN** the character spawns grounded with normal movement speed and no saved jump state exists
