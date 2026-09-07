# Design — Conferencing Media Spike (P8)

## Context

`docs/architecture/elixir/media.md` is the source of truth and this spike implements its selection decision: use Membrane as the media toolkit but treat the SFU implementation as an unresolved production gate. The Membrane RTC Engine repo is archived and the Fishjam successor was archived on 2025-11-12, so neither is a production SFU option; `membrane_webrtc_plugin` (ExWebRTC-based, with Phoenix signaling support) is acceptable to evaluate, while a source/sink demo proves nothing about congestion control, simulcast selection or recovery.

Ownership rows 19–21 define the seams: conferencing signaling is `Afterlight.Conferencing` over Channels (`call:<id>` topic, `authorize_join` / `issue_media_grant`); conferencing media is a media worker behind an SFU adapter reached over SRTP/ICE and never Channels/Ash; recordings are separate consented Membrane pipelines and never gate gameplay. `runtime.md` scopes the context to "grants, membership and media allocation; no packet forwarding in web processes", and notes an established call may survive a web restart but recovery still needs tested renegotiation.

Capacity framing from `migration.md`: eight camera publishers at ~1.2 Mbit/s imply ~9.6 Mbit/s worker ingress and ~67.2 Mbit/s egress for all-to-all forwarding; capping each receiver at four camera subscriptions cuts that to ~38.4 Mbit/s. Call capacity and game socket capacity are separate budgets and must be measured separately. Acceptance targets: eight-person camera plus screen share, 30-minute soak, TURN-only variant, 100 ms RTT / 2% loss variant, join p95 < 5 s, interruption recovery < 10 s — measured, not claimed.

From P7 (`add-node-specialty-adapters`) this change inherits the working pattern it needs: Phoenix issues a scoped, short-lived, expiring grant; an out-of-web-process service validates it independently; the game survives the service's complete loss.

Client facts: the Three.js client has no call surface today and owns its audio settings locally; WebRTC is available in all three target browsers; the client's theater DOM and game island are inviolable, so call UI is plain DOM outside them.

## Goals / Non-Goals

**Goals**

- Adapter-first isolation of the SFU choice so a NO-GO outcome costs nothing but the prototype's existence.
- Grants as the only media authority: Phoenix authorizes identity + membership + capacity; the media worker independently validates short-lived grants; a call ID or SDP message alone grants no access.
- Media strictly out of the web stack: SRTP/ICE between browsers and the worker; signaling only over the authorized `call:<id>` topic.
- Opt-in capture with an explicit feature ladder (voice → eight-person camera → one screen share) and server-enforced mute/revoke.
- Failure behavior that tells the truth: renegotiation on worker loss, immediate track stop on revoke, teardown on removal.
- A pre-registered, measured go/no-go gate that leaves the game migration unblocked either way.

**Non-Goals**

- No camera feeds attached to the ~50 avatars of a game room; no proximity/spatial subscriptions beyond the bounded receiver cap.
- No stage/broadcast or presenter/audience model yet (separating them is future work for large events).
- No E2EE: ordinary SFU transport encryption is not end-to-end encryption against the SFU, and an E2EE requirement would change recording and media processing — separate design if ever needed.
- No recording in this spike; no screen share beyond one at a time; no calls larger than the bounded cap (the proposed eight-person cap is a product safety/capacity boundary to test, not a framework maximum).
- No changes to watch-together: the theater server keeps owning source, queue and timeline; Membrane does not turn cross-origin provider iframes into server media inputs; HLS ingest for owned uploads is future work.
- No mobile/native clients (browser only); no multi-region TURN fleet (one regional TURN deployment suffices for the spike); no production capacity claims from lab numbers.

## Decisions

### D1 — Adapter-first SFU boundary
*Decision:* All media capability is reached through a behaviour exposing `allocate_call`, `join`, `publish`, `subscribe`, `remove_participant`, `close_call` plus authenticated signaling. The Membrane/ExWebRTC prototype is one implementation behind it; nothing else in the codebase knows which SFU is running.
*Alternative Considered:* adopt RTC Engine or Fishjam directly. Rejected: both are archived, and wiring product code to an unmaintained SFU converts this spike into a maintenance liability the gate is supposed to avoid.

