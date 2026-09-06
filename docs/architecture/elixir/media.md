# Membrane and conferencing

## Selection decision

Use Membrane for the media service, but treat the SFU implementation as an unresolved production gate. The original Membrane RTC Engine repository is archived, and the Fishjam successor repository was also archived on November 12, 2025. Do not adopt either as an assumed maintained turnkey conference server. The current `membrane_webrtc_plugin` supports WebRTC sources/sinks and Phoenix signaling and is based on ExWebRTC. These primitives are useful; a source/sink demo does not prove production SFU congestion control, simulcast selection or recovery.

Prototype an adapter exposing `allocate_call`, `join`, `publish`, `subscribe`, `remove_participant`, `close_call` and authenticated signaling. Validate an implementation using Membrane/ExWebRTC for bounded conferences. If maintaining packet forwarding, feedback and browser compatibility exceeds the team's budget, retain the adapter and evaluate a maintained external SFU for conferencing while Membrane handles recording/ingest/transforms. That fallback is a future selection, not an already-verified dependency.

## Join and leave flow

1. User explicitly enables voice or joins a call. Microphone/camera defaults are off; entering The Orpheum never starts capture.
2. Phoenix checks identity, room/call membership, capacity and moderation state. Allocator chooses a regional media worker and issues an expiring grant bound to call, participant, worker and publishing permissions.
3. Browser obtains capture permission. SDP offer/answer and ICE candidates pass through authorized signaling. The media worker verifies the grant independently. A call ID or SDP message alone grants no access.
4. ICE establishes direct browser-to-SFU connectivity where possible; TURN relays packets when required. SRTP carries media outside Phoenix Channels and LiveView. TURN needs public reachability and expiring credentials; expose appropriate UDP ports and TCP/TLS fallback rather than assuming the web load balancer transports media.
5. SFU forwards only authorized subscribed tracks. Receivers prefer active speakers and visible tiles, with adaptive quality. A proximity policy controls subscriptions server-side; Web Audio can spatialize received audio locally. Muting volume locally is not privacy isolation.
6. Leaving, being removed or traveling out of the call revokes subscriptions/publishing and stops capture tracks. A brief network interruption may use a bounded reconnect grace; expiry cleans up abandoned tracks and allocations.

Start with opt-in voice, then eight-person camera calls and one screen share. Separate stage presenters from audiences for large events. Proposed eight-person cap is a product safety/capacity boundary to test, not a framework maximum. Do not attempt to attach a camera feed to every avatar in a 50-person game room by default.

## Media worker responsibilities

One call is assigned to one SFU worker initially. Scaling out places new calls on additional workers; it does not automatically split one giant call. Track incoming/outgoing bitrate, retransmissions, RTT, jitter, packet loss, encoder/decoder pressure and worker memory. Admission control accounts for projected egress and subscription count. Failures require new allocation and ICE/SDP renegotiation; calls are not transparently restored from a GenServer snapshot.

The spike must cover Opus and agreed browser video codecs, audio-only operation, screen-share lifecycle, bandwidth adaptation, RTCP feedback, keyframe requests, simulcast/layer selection if used, mute/revoke enforcement, TURN-only connectivity, packet loss and Chrome/Firefox/Safari interoperability. Pin tested OTP/Elixir/plugin/browser versions in the implementation; this proposal deliberately supplies no untested mix.exs matrix.

Recordings are optional separate Membrane pipelines, started only with visible participant consent and authorized access. Store segments in object storage, with deletion/retention rules and signed downloads. Ordinary SFU transport encryption is not end-to-end encryption against the SFU. An E2EE requirement would change recording and media-processing capabilities and needs a separate design.

## Watch-together remains a separate feature

The theater's server owns source, queue and timeline; each browser continues playing YouTube/Vimeo embeds or direct/HLS video. Membrane does not turn cross-origin provider iframes into server media inputs. Keep the DOM homography overlay and cinema view, including sitting and default spawn behavior.

Use item ID, generation, position, playing flag, authoritative timestamp and revision. Persist wall-clock reference for restart; use monotonic time for live-process elapsed calculations and clamp invalid clock discontinuities. Client skew correction and periodic snapshots bound drift; report measured synchronization rather than promising frame-accurate playback across providers.

For uploaded files or owned live sources, optional Membrane ingest/transcoding can produce HLS delivered by object storage/CDN. WebRTC suits interactive calls; HLS suits larger passive audiences with higher latency. Do not proxy every existing video through the Phoenix application. Call audio and theater audio need local ducking/volume controls to prevent echo and confusion.

## Specialty services

Keep WebTorrent in a small Node service during migration. Preserve magnet canonicalization, resolve → pick → queue, Range responses, cache cap and restart library. Phoenix issues scoped playback grants and bounded resolve jobs; the sidecar validates them. Avoid exposing an unauthenticated generic torrent endpoint. The browser still consumes HTTP video through its file engine. A single torrent worker may require hash-based routing and disk affinity until shared serving is designed.

Keep playlist import server-side and atomic preview → confirm; preserve batch reports and queue caps. Fetch workers enforce URL/DNS/redirect policy, private-address restrictions, timeouts, decompressed-size caps and limited concurrency. They must not fetch arbitrary internal services on behalf of public users. IPTV and EPG remain HTTP uploads with metadata-only catalog broadcasts and lazy pages. The IRC bridge can remain a Node sidecar behind an authenticated event adapter with message IDs to prevent relay loops; game chat survives its failure.
