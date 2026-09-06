# Design: migration governance (umbrella)

## Context

Audits (2026-09-06) established the complete current contract:

- Protocol/persistence: `docs/architecture/elixir/protocol-catalog.md` — every WS message type, tick, cap, HTTP endpoint, and file.
- Ownership current→target: `docs/architecture/elixir/ownership.md` — 22 subsystems with phase assignments.
- Porting hazards: `docs/architecture/elixir/parity-notes.md` — rounding, UTF-16, URL parsing, key-order semantics.
- Architecture source of truth: `docs/architecture/elixir/README.md` + runtime/media/migration/decisions, with the Ash layering decision recorded as ADR-008.
- The Node server already separates pure rules (`shared/*`) from managers; the existing `node --test` suite encodes contracts. Reference Elixir code with pinned Ash/Phoenix versions exists in `serviceradar/elixir/` (ash 3.31.3, ash_postgres 2.10.0, phoenix 1.8.11).

## Goals / Non-Goals

**Goals**

- One writer per durable domain at every instant; authority moves domain-by-domain behind a protocol router.
- Parity proven by language-neutral fixtures before Elixir takes any authority (P0 gate).
- The Three.js client and its NetworkClient contract survive the migration unchanged in behavior.
- Durable correctness: integer money, DB constraints, atomic multi-entity transactions, idempotent commands via receipts, outbox publication.
- Transient correctness: supervised room processes, coalesced movement, bounded buffers, snapshot-on-reconnect.

**Non-Goals**

- No frontend rewrite; no LiveView ownership of game DOM; no Three.js replacement.
- No movement/position rows in PostgreSQL; no Presence as authoritative state.
- No dual-write period as a migration shortcut.
- No event-sourcing platform, GraphQL, or JSON:API.
- No rewrite of WebTorrent or IRC merely because Node is being reduced.
- No distributed room ownership before measurements justify it (P9).
- No unsupported performance claims; capacity numbers are targets until measured (P10).

## Decisions

### D1 — Ash for durable domains, OTP for realtime, Ecto escape hatch
*Decision:* Ash domains (`Afterlight.Accounts/Gardens/Economy/Restoration/Theater/Catalog/Social/Conferencing`) own durable state via AshPostgres; `Afterlight.World` stays process-state. High-contention transactions (market fill) may use bounded raw Ecto/SQL behind domain functions. Room owners are plain GenServers under DynamicSupervisor.
*Alternative Considered:* pure-Ecto contexts. Rejected: policies/actions/naming discipline of Ash fit command-shaped game mutations; escape hatch preserves correctness where declarative abstraction obscures locks.

### D2 — Authority routing at the gateway
*Decision:* A domain→owner router decides per message whether the Phoenix gateway handles it locally or proxies to the Node server over a private authenticated boundary. Clients never choose.
*Alternative Considered:* client-side flag/URL per domain. Rejected: split-brain risk and stale clients.

### D3 — Signed guest credentials replace trusted guestIds
*Decision:* Phoenix issues a short-lived signed token at handshake; the token binds the session to a server-side player identity. Historical guestIds are migrated in P4 through a claim window; they stop being authorization.
*Alternative Considered:* AshAuthentication immediately. Rejected for guests: a small signed credential + Ash `GuestSession` resource is simpler; revisit for long-term accounts only.

### D4 — Cutover ceremony per domain
*Decision:* freeze → snapshot+hash → idempotent import → validate (counts, totals, conservation) → flip router → enable new writer → retain source read-only. Rollback after PG writes requires reverse export under a write freeze or restore+replay; forward-fix preferred.

### D5 — Parity harness is the admission test
*Decision:* JSON fixtures exported from the JS implementations (`tests/fixtures/parity/`) must pass against Elixir ports before a domain's cutover change may flip authority. Known hazards and comparator rules live in `docs/architecture/elixir/parity-notes.md`.

## Risks / Trade-offs

- *[Two live servers during migration]* → router + single-writer matrix + P11 retirement checklist; no domain ever has two writers.
- *[Parity gaps from float/rounding hazards]* → fixtures pin every hazard class from `parity-notes.md`; comparator is numeric-tolerant, order-sensitive where semantic.
- *[Session continuity across transport swap]* → adapter re-emits flat `{type, ...payload}`, replays `desiredRoom`, preserves snapshot ordering; covered by P2 acceptance tests.
- *[IPTV/EPG size in Postgres]* → metadata-only snapshots over the wire (as today), lazy channel pages; blobs stay out of room state.
- *[Reference code divergence]* → serviceradar pins (ash 3.31.3 etc.) are compatibility evidence, not a copy-paste mandate; we pin our own compatible set in `mix.lock` and document it.

## Migration Plan

Phases P0–P11 with gates as listed in the proposal table. Each subordinate change names its phase, its authority flip (if any), and its rollback behavior. P0 and P01 land first; the game must remain fully playable from Node until P2's router exists.

## Open Questions

- Conferencing SFU go/no-go (P8) — explicitly deferred to its spike.
- Exact Postgres provisioning for dev/CI (local cluster documented in P01 tasks) — no production decision implied.
