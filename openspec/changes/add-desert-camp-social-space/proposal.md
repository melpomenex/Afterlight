# add-desert-camp-social-space

## Why

A quiet desert camp proves the place and atmosphere systems work beyond rain. A fire circle, large night sky and shared shooting stars give people reasons to linger without progression.

## What Changes

- Add desert-camp as a new stable public place with a flat navigable sand clearing, perimeter dunes, tents and oriented fire-circle seats.
- Reuse atmosphere/event/zone infrastructure for batched embers, sand, stars, a smooth fire light and timed meteors.
- Provide authored return gates, truthful directory metadata and repeatable visual/performance evidence.

## Capabilities

### New Capabilities

- `desert-camp-social-space`: camp composition, reusable fire response, sky events, navigation and acceptance.

### Modified Capabilities

None. Existing domain behavior is preserved.

## Dependencies

add-rain-court-social-space accepted after A/B foundations. Conferencing remains optional through the A integration contract.

See [program reconciliation](../add-social-place-framework/program.md) for observed upstream status, conflicts and execution order.

## Impact

new src/world/desertCampWorld.js, src/atmosphere/fireEmitter.js, place/preset registration, tests and docs. No farming, consumable fuel, rewards, new protocol or durable state.

## Non-goals

No framework migration, second room/presence authority, Theater engine rewrite, WebRTC implementation, social graph, progression system or destructive data cleanup. Planning artifacts authorize no runtime implementation in this session.

## Migration and rollback

Keep all existing wire/save IDs and original snapshots. Land incrementally with tests; revert the new client presentation or disable new atmosphere routing if acceptance fails. Never revert PostgreSQL-owned domains to an old Node writer. New client storage keys are additive and tolerate unavailable storage. All implementation tasks remain unchecked.
