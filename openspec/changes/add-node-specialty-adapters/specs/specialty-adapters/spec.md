# specialty-adapters

## Purpose

Define the authenticated, bounded boundary between the Phoenix application and the retained Node specialty sidecars (WebTorrent engine, IRC server + bridge). The torrent engine and IRC remain Node-owned per the ownership matrix (rows 17–18); this capability guarantees that every player-facing path into them is authenticated, bounded, loop-safe, and failure-isolated: a sidecar crash degrades UX in a documented way and never affects game chat, rooms, or economy.

## ADDED Requirements

### Requirement: Scoped playback grants

Phoenix SHALL issue short-lived playback grants for torrent video, each an HMAC-signed token binding an infohash, a file index, a participant identity, and an expiry. A grant SHALL be scoped to exactly that capability: the sidecar SHALL reject a grant whose signature is invalid, whose expiry has passed, whose participant does not match the requesting session, whose infohash or file index does not match the requested resource, or which has been tampered with. Grants SHALL be re-issuable while the bound theater item stays active for the participant, so a normal viewing session does not hit expiry.

#### Scenario: Expired grant rejected

- **WHEN** a client requests a torrent file with a grant whose expiry has passed
- **THEN** the sidecar rejects the request without streaming any bytes
- **AND** a re-minted grant for the still-active item lets the same participant resume playback

#### Scenario: Foreign participant and wrong file rejected

- **WHEN** player B replays a grant minted for player A, or a grant for one infohash/file index is presented to a different infohash or file index
- **THEN** the sidecar rejects both requests
- **AND** a valid grant for the correct participant and file streams normally

### Requirement: Authenticated torrent streaming endpoint

The torrent stream endpoint (`GET/HEAD /api/theater/torrent/:infohash/:fileIndex`) SHALL require a valid playback grant for every request in any non-loopback deployment. Existing stream semantics SHALL be preserved: HTTP Range requests answer 206 partial content, only video extensions are served, and the browser consumes the video directly over HTTP — Phoenix never proxies the bytes. Disabling grant enforcement SHALL be possible only in explicit loopback development configuration.

#### Scenario: Unauthenticated request refused in production

- **WHEN** a request with no grant reaches the stream endpoint in a production deployment
- **THEN** it is rejected before any file data is read
- **AND** a browser holding a valid grant receives identical Range/206 behavior to today

#### Scenario: Loopback dev revert is explicit

- **WHEN** a developer sets the loopback-dev configuration that disables grant enforcement
- **THEN** the unauthenticated endpoint works only on loopback interfaces
- **AND** the production configuration refuses to start with grant enforcement disabled

### Requirement: Bounded torrent resolve proxy

The `torrent_resolve` flow SHALL be proxied through Phoenix, preserving today's wire shape and per-player rules: theater-room membership, at most one resolve in flight per player, magnet validity parsing, and the ~10 s cooldown. Phoenix SHALL additionally bound total resolve work with a global in-flight cap; requests beyond any bound SHALL be rejected to the requester with the existing cooldown/error semantics rather than queued unboundedly. `torrent_files` replies SHALL remain targeted to the requester.

#### Scenario: Second concurrent resolve rejected

- **WHEN** a player sends `torrent_resolve` while their previous resolve is still in flight
- **THEN** the second request is rejected to that player only
- **AND** other players' resolves and the room's `torrent_state` continue unaffected

#### Scenario: Global cap holds under crowding

- **WHEN** more than the global cap of resolves are in flight across all players
- **THEN** new resolves are rejected with a readable retryable message
- **AND** no unbounded queue or unbounded sidecar work accumulates

### Requirement: Torrent status pass-through

The sidecar's status stream SHALL pass through to the theater room with today's semantics: `torrent_state` items (infohash, progress, peers, downloaded, ready) broadcast roughly every 2 seconds while relevant, and no status fanout to players outside the theater room.

#### Scenario: Viewers see progress during playback

- **WHEN** a torrent item is playing and downloading
- **THEN** theater occupants receive `torrent_state` updates at the current ~2 s cadence
- **AND** a player in another room receives none

### Requirement: Sidecar-owned magnet library with bill-driven reap exemption

