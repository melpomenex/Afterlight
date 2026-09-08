# add-social-place-framework

## Why

Afterlight needs reusable social destinations whose value is being there together. Extend the working district/world boundary while preserving The Orpheum, stable saves and the Phoenix room authority.

## What Changes

- Add a static place manifest over existing district builders, objective-free definitions, explicit gates, per-place bounds, lifecycle cleanup and specialized-controller hooks.
- Extract reusable seats and a small interaction registry; retain existing emotes and Theater presentation.
- Evolve Travel (T) into an accessible Places selector with real, bounded room-summary reads; unavailable counts remain unknown.
- Declare the integration boundary for opt-in conferencing without creating media infrastructure.

## Capabilities

### New Capabilities

- `social-place-framework`: definitions, lifecycle, specialized controllers, save compatibility and authoring.
- `social-seating`: orientation-aware seating, safe dismount and existing presence flags.
- `place-directory`: bounded public room summaries and truthful selector metadata.

### Modified Capabilities

- `biome-exploration-mechanics`: replace the navigation-dialog requirement with the Places selector while retaining legacy exploration access.

## Dependencies

Existing archived add-world-room-runtime and delivered add-phoenix-gateway-transport, add-ash-accounts-domain, add-ash-theater-catalog-domains, add-node-specialty-adapters, add-social-chat-relay; integration with add-distributed-room-ownership. Conferencing integration is conditional on add-conferencing-media-spike; it does not block this change.

See [program reconciliation](../add-social-place-framework/program.md) for observed upstream status, conflicts and execution order.

## Impact

src/main.js, src/districts.js, src/world/bounds.js, new src/places and src/social modules, shared/placeDefinitions.js, Phoenix World/RoomServer/GameChannel, index.html and CSS; additive directory messages. No new durable tables.

## Non-goals

No framework migration, second room/presence authority, Theater engine rewrite, WebRTC implementation, social graph, progression system or destructive data cleanup. Planning artifacts authorize no runtime implementation in this session.

## Migration and rollback

Keep all existing wire/save IDs and original snapshots. Land incrementally with tests; revert the new client presentation or disable new atmosphere routing if acceptance fails. Never revert PostgreSQL-owned domains to an old Node writer. New client storage keys are additive and tolerate unavailable storage. All implementation tasks remain unchecked.
