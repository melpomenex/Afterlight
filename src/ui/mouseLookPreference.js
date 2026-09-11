/**
 * Mouse-look preference (first-person look input, add-first-person-mouse-look).
 *
 * The default input is hover-follow: in first person the view follows mouse
 * movement with no button held. This module persists the reversible choice to
 * the hold-and-drag gesture. Pure and storage-injected like the legacy-HUD
 * preference in placeHudPolicy.js: reading never throws and never rewrites
 * storage — a malformed stored value is ignored for the session — and a write
 * failure keeps the choice session-local and reports false (the caller must
 * not pretend otherwise).
 */

/** Storage key for the mouse-look preference. */
export const MOUSE_LOOK_PREF_KEY = 'afterlight-mouse-look-v1';

const defaultStorage = () => (typeof localStorage !== 'undefined' ? localStorage : null);

/**
 * Read the saved mouse-look preference. Only the exact string 'off' disables
 * it; anything else — missing, corrupt, or unavailable storage — falls back
 * to the default (enabled) for this session without touching the stored value.
 */
export function readMouseLookPreference(storage = defaultStorage()) {
  try {
    return storage?.getItem(MOUSE_LOOK_PREF_KEY) !== 'off';
  } catch {
    return true;
  }
}

/**
 * Persist the preference. Returns true when it was stored; a storage failure
 * keeps the choice session-local and reports false.
 */
export function writeMouseLookPreference(value, storage = defaultStorage()) {
  try {
    storage?.setItem(MOUSE_LOOK_PREF_KEY, value ? 'on' : 'off');
    return true;
  } catch {
    return false;
  }
}
