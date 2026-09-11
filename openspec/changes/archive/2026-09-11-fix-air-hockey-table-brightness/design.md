## Context

See `proposal.md` - Why. Current state that shapes the approach:

- `src/activities/airHockey/tableScene.js` builds the bed from `bedMat` (color `#edf4f8`, roughness `0.18`, metalness `0.08`) plus a procedural court texture whose laminate background is `#f2f8fc` (near white), with `#dce6ed` perforation dots, `#d32f2f` red markings, and `#0288d1` cyan lines.
- The Orpheum adds ambient `0.42`, hemisphere `0.68`, directional fill `1.25`, and chandelier/stage point lights up to intensity `60`; the shared scene also carries hemisphere `2.2` and sun `3.0`. The composer bloom is strength `0.25`, radius `0.65`, threshold `1.05` at exposure `1.15`.
- A near-white Lambertian albedo (about `0.9`) under that irradiance produces linear values above the `1.05` bloom threshold, so the bed clips to white and blooms. The neighboring pool table reads correctly because its albedo is dark, confirming the cause is the table surface, not the room lighting.
- Node tests run without a DOM, so the court canvas cannot be pixel-sampled in `npm test`. Any contract worth testing must live in pure values the texture is built from.

## Goals / Non-Goals

**Goals:**
- The bed reads as a mid-tone laminate and stays below the bloom threshold from every supported camera mode.
- A bounded satin finish removes blown specular across the play surface.
- Red/cyan court markings stay readable; puck and mallets stay distinguishable.
- Goal glow strips and LED scoreboard remain intentional, unchanged accents.
- The palette and finish contract is unit-testable without a DOM.

**Non-Goals:**
- Changing Orpheum lighting, fog, exposure, or the shared bloom pass.
- Changing the air hockey table transform, footprint, participant anchors, rules, or networking.
- Restyling other Orpheum activities (pool, foosball, arcade cabinets).
- Save data, place manifest, or server changes.

## Decisions

1. **Fix the table surface, not the room.** Alternatives: dim the Orpheum's hall/stage lights, or raise the bloom threshold. Both would regress the rest of the room's art direction (stage, paneling, chandeliers) for a single prop. Rebalance the surface instead.

2. **Bake the entire surface palette into the court texture; keep the material color white.** The material then controls only finish (roughness/metalness), and the texture holds the exact laminate and marking colors. Alternative: tint the material and keep a near-white texture - rejected because material color multiplies the map and would unpredictably shift marking colors, and because two tone sources make the contract untestable.

3. **Extract a pure palette module, `src/activities/airHockey/surfacePalette.js`.** It exports a frozen palette, calibration bound constants, and `relativeLuminance`/`contrastRatio` helpers. `tableScene.js` consumes it. This follows the project's pure-module pattern (like `cameraControl.js`/`placeHudPolicy.js`) and gives Node tests a DOM-free way to assert the contract.

4. **Calibration bounds.** The lit bed must clear the bloom threshold with margin, not sit on it:
   - bed laminate relative luminance in `[0.22, 0.42]` (linear albedo roughly `<= 0.4`, so irradiance times albedo stays below `1.05`);
   - bed roughness `>= 0.45`, metalness `<= 0.1` (no near-mirror lobe);
   - marking contrast ratio against the bed `>= 3:1`.
   - Starting values: bed `#8fa3b0` (relative luminance ~`0.35`), dots `#7c909d`, red `#9e1f24`, cyan `#0a5374`. Final hexes may be tuned within the bounds during visual verification.

5. **Preserve accents unchanged.** Goal glow material (`#ffdd00` / emissive `#ffaa00`) and the scoreboard LED canvas stay as they are; they are deliberate small emissive accents, not the cause of the wash-out.

6. **Expose the bed surface for tests.** The factory's return object gains a `bedSurface` reference (mesh + material) so regression tests can assert finish bounds without brittle geometry searches.

## Risks / Trade-offs

- [Over-darkening hides the table in the dim theater] -> Luminance floor in the bound plus browser inspection under actual Orpheum lighting; markings contrast guard catches lost legibility.
- [The bright chartreuse puck loses luminance contrast against a lighter bed] -> Choose the bed mid-tone rather than light, rely on hue plus the puck's emissive tint and contact shadow, and inspect visually; adjust the puck only if it genuinely disappears.
- [Bloom/exposure retuned later invalidates the margin] -> The contract is a range with margin below the threshold, not one exact value keyed to today's settings.
- [Canvas textures cannot be pixel-tested in Node] -> Texture generation consumes only palette values, so tests assert the palette and the material finish rather than sampled pixels.
- [Purely presentational change could still alter cached canvases across clients] -> Per-instance textures are rebuilt on load; there is no protocol or persistence impact, so no version gating is needed.

## Migration Plan

No data migration and no server work. The change ships with the client build; rollback is a code revert. No feature flag is required.

## Open Questions

- Exact final hex values inside the stated ranges are locked by in-browser inspection at the Orpheum. The ranges are the contract, so tuning does not change this design or the specs.
