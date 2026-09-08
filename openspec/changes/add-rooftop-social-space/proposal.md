# add-rooftop-social-space

## Why

A rooftop gathering place should show a convincing distant city and changing sky without expanding the game into an open world. Upgrade the existing rooftops identity after Rain Court and Desert Camp have proven the reusable foundations.

## What Changes

- Recompose rooftops into a broader social deck with skyline silhouettes, bounded traffic illusion, shelter and seating.
- Use the existing scheduled atmosphere contract for sunset, cloud, light rain and night transitions.
- Retain the optional legacy anemometer restoration and saved completion; remove any need to restore it before social use.
- Require skyline-plus-weather profiling before promoting the place.

## Capabilities

### New Capabilities

- `rooftop-social-space`: bounded skyline, gathering layout, scheduled atmosphere, retained legacy interaction and acceptance.

### Modified Capabilities

None. Existing domain behavior is preserved.

## Dependencies

add-desert-camp-social-space accepted; uses A/B without inventing another weather scheduler. Larger room admission is not part of this change.

See [program reconciliation](../add-social-place-framework/program.md) for observed upstream status, conflicts and execution order.

## Impact

new src/world/rooftopWorld.js replacing buildRooftopsWorld registration, existing rooftops definition and presets, tests and docs. Existing IDs, legacy gate order and completion data retained.

## Non-goals

No framework migration, second room/presence authority, Theater engine rewrite, WebRTC implementation, social graph, progression system or destructive data cleanup. Planning artifacts authorize no runtime implementation in this session.

## Migration and rollback

Keep all existing wire/save IDs and original snapshots. Land incrementally with tests; revert the new client presentation or disable new atmosphere routing if acceptance fails. Never revert PostgreSQL-owned domains to an old Node writer. New client storage keys are additive and tolerate unavailable storage. All implementation tasks remain unchecked.
