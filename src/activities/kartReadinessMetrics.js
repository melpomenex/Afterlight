/**
 * READY hit-rate and arrival lead-time metrics (fix-kart-royale-instant-entry 5.5/8.4).
 */

const WINDOW_SECONDS = [0, 2, 5, 10, 30];
const ARRIVAL_MODES = ['walk', 'run', 'bhop'];

/** @type {Array<{ ts: number, ready: boolean, mode: string, prepSeconds: number, distance: number }>} */
const samples = [];
const MAX_SAMPLES = 200;

export function recordArrivalSample({
  ready = false,
  mode = 'walk',
  prepSeconds = 0,
  distance = 0,
  now = () => Date.now(),
} = {}) {
  samples.push({
    ts: now(),
    ready: Boolean(ready),
    mode: ARRIVAL_MODES.includes(mode) ? mode : 'walk',
    prepSeconds: Math.max(0, prepSeconds),
    distance: Math.max(0, distance),
  });
  if (samples.length > MAX_SAMPLES) samples.shift();
}

export function summarizeReadinessMetrics() {
  const total = samples.length;
  const readyHits = samples.filter((s) => s.ready).length;
  const byMode = {};
  const byWindow = {};

  for (const mode of ARRIVAL_MODES) {
    const subset = samples.filter((s) => s.mode === mode);
    byMode[mode] = {
      total: subset.length,
      ready: subset.filter((s) => s.ready).length,
      hitRate: subset.length ? subset.filter((s) => s.ready).length / subset.length : null,
    };
  }

  for (const sec of WINDOW_SECONDS) {
    const subset = samples.filter((s) => s.prepSeconds <= sec);
    byWindow[`${sec}s`] = {
      total: subset.length,
      ready: subset.filter((s) => s.ready).length,
      hitRate: subset.length ? subset.filter((s) => s.ready).length / subset.length : null,
    };
  }

  return {
    total,
    readyHits,
    hitRate: total ? readyHits / total : null,
    byMode,
    byWindow,
    samples: samples.slice(-40),
  };
}

export function clearReadinessMetrics() {
  samples.length = 0;
}

if (typeof globalThis !== 'undefined') {
  globalThis.__kartReadinessMetrics = {
    recordArrivalSample,
    summarizeReadinessMetrics,
    clearReadinessMetrics,
  };
}
