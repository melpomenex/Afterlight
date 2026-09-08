## Purpose

Help people find opponents, watch games and return to shared activities through respectful invitations, truthful discovery and durable results.

## ADDED Requirements

### Requirement: Direct challenges
Visitors SHALL invite a named player to an available activity with an explicit accept/decline action, a 30-second expiry and target highlighting. Acceptance SHALL not teleport or auto-seat either person. Blocked senders SHALL not deliver invitations; recipients SHALL be able to mute invites. Each sender SHALL have one pending invite and at most three invites per minute.

#### Scenario: Decline
- **WHEN** a recipient declines a pool invitation
- **THEN** no participation or room state changes and the sender sees it declined.

#### Scenario: Stale invite
- **WHEN** a recipient accepts after the table becomes unavailable
- **THEN** the UI shows current availability and offers watch/queue without ejecting anyone.

### Requirement: Winner stays and queue fairness
Pool, air hockey and foosball SHALL support opt-in winner-stays configured before a series. A completed series winner SHALL retain a slot only if still present and willing; the next eligible queued player SHALL be offered the other slot. Ties, aborts and both-player departure SHALL not invent a winner; FIFO fills vacant slots. Queue position and next-player status SHALL be visible.

#### Scenario: Winner departs
- **WHEN** the winner leaves before the next match
- **THEN** both free slots are offered in queue order.

#### Scenario: No challenger
- **WHEN** a winner finishes with an empty queue
- **THEN** the table returns to waiting state and does not start an empty match.

### Requirement: Durable stats and honest rankings
Profiles SHALL show server-recorded games, wins, streaks and game-specific bests under rules-versioned categories. Rankings SHALL be paginated and capped at 100 entries per response, with stable tie ordering and no forged demo rows. Display names SHALL not identify authority; signed identities SHALL. Local guest continuity SHALL be labeled without promising cross-device recovery. No activity SHALL award XP, currency, daily obligations or paid advantage.

#### Scenario: Rename
- **WHEN** a player changes display name
- **THEN** their verified records stay attached to the same identity.

#### Scenario: Rule change
- **WHEN** a game changes scoring rules
- **THEN** old and new incompatible scores are not silently merged.

### Requirement: Tournament board
Phase six SHALL offer opt-in room-local pool tournaments for four or eight players with single-elimination brackets, ready/check-in, a 60-second no-show deadline, visible progression and cancellation. Played-match results SHALL advance only from verified matches; explicitly labeled walkovers SHALL advance the bracket without played-match statistical credit. A player SHALL not occupy a casual and tournament slot simultaneously. Server restart SHALL cancel unfinished tournaments visibly while preserving completed match records.

#### Scenario: Bracket advancement
- **WHEN** a semifinal completes and the same result is retried
- **THEN** the winner advances once to the correct next match.

#### Scenario: No show
- **WHEN** one scheduled player misses the deadline
- **THEN** the other checked-in player advances by labeled walkover; with neither present the pairing is canceled without fictional match wins.

### Requirement: Truthful activity discovery
Places and nearby activity UI SHALL show game type, playing count, focused spectator count, queue size and availability from bounded public-room summaries. Counts SHALL not be added as if all categories are disjoint. Unknown, disconnected or older-than-ten-second data SHALL appear unavailable, not zero. Private gardens SHALL not be enumerated. Summary requests SHALL follow the existing place-directory rate/bounds policy.

#### Scenario: Discovery
- **WHEN** a visitor opens Places while a pool match has two players and three focused spectators
- **THEN** the table summary shows those counts and highlights its destination without automatic travel.

#### Scenario: Stale summary
- **WHEN** no fresh summary arrives for more than ten seconds
- **THEN** availability becomes unknown and no false empty-table promise is displayed.
