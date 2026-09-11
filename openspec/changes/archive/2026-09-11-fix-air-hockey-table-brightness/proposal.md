## Why

In the Orpheum, the air hockey table's near-white laminate bed and low-roughness finish blow out to a glowing white under the hall/stage lighting and the 1.05-threshold bloom. The play surface reads as a light source instead of furniture, washing out the court markings, puck, and mallets and breaking the restrained, amber-on-desaturated-stone art direction of the place.

## What Changes

- Recalibrate the air hockey bed luminance to a mid-tone, theater-appropriate laminate so the lit surface stays below the bloom threshold instead of clipping to white.
- Raise the bed surface roughness (and remove near-mirror specular response) so the overhead lights and scoreboard do not produce blown highlights across the play surface.
- Keep the court markings (red center line/circle/creases, cyan defensive lines) visually legible against the darker bed, and preserve puck and mallet contrast.
- Leave intentional emissive accents unchanged: the goal-flash glow strips and the LED scoreboard remain as designed.
- Add a regression check that asserts the bed material and court texture stay within the calibrated luminance/roughness bounds.

## Capabilities

### New Capabilities

- `air-hockey-table-presentation`: Calibrated, readable air hockey table surface rendering for the Orpheum activity (bed luminance, finish, marking legibility, and preserved accent glow).

### Modified Capabilities

<!-- None: no existing spec under openspec/specs/ defines air hockey table presentation. -->

## Impact

- Client: `src/activities/airHockey/tableScene.js` (bed material, bed court texture, and derived surface parameters) plus a pure `src/activities/airHockey/surfacePalette.js` module holding the calibrated palette and contrast helpers.
- Tests: new `tests/air-hockey-surface.test.js` for palette/finish/contrast regression assertions.
- No network, persistence, manifest, or server changes; activity definition, transforms, and rules are unaffected.
