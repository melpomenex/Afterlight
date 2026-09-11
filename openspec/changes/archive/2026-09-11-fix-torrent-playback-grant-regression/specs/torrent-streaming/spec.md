## MODIFIED Requirements

### Requirement: Range-capable streaming endpoint
A picked torrent file SHALL be streamed over HTTP with Range request support, so the room's shared seek/pause playback math works unchanged, under the post-cutover topology: the streaming engine remains the Node sidecar, reached by the browser through the gateway, and every stream request SHALL carry a short-lived playback grant minted by the gateway for that participant, file, and bill item — requests without a valid, unexpired grant SHALL be refused. The gateway's proxy SHALL preserve Range semantics end to end (forwarded `Range` headers, 206 responses, `Content-Range`/`Accept-Ranges`), SHALL NOT buffer a stream body in memory, and SHALL NOT truncate an otherwise healthy transfer that is merely slow or idle within a reasonable period. Only video files inside the resolved torrent SHALL be served; requests for nonexistent files or indexes SHALL fail cleanly. Grant minting and delivery SHALL be integrated into the production paths that deliver theater state — join snapshots, the acting participant's committed-action replies, and room broadcasts — not merely present as an uncalled module.

#### Scenario: Seek into a partially downloaded file
- **WHEN** a viewer seeks forward to an unmapped region of a torrent file
- **THEN** the granted stream serves the requested byte range (a 206 with correct `Content-Range`) and playback continues from there

#### Scenario: Stream without a grant refused
- **WHEN** an HTTP request for a torrent file arrives with a missing, expired, or mismatched grant
- **THEN** the stream endpoint refuses it without disturbing the playing item, and an authorized viewer's client obtains a fresh grant for an item that is live for them

#### Scenario: Non-video file request
- **WHEN** an HTTP request names a file index that is not a video file or does not exist
- **THEN** the server refuses it without disturbing the playing item

#### Scenario: Range survives the gateway
- **WHEN** a viewer's player issues Range requests while playing through the gateway
- **THEN** the responses preserve 206/`Content-Range` semantics and no more than bounded memory is used per stream at the gateway

#### Scenario: Acting participant's first request is authenticated
- **WHEN** a participant picks a torrent file and the committed bill makes it the live item
- **THEN** that participant receives a matching `torrent_grant` before the `theater_state` frame that announces the item, and the first stream URL its player uses contains that grant

#### Scenario: Join snapshot carries a grant for the active torrent
- **WHEN** a participant joins The Orpheum while a torrent item is already live
- **THEN** the join sequence delivers that participant's own matching grant before (or with) the join `theater_state`, and no unsigned first request is issued

## ADDED Requirements

### Requirement: Participant-scoped torrent grant lifecycle
The gateway SHALL mint and deliver a participant-scoped playback grant to every occupant of The Orpheum whenever a `theater_state` snapshot instructs that occupant to render an active torrent item, and SHALL deliver the grant to that participant only. Every theater occupant SHALL receive their own grant when joining or when the active torrent item or file changes. Shared `theater_state` SHALL NOT contain or broadcast participant-specific grant tokens, and one participant's token SHALL NOT be delivered to another participant. A client SHALL possess a valid, unexpired, matching grant before its media engine begins fetching the active torrent stream, so the first stream request is authorized rather than relying on a refused request followed by a retry. Renewal SHALL occur before expiration while that participant remains eligible to view the same active torrent file; when the item changes, the file changes, or the participant leaves the theater, the previous grant's renewal lifecycle SHALL be cancelled and a stale renewal SHALL NOT mint an active grant. Leaving and re-entering, and reconnect/rejoin, SHALL re-establish a valid grant through the join path.

#### Scenario: Every occupant receives their own grant
- **WHEN** two participants are in the theater when a torrent item becomes live
- **THEN** each receives a valid, participant-scoped grant for that infohash and file index, neither receives the other's token, and the shared `theater_state` contains no grant field

#### Scenario: Late joiner receives a grant
- **WHEN** a participant joins while another's torrent file is already the live item
- **THEN** the joiner receives a valid matching grant and can construct an authenticated stream URL without waiting for a failed request

#### Scenario: Renewal before expiration
- **WHEN** a participant remains in the theater and the same torrent file stays live as its grant approaches expiry
- **THEN** a fresh valid grant reaches that participant before the previous one expires, and playback does not encounter an expired token

#### Scenario: Item replacement or file change
- **WHEN** the live item changes from torrent A to torrent B, or from one file index of the same torrent to another
- **THEN** A's renewal lifecycle is cancelled, the participant receives a grant matching B's infohash/file index, and a stale renewal for A cannot mint an active grant

#### Scenario: Leaving the theater stops renewal
- **WHEN** a participant travels out of The Orpheum while holding an active torrent grant
- **THEN** the grant lifecycle and its renewal timer are cancelled, no further grant is delivered to that participant, and re-entering mints a fresh one through the join path

#### Scenario: Non-torrent media mints nothing
- **WHEN** the live item is YouTube, Vimeo, a direct file, prepared media/HLS, or IPTV
- **THEN** no torrent grant is minted or delivered for it

#### Scenario: Missing or invalid grants keep failing closed
- **WHEN** a stream request presents no grant, an expired grant, a grant for another infohash or file, or a malformed signature
- **THEN** the endpoint refuses it, and no configuration in this change disables or weakens that enforcement

### Requirement: Selective torrent download
A torrent SHALL be added to the engine with all files deselected, so metadata resolution succeeds without downloading file content. Streaming a chosen file SHALL select only that file's pieces, and a ranged request SHALL select only the pieces needed for that range; unrelated files SHALL NOT consume bandwidth or disk. Random seeking through Range requests SHALL continue to work against partially available data.

#### Scenario: Metadata without downloading content
- **WHEN** a magnet is resolved for the picker and no file has been chosen
- **THEN** the torrent's metadata and file list are available and file content is not being fetched for files the viewer has not selected

#### Scenario: Picked file is prioritized, others stay deselected
- **WHEN** a viewer plays one file from a multi-file torrent
- **THEN** that file's pieces are selected for streaming and the remaining files stay deselected

#### Scenario: Range read selects on demand
- **WHEN** the player issues a Range request for a region whose pieces are not yet available
- **THEN** the engine selects those pieces, serves the range when they arrive, and the response remains a proper 206

### Requirement: Torrent playback diagnostics
Torrent playback SHALL emit bounded diagnostic information covering at least: resolve started, metadata ready, file selected as the live item, grant minted/renewed/cleared, stream request authorized or refused (with a reason category), stream opened, first bytes delivered, media metadata loaded, and playback started. Diagnostics SHALL NOT include complete magnet URIs, grant tokens, signing secrets, or other secret material; stream-request logs SHALL redact the `grant` query parameter. Refusals SHALL be distinguishable by category, at minimum: missing grant, expired grant, invalid grant, stream refusal, metadata timeout, no reachable peers, stalled stream, and browser decode error. Player-facing UI SHALL NOT present a stream that was refused by authorization as ongoing swarm progress; when a torrent player is waiting for authorization, the loading state SHALL reflect that rather than implying swarm activity.

#### Scenario: A refused stream is diagnosable
- **WHEN** a torrent stream request is refused or a stream stalls while the swarm is healthy
- **THEN** diagnostics name the failure category and the item's infohash (never the token or full magnet), so the cause is distinguishable from a dead swarm

#### Scenario: No secrets in diagnostics
- **WHEN** telemetry and logs for the torrent playback path are captured
- **THEN** they contain no complete grant tokens, no signing secret, and no full magnet URI
