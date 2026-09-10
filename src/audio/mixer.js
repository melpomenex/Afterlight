/**
 * The local audio mixer (add-atmosphere-weather-system task 4.1, design D7).
 *
 * ONE AudioContext, created lazily on an explicit user gesture and shared by
 * everything: environment (ambience + weather), effects (footsteps, chimes)
 * and the logical media/voice factors. The context and the retained gain
 * hierarchy are owned here and by nobody else; consumers connect their own
 * short-lived sources into the buses.
 *
 * Design rules pinned in this file:
 *   - Independent logical gains: ambience/weather/effects are WebAudio bus
 *     gains; media and voice are NUMERIC factors because provider engines
 *     (YouTube/Vimeo/<video>) keep their own playback path — the game never
 *     creates a MediaElementSource (videos deliberately omit crossOrigin)
 *     and there is no capture/voice detector in B (P8 owns real calls).
 *   - Preferences live in the additive key `afterlight-audio-v1`, clamped
 *     to 0..1; malformed or unavailable storage falls back to session-only
 *     defaults without pretending anything was persisted.
 *   - Master sound gate: the game's Sound toggle (owned by main.js) starts
 *     OFF and gates `mediaGain()` to 0 — media provider engines keep their
 *     own playback path, so this factor is the only seam that can silence
 *     them. Synth buses need no gate: the Sound gesture creates/resumes the
 *     context, so they are silent until it runs anyway.
 *   - The optional P8 hook is exactly `setVoiceActive(boolean)`: while a
 *     call is active the environment bus ducks to 0.35x (attack 150ms,
 *     release 600ms) and the media factor to 0.6x. The user's own voice
 *     preference is never ducked. `clearDuck()` is the removal/travel path.
 *   - Autoplay denial is tolerated: `ensure()` never throws, `resume()`
 *     resolves honestly with the context still suspended, and the next
 *     explicit Sound gesture retries.
 *   - The footstep preference (`afterlight-footsteps`) stays owned by
 *     main.js; this module only supplies the effects bus it feeds.
 */

export const AUDIO_PREFS_KEY = 'afterlight-audio-v1';

/** Logical gain names and their defaults after the enabling gesture (D7). */
export const AUDIO_PREF_NAMES = Object.freeze(['ambience', 'weather', 'effects', 'media', 'voice']);

export const DEFAULT_AUDIO_PREFS = Object.freeze({
  ambience: 0.35,
  weather: 0.35,
  effects: 0.7,
  media: 1,
  voice: 1,
});

/** P8 duck policy (D7): one mix state hook, bounded ramps. */
export const DUCK_ENV_LEVEL = 0.35;
export const DUCK_MEDIA_LEVEL = 0.6;
export const DUCK_ATTACK_MS = 150;
export const DUCK_RELEASE_MS = 600;
const DUCK_STEP_MS = 50;

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

function defaultContextClass() {
  if (typeof AudioContext === 'function') return AudioContext;
  if (typeof globalThis !== 'undefined' && typeof globalThis.webkitAudioContext === 'function') {
    return globalThis.webkitAudioContext;
  }
  return null;
}

/** Tolerant preference read: anything malformed falls back per-field. */
function sanitizePrefs(raw) {
  const prefs = { ...DEFAULT_AUDIO_PREFS };
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return prefs;
  for (const name of AUDIO_PREF_NAMES) {
    const value = Number(raw[name]);
    if (Number.isFinite(value)) prefs[name] = clamp01(value);
  }
  return prefs;
}

function readStoredPrefs(storage) {
  if (!storage || typeof storage.getItem !== 'function') return null;
  let raw = null;
  try {
    raw = storage.getItem(AUDIO_PREFS_KEY);
  } catch {
    return null; // unavailable storage: session-only defaults
  }
  if (!raw || typeof raw !== 'string') return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null; // malformed JSON: defaults, never a throw
  }
}

