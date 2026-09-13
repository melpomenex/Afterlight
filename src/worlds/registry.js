/**
 * Central View Policy Registry (introduce-global-world-system D3).
 *
 * Bridges place definitions and activity modules to provide normalized
 * WorldSupport metadata for every namespaced View ('place:<id>' or 'activity:<type>').
 */

import { PLACE_DEFINITIONS, ACTIVITY_TYPES } from '../../shared/placeDefinitions.js';
import { getPlaceWorldSupport, normalizePlaceWorldSupport } from '../places/registry.js';
import { getActivityWorldSupport, normalizeActivityWorldSupport } from '../activities/registry.js';

const customViewSupports = new Map();

/**
 * Parses a namespaced viewId.
 * @param {string} viewId
 * @returns {{ kind: 'place'|'activity'|'unknown', id: string }}
 */
export function parseViewId(viewId) {
  if (typeof viewId !== 'string') {
    return { kind: 'unknown', id: '' };
  }
  if (viewId.startsWith('place:')) {
    return { kind: 'place', id: viewId.slice(6) };
  }
  if (viewId.startsWith('activity:')) {
    return { kind: 'activity', id: viewId.slice(9) };
  }
  return { kind: 'unknown', id: viewId };
}

/**
 * Registers an explicit WorldSupport override for a view.
 * @param {string} viewId
 * @param {object} support
 */
export function registerViewSupport(viewId, support) {
  if (typeof viewId !== 'string' || viewId.length === 0) {
    throw new Error('viewId must be a non-empty string');
  }
  const parsed = parseViewId(viewId);
  const normalized = parsed.kind === 'activity'
    ? normalizeActivityWorldSupport(support)
    : normalizePlaceWorldSupport(support);
  customViewSupports.set(viewId, normalized);
}

/**
 * Resolves normalized WorldSupport for a viewId.
 * @param {string} viewId
 * @returns {object} Normalized WorldSupport { mode, host, slots, adapterKey, defaultPresentationKey }
 */
export function getViewWorldSupport(viewId) {
  if (customViewSupports.has(viewId)) {
    return customViewSupports.get(viewId);
  }
  const { kind, id } = parseViewId(viewId);
  if (kind === 'place') {
    return getPlaceWorldSupport(id);
  }
  if (kind === 'activity') {
    return getActivityWorldSupport(id);
  }
  return Object.freeze({
    mode: 'none',
    host: 'self',
    slots: Object.freeze([]),
    adapterKey: null,
    defaultPresentationKey: null,
  });
}

/**
 * Validates the view policies across all places and activity types.
 * @returns {string[]} List of validation problems (empty if all valid)
 */
export function validateViewPolicies() {
  const problems = [];

  // 1. Validate all shipped places + market
  const shippedPlaceIds = [...Object.keys(PLACE_DEFINITIONS), 'market'];
  for (const placeId of shippedPlaceIds) {
    const viewId = `place:${placeId}`;
    const support = getViewWorldSupport(viewId);
    if (!['full', 'partial', 'ambient', 'none'].includes(support.mode)) {
      problems.push(`${viewId}: invalid mode "${support.mode}"`);
    }
    if (!['self', 'parent'].includes(support.host)) {
      problems.push(`${viewId}: invalid host "${support.host}"`);
    }
    if (placeId === 'theater' && support.mode !== 'full') {
      problems.push(`${viewId}: theater must have full mode`);
    }
  }

  // Ensure test fixture tiny-view is not a shipped place
  if (Object.prototype.hasOwnProperty.call(PLACE_DEFINITIONS, 'tiny-view')) {
    problems.push('tiny-view: fixture must not be exposed as a shipped place definition');
  }

  // 2. Validate all activity types
  for (const type of ACTIVITY_TYPES) {
    const viewId = `activity:${type}`;
    const support = getViewWorldSupport(viewId);
    if (!['full', 'partial', 'ambient', 'none'].includes(support.mode)) {
      problems.push(`${viewId}: invalid mode "${support.mode}"`);
    }
    if (!['self', 'parent'].includes(support.host)) {
      problems.push(`${viewId}: invalid host "${support.host}"`);
    }
  }

  return problems;
}
