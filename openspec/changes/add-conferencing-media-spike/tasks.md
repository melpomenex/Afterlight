## 1. Ash Conferencing domain (durable metadata)

- [ ] 1.1 Create the `Afterlight.Conferencing` Ash domain with `Call`, `CallMembership` and `MediaGrant` resources and migrations per design D9 (`calls`: room key, mode, status, max_participants, worker, created_by, timestamps; `call_memberships`: unique (call_id, player_id), state, joined/left timestamps; `media_grants`: jti, call_id, player_id, worker_id, can_publish_audio/video/screen, issued/expires/revoked timestamps, reason — grant tokens never persisted).
- [ ] 1.2 Implement domain actions with policies: `authorize_join` (server-verified identity + room/call membership + moderation state + capacity check) and `issue_media_grant` (signed short-lived grant bound to call + participant + worker + per-track publish permissions), plus `revoke_grant`, `remove_participant` and `close_call`.
- [ ] 1.3 Implement grant renewal (re-issue over the authorized topic while membership holds) and an expiry/reaper sweep that cleans abandoned grants, memberships and worker allocations.
- [ ] 1.4 DB/unit tests: capacity boundary (8th in, 9th rejected), grant binding fields enforced, expiry honored, revocation recorded, leave/close idempotency, no grant tokens in any persisted column.

## 2. SFU adapter and media worker

- [ ] 2.1 Define the `Afterlight.Media.SFU` behaviour exposing `allocate_call`, `join`, `publish`, `subscribe`, `remove_participant`, `close_call` plus authenticated signaling callbacks; document it as the only media seam.
- [ ] 2.2 Implement the Membrane/ExWebRTC prototype behind the behaviour: Opus audio and agreed browser video codecs, audio-only operation, RTCP feedback and keyframe requests, bandwidth adaptation, and single screen-share lifecycle; pin tested OTP/Elixir/plugin versions in the implementation.
- [ ] 2.3 Implement independent grant validation at the worker: verify signature, binding (call, participant, worker, permissions) and expiry on every allocate/join/publish/subscribe; reject forged IDs and SDP-without-grant; add a revocation check consulted on use.
- [ ] 2.4 Run the media worker as a separate release with its own supervision and config; implement the regional allocator, admission control on projected egress and subscription count, and the four-camera-subscription receiver cap; one call per worker, never split.
- [ ] 2.5 Deploy/configure TURN: UDP primary with TCP/TLS fallback, public reachability, port exposure documented separately from the web gateway; issue short-lived HMAC per-session TURN credentials over the authorized topic only.
- [ ] 2.6 Emit worker metrics: per-call and per-track incoming/outgoing bitrate, retransmissions, RTT, jitter, packet loss, encoder/decoder pressure, and worker memory (consumed by task 5.2 and by P10's media metrics group).

## 3. Signaling and client integration

- [ ] 3.1 Add the `call:<id>` Phoenix Channel: authorized join, per-command membership re-check, participant join/leave/remove events, SDP/ICE signal relay between authorized participants only, grant + TURN credential delivery, grant renewal, and revoke propagation (client-independent enforcement at the worker).
- [ ] 3.2 Add `src/net/calls.js` (WebRTC wrapper: peer connections, track lifecycle, renegotiation, reconnect grace) and `src/ui/callPanel.js` (explicit start/join/leave, mute toggle, camera toggle, screen share, participant list, visible connection state); wire handler registration in `src/net/client.js` and `src/main.js` without touching the game island, canvas, rAF or theater DOM.
- [ ] 3.3 Enforce opt-in capture in the client: capture starts only from an explicit call action; entering The Orpheum or any room never requests mic/camera permission; declined permission leaves subscribe-only participation.
- [ ] 3.4 Implement local audio policy: call audio vs theater audio ducking/volume controls in the client's audio settings; document that local muting is comfort, not enforcement.
- [ ] 3.5 Implement renegotiation UX for failure paths: worker-loss and disconnect flows show a rejoining state and complete via new allocation + renegotiation; no snapshot-restore pretense.

## 4. Failure and security tests

- [ ] 4.1 Two-browser voice call end-to-end test on pinned browsers: explicit start, join, audio flows, mute, unmute, leave; late joiner receives call state.
- [ ] 4.2 Mute/revoke enforcement tests: server-side mute stops forwarding; revoked grant stops capture tracks immediately even when the client ignores the revoke message; removal mid-call tears down subscriptions and publications.
- [ ] 4.3 Permission-denied paths: non-member topic join, forged player/call IDs, SDP or allocate without a grant, expired grant, grant presented to the wrong worker or without the needed publish permission, capacity-exceeded join.
- [ ] 4.4 TURN-only connectivity test with relay forced (blocked direct path): call establishes via TURN with session credentials; stale/expired credentials are rejected.
- [ ] 4.5 Worker-kill recovery test: kill the worker mid-call, verify visible reconnection, new allocation, renegotiation, and record measured recovery time.
- [ ] 4.6 Web-restart coexistence test: restart the web node during an established call; media worker accepts no new media without fresh authorization and re-entry goes through tested renegotiation.
- [ ] 4.7 Log-hygiene test: grant tokens, TURN credentials, and signaling payloads containing credentials never appear in logs at any level; log correlation fields exclude call content.

## 5. Compatibility, measurements and the go/no-go gate

- [ ] 5.1 Run and record the pinned Chrome/Firefox/Safari compatibility matrix (audio join, camera publish/subscribe, screen share, mute, revoke, TURN-only, renegotiation) with exact browser versions.
- [ ] 5.2 Build the measurement harness: per-call CPU/memory/egress from worker metrics, join latency distribution, and recovery time, exportable into the gate report.
- [ ] 5.3 Run the soak and variants: 30-minute eight-person camera plus screen-share soak, TURN-only variant, and 100 ms RTT / 2% packet-loss variant.
- [ ] 5.4 Evaluate targets honestly against the measurements: join p95 < 5 s and interruption recovery < 10 s — record pass/fail with numbers, never claims without measurements.
- [ ] 5.5 Commit the pre-registered gate criteria, then write the gate report (`docs/architecture/elixir/conferencing-gate.md`) with measurements, maintenance-budget assessment, and an explicit GO or NO-GO decision; on NO-GO retain the adapter, keep the flag off, and file the follow-up to evaluate a maintained external SFU as a future selection.
- [ ] 5.6 Verify rollback: flag off removes the entire call surface with in-flight calls ended gracefully; confirm game rooms, economy, theater playback and watch-together behavior are identical with the flag on-but-unused, off, and absent.
