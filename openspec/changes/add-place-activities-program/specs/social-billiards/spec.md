## Purpose

Offer a complete shared 8-ball game with readable rules, controllable spin and visibly credible table physics in the Orpheum.

## ADDED Requirements

### Requirement: Explicit casual eight-ball rules
Pool SHALL implement two-player 8-ball with a published in-game house-rules sheet: legal break requires a pocket or four object balls touching rails; illegal break grants opponent rerack/break; eight on break is spotted (including when accompanied by scratch); scratch gives opponent ball in hand; the table stays open after the break and either non-eight group can be hit first while open; groups assign from the first legally pocketed post-break ball (server collision order, ball number breaks same-tick ties); legal shots after assignment hit the own group first and then pocket or touch a rail; cleared group allows called-pocket eight; after the break, early eight, wrong-pocket eight or scratch on eight loses. Legal own-group pockets retain turn; other legal shots switch turn. Rules SHALL be frozen per match.

#### Scenario: Foul
- **WHEN** a shooter misses all balls or scratches
- **THEN** both clients show the foul, switch turn and allow legal ball-in-hand placement.

#### Scenario: Win and loss
- **WHEN** a player pots the eight in the called pocket after clearing their group without a foul
- **THEN** all clients declare that player winner once.

#### Scenario: Early eight
- **WHEN** a player pockets the eight before clearing their group
- **THEN** that player loses and a single result is emitted.

### Requirement: Aim spin and credible motion
Players SHALL aim, set bounded power and two-axis cue spin, preview the cue direction, cancel before shooting and place ball in hand without overlap. Shots SHALL only be accepted from the current player while balls are settled. Rolling/sliding transitions, ball collisions, rail response and pockets SHALL conserve plausible motion with no tunneling at maximum power. Backspin, topspin and side spin SHALL visibly affect controlled reference shots.

#### Scenario: Spin reference
- **WHEN** equal-power centered and backspin shots hit the same object-ball setup
- **THEN** the reference suite shows distinct expected cue-ball paths within documented tolerances.

#### Scenario: Simultaneous shots
- **WHEN** two shot commands arrive before the first settles
- **THEN** only the valid current-turn shot starts.

### Requirement: Accessible physical table
The table SHALL have readable balls/pockets, cloth, wood rails, cue, contact shadows and synchronized shot poses/audio. Mouse/keyboard, touch and controller SHALL each support complete aim, power, spin, shoot, ball-in-hand and exit actions. Standing, cue and follow views SHALL preserve spectator visibility; reduced-motion mode SHALL avoid forced follow motion.

#### Scenario: Input parity
- **WHEN** a tester completes a match using each supported input family
- **THEN** no required action needs a different input device.

#### Scenario: Witness
- **WHEN** a third visitor watches a shot
- **THEN** cue motion, ball movement and result agree with the players, without duplicate collision audio.
