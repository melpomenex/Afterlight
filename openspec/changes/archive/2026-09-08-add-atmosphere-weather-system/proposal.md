# add-atmosphere-weather-system

## Why

Social places need a reusable, spatially aware atmosphere that remains coherent across occupants. The present global garden-weather HUD/fog handler and unowned ambient loop cannot provide that safely.

## What Changes

- Add room-authoritative semantic atmosphere snapshots and bounded timed events on the existing Phoenix control plane; never transmit particles.
- Add retained interpolation, authored shelter/audio zones, batched precipitation, wet material families, sky/fog/light response and resource cleanup.
- Add local quality, comfort and audio controls; expose one ducking seam for the existing conferencing work and Theater engines.
- Keep legacy agricultural weather untouched; add real room-epoch integration verification as a prerequisite to synchronized activation.

## Capabilities

### New Capabilities

- `room-atmosphere`: semantic snapshots, transition/event timing, epoch/revision rules and separation from agricultural weather.
- `atmosphere-rendering`: batched effects, exposure, wetness, lifecycle and measured budgets.
- `environment-audio`: zone mixing, gesture activation, local gains and optional call/media integration.

### Modified Capabilities

None. Existing domain behavior is preserved.

## Dependencies

add-social-place-framework. Reuse add-distributed-room-ownership primitives; live owner-handle propagation must pass the explicit integration gate. Reuse realtime measurement discipline; no dependency on WebGPU. add-conferencing-media-spike owns real calls.

See [program reconciliation](../add-social-place-framework/program.md) for observed upstream status, conflicts and execution order.

## Impact

new shared/atmosphereModel.js, src/atmosphere, src/audio, Phoenix World.Atmosphere module, RoomServer and GameChannel integration, protocol catalog, settings; no database weather rows or Node weather writer.

## Non-goals

No framework migration, second room/presence authority, Theater engine rewrite, WebRTC implementation, social graph, progression system or destructive data cleanup. Planning artifacts authorize no runtime implementation in this session.

## Migration and rollback

Keep all existing wire/save IDs and original snapshots. Land incrementally with tests; revert the new client presentation or disable new atmosphere routing if acceptance fails. Never revert PostgreSQL-owned domains to an old Node writer. New client storage keys are additive and tolerate unavailable storage. All implementation tasks remain unchecked.
