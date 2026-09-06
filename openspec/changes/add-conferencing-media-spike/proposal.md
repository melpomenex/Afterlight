# Add Conferencing Media Spike (Phase P8)

## Why

Afterlight has shared viewing — the theater screen, watch-together, the shared IPTV catalog — but no live voice or video between players: conferencing "does not exist yet" (`docs/architecture/elixir/ownership.md` rows 19–21). The migration plan reserves P8 for an independent, releasable conferencing experiment, and `docs/architecture/elixir/media.md` records the constraint that shapes it: both the Membrane RTC Engine and its Fishjam successor are archived, so there is no proven maintained turnkey Elixir SFU to adopt — only the `membrane_webrtc_plugin`/ExWebRTC primitives, which are worth evaluating but do not by themselves prove production SFU congestion control, simulcast selection or recovery.

Current: no call signaling, no media grant model, no media worker, no capture surface in the client; nothing about a player's presence in The Orpheum should ever imply permission to touch their microphone or camera.

Desired: a bounded, opt-in conferencing capability — voice first, then eight-person camera calls, then one screen share — where Phoenix authorizes identity, call membership and capacity and issues short-lived expiring grants that a regional media worker validates independently; SDP/ICE travels over an authorized `call:<id>` signaling topic while media itself flows browser-to-worker over SRTP/ICE and never through Channels, LiveView or Ash; failures are recovered by renegotiation rather than pretended snapshot restores; and a pre-registered go/no-go gate, evaluated on measurements (per-call CPU/memory/egress, join p95, recovery time, TURN-only and degraded-network variants), decides whether the owned Membrane/ExWebRTC path is viable or the adapter is retained while a maintained external SFU is evaluated later — with the game migration unblocked either way.

## What Changes

- **Ash `Afterlight.Conferencing` domain** (durable metadata only): `Call`, `CallMembership` and `MediaGrant` resources in PostgreSQL; the grant tokens themselves are short-lived and never stored verbatim. Domain actions `authorize_join` and `issue_media_grant`, plus revoke and `close_call`.
- **SFU adapter boundary** exposing `allocate_call`, `join`, `publish`, `subscribe`, `remove_participant`, `close_call` and authenticated signaling, so the SFU choice is isolated behind one behaviour. A Membrane/ExWebRTC prototype implements it for bounded conferences; neither the archived RTC Engine nor Fishjam is adopted.
- **Authorized signaling on `call:<id>`**: Phoenix checks identity, room/call membership, capacity and moderation state, then issues an expiring grant bound to call + participant + worker + publish permissions. SDP offer/answer and ICE candidates pass through this authorized topic; media NEVER flows through Channels, LiveView or Ash, and no web process forwards packets.
- **Media worker as a separate release** (Membrane/ExWebRTC): validates grants independently (a call ID or SDP message alone grants no access), runs admission control on projected egress and subscription count, and forwards only authorized subscribed tracks with a bounded camera-receiver cap. One call per worker initially; scaling adds workers per new call and never splits one giant call.
- **TURN with short-lived credentials** for restrictive NATs: UDP primary with TCP/TLS fallback, public reachability assumed for the media path rather than the web load balancer.
- **Opt-in only**: microphone/camera defaults are off; entering The Orpheum never starts capture; capture permission is always an explicit user action surfaced through the browser prompt.
- **Feature ladder**: opt-in voice → bounded eight-person camera calls → one screen share. Recording is NOT part of this spike and is only available later, as separate Membrane pipelines started with visible participant consent.
- **Failure semantics**: media worker loss requires new allocation and ICE/SDP renegotiation (calls are not restored from a GenServer snapshot); a revoked grant stops tracks immediately; removing a participant mid-call tears down their subscriptions; a bounded reconnect grace covers brief network interruptions before expiry cleans up abandoned tracks.
- **Local audio policy**: call audio vs theater audio ducking/volume controls in the client to prevent echo and confusion; muting volume locally is UI comfort, never privacy enforcement (mute/revoke are enforced server-side).
- **Measurements and gate**: per-call CPU/memory/egress, join p95 (< 5 s target), interruption recovery (< 10 s target), a TURN-only variant, a 100 ms RTT / 2% packet-loss variant, and a pinned Chrome/Firefox/Safari compatibility matrix — feeding a documented GO/NO-GO decision. If production SFU maintenance exceeds budget: retain the adapter, evaluate a maintained external SFU as a future selection (not an already-verified dependency), and continue the game migration with conferencing disabled.
- **Independence**: the whole capability sits behind a feature flag, off by default; enabling or disabling it never touches game rooms, economy, theater playback or the watch-together path.

