## Why

Billiards currently sounds electronic rather than physical: brief oscillator sweeps stand in for cue, resin, rubber and pocket impacts. Event-field mismatches also flatten collision dynamics and omit pocket sounds, weakening the connection between the visible shot and what players hear.

## What Changes

- Replace placeholder impact tones with a small, locally hosted sample palette for cue contact, ball collisions, cushions and pocket drops, with velocity layers and restrained variation.
- Add quiet movement-driven cloth rolling/sliding that fades naturally as balls settle.
- Normalize physics, snapshot and activity-event audio through one bounded presentation path; repair speed and pocket naming mismatches and suppress replayed contacts without erasing legitimate break impacts.
- Give players and nearby spectators consistent shot audio, with table-relative positioning, distance attenuation and the existing Sound/effects controls.
- Tie loading, sources and scheduled sounds to the active table lifecycle; tolerate unavailable audio without blocking play.
- Require listening evidence as well as automated checks for soft shots, hard breaks, banks and pockets.

## Capabilities

### New Capabilities

- `billiards-audio`: Material-specific, motion-responsive billiards sound, event synchronization, spatial presentation and resource lifecycle. Complements the pending `social-billiards` capability in `add-place-activities-program`.

### Modified Capabilities

None. Existing `environment-audio` gain and gesture requirements remain unchanged and are consumed by this feature.

## Impact

Primary surfaces: `src/activities/pool/audio.js`, `src/activities/pool.js`, the shared pool physics event metadata, matching Elixir pool physics/session serialization where needed, new local audio assets and focused tests. Reuse `src/audio/mixer.js` and existing activity lifecycle; no new audio library, transport, gameplay rules, save data or deployment changes. Additive event metadata must preserve legacy consumers and JS/Elixir parity. Coordinate integration with the active global-world change without modifying its planning artifacts.
