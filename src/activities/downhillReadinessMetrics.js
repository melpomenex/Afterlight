/**
 * Downhill Mayhem entry-readiness metrics
 * (integrate-multiplayer-downhill-mayhem-arcade 17.2, Kart pattern).
 *
 * Bounded, identifier-free local samples of how often an entry arrived with a
 * prepared/retained host and how long preparation took. Exposed on
 * `globalThis.__downhillReadinessMetrics` for the `?debug=1` gate projection;
 * never sent anywhere and never a gameplay input.
 */

const WINDOW_SECONDS = [0, 0.25, 0.5, 1, 2, 5];
const MAX_SAMPLES = 200;

/** @type {Array<{ ts:number, ready:boolean, retained:boolean, cancelled:boolean, prepSeconds:number, distance:number }>} */
const samples = [];

export function recordEntrySample({
  ready = false,
  retained = false,
  cancelled = false,
  prepSeconds = 0,
  distance = 0,
  now = () => Date.now(),
} = {}) {
  samples.push({
    ts: now(),
    ready: Boolean(ready),
    retained: Boolean(retained),
    cancelled: Boolean(cancelled),
    prepSeconds: Math.max(0, Number(prepSeconds) || 0),
    distance: Math.max(0, Number(distance) || 0),
  });
  if (samples.length > MAX_SAMPLES) samples.shift();
}

export function summarizeReadinessMetrics() {
  const total = samples.length;
  const readyHits = samples.filter((s) => s.ready).length;
  const retainedHits = samples.filter((s) => s.retained).length;
  const cancelled = samples.filter((s) => s.cancelled).length;
  const byWindow = {};

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
    retainedHits,
    cancelled,
    hitRate: total ? readyHits / total : null,
    retainedRate: total ? retainedHits / total : null,
    byWindow,
    // Last samples carry no player/session identity — timing and flags only.
    samples: samples.slice(-40),
  };
}

export function clearReadinessMetrics() {
  samples.length = 0;
}

if (typeof globalThis !== 'undefined') {
  globalThis.__downhillReadinessMetrics = {
    recordEntrySample,
    summarizeReadinessMetrics,
    clearReadinessMetrics,
  };
}
