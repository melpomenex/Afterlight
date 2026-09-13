/**
 * Compatibility exports for Theater Environments (introduce-global-world-system D1).
 *
 * Re-exports the canonical six-World definitions from shared/worldDefinitions.js
 * under their legacy Theater Environment symbol names.
 */

import {
  WORLD_DEFINITIONS,
  WORLD_IDS,
  WORLD_DEFAULT_PRESETS,
  getWorldDefinition,
  getWorldVariant,
  worldForPreset,
  worldVariantPreset,
  isWorldPreset,
  validateWorldDefinitions,
} from './worldDefinitions.js';

export const THEATER_ENVIRONMENTS = WORLD_DEFINITIONS;
export const THEATER_ENVIRONMENT_IDS = WORLD_IDS;
export const THEATER_WORLD_DEFAULT_PRESETS = WORLD_DEFAULT_PRESETS;

export function randomTheaterWorldPreset(rng = Math.random) {
  const index = Math.floor(rng() * THEATER_WORLD_DEFAULT_PRESETS.length);
  return THEATER_WORLD_DEFAULT_PRESETS[index];
}

export function getTheaterEnvironment(id) {
  return getWorldDefinition(id);
}

export function getTheaterVariant(environmentId, variantId) {
  return getWorldVariant(environmentId, variantId);
}

export function environmentVariantEntries() {
  const entries = [];
  for (const [environmentId, environment] of Object.entries(THEATER_ENVIRONMENTS)) {
    for (const [variantId, row] of Object.entries(environment.variants)) {
      entries.push({ environmentId, variantId, row });
    }
  }
  return entries;
}

export function environmentVariantPreset(environmentId, variantId) {
  return worldVariantPreset(environmentId, variantId);
}

export function environmentForPreset(presetId) {
  const match = worldForPreset(presetId);
  if (!match) return null;
  return {
    environmentId: match.worldId,
    variantId: match.variantId,
    row: match.row,
  };
}

export function isEnvironmentPreset(presetId) {
  return isWorldPreset(presetId);
}

export function validateTheaterEnvironments(environments = THEATER_ENVIRONMENTS) {
  return validateWorldDefinitions(environments);
}
