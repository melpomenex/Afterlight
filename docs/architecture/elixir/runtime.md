# Runtime and durable state

## Current evidence

`server/index.js` is the HTTP/WebSocket composition root. `server/world.js` keeps sessions and rooms in process-local Maps and broadcasts all occupants of dirty rooms every 100 ms. Movement accepts finite client coordinates; it is not an authoritative physics simulation. `server/storage.js` synchronously serializes the whole game state and renames a temporary JSON file. Save failures are logged rather than propagated to the caller. These are concrete scale and durability limitations; no throughput baseline has been measured.

The current theater reducer is already separated from its manager, as are many garden/economy/media rules. IPTV/EPG and torrent state have separate storage. `src/net/client.js` owns reconnect and desired-room replay. The client retains camera, jump, rendering, local restoration progress and the DOM theater screen. Preserve these useful boundaries.

## Application boundaries

Proposed contexts in one Elixir codebase:

- `Afterlight.Accounts`: signed guest sessions, optional accounts, nickname allocation and session revocation.
- `Afterlight.World`: room admission, placement, movement validation, snapshots and interest subscriptions.
- `Afterlight.Gardens`: beds, growth, watering, sprinkler effects and offline catch-up.
- `Afterlight.Economy`: inventory, wallets, reservations, orders, trades, contracts and crafting transactions.
- `Afterlight.Restoration`: shared machines and gather nodes; personal exploration remains distinct.
- `Afterlight.Theater`: canonical queue, timeline, item generation and playlist import commands.
- `Afterlight.Catalog`: shared IPTV metadata, channel pages and EPG lookup.
- `Afterlight.Social`: chat, moderation and a narrow IRC adapter.
- `Afterlight.Conferencing`: grants, membership and media allocation; no packet forwarding in web processes.

Phoenix controllers, LiveViews and Channels call the same context commands. LiveView assigns are UI projections, not an independent authoritative copy of a garden or wallet. Initial release contains Repo, PubSub, Presence, Endpoint, a local Registry and a DynamicSupervisor for room processes. Import jobs run in a separate bounded worker pool backed by durable jobs. Media runs in its own release from the beginning.

## Browser integration

Mount a stable `id="afterlight-world" phx-hook="AfterlightWorld" phx-update="ignore"` island. Three.js owns its canvas, requestAnimationFrame, input, camera, local prediction and theater media DOM. LiveView owns siblings outside that island. Avoid replacing the root during panel changes or navigation. A hook starts once, reconnects its subscriptions without rebuilding GPU resources, and destroys listeners, sockets, media tracks and renderer resources on actual unmount.

Keep fast HUD effects, minimap, homography and camera updates local. Move panels gradually; existing imperative UI cannot simply be patched by LiveView while also owning the same children. Hook events bridge coarse state changes. Rendering continues during a network disconnect with a visible connection state; authoritative mutations are disabled until resynchronization.

Use a Channels client behind the existing NetworkClient interface; Phoenix framing is not wire-compatible with the existing raw WebSocket messages. Preserve desiredRoom, default theater entry, seated/airborne flags, emotes and snapshot-before-delta semantics. LiveView and game Channels can have separate socket connections using the same signed identity; count both in load tests.

## Room authority and partitioning

Identify a room by `{region, district_id, instance_id}`. A private garden additionally authorizes its owner. Preserve district IDs; do not confuse the explorable `garden` district with a personal cultivation plot. A room instance has one supervised owner, a bounded mailbox, transient actor state and a monotonically increasing revision. Presence tracks membership and coarse status only; it does not carry 10 Hz positions or decide mutation authority.

Initially one node owns every room. For multi-node operation, introduce a directory backed by PostgreSQL leases: room key, owner node, epoch, expiry. Acquisition atomically increments the epoch; renewals compare owner/epoch using database time. Every durable room mutation checks the current epoch and unexpired lease in its transaction. A partitioned owner stops accepting commands when renewal fails. Gateways stop routing to expired owners; successor snapshots carry a new epoch and clients discard older-epoch messages. Presence/PubSub and a local Registry do not provide distributed single-writer consensus.

