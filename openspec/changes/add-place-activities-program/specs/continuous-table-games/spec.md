## Purpose

Make air hockey and foosball responsive shared physical games while keeping scoring and movement limits authoritative.

## ADDED Requirements

### Requirement: Air hockey rules
Air hockey SHALL constrain each mallet to its half, resolve puck/rail/mallet contacts and goal mouths, reset after a goal and finish first-to-seven. Players SHALL select a single game or best-of-three/five/seven before readiness; rules SHALL not change mid-series. Keyboard, pointer/touch and controller input SHALL be available.

#### Scenario: Goal
- **WHEN** the puck crosses the goal boundary
- **THEN** the server awards one point, resets play and ends the game at seven.

#### Scenario: Teleport attempt
- **WHEN** a player requests a mallet position outside its half or speed limit
- **THEN** the server clamps/rejects it without moving through the puck unfairly.

### Requirement: Foosball rules and control
Foosball SHALL support two players, bounded rod translation/rotation, ball goals, serve reset and first-to-five scoring. Casual mode SHALL choose a relevant rod; advanced mode SHALL allow explicit rod selection. Keyboard W/S translates, A/D selects, Space kicks; equivalent touch/controller controls SHALL be provided.

#### Scenario: Rod control
- **WHEN** an advanced-mode player selects and kicks a rod
- **THEN** only the permitted rod moves, with bounded angular speed and no unrestricted spinning.

#### Scenario: Casual mode
- **WHEN** the ball changes zone
- **THEN** the selected relevant rod is indicated visibly and the player can continue without managing four rods at once.

### Requirement: Latency behavior
Local mallet/rod control SHALL respond by the next rendered frame and reconcile to authority; remote motion SHALL interpolate bounded snapshots. At 150 ms RTT, 30 ms jitter and 2 percent application-level dropped snapshots, a ten-minute test SHALL have identical final scores for players/spectators, no repeated goals and no persistent divergence more than 500 ms after a fresh authoritative snapshot. At disconnection inputs SHALL neutralize and recovery policy SHALL apply.

#### Scenario: Impaired network
- **WHEN** players complete a match under the specified network profile
- **THEN** scores converge, motion recovers within the bound and result attribution is identical.