### D2 — Short-lived grants are the only media authority
*Decision:* Phoenix checks identity, room/call membership, capacity and moderation state, then issues an expiring signed grant bound to call ID, participant, target media worker and per-track publish permissions (audio/video/screen). TTL is minutes, renewed over the authorized topic while membership holds. The media worker verifies the grant independently on every allocate/join/publish/subscribe; expired or revoked grants stop working without web-process involvement. Media never flows through Channels, LiveView or Ash; no web process forwards packets.
*Alternative Considered:* let the SFU trust the signaling process (single trust domain). Rejected: worker-side validation contains the blast radius of a compromised or buggy web node and is exactly the discipline P7 proved with the torrent sidecar.

### D3 — Signaling lives on an authorized `call:<id>` topic
*Decision:* A dedicated Channels topic per call. Join is authorized; every subsequent command (signal relay, mute state, leave) is re-authorized against current membership. The topic carries SDP offer/answer, ICE candidates, grant renewals, TURN credentials, participant state changes and revocations. Revocation is pushed on the topic and enforced at the worker, so a client that ignores the message still loses its tracks.
*Alternative Considered:* a separate REST signaling endpoint. Rejected: Channels already carries the signed session, membership context and PubSub propagation; a second transport would duplicate authorization for no benefit.

### D4 — One call per media worker; admission control on egress
*Decision:* The allocator chooses a regional worker per call; scaling out places new calls on additional workers and never splits one giant call. Admission control accounts for projected egress (publishers × subscribers × track bitrate) and subscription count, enforcing the receiver cap of four concurrent camera subscriptions (active-speaker/visible-tile preference can come later; the cap is what makes the capacity math honest). Workers report per-call CPU/memory/egress for the gate measurements.
*Alternative Considered:* one big shared SFU node. Rejected for the spike: per-call isolation gives clean measurements, trivial blast-radius containment (a crashed worker affects one call and must be renegotiated anyway), and matches the migration rule that call capacity budgets separately from game socket capacity.

### D5 — Prototype scope: what the Membrane/ExWebRTC cut must prove
*Decision:* The prototype must demonstrate, with pinned OTP/Elixir/plugin/browser versions recorded during implementation (this proposal deliberately supplies no untested mix.exs matrix): Opus audio and the agreed browser video codecs; audio-only operation; RTCP feedback and keyframe requests; bandwidth adaptation; screen-share lifecycle (single share); mute/revoke enforcement at the forwarding layer; TURN-only connectivity; and packet-loss behavior. Simulcast/layer selection is evaluated only if cheap — it is a gate question, not a spike requirement.
*Alternative Considered:* declare Membrane production-ready from the demo materials. Rejected: that is precisely the inference media.md forbids.

### D6 — Feature ladder with explicit capture consent
*Decision:* Order of release: opt-in voice → bounded eight-person camera calls → one screen share. Capture begins only from an explicit user action that surfaces the browser permission prompt; entering The Orpheum never activates mic or camera, and joining a room never implies joining a call. Recording is excluded from this spike; when it arrives it is separate Membrane pipelines started only with visible participant consent, stored in object storage with deletion/retention rules and signed downloads. The client provides local call-audio vs theater-audio ducking/volume controls; this is echo/confusion comfort, never privacy enforcement.
*Alternative Considered:* ship voice+camera+screen together to "finish faster". Rejected: media.md and the migration gate sequence voice before cameras precisely so the riskiest browser surface (capture permissions, device handling) is proven on the simplest path first.

### D7 — Failure semantics: renegotiate, never snapshot-restore
*Decision:* Media worker loss requires new allocation plus ICE/SDP renegotiation — calls are not transparently restored from a GenServer snapshot. A revoked grant stops capture tracks immediately (worker stops forwarding AND client stops capture on notification). Removing a participant mid-call (moderation, membership loss, room departure) tears down their subscriptions and publishes. Brief network interruptions get a bounded reconnect grace; expiry reaps abandoned tracks and allocations. A web restart may leave an established call alive; re-entry still goes through tested renegotiation.
*Alternative Considered:* worker failover with session/track state transfer. Rejected: SRTP contexts and encoder state make transparent migration a research project, and the honest failure mode (fast renegotiation, < 10 s target) is achievable and measurable.

### D8 — TURN with short-lived credentials, media path outside the web LB
*Decision:* Deploy TURN with expiring per-session credentials (short-lived HMAC secrets bound to the session, delivered only over the authorized `call:<id>` topic), UDP primary with TCP/TLS fallback, on infrastructure with public reachability and its own UDP port exposure — never assuming the web load balancer transports media. TURN relay usage is measured (it adds a traffic/cost hop) as part of the gate evidence.
*Alternative Considered:* long-lived shared TURN secret in client config. Rejected: it is unauditable and unrevokable; short-lived REST/timeout-style credentials are the standard for a reason and cost little.