Loss of ownership pauses the affected room and rebuilds from durable state; transient positions may reset to safe entrances. Do not promise seamless process migration. Bound drain time during deploys, reject new room allocations to draining nodes, and let clients rejoin with jitter. At larger scale partition workers by room instance; avoid a global GenServer for all rooms. Pin parties together and make any instance switching visible to users.

## Event contract and overload

Proposed topics: `room:<district>:<instance>`, `player:<id>`, `theater:<instance>`, `call:<id>`. Authorize every join, then authorize every command against current membership. Never trust a supplied player ID or room ID as proof of access.

Durable command envelope: `{protocol_version, request_id, expected_revision, payload}`. Derive actor and room from the server session. Response: `{request_id, result, revision, epoch}`. Persist a deduplication receipt keyed by actor and request ID with payload hash; retrying different payload under the same ID is rejected. Publish after commit using an outbox; deduplicate repeat delivery with event IDs/revisions. A missing revision triggers a fresh snapshot, not blind delta application. Publish is at-least-once, not exactly-once.

Movement uses `{sequence, x, z, yaw, walking, sitting, airborne}` initially at the existing 10 Hz. Validate finite values, room bounds, permitted speed/elapsed time and state transitions; later input-based authoritative simulation is a separate change. Arrival time is server-owned. Keep only the newest unsent movement per actor, coalesce snapshots and cap per-client outbound buffers. Disconnect/resnapshot slow consumers rather than retaining unlimited frames. Never silently drop economic commands: reject with a retryable overload response before execution.

Use spatial interest groups if crowded rooms require them; neighboring cell subscriptions need a margin to avoid boundary flicker. Do not send updates for every avatar to every player globally. PubSub fanout is transient delivery; reconnect always fetches state.

## PostgreSQL model and transaction boundaries

Suggested tables: players, guest_sessions, wallets, inventory_balances, gardens, beds, sprinklers, gather_nodes, machines, machine_contributions, orders, trades, ledger_entries, contracts, theater_rooms, theater_items, playlist_lists, playlist_channels, epg_programmes, command_receipts, outbox_events and room_leases. Optional personal_exploration stores validated browser-save imports separately from communal restoration.

Use integer coins/quantities, nonnegative constraints, unique IDs and explicit reservation balances. Index orders by market/item/side/price/time; channels by list and country/category; programmes by channel identity and time interval. Store source upload blobs and recordings in object storage; cache parsed guide queries. EPG data never becomes a massive game-room snapshot.

Harvest commits bed state and inventory together. A market fill commits buyer/seller balances, reservations, inventory, order remainders, fee and ledger rows in one transaction. Lock rows in deterministic order; use a per-market transactional lock for matching if needed, then benchmark contention. Ecto.Multi organizes operations but row locks, constraints and isolation enforce correctness. Retrying transactions must reuse idempotency keys. Never split a fill across independent player actors and hope messages arrive together.

Theater mutations lock the room record, update its revision, and commit queue plus playback timeline atomically. Every ended/failed report includes current item ID and generation; stale reports cannot advance a new item. Catalog deletion does not alter playback. Gardens use persisted timestamps plus deterministic weather intervals to reproduce growth and sprinkler water consumption while inactive; verify against the current per-second simulation before replacing it. Avoid one always-awake process/timer per bed.

## Operations and security

TLS terminates at a WebSocket-capable gateway; PostgreSQL and BEAM distribution stay on private networks. Short-lived signed guest credentials replace possession of a client-supplied guestId. Historical guest IDs are not secure proof of ownership; define a controlled migration claim window or manual account recovery before public exposure.

Measure connection counts, room sizes, process memory, mailbox depth, scheduler utilization, tick lag, dropped/coalesced movement, join latency, DB pool waits, transaction retries, outbox age and import queue depth. Correlate request/room IDs without logging tokens or private messages. Back up PostgreSQL with restore drills and explicit retention. DB outage means durable actions fail closed; ephemeral movement can continue only while valid room ownership is retained. Static rendering and an established call can survive a web restart, but call recovery still needs tested renegotiation.
