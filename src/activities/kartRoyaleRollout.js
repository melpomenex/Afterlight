/**
 * Kart Royale preparation/retention rollout policy (fix-kart-royale-instant-entry 5.5/8.6).
 *
 * Query override: `?kartPrep=0|1` (session). Persisted override: localStorage
 * `afterlight-kart-prep-v1`. Default: enabled when frame-bound graphics jobs exist.
 */

const STORAGE_KEY = 'afterlight-kart-prep-v1';

export function readKartPrepRollout({
  getSearch = () => (typeof window !== 'undefined' ? window.location.search : ''),
  getStorage = () => (typeof localStorage !== 'undefined' ? localStorage : null),
  hasGraphicsTransactions = true,
} = {}) {
  try {
    const params = new URLSearchParams(getSearch());
    if (params.has('kartPrep')) {
      return params.get('kartPrep') !== '0';
    }
  } catch {
    // ignore malformed search
  }

  try {
    const stored = getStorage()?.getItem(STORAGE_KEY);
    if (stored === '0') return false;
    if (stored === '1') return true;
  } catch {
    // storage blocked
  }

  return Boolean(hasGraphicsTransactions);
}

export function setKartPrepRollout(enabled, { getStorage = () => localStorage } = {}) {
  try {
    getStorage()?.setItem(STORAGE_KEY, enabled ? '1' : '0');
    return true;
  } catch {
    return false;
  }
}
