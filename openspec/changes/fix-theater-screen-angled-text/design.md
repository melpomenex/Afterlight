## Context

The Orpheum theater screen projects shared media and an idle prompt using a DOM overlay (`#theater-screen`) positioned every frame via a CSS `matrix3d` homography (`updateScreenQuad` in `src/ui/theaterScreen.js`). The builder exposes `screenQuad` (world corners with aspect ratio 13:4 = 3.25).

In first-person view, the player can stand near the screen and look up or view it from the side at grazing angles. Currently:
1. `fitOverlaySize` only checks the horizontal edge lengths (`wFit = max(bottom, top)`), setting `h = w / aspect`. When viewed at an angle, horizontal foreshortening shrinks `w` (e.g., to 400px) even when the nearest vertical edge is tall (e.g., 300px), causing `h` to be set to only ~123px. The browser rasterizes the DOM at this compressed height, and `matrix3d` stretches it vertically, magnifying pixels and distorting aspect.
2. `--ts-scale` is defined as `h / 100`. At low `h`, idle screen typography (`ts-idle-title`, `ts-idle-hint`, `ts-idle-open`) computes to fractional font sizes as low as 5px–8px with sub-pixel padding.
3. The sleeping screen background (`.ts-state-layer`) renders a 2px repeating linear gradient (`repeating-linear-gradient(0deg, #0c1614 0 2px, #101d1a 2px 4px)`). When mapped via `matrix3d` with perspective minification, the absence of GPU mipmaps causes severe aliasing and moiré, effectively slicing thin glyph strokes on alternating scanlines.

See `proposal.md` for motivation and `specs/video-screen/spec.md` for requirements.

## Goals / Non-Goals

**Goals:**
- **Dual-axis quad fitting**: Measure both horizontal (`wFit`) and vertical (`hFit`) projected edge lengths so `fitOverlaySize` sizes the overlay to prevent magnification along either axis.
- **Robust typography scaling**: Establish legible font sizes and minimum readable floors for all idle screen elements (`.ts-idle-title`, `.ts-idle-hint`, `.ts-idle-open`) so text remains crisp and intact at any angle.
- **Scanline & aliasing protection**: Soften high-frequency background stripes and apply CSS font-smoothing and text contrast shadows so 3D perspective transforms do not skip text scanlines.
- **Preserve performance & limits**: Maintain the `OVERLAY_MAX_AREA` budget (8.4M px²) and hysteresis threshold (3%) to prevent per-frame DOM thrashing.

**Non-Goals:**
- Replacing the DOM homography overlay with a WebGL canvas texture (YouTube and Vimeo iframes require DOM presentation).
- Altering the cinema watching view (`body.theater-watching`), which already uses viewport-clamped responsive styling.
- Changing server-side theater state or network protocol messages.

## Decisions

### 1. Dual-Axis Fitting in `fitOverlaySize`
- **Choice**: Measure both the maximum horizontal edge length (`max(wBottom, wTop)`) and the maximum vertical edge length (`max(hLeft, hRight)`). If `hFit * aspect > wFit`, determine `w` based on `hFit * aspect` and `h` based on `hFit`.
- **Rationale**: Ensures the overlay is rasterized at at least 1:1 scale for the most demanding dimension, preventing vertical stretching when the screen is viewed at grazing angles.
- **Alternatives Considered**:
  - Bounding box AABB: Over-allocates memory when the screen is rotated 45 degrees.
  - Fixed 4K buffer: Excess memory consumption (~33MB+ continuously on mobile devices) and poor performance on lower-end devices.

### 2. Idle Typography Scaling & Legibility Floors
- **Choice**: Update `.ts-idle` typography in `src/style.css` to use balanced font sizes with sensible minimum floors (e.g. title minimum 16px, hint minimum 11px, button minimum 11px with proper padding) and increased font weight for Space Mono (`font-weight: 500` or `700`) to prevent hairline stroke decimation.
- **Rationale**: Browser font rasterizers cannot render hairline glyphs legibly below 9px; when such small glyphs undergo 3D perspective transforms without mipmapping, single-pixel strokes inevitably alias and drop scanlines.
- **Alternatives Considered**:
  - Static fixed font size: Fails when the screen is viewed from far away in isometric mode.
  - Pure vector SVG text: Unnecessary complexity; CSS font scaling with floors works across standard HTML elements.

### 3. Anti-Aliasing & Background Gradient Softening
- **Choice**:
  - Add `-webkit-font-smoothing: antialiased`, `-moz-osx-font-smoothing: grayscale`, and `text-rendering: optimizeLegibility` to `#theater-screen`.
  - Soften `.ts-state-layer`'s 2px repeating scanlines into a broader, lower-frequency pattern (or subtle vignette gradient) so the background does not visually collide with text glyphs.
  - Add a subtle text shadow (`text-shadow: 0 1px 2px rgba(0, 0, 0, 0.7)`) to `.ts-idle` text to preserve glyph boundary contrast over animated backgrounds.
- **Rationale**: 3D GPU layer composition without mipmaps produces severe moiré on 2px repeating patterns; softening the gradient eliminates the visual "chopped scanline" artifact.
- **Alternatives Considered**:
  - Canvas 2D procedural rendering: Adds runtime overhead compared to CSS linear gradients.

## Risks / Trade-offs

- **[Risk]** Larger overlay dimensions under steep perspective could increase GPU memory usage.
  - **Mitigation**: The existing `OVERLAY_MAX_AREA` (8,400,000 px²) ceiling is preserved, flooring both sides proportionally if an extreme quad exceeds the area budget.
- **[Risk]** Hysteresis threshold (3%) could cause slight stepping during continuous rotation.
  - **Mitigation**: Sizing the raster to the larger dimension guarantees that hysteresis only down-samples within a safe 3% margin, keeping text crisp throughout head turns.
