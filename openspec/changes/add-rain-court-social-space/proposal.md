# add-rain-court-social-space

## Why

The existing Rain Court is a small bench-and-puddle district with no actual rain. Recompose it as the first polished weather destination while preserving its public and saved identity court.

## What Changes

- Replace court scenery with an open rain square, covered arcade, alcove, seating and a rain-chain basin landmark.
- Author roof cover, wet paving/puddles, rain-on-roof audio, subtle vegetation and bounded shared lightning/thunder.
- Publish repeatable four-camera, two-client, quality-tier and travel-cleanup evidence.

## Capabilities

### New Capabilities

- `rain-court-social-space`: the navigable court composition, shelter experience, seating, atmosphere and acceptance evidence.

### Modified Capabilities

None. Existing domain behavior is preserved.

## Dependencies

add-social-place-framework → add-atmosphere-weather-system → this change; finish this slice before Desert Camp.

See [program reconciliation](../add-social-place-framework/program.md) for observed upstream status, conflicts and execution order.

## Impact

new src/world/rainCourtWorld.js, court builder registration/definition, tests and authoring/evidence docs. Preserve court ID, position in the legacy route, and existing absence of restoration requirements.

## Non-goals

No framework migration, second room/presence authority, Theater engine rewrite, WebRTC implementation, social graph, progression system or destructive data cleanup. Planning artifacts authorize no runtime implementation in this session.

## Migration and rollback

Keep all existing wire/save IDs and original snapshots. Land incrementally with tests; revert the new client presentation or disable new atmosphere routing if acceptance fails. Never revert PostgreSQL-owned domains to an old Node writer. New client storage keys are additive and tolerate unavailable storage. All implementation tasks remain unchecked.
