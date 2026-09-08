/**
 * Summit Run countdown clock mapping
 * (add-multiplayer-snowboard-arcade 5.6, design D8).
 *
 * The server owns the authoritative start (monotonic internally) and
 * publishes epoch-ms `startAt` + `serverNow` for DISPLAY only. This module
 * maintains a client estimate of server time and maps the countdown into
 * `performance.now()` deadlines:
 *   - seeded from the join/countdown snapshot (serverNow correlation);
 *   - improved with echoed requestId round trips (RTT midpoint), keeping
 *     the LOWEST-RTT sample of the last eight;
 *   - local wall-clock changes never matter: only monotonic
 *     `performance.now()` is read after seeding;
 *   - large uncertainty renders "syncing" and never postpones the start —
 *     the server starts irrespective of any client countdown.
 */

export const CLOCK_TUNING = Object.freeze({
  samples: 8,
  uncertaintyWarnMs: 250,
});

export function createRaceClock(tuning = {}) {
  const t = { ...CLOCK_TUNING, ...tuning };
  let samples = []; // [{ offset, rtt, perfAt }]  (serverNow ≈ perfAt + offset)
  let basePerf = null;
  let baseOffset = 0;

  function bestSample() {
    if (samples.length === 0) return null;
    return samples.reduce((best, s) => (s.rtt < best.rtt ? s : best));
  }

  return {
    /**
     * Correlation sample: caller records perfAt right before sending and
     * perfBack right after the echo arrives; serverNow is the echoed value.
     */
    addSample(serverNow, perfAt, perfBack) {
      const rtt = Math.max(0, perfBack - perfAt);
      const offset = serverNow - (perfAt + rtt / 2);
      samples.push({ offset, rtt, perfAt });
      if (samples.length > t.samples) samples = samples.slice(-t.samples);

      const best = bestSample();
      if (best && basePerf === null) {
        basePerf = best.perfAt;
        baseOffset = best.offset;
      }
      return rtt;
    },

    /** Seed directly from a snapshot that carries serverNow (join baseline). */
    seedFromSnapshot(serverNow, perfNow) {
      return this.addSample(serverNow, perfNow, perfNow);
    },

    /**
     * Local monotonic performance-now timestamp for the epoch-ms server
     * instant `serverWhenMs`, given the caller's current perf reading.
     * Deterministic; returns null before any sample exists.
     */
    toPerf(serverWhenMs, _perfNowMs) {
      const best = bestSample();
      if (!best || !Number.isFinite(serverWhenMs)) return null;
      // The offset is anchored at best.perfAt; mapping is deterministic.
      return serverWhenMs - best.offset;
    },

    /**
     * Countdown render data for a start instant (epoch ms). Returns
     * `{ ready: false }` while uncertainty is too high, else
     * `{ ready: true, secondsLeft, uncertaintyMs, started }`.
     */
    countdown(startAtMs, perfNowMs) {
      const best = bestSample();
      if (best === null || !Number.isFinite(startAtMs)) {
        return { ready: false, reason: 'no_sample' };
      }

      const startPerf = this.toPerf(startAtMs, perfNowMs);
      const secondsLeft = (startPerf - perfNowMs) / 1000;
      const uncertaintyMs = best.rtt;

      if (uncertaintyMs > t.uncertaintyWarnMs && secondsLeft > uncertaintyMs / 1000) {
        return { ready: false, reason: 'syncing', uncertaintyMs, secondsLeft };
      }

      return {
        ready: true,
        secondsLeft: Math.max(0, secondsLeft),
        uncertaintyMs,
        started: perfNowMs >= startPerf,
      };
    },

    get sampleCount() {
      return samples.length;
    },
  };
}
