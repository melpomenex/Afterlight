/**
 * Personal World Presentation Sampler (introduce-global-world-system D4, Task 4.1).
 *
 * Separates local visual presentation from authoritative semantic atmosphere state.
 * Composes permitted World slots (sky, lighting, fog) with base semantic presets
 * without mutating stateClient accepted state or shared/activityEnvironment.js.
 */

import { getPreset } from '../../shared/atmospherePresets.js';
import { resolveWorldPresentation } from './resolver.js';

/**
 * Samples visual presentation properties for a view based on personal World selection.
 *
 * @param {object} params
 * @param {{ worldId: string, variantId?: string }} params.worldSelection
 * @param {string} params.viewId View identifier ('place:<id>' or 'activity:<type>')
 * @param {string|null} [params.semanticPresetId] Current authoritative atmosphere preset ID
 * @param {object} [params.comfort={}] Comfort settings ({ particles?: boolean, reducedMotion?: boolean })
 * @returns {{ plan: object, visuals: object, audioProfile: string|null, particles: object|null }}
 */
export function sampleWorldPresentationVisuals({
  worldSelection,
  viewId,
  semanticPresetId = null,
  comfort = {},
} = {}) {
  const plan = resolveWorldPresentation({
    selection: worldSelection,
    viewId,
    comfort,
  });

  const semanticPreset = semanticPresetId ? getPreset(semanticPresetId) : null;
  const semanticVisuals = semanticPreset?.visuals ?? null;

  // When plan mode is 'none' or no custom atmosphere is permitted, use semantic visuals untouched
  if (!plan.atmosphere) {
    return {
      plan,
      visuals: semanticVisuals || {},
      audioProfile: semanticPreset?.audio?.ambience ?? null,
      particles: null,
    };
  }

  // Start with semantic visuals as base so undeclared/unsupported slots retain place identity
  const composed = semanticVisuals ? { ...semanticVisuals } : {};

  if (plan.atmosphere.sky) {
    Object.assign(composed, plan.atmosphere.sky);
  }
  if (plan.atmosphere.lighting) {
    Object.assign(composed, plan.atmosphere.lighting);
  }
  if (plan.atmosphere.fog) {
    Object.assign(composed, plan.atmosphere.fog);
  }

  return {
    plan,
    visuals: composed,
    audioProfile: plan.audioProfile ?? (semanticPreset?.audio?.ambience ?? null),
    particles: plan.atmosphere.particles ?? null,
  };
}