export function createAudioMixer({
  contextClass = defaultContextClass(),
  storage = typeof localStorage !== 'undefined' ? localStorage : null,
  clock = () => (typeof performance !== 'undefined' ? performance.now() : Date.now()),
  // Injectable timers keep the media-factor duck ramp deterministic in tests.
  scheduleDelay = (fn, ms) => setTimeout(fn, ms),
  cancelDelay = (id) => clearTimeout(id),
} = {}) {
  if (contextClass !== null && typeof contextClass !== 'function') {
    throw new Error('createAudioMixer: contextClass must be a constructor or null');
  }

  let context = null;
  let disposed = false;
  let soundEnabled = false; // the game's Sound toggle; media stays silent until it is on
  let voiceActive = false;
  let mediaFactor = 1;
  let mediaRampTimer = null;

  const prefs = sanitizePrefs(readStoredPrefs(storage));
  const mediaListeners = new Set();

  // Retained bus graph: master → environment(ambience, weather) + effects.
  const buses = { master: null, environment: null, ambience: null, weather: null, effects: null };

  function notifyMedia() {
    for (const fn of mediaListeners) {
      try { fn(mediaGain()); } catch { /* a listener must never break the ramp */ }
    }
  }

  function applyBusGain(node, value) {
    if (!node || !context) return;
    // Small smoothing keeps slider moves click-free without a second source
    // of truth: the node itself is the only mutable carrier of the gain.
    try {
      node.gain.setTargetAtTime(value, context.currentTime, 0.05);
    } catch {
      node.gain.value = value;
    }
  }

  function buildGraph() {
    context = new contextClass();
    const master = context.createGain();
    master.gain.value = 1;
    master.connect(context.destination);

    const environment = context.createGain();
    environment.gain.value = 1;
    environment.connect(master);

    const ambience = context.createGain();
    ambience.gain.value = prefs.ambience;
    ambience.connect(environment);

    const weather = context.createGain();
    weather.gain.value = prefs.weather;
    weather.connect(environment);

    const effects = context.createGain();
    effects.gain.value = prefs.effects;
    effects.connect(master);

    buses.master = master;
    buses.environment = environment;
    buses.ambience = ambience;
    buses.weather = weather;
    buses.effects = effects;
    return context;
  }

  /** Create the context on an explicit gesture. Returns null when audio is
   * unavailable (no constructor or a denied constructor) — never throws. */
  function ensure() {
    if (disposed) return null;
    if (context) return context;
    if (!contextClass) return null;
    try {
      return buildGraph();
    } catch {
      context = null;
      return null;
    }
  }

  function status() {
    if (!context) return 'unavailable';
    return context.state === 'running' ? 'running' : 'suspended';
  }

  /** Autoplay denial resolves instead of throwing: the caller reports the
   * honest state and the next explicit gesture retries. */
  async function resume() {
    if (!context) return false;
    try {
      await context.resume();
    } catch {
      /* stay suspended; retried on the next gesture */
    }
    return context.state === 'running';
  }

  async function suspend() {
    if (!context) return false;
    try {
      await context.suspend();
    } catch {
      /* treat as suspended either way */
    }
    return true;
  }

  function preference(name) {
    if (!AUDIO_PREF_NAMES.includes(name)) return 0;
    return prefs[name];
  }

  function setPreference(name, value) {
    if (!AUDIO_PREF_NAMES.includes(name)) return 0;
    const v = clamp01(Number(value));
    if (!Number.isFinite(v)) return prefs[name];
    prefs[name] = v;
    if (name === 'ambience') applyBusGain(buses.ambience, v);
    if (name === 'weather') applyBusGain(buses.weather, v);
    if (name === 'effects') applyBusGain(buses.effects, v);
    // Persist best-effort; storage failure keeps the choice session-only.
    if (storage && typeof storage.setItem === 'function') {
      try {
        storage.setItem(AUDIO_PREFS_KEY, JSON.stringify({ version: 1, ...prefs }));
      } catch {
        /* session-only */
      }
    }
    return v;
  }

  function preferences() {
    return Object.freeze({ ...prefs });
  }

  // --- P8 duck (the ONE conferencing mix seam) ---

  function rampMediaTo(target, durationMs) {
    if (mediaRampTimer !== null) {
      cancelDelay(mediaRampTimer);
      mediaRampTimer = null;
    }
    if (durationMs <= 0) {
      mediaFactor = target;
      notifyMedia();
      return;
    }
    const from = mediaFactor;
    const startedAt = clock();
    const step = () => {
      mediaRampTimer = null;
      const u = Math.min(1, Math.max(0, (clock() - startedAt) / durationMs));
      const value = from + (target - from) * u;
      if (value !== mediaFactor) {
        mediaFactor = value;
        notifyMedia();
      }
      if (u < 1) mediaRampTimer = scheduleDelay(step, DUCK_STEP_MS);
    };
    mediaRampTimer = scheduleDelay(step, DUCK_STEP_MS);
  }

  /** The single P8 mix-state hook. Default state is inactive. */
  function setVoiceActive(active) {
    const next = !!active;
    if (next === voiceActive) return;
    voiceActive = next;
    if (context && buses.environment) {
      const now = context.currentTime;
      const target = voiceActive ? DUCK_ENV_LEVEL : 1;
      const duration = (voiceActive ? DUCK_ATTACK_MS : DUCK_RELEASE_MS) / 1000;
      try {
        buses.environment.gain.cancelScheduledValues(now);
      } catch { /* fake contexts may skip scheduling */ }
      buses.environment.gain.setValueAtTime(buses.environment.gain.value, now);
      buses.environment.gain.linearRampToValueAtTime(target, now + duration);
    }
    rampMediaTo(voiceActive ? DUCK_MEDIA_LEVEL : 1, voiceActive ? DUCK_ATTACK_MS : DUCK_RELEASE_MS);
  }

  /** Adapter removal / travel / failure: no stuck ducking, ever. */
  function clearDuck() {
    if (!voiceActive && mediaFactor === 1 && mediaRampTimer === null) return;
    voiceActive = false;
    if (context && buses.environment) {
      const now = context.currentTime;
      try {
        buses.environment.gain.cancelScheduledValues(now);
      } catch { /* ignore */ }
      buses.environment.gain.setValueAtTime(buses.environment.gain.value, now);
      buses.environment.gain.linearRampToValueAtTime(1, now + DUCK_RELEASE_MS / 1000);
    }
    rampMediaTo(1, DUCK_RELEASE_MS);
  }

  function isVoiceActive() {
    return voiceActive;
  }

  /** Master sound gate (main.js owns the toggle; the default is off so a
   * fresh page load is silent, theater media included). Idempotent; the
   * change reaches media listeners so live engines re-apply volume. */
  function setSoundEnabled(enabled) {
    const next = enabled === true;
    if (next === soundEnabled) return soundEnabled;
    soundEnabled = next;
    notifyMedia();
    return soundEnabled;
  }

  function isSoundEnabled() {
    return soundEnabled;
  }

  /** Effective local media multiplier: the master sound gate x user
   * preference x duck factor. The Theater seam multiplies its own stored
   * user volume by this. */
  function mediaGain() {
    if (!soundEnabled) return 0;
    return clamp01(prefs.media) * clamp01(mediaFactor);
  }

  function onMediaGainChange(fn) {
    if (typeof fn !== 'function') return () => {};
    mediaListeners.add(fn);
    return () => mediaListeners.delete(fn);
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    clearDuck();
    if (context) {
      for (const node of Object.values(buses)) {
        try { node?.disconnect(); } catch { /* already gone */ }
      }
    }
    buses.master = null;
    buses.environment = null;
    buses.ambience = null;
    buses.weather = null;
    buses.effects = null;
    context = null;
  }

  return {
    ensure,
    resume,
    suspend,
    status,
    preference,
    setPreference,
    preferences,
    setVoiceActive,
    clearDuck,
    isVoiceActive,
    setSoundEnabled,
    isSoundEnabled,
    mediaGain,
    onMediaGainChange,
    dispose,
    get context() { return context; },
    get buses() { return buses; },
  };
}