The magnet library (`data/torrents/library.json`) and the torrent cache directory SHALL remain owned by the sidecar, including their restart-recovery behavior. Phoenix SHALL push the set of infohashes referenced by the PostgreSQL theater bill (P5 `theater_items`) to the sidecar as the exempt-from-reap list, on bill change and on sidecar reconnect. The sidecar SHALL NOT reap cached content for bill-exempt infohashes while they remain referenced, and the sidecar SHALL NOT write to any PostgreSQL theater table.

#### Scenario: Bill torrent survives reap pressure

- **WHEN** the sidecar's cache-reap policy runs while the current bill references an old torrent
- **THEN** the bill-referenced torrent's cache is exempt from reaping
- **AND** the bill itself is untouched by the sidecar in PostgreSQL

#### Scenario: Sidecar restart re-arms exemption

- **WHEN** the sidecar restarts after a crash
- **THEN** it reloads its library file and receives the exempt list again from Phoenix without manual repair

### Requirement: Authenticated IRC event adapter with loop prevention

Phoenix chat and the IRC bridge SHALL exchange events only over an authenticated local adapter. Every relayed message SHALL carry a unique message ID and an origin-scoped echo suppression key, and a message re-entering its origin with an already-seen key SHALL be dropped, so game→IRC→game or IRC→game→IRC reflection cannot double-deliver. Existing chat wire shapes (`chat_message`, `chat_dm`, `chat_presence`, fromKind distinction) SHALL be unchanged.

#### Scenario: Relayed message cannot loop

- **WHEN** a game chat message is replayed into the adapter exactly as the bridge would echo it back
- **THEN** the echo is suppressed by its seen origin+ID key
- **AND** occupants receive the message exactly once

### Requirement: Game chat survives IRC bridge outage

Game chat (room channels and DMs) SHALL continue to function when the IRC bridge or IRC sidecar is down, degrading to game-only relay — the current pre-migration behavior. The chat UI surface SHALL reflect the bridge being down rather than surfacing chat errors, and recovery SHALL reattach the bridge without restart or state repair.

#### Scenario: Sidecar kill during conversation

- **WHEN** the IRC sidecar process is killed while players are chatting
- **THEN** game channel messages and DMs continue to deliver among players
- **AND** IRC presence is marked down and resumes relaying when the bridge reconnects

### Requirement: Sidecar failure isolation

A sidecar crash or hang SHALL produce documented, bounded UX degradation only: torrent playback and resolve attempts fail fast with readable messages, IRC goes quiet with presence marked down. Rooms, movement, economy, theater bill state, and game chat SHALL be unaffected. Phoenix's sidecar clients SHALL use bounded timeouts and SHALL NOT retry unboundedly.

#### Scenario: Torrent sidecar loss mid-session

- **WHEN** the torrent sidecar crashes during an active session
- **THEN** in-flight playback and resolve attempts fail with readable messages and no retry storm
- **AND** room movement, market actions, and game chat continue normally

### Requirement: Secret and log hygiene

Grant-signing secrets SHALL be provisioned privately to Phoenix and the sidecar and SHALL never appear in client payloads, repositories, or logs. Grant tokens, magnet URIs, and private message content SHALL never be written to info-level logs; the stream endpoint's `grant` query parameter SHALL be redacted from request logging.

#### Scenario: Info-level logs contain no tokens

- **WHEN** playback and resolve traffic is exercised at normal verbosity
- **THEN** no log line contains a grant token or a magnet URI
- **AND** request logs show the stream endpoint with the grant parameter redacted

### Requirement: No unauthenticated generic torrent surface

The system SHALL NOT expose a generic unauthenticated torrent service at any point: no endpoint that resolves an arbitrary magnet or serves arbitrary torrent file bytes without either a valid grant (players) or adapter authentication (Phoenix↔sidecar internal calls).

#### Scenario: Direct sidecar access refused

- **WHEN** a request that bypasses Phoenix — an unauthenticated resolve call or a stream request without a grant — reaches the sidecar directly
- **THEN** it is rejected
- **AND** only grant-bearing player requests and adapter-authenticated internal calls are served