### D9 — Durable metadata model; grants stay short-lived
*Decision:* `Afterlight.Conferencing` persists three resources. `calls`: id, anchored room key, mode (voice/camera), status (active/ended), max_participants (default 8), allocated worker, created_by, inserted_at, ended_at. `call_memberships`: call_id, player_id, state (joined/left/removed), joined_at, left_at, unique (call_id, player_id). `media_grants` (metadata only): grant id (jti), call_id, player_id, worker_id, can_publish_audio/video/screen booleans, issued_at, expires_at, revoked_at, revoke_reason. The signed grant token itself is never stored — only its binding and lifecycle, which is what audits and cleanup need.
*Alternative Considered:* persisting grant tokens for replay/inspection. Rejected: stored bearer credentials are a liability; the metadata row plus independent worker validation gives auditability without a secret store.

### D10 — Pre-registered go/no-go gate
*Decision:* Before the measurement runs, the gate report template is committed with its criteria: (a) the prototype (or owned fork) demonstrably handles forwarding, RTCP feedback, keyframes, bandwidth adaptation and the browser matrix within the team's maintenance budget; (b) measured join p95 < 5 s and recovery < 10 s on the soak, TURN-only, and 100 ms RTT / 2% loss variants; (c) per-call CPU/memory/egress within the projected budget. GO = enable the ladder rollout. NO-GO = retain the adapter, keep conferencing flagged off, and open a future selection process for a maintained external SFU (an evaluation, not an already-verified dependency). Either way the game migration proceeds; the gate only decides conferencing.
*Alternative Considered:* deciding the gate ad hoc after the numbers land. Rejected: pre-registration is what stops the measurement from being negotiated after the fact.

## Risks / Trade-offs

- *[Archived SFU ecosystem: the prototype may hit a wall (congestion control, Safari codec quirks) that no amount of spike effort fixes]* → the adapter caps the loss at the prototype's existence; D10 makes NO-GO a first-class outcome and the external-SFU evaluation a named follow-up, so the discovery is the deliverable.
- *[Grant clock skew between web issuer and media worker]* → short TTL with small signed expiry leeway on the worker, renewal over the topic; revocation works even with skew because the worker consults its own revocation check on use — a direct PostgreSQL read of the `media_grants` revocation state, never a lookup through a web process, so compromise or downtime of a web process SHALL NOT by itself allow unauthorized media. If PostgreSQL is unreachable the worker SHALL fail closed for NEW grants (rejecting the allocate/join/publish/subscribe that present them) while already-issued unexpired grants run to expiry — their revocation is enforced at expiry at the latest.
- *[TURN relay cost and degraded quality under forced relay]* → TURN-only is a measured variant, not a guess; credential expiry bounds abuse; egress accounting in admission control includes relayed publishers.
- *[Browser drift (Safari especially) breaks a previously green matrix]* → matrix is pinned and re-run per release candidate; the compatibility matrix requirement makes drift visible instead of emergent.
- *[Echo/confusion between call audio and theater audio]* → local ducking/volume controls ship with voice, not later; but server-side mute/revoke remain the enforcement path since local volume muting is not privacy isolation.
- *[Feature creep toward "cameras everywhere"]* → the ladder and the eight-person cap are product safety boundaries in the spec; stage/broadcast and 50-avatar camera models are explicitly out of scope.
- *[Conferencing bugs leak into the game]* → separate release, separate topic, separate worker, feature flag off by default, and game-protocol surface unchanged; the rollback requirement is testable (flag off → game unaffected).

## Migration Plan

Land the Ash domain and adapter behaviour with the flag off (nothing user-visible). Bring up the media worker and TURN; run the two-browser voice call internally; release opt-in voice to a small cohort. Add the bounded camera ladder, then single screen share, each behind the same flag. Run the measurement suite (soak, TURN-only, degraded network, browser matrix) and write the gate report. GO: continue the ladder and hand capacity findings to P10 as media metrics. NO-GO: flag stays off, adapter retained, external-SFU evaluation filed; game migration (P9/P10) is unaffected. Rollback at any point: turn the flag off; in-flight calls end; no game behavior changes. Because conferencing owns no prior authority, there is no cutover ceremony and no reverse-export concern — this phase adds a subsystem instead of moving one.
