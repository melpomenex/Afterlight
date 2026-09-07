# Remove Node Server Authority (Retire the Node Game Server)

## Why

Phase P11 — the migration's closing gate (`docs/architecture/elixir/ownership.md` phase map: "No Node writer remains for any migrated domain; parity + regression suites green"). Every durable and transient game domain has had an Elixir owner since P2–P7 — including the chat relay, moved by `add-social-chat-relay` in the P7 window — and distributed fencing (P9) has proven multi-node safety. What remains is risk without value: as long as any Node write path for a game domain exists — even disabled-but-present behind a dual-run config flag — the single-writer rule is enforced by discipline instead of by the codebase, the proxy boundary is a live attack/misconfiguration surface, and every future contributor must understand two backends to touch one. **Current** state: the Node server's game write paths are (at worst) dormant, its proxy compatibility layer still routes, `game-state.json`/`iptv.json`/`epg.json` sit as pre-cutover snapshots, and transitional semantics (guestId, dual-run env) linger in config and docs. **Desired** state: an evidence-backed audit showing every `ownership.md` row's Node write path disabled and verified, a router table with no Node owners for game domains, the compatibility layer removed only after cutover is proven, snapshots retained read-only with recorded hashes, and documentation describing one topology — with player-facing behavior unchanged and the specialty sidecars (torrent, IRC) explicitly retained.

## What Changes

- **Final authority audit**: a row-by-row checklist against `docs/architecture/elixir/ownership.md` — for every migrated row (1–16, 22: accounts, nicknames, movement, membership, gardens, wallets/inventory, market, orders, contracts, gather nodes, machines, theater bill, playlist import, IPTV, EPG, chat, weather) the Node write path is disabled **and verified disabled** with recorded evidence; rows 17–18 (IRC bridge, torrent engine) are checked as retained sidecars, not retired. The audit is a deliverable, not a formality.
- **Router retirement**: the gateway's domain→owner routing table has no Node owners left for game domains; the Node proxy boundary for them is deleted rather than dormant.
- **Compatibility layer removal checklist**: the P2-era transitional machinery — proxy boundary to Node, dual-run configuration, transitional guestId semantics (client-generated identity as any form of authorization or self-filter key) — is removed, each item only after its cutover evidence exists. No compatibility code is deleted before its proof.
- **Snapshot retention and data hygiene**: `data/game-state.json`, `data/iptv.json`, `data/epg.json` are retained as read-only snapshots with recorded hashes; the `data/` cleanup policy states originals are never deleted (only sidecar-owned regenerable caches may be cleared).
- **Configuration and documentation currency**: legacy Node-only env vars/config selectors are deprecated with warnings and a removal timeline; README, AGENTS.md, and the architecture docs are updated to the new topology (Phoenix/Ash authority + retained specialty sidecars).
- **Final full verification sweep**: `npm test` green (the JS client tests are never deleted), `mix test` green, and a scripted two-browser end-to-end pass — travel between rooms, garden→market→mill loop, theater playback including torrent + IPTV + EPG, chat + DM, emotes, reconnect — plus a load re-baseline against the P10 profile.

Exit gate (P11): the audit checklist is complete with evidence for every row, the sweep is green end-to-end, the re-baseline is recorded, and no code path can route a game-domain write to Node.

Depends on: `add-distributed-room-ownership` (P9 — retirement happens only after multi-node safety is proven, so removing Node's dormant paths cannot be a covert rollback hatch). P9's own measured gate may legitimately park multi-node operation when P10 evidence shows single-node suffices; in that case retirement proceeds on the recorded P10 deferral evidence plus the P9 single-node lease substrate, and the hard dependency applies only to the multi-node end-state. Presupposes the full P0–P8 sequence and the P10 suites used in the final sweep, per the umbrella `port-backend-to-elixir` ordering.

## Capabilities

### New Capabilities

- `node-authority-retirement`: the retirement contract — the evidence-backed authority audit over the ownership matrix, router/table and compatibility-layer removal gated on proven cutover, read-only snapshot retention with hashes and a never-delete-originals data policy, config/doc currency, and the final full verification sweep (JS + Elixir suites, two-browser end-to-end, load re-baseline) that closes the migration.

### Modified Capabilities

- (none — no capability has been archived yet; the single-writer and cutover rules this change enforces finally were established by the `migration-governance` capability of `port-backend-to-elixir`, which this change satisfies rather than modifies.)

## Impact

- **Removed (Node)**: game write paths and their dual-run/config toggles across `server/index.js`, `server/world.js`, `server/gardens.js`, `server/economy.js`, `server/orderbook.js`, `server/nodes.js`, `server/machines.js`, `server/theater.js`, `server/youtubePlaylist.js`, `server/iptv.js`, `server/chat.js` (game relay portions), `server/storage.js`; the Phoenix-side proxy boundary and dual-run router entries for game domains.
- **Retained (Node, unchanged authority)**: `server/torrents.js` and `server/irc.js` + bridge as specialty sidecars behind the P7 authenticated adapters (explicitly not removed).
- **Frozen as reference**: `shared/*.js` pure rules stay as the parity fixture source and JS-test substrate; the JS client (`src/`) keeps all of its tests and behavior.
- **Data**: `data/game-state.json`, `data/iptv.json`, `data/epg.json` kept read-only with recorded SHA-256 hashes in the change evidence; `data/torrents/library.json` remains sidecar-owned; policy recorded that `data/` originals are never deleted.
- **Config**: legacy Node-only env vars/selectors deprecated (startup warnings + documented removal timeline); gateway config becomes the single server topology description.
- **Data model**: none (no new tables; the audit touches no schema).
- **Protocol changes**: none player-facing — the client's Phoenix Channels transport, message shapes, and `NetworkClient` semantics are unchanged; the removed internal Node proxy boundary was never a client-visible protocol.
- **Docs**: README.md, AGENTS.md, `docs/architecture/elixir/ownership.md` (final statuses per row), `protocol-catalog.md` (baseline marked historical), and the migration README updated to the post-migration topology.
- **Tests**: no existing test deleted; the audit checklist with evidence, the two-browser end-to-end script/scenario list, and the load re-baseline report are the new artifacts; both suites must be green.
