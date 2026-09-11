## Why

Kart Royale can render a vehicle's contact shadow visibly offset beside the car, creating the appearance of a second dark vehicle shape rather than a grounded kart. Correcting the alignment restores readable vehicle motion and visual polish during play.

## What Changes

- Align each Kart Royale vehicle's contact-shadow geometry with the corresponding kart across supported chassis/livery layouts.
- Preserve intentional lighting and shadow behavior while preventing a duplicate or laterally displaced shadow silhouette.
- Add focused regression coverage or a deterministic rendering/debug assertion for contact-shadow placement.

## Capabilities

### New Capabilities

- `kart-royale-vehicle-shadows`: Correct, stable per-kart contact-shadow placement in Kart Royale gameplay.

### Modified Capabilities

- None.

## Impact

- Affected code: Kart Royale kart model and livery/contact-shadow rendering under `games/kart-royale/src/kart/`.
- Affected systems: in-game vehicle visual rendering and its existing shadow-debug path.
- No public API, dependency, save-data, or multiplayer protocol changes are expected.
