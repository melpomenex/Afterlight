# Proposed architecture decisions

All decisions are proposals pending implementation evidence.

## ADR-001: Preserve Three.js; introduce LiveView around it

The current camera, collision, animation and media overlay are browser-native. Keep them in one JS-owned island. Use LiveView for slower stateful UI. This preserves responsiveness and avoids sending frame-rate state through HTML diffs. Cost: continued JavaScript and explicit ownership of each DOM subtree.

## ADR-002: Channels carry realtime game events

Use Channels topics with authorization and snapshots; Presence contains coarse membership. Movement stays transient and coalesced. This fits Phoenix's realtime abstractions without making Presence a physics database. Cost: a protocol adapter and explicit overload/reconnect handling.

## ADR-003: PostgreSQL owns valuable durable state

Replace whole-file saves with transactions, constraints, receipts and an outbox. Actor serialization alone cannot atomically transfer assets between players or survive failures. Cost: schema migrations, database operations and contention testing. No event-sourcing platform is required initially.

## ADR-004: Bound rooms and fence distributed owners

One room process is an execution unit, not an unlimited shard. Introduce instance IDs and leases/epochs when distributing ownership. Prefer consistency for valuable mutations during partitions. Cost: visible room recovery and product decisions about party placement and shared theater instances.

## ADR-005: Separate signaling from media

Phoenix authorizes and signals; a separate Membrane release handles media. Keep an adapter around the SFU because RTC Engine is archived and primitives still need a production implementation. Cost: another service and substantial WebRTC validation. Never make a conference outage stop the market.

## ADR-006: Preserve direct watch-together and specialist Node code

Provider embeds remain in the browser. Retain WebTorrent and initially IRC behind authenticated boundaries. Elixir migration need not replace mature specialty integrations before value is demonstrated. Cost: a small polyglot deployment and API compatibility tests.

## ADR-007: Migrate one authority at a time

Use fixtures and domain routing, then freeze/import/reconcile before switching writers. Reject dual writes for inventory, balances and theater state. Cost: short maintenance windows and an explicit post-cutover rollback/export procedure.
