/**
 * Declarative Validation and Development Diagnostics for World System (introduce-global-world-system D3, D9, Task 3.4).
 *
 * Validates catalog integrity, asset references, adapter registrations, and view policies.
 * Catches configuration errors during build/test while providing safe playable runtime fallback.
 */

import {
  WORLD_DEFINITIONS,
  WORLD_IDS,
  validateWorldDefinitions,
} from '../../shared/worldDefinitions.js';
import {
  validateViewPolicies,
  parseViewId,
  getViewWorldSupport,
} from './registry.js';
import { resolveWorldPresentation } from './resolver.js';

/**
 * Validates all world declarations, view policies, asset references, and interpretations.
 * @param {object} [options]
 * @param {object} [options.definitions=WORLD_DEFINITIONS]
 * @returns {string[]} List of named problem strings (empty if all valid)
 */
export function validateWorldSystemDeclarations(definitions = WORLD_DEFINITIONS) {
  const problems = [];

  // 1. Catalog integrity
  const catalogProblems = validateWorldDefinitions(definitions);
  problems.push(...catalogProblems);

  // 2. View policies
  const viewProblems = validateViewPolicies();
  problems.push(...viewProblems);

  // 3. Interpretations and asset kit references
  for (const [worldId, def] of Object.entries(definitions)) {
    const assetKitSet = new Set(def.assetKit || []);
    if (def.interpretations && typeof def.interpretations === 'object') {
      for (const [viewId, interp] of Object.entries(def.interpretations)) {
        const { kind } = parseViewId(viewId);
        if (kind === 'unknown') {
          problems.push(`${worldId}.interpretations: "${viewId}" is not a valid namespaced viewId ('place:<id>' or 'activity:<type>')`);
        }
        if (interp.adapterKey && typeof interp.adapterKey !== 'string') {
          problems.push(`${worldId}.interpretations["${viewId}"]: adapterKey must be a string`);
        }
        if (Array.isArray(interp.assetIds)) {
          for (const assetId of interp.assetIds) {
            if (!assetKitSet.has(assetId)) {
              problems.push(`${worldId}.interpretations["${viewId}"]: references asset "${assetId}" not declared in assetKit`);
            }
          }
        }
      }
    }
  }

  return problems;
}

/**
 * Development diagnostic runner for a World and View combination.
 *
 * @param {object} params
 * @param {string} params.worldId
 * @param {string} [params.variantId]
 * @param {string} params.viewId
 * @param {Set<string>|Array<string>|null} [params.availableAdapters]
 * @param {Set<string>|Array<string>|null} [params.availableAssets]
 * @returns {{ valid: boolean, issues: string[], plan: object }}
 */
export function diagnoseWorldResolution({
  worldId,
  variantId,
  viewId,
  availableAdapters = null,
  availableAssets = null,
} = {}) {
  const issues = [];
  if (!WORLD_IDS.includes(worldId)) {
    issues.push(`Unknown worldId "${worldId}". Fallback will be applied.`);
  }

  const { kind } = parseViewId(viewId);
  if (kind === 'unknown') {
    issues.push(`Unknown view namespace for "${viewId}". Safe none/self fallback will be applied.`);
  }

  const plan = resolveWorldPresentation({
    selection: { worldId, variantId },
    viewId,
    availableAdapters,
    availableAssets,
  });

  if (plan.fallbackReason) {
    issues.push(`Presentation resolved with fallback: level=${plan.fallbackLevel}, reason=${plan.fallbackReason}`);
  }

  return Object.freeze({
    valid: issues.length === 0,
    issues: Object.freeze(issues),
    plan,
  });
}
