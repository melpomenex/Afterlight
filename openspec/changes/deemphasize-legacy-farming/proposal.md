# deemphasize-legacy-farming

## Why

Farming-centric navigation, tools and rewards currently dominate the HUD even in social places. Demote that presentation without deleting saves or compromising the unfinished migration of existing player data.

## What Changes

- Apply a place-context HUD policy: social identity, travel, emotes and chat primary; legacy inventory/tools/market remain accessible in legacy contexts.
- Keep market and personal garden in the Places selector’s Legacy areas section; preserve direct links and shortcuts as contextual legacy affordances.
- Reconcile stale README/AGENTS ownership claims and record a non-destructive product disposition for the in-progress P6 migration.

## Capabilities

### New Capabilities

- `legacy-social-transition`: contextual legacy UX, data preservation and migration disposition.

### Modified Capabilities

None. Existing domain behavior is preserved.

## Dependencies

add-social-place-framework; may ship alongside B/C. Does not depend on P6 production cutover and MUST NOT execute it. P6 correctness/import/conservation tasks remain with add-ash-gardens-economy-restoration.

See [program reconciliation](../add-social-place-framework/program.md) for observed upstream status, conflicts and execution order.

## Impact

index.html, src/style.css, src/main.js HUD/input orchestration, src/ui/marketModal.js display policy, README.md and AGENTS.md. No table drops, deletions, migration execution or runtime economy-rule changes.

## Non-goals

No framework migration, second room/presence authority, Theater engine rewrite, WebRTC implementation, social graph, progression system or destructive data cleanup. Planning artifacts authorize no runtime implementation in this session.

## Migration and rollback

Keep all existing wire/save IDs and original snapshots. Land incrementally with tests; revert the new client presentation or disable new atmosphere routing if acceptance fails. Never revert PostgreSQL-owned domains to an old Node writer. New client storage keys are additive and tolerate unavailable storage. All implementation tasks remain unchecked.
