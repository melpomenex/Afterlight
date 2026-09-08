/**
 * Registry of client-side activity modules.
 *
 * Maps an activity type (e.g. 'pong', 'rain_runner', etc.) to an activity module.
 * Modules implement:
 *   - initialize({ activityDef, world, net, generation, ... }) -> instance
 * Instance implements:
 *   - update(time, delta)
 *   - acceptSnapshot(snapshotEnvelope)
 *   - acceptEvent(eventEnvelope)
 *   - acceptResult(resultEnvelope)
 *   - acceptError(errorEnvelope)
 *   - dispose()
 */

import { ACTIVITY_TYPES } from '../../shared/placeDefinitions.js';

const modules = new Map();

/**
 * Register an activity module for a supported activity type.
 * @param {string} type
 * @param {object} moduleDef
 * @returns {object} moduleDef
 */
export function registerActivityModule(type, moduleDef) {
  if (typeof type !== 'string' || type.length === 0) {
    throw new Error('Activity type must be a non-empty string');
  }
  if (!ACTIVITY_TYPES.includes(type)) {
    throw new Error(`Cannot register unknown activity type "${type}". Must be in ACTIVITY_TYPES.`);
  }
  if (!moduleDef || typeof moduleDef !== 'object') {
    throw new Error(`Activity module for "${type}" must be an object`);
  }
  if (typeof moduleDef.initialize !== 'function') {
    throw new Error(`Activity module for "${type}" must implement initialize()`);
  }
  if (modules.has(type)) {
    throw new Error(`Duplicate activity module registration for "${type}"`);
  }
  modules.set(type, moduleDef);
  return moduleDef;
}

/**
 * Check if a module is registered for a type.
 * @param {string} type
 * @returns {boolean}
 */
export function hasActivityModule(type) {
  return modules.has(type);
}

/**
 * Get the registered module for a type.
 * @param {string} type
 * @returns {object | undefined}
 */
export function getActivityModule(type) {
  return modules.get(type);
}

/**
 * Unregister an activity module (useful in tests or hot reloading).
 * @param {string} type
 * @returns {boolean}
 */
export function unregisterActivityModule(type) {
  return modules.delete(type);
}

/**
 * Clear all registered activity modules.
 */
export function clearActivityModules() {
  modules.clear();
}

/**
 * Get all registered module keys.
 * @returns {string[]}
 */
export function activityModuleKeys() {
  return [...modules.keys()];
}
