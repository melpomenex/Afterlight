## 1. Dual-Axis Quad Fitting

- [x] 1.1 Update `fitOverlaySize` in `src/ui/theaterScreen.js` to compute both horizontal (`wFit = max(bottom, top)`) and vertical (`hFit = max(left, right)`) projected edge lengths, sizing the overlay so neither axis is magnified under perspective foreshortening while respecting `OVERLAY_MAX_AREA`.
- [x] 1.2 Add unit tests in `tests/theater-ui.test.js` covering horizontally-foreshortened perspective quads, vertical grazing angles, and degenerate inputs.

## 2. Typography Scaling and Anti-Aliasing

- [x] 2.1 Update `.ts-idle` styles in `src/style.css` to establish legible typography scales and minimum readable font floors for `.ts-idle-title`, `.ts-idle-hint`, `kbd`, and `.ts-idle-open`, with appropriate stroke weights to prevent hairline glyph decimation.
- [x] 2.2 Add 3D CSS rendering hints (`-webkit-font-smoothing: antialiased`, `-moz-osx-font-smoothing: grayscale`, `text-rendering: optimizeLegibility`, `backface-visibility: hidden`) and text contrast protection (`text-shadow`) to `#theater-screen` and `.ts-idle` in `src/style.css`.
- [x] 2.3 Soften `.ts-state-layer`'s repeating scanline gradient in `src/style.css` to prevent high-frequency 2px moiré sampling interference with overlaid text glyphs.

## 3. Verification and Visual Validation

- [x] 3.1 Run `npm test` to verify unit test suite passes across all theater UI and place projection tests.
- [x] 3.2 Run `npm run build` to verify production bundle output cleanly without errors.
- [x] 3.3 Validate the first-person perspective rendering in The Orpheum at oblique angles to confirm text remains crisp, legible, and unbroken.
