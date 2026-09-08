## Purpose

Provides an accessible social-place selector with bounded, truthful public room occupancy and graceful unavailable-state handling.

## ADDED Requirements

### Requirement: Public occupancy is measured

Directory occupancy SHALL count unique live identities in the authoritative public room roster, including the requester when present. It SHALL NOT expose private garden counts, player identifiers, invented occupants or unverified global totals.

#### Scenario: Duplicate identity

- **WHEN** one identity replaces an older connection in a public room
- **THEN** its directory count remains one throughout supersession.

#### Scenario: No room owner

- **WHEN** a known public room has no process in the supported single-node topology
- **THEN** the directory reports zero without starting the room.

#### Scenario: Owner unreachable

- **WHEN** the authoritative owner cannot be read before the deadline
- **THEN** occupancy is unknown, never fabricated as zero or inferred by summing local registries.

### Requirement: Directory queries are bounded

Only signed sessions SHALL request directory summaries. Requests SHALL permit one in flight and no more than one per five seconds; responses SHALL contain at most 64 public entries and 16KiB, with a total read deadline of 500ms. Unavailable metadata SHALL NOT block travel.

#### Scenario: Spam request

- **WHEN** a session requests again within five seconds
- **THEN** the request is rejected without starting unbounded room work.

#### Scenario: Slow owner

- **WHEN** one room does not answer
- **THEN** the response contains unknown for that entry within the total deadline and other entries remain usable.

### Requirement: Freshness and safe presentation

The selector SHALL show data older than 30 seconds as unavailable and poll at most once per ten seconds only while open. Dynamic text SHALL be rendered as text, and absent activity/voice/friend information SHALL NOT be invented.

#### Scenario: Close while pending

- **WHEN** the selector closes before a response arrives
- **THEN** polling stops and the response cannot reopen or update a later dialog generation.

#### Scenario: Stale count

- **WHEN** the last count is over 30 seconds old after a disconnect
- **THEN** the card shows unavailable occupancy while retaining its travel action.

#### Scenario: Hostile title

- **WHEN** a returned activity title contains HTML markup
- **THEN** it displays as text and executes nothing.
