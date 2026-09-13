/**
 * Global World System Rollout & Rollback Policy (introduce-global-world-system D1, Task 2.5).
 *
 * Query override: `?world-system=off` or `?world-system=0` forces rollback.
 * `?world-system=on` or `?world-system=1` forces enablement.
 * LocalStorage override: `afterlight-world-system` = `off` | `on`.
 * Default: build-controlled rollout flag (enabled by default when ready).
 *
 * Rollback leaves saved World preference, quality settings, identity tokens,
 * and game saves intact.
 */

export const WORLD_SYSTEM_STORAGE_KEY = 'afterlight-world-system';
export const DEFAULT_WORLD_SYSTEM_ENABLED = true;

/**
 * Reads whether the Global World System is enabled.
 *
 * @param {object} [options]
 * @param {() => string} [options.getSearch]
 * @param {() => Storage|null} [options.getStorage]
 * @param {boolean} [options.buildFlag]
 * @returns {boolean}
 */
export function readWorldSystemRollout({
  getSearch = () => (typeof window !== 'undefined' && window.location ? window.location.search : ''),
  getStorage = () => (typeof localStorage !== 'undefined' ? localStorage : null),
  buildFlag = DEFAULT_WORLD_SYSTEM_ENABLED,
} = {}) {
  try {
    const search = getSearch();
    if (search) {
      const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
      const queryVal = params.get('world-system');
      if (queryVal === 'off' || queryVal === '0') return false;
      if (queryVal === 'on' || queryVal === '1') return true;
    }
  } catch {
    // ignore query parse errors
  }

  try {
    const storage = getStorage();
    const stored = storage?.getItem?.(WORLD_SYSTEM_STORAGE_KEY);
    if (stored === 'off' || stored === '0') return false;
    if (stored === 'on' || stored === '1') return true;
  } catch {
    // storage blocked / unavailable
  }

  return Boolean(buildFlag);
}

/**
 * Sets the persistent Global World System rollout override in localStorage.
 *
 * @param {boolean|null} enabled True to enable, false to rollback, null to clear override
 * @param {object} [options]
 * @param {() => Storage|null} [options.getStorage]
 * @returns {boolean}
 */
export function setWorldSystemRollout(enabled, { getStorage = () => (typeof localStorage !== 'undefined' ? localStorage : null) } = {}) {
  try {
    const storage = getStorage();
    if (!storage) return false;
    if (enabled === null) {
      storage.removeItem?.(WORLD_SYSTEM_STORAGE_KEY);
    } else {
      storage.setItem?.(WORLD_SYSTEM_STORAGE_KEY, enabled ? 'on' : 'off');
    }
    return true;
  } catch {
    return false;
  }
}
