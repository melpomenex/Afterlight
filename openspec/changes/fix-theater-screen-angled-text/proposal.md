## Why

When viewing The Orpheum theater screen in first-person mode from an angle or close-up perspective, the idle screen text ("The screen sleeps", the booth hotkey hint, and the "Open the Booth" button) becomes severely degraded, jagged, and sliced by horizontal scanlines. This occurs because the overlay sizing logic only measures projected horizontal edge lengths (ignoring foreshortening and vertical perspective stretch), applies an under-scaled fractional font size without a legibility floor, and exposes hairline typography directly over a 2px high-frequency animated scanline pattern without anti-aliasing / contrast protection under 3D homography transforms.

## What Changes

- **Dual-Axis Quad Fitting in `fitOverlaySize`**: Measure both horizontal (`wFit`) and vertical (`hFit`) projected edge lengths so foreshortened angles at grazing perspectives size the untransformed DOM overlay to match the limiting dimension rather than squashing its vertical resolution.
- **Legible Typography Scale & Floors**: Replace brittle fractional font calculations with balanced typography scales and minimum readable floors for the title, hint, and button on the idle screen so text glyphs remain intact across arbitrary perspective view angles.
- **Anti-Aliasing & Text Contrast Protection**: Apply CSS 3D rendering enhancements (`-webkit-font-smoothing: antialiased`, text contrast shadows, and softened idle layer backgrounds) to prevent high-frequency gradient scanlines and anisotropic texture sampling from breaking thin font strokes into disjointed slivers.
- **Unit & Visual Regression Tests**: Add test coverage for perspective-angled quad fitting and verify crisp rendering in first-person angled views.

## Capabilities

### New Capabilities
<!-- None -->

### Modified Capabilities
- `video-screen`: Extend the in-world theater screen presentation requirements so that on-screen overlay text and controls remain legible, unaliased, and structurally intact when viewed at perspective angles in first-person mode.

## Impact

- `src/ui/theaterScreen.js`: Overlay sizing and quad tracking math (`fitOverlaySize`).
- `src/style.css`: Screen overlay styling, idle state typography sizing, font smoothing, and background scanline treatment for `#theater-screen`.
- `tests/theater-ui.test.js`: Unit tests for angled quad sizing and scaling limits.