Depends on: `add-node-specialty-adapters` (P7) — reuses its authenticated sidecar boundary and scoped-grant pattern (Phoenix issues, sidecar/worker validates) and its proven "game survives sidecar loss" posture; conferencing flips no existing authority, since ownership rows 19–21 are entirely new subsystems.

## Capabilities

### New Capabilities

- `conferencing-spike`: opt-in bounded calls as a safe, releasable unit — explicit capture consent, authorized join with capacity bound, short-lived media grants validated independently by the media worker, SRTP/ICE media isolation from Channels/LiveView/Ash, TURN with expiring credentials for restrictive NATs, mute/revoke/removal enforcement, renegotiation-based recovery, the voice → camera → screen-share ladder with local call/theater audio ducking, the pinned browser compatibility matrix, the measured join/recovery/CPU/memory/egress evidence, and the go/no-go gate with its entirely-feature-flagged rollback.

### Modified Capabilities

- (none — the game transport, room runtime, economy, theater playback and watch-together behavior are untouched. `call:<id>` is a new topic alongside the existing `room:*` / `theater:*` / `player:*` topics, and with the conferencing flag off — its default — no existing behavior changes.)

## Impact

- **Client**: new opt-in call surface — `src/net/calls.js` (new: WebRTC wrapper holding `RTCPeerConnection`s, track lifecycle, renegotiation) and `src/ui/callPanel.js` (new: start/join/leave, mute, camera toggle, screen share, participant tiles, connection state). `src/net/client.js` gains call event handler registration only where the net handler map lives; `src/main.js` wiring only where handlers register. The Three.js island (canvas, rAF, input, camera, theater DOM) is untouched; call UI is plain DOM outside it. Local audio ducking lives in the client's existing audio-settings state.
- **Server (web)**: new `server_elixir/lib/afterlight/conferencing/` Ash domain (`Call`, `CallMembership`, `MediaGrant` + policies + actions `authorize_join`/`issue_media_grant`/revoke/`close_call`); new `server_elixir/lib/afterlight_web/channels/call_channel.ex` for the `call:<id>` topic (join-time and per-command authorization, signal relay, revoke propagation); new grant/TURN-credential signing modules under `server_elixir/lib/afterlight/conferencing/grants.ex`.
- **Server (media)**: new `server_elixir/lib/afterlight/media/sfu.ex` behaviour (the six adapter operations) and `server_elixir/lib/afterlight/media/membrane.ex` Membrane/ExWebRTC prototype; media worker runs as its own release (`server_elixir/` release config gains a media role) with its own supervision, admission control and metrics emission. No packet forwarding in web processes.
- **Infrastructure**: TURN server deployment config (UDP ports + TLS/TCP fallback, short-lived HMAC credentials); documented port exposure separate from the web gateway.
- **Persistence**: three new tables (`calls`, `call_memberships`, `media_grants`); game and theater tables untouched; no movement/position rows; grant tokens never persisted (metadata only: issuance, binding, expiry, revocation).
- **Protocol**: new `call:*` events on the `call:<id>` topic (join/leave, SDP/ICE signal envelope, grant delivery, mute/participant state, revoke); zero changes to existing game-room, theater or catalog messages.
- **Security**: grants validated independently by the media worker; TURN credentials expiring and delivered only over the authorized topic; no grant tokens or TURN secrets in logs; capture permission always explicit and user-initiated.
- **Tests**: two-browser voice call; mute/revoke enforcement; permission-denied paths (forged IDs, missing/expired grants, wrong worker, publish without permission); TURN-only connectivity; worker-kill recovery; participant removal mid-call; log hygiene.
- **Docs**: pinned browser compatibility matrix; go/no-go gate report with measurements committed under `docs/architecture/elixir/` (e.g. `conferencing-gate.md`); media.md remains the design source of truth.
- **Rollback**: the feature flag turns conferencing entirely off; in-flight calls end; the game is unaffected in both directions. A NO-GO gate outcome leaves the adapter in place, disables the feature, and blocks nothing else in the migration.
