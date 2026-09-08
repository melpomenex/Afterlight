## MODIFIED Requirements

### Requirement: Range-capable streaming endpoint
A picked torrent file SHALL be streamed over HTTP with Range request support, so the room's shared seek/pause playback math works unchanged, under the post-cutover topology: the streaming engine remains the Node sidecar, reached by the browser through the gateway, and every stream request SHALL carry a short-lived playback grant minted by the gateway for that participant, file, and bill item — requests without a valid, unexpired grant SHALL be refused. The gateway's proxy SHALL preserve Range semantics end to end (forwarded `Range` headers, 206 responses, `Content-Range`/`Accept-Ranges`), SHALL NOT buffer a stream body in memory, and SHALL NOT truncate an otherwise healthy transfer that is merely slow or idle within a reasonable period. Only video files inside the resolved torrent SHALL be served; requests for nonexistent files or indexes SHALL fail cleanly.

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
