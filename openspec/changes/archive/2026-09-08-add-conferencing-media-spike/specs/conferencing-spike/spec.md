# conferencing-spike

## Purpose

Define the behavior of Afterlight's opt-in, bounded conferencing spike: explicit capture consent, authorized join and short-lived media grants validated independently by the media worker, media strictly isolated from the Channels/LiveView/Ash web stack, TURN for restrictive NATs, enforced mute/revoke/removal, renegotiation-based recovery, the voice → camera → screen-share feature ladder, and the measured go/no-go gate — all behind a feature flag whose off state leaves the game untouched.

## ADDED Requirements

### Requirement: Opt-in capture only

The system SHALL start microphone or camera capture only after an explicit user action that surfaces the browser permission prompt. Entering The Orpheum, joining any room, or any other navigation SHALL NOT activate capture, request capture permission, or join a call. Presence in a room SHALL NOT imply presence in a call.

#### Scenario: Entering the theater starts nothing

- **WHEN** a player enters The Orpheum and stays in the room
- **THEN** no microphone or camera capture begins and no capture permission prompt appears

#### Scenario: Explicit call start is the only capture trigger

- **WHEN** a player deliberately starts or joins a call
- **THEN** capture begins only after they grant the browser permission, and declining the permission leaves them unable to publish but still able to subscribe and chat

### Requirement: Authorized join with capacity bound

Starting or joining a call SHALL be authorized by Phoenix against the server-verified session identity, current room/call membership, moderation state, and a configurable bounded participant capacity (default 8). Joins beyond the capacity SHALL be rejected with a readable reason. Client-supplied call IDs or player IDs SHALL NEVER be accepted as proof of access.

#### Scenario: Joining within capacity issues a grant

- **WHEN** an eligible player joins an active call below the participant cap
- **THEN** Phoenix records their call membership and issues them a media grant for that call

#### Scenario: Capacity boundary enforced

- **WHEN** a player attempts to join a call already at the participant cap
- **THEN** the join is rejected with a clear reason and no grant or membership is created

### Requirement: Short-lived grants bound to call, participant, worker and permissions

Every media session SHALL be authorized by an expiring grant bound to the call, the participant, the specific media worker, and per-track publish permissions (audio, video, screen share). Grants SHALL be short-lived (minutes), renewed over the authorized signaling topic while membership holds, and revoked on leave, removal, moderation action or call close. The signed grant token SHALL NOT be persisted; only its binding metadata (issuance, expiry, revocation) is durable.

#### Scenario: Grant expires without renewal

- **WHEN** a participant's grant reaches expiry without renewal (for example after a lost connection)
- **THEN** the media worker no longer accepts the grant for publishing or subscribing, and expiry cleanup removes abandoned tracks

#### Scenario: Grant binding limits use

- **WHEN** a valid grant is presented for a different call, a different participant, a different worker, or for a publish permission it does not carry
- **THEN** the media worker rejects it

### Requirement: Independent grant validation at the media worker

The media worker SHALL validate every allocate/join/publish/subscribe request against the signed grant independently of the web tier. A call ID, room membership, or SDP/ICE message alone SHALL grant no access to media resources. Compromise or downtime of a web process SHALL NOT by itself allow unauthorized media.

#### Scenario: Forged signaling without a grant

- **WHEN** a client sends SDP offers or allocate/join requests to the media worker without a valid grant
- **THEN** the worker rejects every request and forwards no tracks for it

#### Scenario: Web restart does not open the media path

- **WHEN** the Phoenix web node restarts while a call is up
- **THEN** the media worker continues to accept only previously validated, unexpired grants and accepts nothing new without fresh authorization

### Requirement: Media path isolation

Media SHALL flow as SRTP over ICE directly between browsers and the media worker. Media packets SHALL NEVER travel through Phoenix Channels, LiveView or Ash, and no web process SHALL forward media packets. TURN relaying is the permitted exception path for connectivity, not an application-layer media route.

#### Scenario: Signaling and media take different paths

- **WHEN** a call is active with audio and camera tracks flowing
- **THEN** only SDP/ICE/control events traverse the `call:<id>` channel while the media itself reaches the worker over SRTP/ICE (relayed by TURN only when direct connectivity fails)

### Requirement: Authorized signaling topic

Call signaling SHALL occur on a per-call `call:<id>` topic. Joining the topic SHALL be authorized against current call membership, and every subsequent signaling command SHALL be re-authorized; a participant who leaves, is removed, or loses membership SHALL no longer be able to send or receive signaling on the topic. SDP/ICE candidates SHALL only ever be exchanged between authorized participants of that call.

#### Scenario: Non-member cannot join the call topic

- **WHEN** a player who is not a member of a call attempts to join its topic
- **THEN** the join is denied and the player receives no signaling or participant information for the call

#### Scenario: Removed participant loses the topic

- **WHEN** a participant is removed from a call mid-session
- **THEN** their topic subscription is revoked and further signaling from them is rejected

### Requirement: Server-enforced mute, revoke and removal

Mute and revocation SHALL be enforced at the media worker and by track stop, not merely by local volume: a muted publisher's audio SHALL stop being forwarded, and a revoked grant SHALL stop the participant's capture tracks immediately. Removing a participant mid-call SHALL tear down their subscriptions and publications and update remaining participants' call state. Local volume muting is a client comfort and SHALL NOT be relied on as privacy enforcement.

#### Scenario: Revoked grant stops tracks immediately

- **WHEN** a moderator revokes a participant's media grant mid-call
- **THEN** the participant's tracks stop being forwarded to others immediately and their capture tracks stop, even if the participant's client ignores the notification

