# theater-state-delivery

## ADDED Requirements

### Requirement: Channel flip commits HLS state

The Phoenix theater gateway SHALL accept `theater_channel` with a valid `https://…/*.m3u8` URL, classify it as `kind: "hls"`, and commit it as the live `now` item.

#### Scenario: IPTV channel tune commits HLS

- **GIVEN** a connected browser in The Orpheum on the Phoenix theater owner
- **AND** a valid `https://example.test/live/channel.m3u8` URL
- **WHEN** the client sends `theater_channel` with that URL and a title
- **THEN** the server commits `now.kind == "hls"` and `now.url` equals the input URL

### Requirement: Initiator receives authoritative state on command path

After a successful theater mutation, the initiating client SHALL receive `theater_state` containing the committed bill and `serverNow` without waiting for the outbox relay tick alone.

#### Scenario: HLS tune delivers state to requester

- **GIVEN** a joined theater client
- **WHEN** the client pushes `theater_channel` with a valid `.m3u8` URL
- **THEN** the client receives `theater_state` with `now.kind == "hls"`
- **AND** `TheaterScreenUI.applyState` can select the HLS engine
- **AND** `hls.loadSource()` is invoked with the resolved `.m3u8` URL

### Requirement: Second client synchronization

When one occupant tunes an IPTV HLS channel, every other occupant in The Orpheum SHALL receive the same authoritative `theater_state` referencing the same item id and revision without creating a duplicate queue entry.

#### Scenario: Two clients share one HLS tune

- **GIVEN** clients A and B joined to the theater room
- **WHEN** A sends `theater_channel` for channel X
- **THEN** A and B each receive `theater_state` where `now.url` is X
- **AND** both reference the same `now.id`
- **AND** the queue length is unchanged aside from the live swap

### Requirement: Reconnect join snapshot

A client that disconnects and rejoins The Orpheum SHALL receive the latest committed bill in the join `theater_state` snapshot.

#### Scenario: Rejoin restores active HLS channel

- **GIVEN** channel X is the committed live item
- **WHEN** a client reconnects and joins the theater
- **THEN** the join snapshot contains `now` for channel X with `kind: "hls"`

### Requirement: Duplicate state idempotency

Duplicate `theater_state` deliveries for the same unchanged live item SHALL NOT restart the HLS engine unnecessarily.

#### Scenario: Immediate reply plus relay broadcast

- **GIVEN** the HLS engine loaded item id `itm_1`
- **WHEN** an identical `theater_state` arrives again
- **THEN** `hls.loadSource` is not called a second time for the same play key

### Requirement: Outbox relay semantics

Theater outbox rows SHALL be marked published only after a successful broadcast attempt to an existing room process. When no room process is registered, the row SHALL remain unpublished for retry.

#### Scenario: Absent room defers publish

- **GIVEN** a committed theater outbox event
- **AND** no `RoomServer` process is registered for the theater wire id
- **WHEN** the outbox relay runs
- **THEN** the event is not marked published
- **AND** a later relay attempt after the room starts can deliver the frame

### Requirement: Client epoch filtering for bill snapshots

Room-scoped bill snapshots without an `epoch` field SHALL apply when the `roomId` tag matches the desired room, even after higher presence epochs were observed.

#### Scenario: theater_state after presence

- **GIVEN** the client has seen `presence_update` with `epoch: 3` for the theater
- **WHEN** a `theater_state` frame arrives without an `epoch` field and `roomId: "theater"`
- **THEN** the frame is applied
