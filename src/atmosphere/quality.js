/**
 * Atmosphere quality and comfort preferences (add-atmosphere-weather-system
 * task 4.3, design D8). PURE module: no Three.js, no DOM, no network.
 *
 * Decisions pinned here (program decisions 16/17):
 *   - the effect tier (normal/reduced) is SEPARATE from the existing
 *     device-pixel-ratio render-quality selector — that control keeps its
 *     own behavior and storage untouched;
 *   - the reduced-motion preference defaults to following the OS
 *     (`prefers-reduced-motion`) with a local override; when motion is
 *     reduced the effective tier is at least 'reduced', so vigorous motion
 *     is always backed by the reduced budgets. Fog, light, wetness, seats
 *     and interactions are NEVER suppressed by any preference here — only
 *     the existing global particle checkbox hides decorative particles,
 *     and it alone;
 *   - lightning flashes default to 'reduced' (half-amplitude single smooth
 *     pulse); 'off' suppresses the flash entirely but permits thunder;
 *   - budgets are the exact acceptance ceilings from D8. Nothing in this
 *     module can RAISE a ceiling — clampToBudget only ever lowers a request.
 *
 * Storage is the additive key `afterlight-atmosphere-v1`. Zero, malformed,
 * partially corrupt or unavailable storage yields session defaults derived
 * from the OS preference — never a throw, never a partial preference set.
 */

export const ATMOSPHERE_QUALITY_KEY = 'afterlight-atmosphere-v1';

export const QUALITY_TIERS = Object.freeze(['normal', 'reduced']);
export const MOTION_PREFS = Object.freeze(['os', 'on', 'off']);
export const FLASH_PREFS = Object.freeze(['reduced', 'off']);

export const DEFAULT_ATMOSPHERE_PREFERENCES = Object.freeze({
  quality: 'normal',
  reduceMotion: 'os', // 'os' follows prefers-reduced-motion; 'on'/'off' override
  flash: 'reduced',
});

/** Exact acceptance ceilings per tier (design D8). Frozen. */
export const ATMOSPHERE_BUDGETS = Object.freeze({
  normal: Object.freeze({
    rainDrops: 4096,
    splashInstances: 128,
    effectBatches: 6,
    atmosphereDrawCalls: 12,
    textureBytes: 8 * 1024 * 1024,
    cpuP95Ms: 2,
    shadowLights: 0,
    puddles: 8,
    shadowMapSize: 2048,
  }),
  reduced: Object.freeze({
    rainDrops: 1024,
    splashInstances: 32,
    effectBatches: 3,
    atmosphereDrawCalls: 6,
    textureBytes: 2 * 1024 * 1024,
    cpuP95Ms: 1,
    shadowLights: 0,
    puddles: 4,
    shadowMapSize: 1024,
  }),
});

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

export function budgetFor(tier) {
  return ATMOSPHERE_BUDGETS[QUALITY_TIERS.includes(tier) ? tier : 'normal'];
}

/** Lower a requested count to the tier ceiling. Never raises; requests above
 * the ceiling are a bug in the caller and are capped, not normalized. */
export function clampToBudget(tier, requested, field) {
  const ceiling = budgetFor(tier)[field];
  if (!Number.isFinite(ceiling)) return requested;
  const n = Number(requested);
  if (!Number.isFinite(n)) return ceiling;
  return Math.min(n, ceiling);
}

function oneOf(value, allowed, fallback) {
  return typeof value === 'string' && allowed.includes(value) ? value : fallback;
}

/**
 * Normalize a raw stored record into a full preference set. Unknown or
 * invalid fields fall back INDIVIDUALLY, so a partially corrupt record
 * keeps its good fields; a non-object yields the defaults wholesale.
 */
export function normalizeAtmospherePreferences(raw) {
  const prefs = { ...DEFAULT_ATMOSPHERE_PREFERENCES };
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return prefs;
  prefs.quality = oneOf(raw.quality, QUALITY_TIERS, prefs.quality);
  prefs.reduceMotion = oneOf(raw.reduceMotion, MOTION_PREFS, prefs.reduceMotion);
  prefs.flash = oneOf(raw.flash, FLASH_PREFS, prefs.flash);
  return prefs;
}

function readStored(storage) {
  if (!storage || typeof storage.getItem !== 'function') return null;
  let raw = null;
  try {
    raw = storage.getItem(ATMOSPHERE_QUALITY_KEY);
  } catch {
    return null; // unavailable storage
  }
  if (!raw || typeof raw !== 'string') return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null; // malformed JSON
  }
}

/**
 * Load preferences. `prefersReducedMotion` is the OS answer; storage is
 * optional (pass null in tests / private-browsing contexts). The result
 * reports honestly whether anything was restored from storage.
 */
export function loadAtmospherePreferences({ storage = typeof localStorage !== 'undefined' ? localStorage : null, prefersReducedMotion = false } = {}) {
  const stored = readStored(storage);
  const prefs = normalizeAtmospherePreferences(stored);
  return Object.freeze({
    prefs,
    fromStorage: stored !== null,
    sessionOnly: stored === null,
  });
}

/** Persist best-effort. Returns false when storage is unavailable — the
 * session keeps the choice without ever claiming it was saved. */
export function saveAtmospherePreferences(prefs, storage) {
  if (!storage || typeof storage.setItem !== 'function') return false;
  try {
    const clean = normalizeAtmospherePreferences(prefs);
    storage.setItem(ATMOSPHERE_QUALITY_KEY, JSON.stringify({ version: 1, ...clean }));
    return true;
  } catch {
    return false;
  }
}

/** 'reduced' | 'full' — the resolved motion posture for this session. */
export function resolveMotion(prefs, prefersReducedMotion = false) {
  const override = oneOf(prefs?.reduceMotion, MOTION_PREFS, 'os');
  if (override === 'on') return 'reduced';
  if (override === 'off') return 'full';
  return prefersReducedMotion ? 'reduced' : 'full';
}

/**
 * The tier the controller should run at: the stored quality, RAISED to
 * 'reduced' whenever motion is reduced (decision 17 — reduced motion is
 * backed by the reduced budgets). 'off' motion override restores the
 * stored tier even on an OS that asks for reduction.
 */
export function effectiveTier(prefs, prefersReducedMotion = false) {
  const quality = oneOf(prefs?.quality, QUALITY_TIERS, DEFAULT_ATMOSPHERE_PREFERENCES.quality);
  return resolveMotion(prefs, prefersReducedMotion) === 'reduced' ? 'reduced' : quality;
}

/**
 * Which presentation systems each posture keeps. Reduced motion retains
 * the environmental identity — fog, light, wetness, lamps — and only
 * reduces vigorous motion. Disabling particles (the existing checkbox,
 * handled by main.js) never appears here: it hides decorative particles
 * only and cannot suppress light/fog/wetness.
 */
export function describePosture(tier, motion) {
  const reduced = tier === 'reduced' || motion === 'reduced';
  return Object.freeze({
    tier: reduced ? 'reduced' : 'normal',
    motionReduced: motion === 'reduced',
    fog: true,
    lighting: true,
    wetness: true,
    particles: reduced ? 'reduced' : 'full',
    flashes: 'envelope', // the flash preference (reduced/off) lives on the events module
  });
}
