## Context

See [proposal.md](proposal.md) for motivation and the vehicle-shadow contract in `specs/kart-royale-vehicle-shadows/spec.md`. Kart construction owns the four-wheel contact-shadow mesh and its per-frame suspension update. The render budget also switches a kart between detail and merged far-detail representations, so the fix must preserve the distinction between the intentionally rendered ground-contact shadow and the vehicle's lighting-shadow caster.

## Goals / Non-Goals

**Goals:**

- Identify the render path producing the offset silhouette from a reproducible Kart Royale race scene.
- Keep the contact-shadow mesh in the kart's authoritative ground-relative transform space.
- Ensure that detail and far-detail transitions leave exactly one contact-shadow visual per kart.
- Make the invariant diagnosable and regression-testable without relying solely on subjective screenshots.

**Non-Goals:**

- Retuning the game's artistic shadow colour, penumbra, lighting direction, or general Three.js shadow-map quality.
- Changing vehicle physics, suspension behavior, livery data, networking, or arcade-host integration.

## Decisions

### Treat the contact shadow and lighting shadow as separate render products

The implementation will first isolate the defective silhouette with the existing Kart Royale shadow diagnostics and render-mode toggles. The explicit ground-contact mesh remains responsible for wheel-footprint AO, while the vehicle detail/impostor geometry remains responsible for cast lighting shadows. This prevents a fix for one product from silently removing the other.

Alternative considered: disabling all kart shadows. This would hide the symptom but remove depth cues and does not satisfy the contact-shadow requirement.

### Preserve one authoritative kart-relative contact-shadow transform

The contact-shadow mesh will be attached and updated in the same root transform space as the wheel contact anchors. The vehicle's merged LOD proxy will not cast directional-light shadows: the low-angle key light makes those silhouettes appear laterally beside cars, which is the reported defect. The contact-shadow mesh is therefore the single shadow owner for each kart.

Alternative considered: applying a camera- or world-space correction offset. That would be fragile across turns, slopes, and different vehicle layouts.

### Validate near, far, and transition states

Focused coverage will exercise the shadow debug/placement invariant through the normal vehicle build and draw-budget state changes. Manual visual verification will include multiple kart layouts, steering, suspension travel, and a near-to-far-to-near transition.

Alternative considered: a single screenshot check. It cannot reliably detect stale or duplicated state across LOD transitions.

## Risks / Trade-offs

- [The screenshot cannot be inspected directly in the planning environment] → Reproduce in the local Kart Royale runtime and use the existing shadow diagnostic controls to attribute the offending render path before changing it.
- [Changing LOD participation can regress far-distance vehicle quality or shadow performance] → Keep the existing draw-budget thresholds and verify both near and far render states.
- [Removing kart cast shadows changes one depth cue] → Retain the suspension-aware contact-shadow mesh and leave lighting/shadows for the track, scenery, and other objects unchanged.

## Migration Plan

1. Implement the isolated render-path correction with no persistent data or protocol change.
2. Run the focused Kart Royale checks, the relevant test suite, and a production build.
3. Visually verify the race scene at near and far distances.
4. Roll back the contained rendering change if it causes a regression; no data migration or cleanup is required.
