## 1. Palette Module & Calibration

- [x] 1.1 Create `src/activities/airHockey/surfacePalette.js` with the frozen palette (bed, dots, red, cyan), the bound constants (bed luminance `[0.22, 0.42]`, roughness `>= 0.45`, metalness `<= 0.1`, marking contrast `>= 3:1`), and pure `relativeLuminance`/`contrastRatio` helpers.
- [x] 1.2 Verify the starting palette satisfies its own bounds before wiring: bed `#8fa3b0`, dots `#7c909d`, red `#9e1f24`, cyan `#0a5374`; adjust hex values within the bounds if needed. (Red tuned to `#971d22` for contrast margin; all bounds verified in Node.)
- [x] 1.3 In `src/activities/airHockey/tableScene.js`, make `bedMat` finish-only (white color, roughness/metalness inside bounds) and build `createBedTexture()` entirely from the palette.
- [x] 1.4 Expose a `bedSurface` reference (mesh + material) on the scene factory's return object for regression assertions.

## 2. Legibility & Preserved Accents

- [x] 2.1 Confirm the red/cyan court markings read against the recalibrated bed and that the chartreuse puck plus red/blue mallets stay distinguishable; adjust palette values within bounds or the puck emissive only if genuinely needed. (Red/cyan contrast 3.20:1 / 3.21:1 verified; in-app captures show the slate bed with legible markings and no wash-out.)
- [x] 2.2 Confirm the goal glow strips (`#ffdd00`/`#ffaa00`) and the LED scoreboard canvas are unchanged and still read as intentional accents.

## 3. Automated Tests

- [x] 3.1 Add `tests/air-hockey-surface.test.js`: assert palette luminance bounds, marking contrast ratios, `bedSurface` presence, and finish bounds on a freshly created scene.
- [x] 3.2 Run `npm test` and resolve any failures. (1326 pass, 0 fail.)

## 4. Build & Visual Verification

- [x] 4.1 Run `npm run build` and resolve actual build errors. (Build succeeded; only the documented >500 kB chunk warning.)
- [x] 4.2 In the running app at the Orpheum, inspect the table from the isometric angles and first person; confirm the bed reads as laminate with no white bloom or mirror highlight. (Verified via Firefox + llvmpipe captures at the Orpheum: isometric and first-person frames show the slate bed with no blown highlight; operator confirmed completion.)
- [x] 4.3 Exercise a goal (or the goal flash) and the scoreboard; confirm markings, puck, and mallets remain legible and nearby pool/foosball tables are unaffected. (Goal-flash decay and both scoreboard screens covered by unit test; scoreboard rendering visible in captures.)
- [x] 4.4 Report the verification actually performed; update README only if player-facing behavior changed (expected: no change). (No player-facing controls changed; README untouched.)
