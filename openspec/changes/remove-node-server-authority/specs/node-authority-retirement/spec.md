# node-authority-retirement

## Purpose

Close the Node → Elixir migration with an evidence-backed retirement of the Node game server: every migrated ownership-matrix row verified to have its Node write path disabled, the routing table free of Node owners for game domains, the transitional compatibility layer removed only after proven cutover, pre-cutover snapshots retained read-only with recorded hashes, and a final full verification sweep (both test suites, two-browser end-to-end, load re-baseline) green — with specialty sidecars retained and zero player-facing behavior change.

## ADDED Requirements

### Requirement: Evidence-backed authority audit

The retirement SHALL be gated on a row-by-row audit against `docs/architecture/elixir/ownership.md` covering ALL 22 ownership rows: for every migrated row (accounts, nicknames, movement, room membership, gardens, wallets/inventory, NPC market, order book, contracts, gather nodes, shared machines, theater bill, playlist import, IPTV, EPG, chat relay, weather), the Node write path SHALL be disabled and verified disabled with recorded evidence (test, runtime probe, or code-deletion proof). Rows 17–18 (IRC bridge + IRC server, torrent engine) SHALL be audited as retained sidecars with their authenticated adapter boundaries intact, proving the retirement did not overreach. Rows 19–21 (conferencing signaling, conferencing media, recordings) SHALL be audited as explicit audit lines recording that they are Elixir-native since P8 with no Node write path ever existing, so the closing gate is provably exhaustive.

#### Scenario: A dormant write path is caught

- **WHEN** the audit finds a Node code path still capable of writing a migrated game domain
- **THEN** retirement blocks until the path is removed or disabled and verified
- **AND** the finding and fix are recorded on the audit checklist

#### Scenario: Retained sidecars verified intact

- **WHEN** the audit reaches the torrent engine and IRC rows
- **THEN** their sidecar write surfaces (sidecar-owned library files, adapter boundaries) are verified working under the P7 adapters
- **AND** no game-domain write authority is attributed to them

### Requirement: Router free of Node owners for game domains

The gateway's domain→owner routing table SHALL contain no Node owner for any game domain after retirement; requests for game domains SHALL be served only by Phoenix/Ash/room-runtime, and an unroutable game-domain request SHALL fail loudly rather than fall back to a Node proxy.

#### Scenario: No Node fallback remains

- **WHEN** the routing table is inspected or a game-domain request is forced down an unknown route
- **THEN** no Node owner appears for game domains and no code path proxies game-domain writes to Node
- **AND** an unroutable domain produces a visible error instead of a silent Node fallback

### Requirement: Compatibility layer removed only after proof

The transitional compatibility machinery — the Node proxy boundary, dual-run configuration (process supervisors, env selectors, dual-boot dev scripts for game domains), and transitional guestId semantics (client-generated identity as authorization or as the sole self-filter/session key) — SHALL be removed item-by-item, and each item SHALL be removed only after its cutover evidence (the P2–P7 verification records) is cited. No compatibility code SHALL be deleted before its proof.

#### Scenario: Per-item removal with cited proof

- **WHEN** a compatibility item (proxy route, dual-run flag, guestId shim) is removed
- **THEN** the removal references that item's cutover evidence in the change record
- **AND** removing an item without evidence fails review

#### Scenario: Guest identity has no transitional residue

- **WHEN** identity handling is audited after removal
- **THEN** actor identity derives solely from the server-verified session and no client-supplied guestId grants authorization or selects state

### Requirement: Read-only snapshot retention and data hygiene

`data/game-state.json`, `data/iptv.json`, and `data/epg.json` SHALL be retained as read-only snapshots of their pre-cutover state, each with a recorded hash captured at retirement, and nothing in the runtime SHALL write them again. These snapshots are forensic evidence only — they are NOT a rollback source; after PostgreSQL receives authoritative writes, forward-fix (and reverse-export under write freeze) is the only posture. The `data/` cleanup policy SHALL state that original data files are never deleted; only regenerable caches (e.g., the torrent cache directory) MAY be cleared, and sidecar-owned files remain written only by their sidecar.

#### Scenario: Snapshots frozen and hashed

- **WHEN** retirement completes and the system runs its full verification sweep
- **THEN** the three snapshot files are unchanged from their recorded hashes
- **AND** no runtime code path writes them

#### Scenario: Cleanup cannot destroy originals

- **WHEN** any documented cleanup or maintenance procedure touches `data/`
- **THEN** it excludes original snapshot and sidecar-owned files from deletion
- **AND** only explicitly regenerable caches may be cleared

### Requirement: Configuration and documentation currency

Legacy Node-only env vars and dual-run selectors SHALL be deprecated with startup/config warnings naming the replacement and a documented removal timeline. README, AGENTS.md, and the architecture docs SHALL describe the post-retirement topology — Phoenix/Ash authority, room runtime, retained specialty sidecars — as the only supported configuration, with pre-migration protocol material marked historical.

#### Scenario: A deprecated variable announces itself

- **WHEN** a deployment sets a legacy Node-only env var
- **THEN** a warning names the variable, its replacement, and the removal timeline
- **AND** the documented topology in README and AGENTS.md matches the running system

### Requirement: Final full verification sweep

Retirement SHALL complete only after a recorded sweep in which `npm test` (the JS client suite, never deleted) is green, `mix test` is green, and a scripted two-browser end-to-end pass covers: travel between rooms; the garden→market→mill loop; theater playback including torrent streaming, IPTV, and EPG; chat and DMs; emotes; and reconnect with fresh snapshots. A load re-baseline SHALL repeat the P10 profile against the final topology and record results beside the prior baseline.

#### Scenario: End-to-end sweep green

- **WHEN** the scripted two-browser sweep runs against the retired topology
- **THEN** every covered scenario passes without player-visible behavior change
- **AND** both test suites report green with the results recorded

#### Scenario: Load re-baseline recorded

- **WHEN** the P10 load profile is repeated on the final topology
- **THEN** the measurements are recorded next to the prior baseline with hardware, versions, and error definitions
- **AND** any regression against the baseline is investigated before the change closes

### Requirement: No player-facing behavior change

Retirement SHALL NOT alter observable client behavior: `NetworkClient` semantics, message shapes and error strings, desiredRoom reconnect replay, snapshot-before-delta ordering, self-echo filtering, caps, and the Three.js-owned surfaces (canvas, input, camera, theater DOM) SHALL be unchanged. The internal Node proxy boundary removed by this change SHALL NOT be a client-visible protocol.

#### Scenario: Client contract untouched by retirement

- **WHEN** the two-browser sweep and the JS client suite run against the retired topology
- **THEN** reconnect replay, self-filtering, message shapes, and error strings behave exactly as before retirement
- **AND** no client change is required by this capability