#### Scenario: Participant removal mid-call

- **WHEN** a participant is removed from an active call
- **THEN** their publications and subscriptions are torn down at the worker and the remaining participants see the updated participant list

### Requirement: Renegotiation-based recovery

Loss of a media worker SHALL be recovered by allocating a new worker and performing ICE/SDP renegotiation; calls SHALL NOT be restored from a GenServer or process snapshot. Brief network interruptions MAY use a bounded reconnect grace; expiry SHALL clean up abandoned tracks and allocations. Interruption recovery time SHALL be measured against the < 10 s target rather than assumed.

#### Scenario: Worker killed mid-call

- **WHEN** the media worker for an active call is killed
- **THEN** participants see a visible reconnection state and the call resumes via new allocation and renegotiation on a fresh worker, without snapshot restore and without duplicating the call

#### Scenario: Recovery is measured

- **WHEN** the worker-kill recovery test runs
- **THEN** the time from worker loss to renegotiated media is recorded and reported against the < 10 s recovery target

### Requirement: TURN with short-lived credentials

Restrictive NATs SHALL be served through TURN using short-lived, expiring per-session credentials delivered only over the authorized signaling topic. The deployment SHALL expose the required UDP ports with TCP/TLS fallback for the media path rather than assuming the web load balancer transports media. Expired or forged TURN credentials SHALL be rejected. TURN-only operation SHALL be tested, not assumed.

#### Scenario: TURN-only client connects

- **WHEN** a client's network blocks direct peer connectivity so all media must relay
- **THEN** the call still establishes and carries audio (and camera where enabled) through TURN using that session's short-lived credentials

#### Scenario: Expired TURN credentials fail closed

- **WHEN** a client presents TURN credentials from a previous, ended session
- **THEN** the TURN server rejects them and no relay allocation is granted

### Requirement: Feature ladder with bounded scope

Conferencing SHALL roll out in order: opt-in voice first, then camera calls bounded at the participant cap, then a single concurrent screen share per call. Recording SHALL NOT be available in this spike; future recording SHALL only ever start as separate pipelines with visible, explicit participant consent. The participant cap SHALL be enforced for camera calls regardless of client behavior.

#### Scenario: Screen share stays single

- **WHEN** a participant starts a screen share while another participant is already sharing in the same call
- **THEN** the second share is rejected or replaces the first per a single-share policy, and never two shares at once

#### Scenario: No silent recording

- **WHEN** a call is active in this spike
- **THEN** no recording pipeline starts and no media is written to storage, since recording requires an explicit consent flow that does not exist yet

### Requirement: Local call and theater audio coexistence

The client SHALL provide local volume/ducking controls between call audio and theater screen audio so both can be used in the same room without echo or confusion. These controls are client-side comfort only and SHALL NOT change server-side enforcement of mute or revocation.

#### Scenario: Call ducks theater audio

- **WHEN** a participant in a voice call is also watching the theater screen
- **THEN** the client lets them duck or separately control the theater audio relative to call audio

### Requirement: Pinned browser compatibility matrix

The spike SHALL be verified against a pinned matrix of current Chrome, Firefox and Safari versions covering: audio-only join, camera publish/subscribe, screen share lifecycle, mute, revoke, TURN-only connectivity, and renegotiation. The tested browser versions SHALL be recorded with the gate report, and the matrix SHALL be re-run for release candidates.

#### Scenario: Matrix run recorded

- **WHEN** the compatibility matrix is executed before the gate decision
- **THEN** each browser's pass/fail per scenario and its exact version are recorded in the gate evidence

### Requirement: Measured evidence and the go/no-go gate

The spike SHALL produce measured evidence before any wider release: per-call CPU, memory and network egress; join latency with a p95 < 5 s target; interruption recovery against the < 10 s target; a 30-minute eight-person camera plus screen-share soak; a TURN-only variant; and a 100 ms RTT / 2% packet-loss variant. The go/no-go decision SHALL be evaluated against criteria committed before the runs. A NO-GO outcome SHALL retain the adapter, keep conferencing disabled, and record a future evaluation of a maintained external SFU (a future selection, not an already-verified dependency) — and SHALL NOT block any other migration phase.

#### Scenario: Gate decision documented with measurements

- **WHEN** the measurement suite completes
- **THEN** the gate report records the measurements, the pre-registered criteria, and an explicit GO or NO-GO decision with its consequences

#### Scenario: NO-GO leaves the game unblocked

- **WHEN** the gate outcome is NO-GO because SFU maintenance exceeds budget
- **THEN** conferencing stays flag-disabled, the adapter is retained, a follow-up evaluation for a maintained external SFU is filed, and game migration phases proceed without conferencing

### Requirement: Feature-flagged independence and rollback

The entire conferencing capability SHALL be behind a feature flag that defaults to off. With the flag off, no call surface, topic, grant issuance, media worker allocation or capture UI SHALL be active, and game behavior SHALL be identical to the pre-spike state. Enabling or disabling the flag SHALL NOT alter game rooms, economy, theater playback or watch-together behavior, and SHALL NOT require changes to existing game protocol messages.

#### Scenario: Flag off is game-identical

- **WHEN** the conferencing flag is off and a player plays the game
- **THEN** no call UI, signaling, or capture surface exists and all game behavior matches the state before this change

#### Scenario: Disabling mid-flight is safe

- **WHEN** the flag is turned off while calls are active
- **THEN** in-flight calls end gracefully and no game session, room or theater behavior changes
