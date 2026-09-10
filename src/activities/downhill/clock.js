/**
 * Downhill Mayhem shared clock
 * (integrate-multiplayer-downhill-mayhem-arcade 10.3, generalized from Summit
 * Run). Maps authoritative epoch-ms to monotonic `performance.now()` using
 * RTT-midpoint samples, keeping the lowest-RTT of the last N. Wall-clock changes
 * never move the race.
 */

export const CLOCK_TUNING = Object.freeze({ samples: 8, uncertaintyWarnMs: 250 });

export function createRaceClock(tuning = {}) {
  const t = { ...CLOCK_TUNING, ...tuning };
  const offsets = []; // {rtt, offsetMs}

  function record(serverNow, perfAt, rtt) {
    offsets.push({ rtt, offsetMs: serverNow - (perfAt + rtt / 2) });
    offsets.sort((a, b) => a.rtt - b.rtt);
    if (offsets.length > t.samples) offsets.length = t.samples;
  }

  return {
    /** Client sends at perfAt and receives at perfBack with a serverNow echo. */
    addSample(serverNow, perfAt, perfBack) {
      if (!Number.isFinite(serverNow) || !Number.isFinite(perfAt) || !Number.isFinite(perfBack)) return;
      record(serverNow, (perfAt + perfBack) / 2, Math.max(0, perfBack - perfAt));
    },

    /** A local-only sample (e.g. a snapshot with no request echo). */
    seedFromSnapshot(serverNow, perfNow) {
      if (!Number.isFinite(serverNow) || !Number.isFinite(perfNow)) return;
      record(serverNow, perfNow, 9999);
    },

    /** Convert an authoritative epoch-ms instant to a local perf deadline. */
    toPerf(serverWhenMs, perfNowMs) {
      if (offsets.length === 0) return null;
      const best = offsets[0].offsetMs;
      const uncertainty = offsets[0].rtt;
      return {
        perfMs: serverWhenMs - best,
        uncertaintyMs: uncertainty,
        syncing: uncertainty > t.uncertaintyWarnMs,
      };
    },

    /** Countdown state at a local perf time. */
    countdown(startAtMs, perfNowMs) {
      const mapped = this.toPerf(startAtMs, perfNowMs);
      if (!mapped) return { ready: false, reason: 'no_sample' };
      const remainingMs = mapped.perfMs - perfNowMs;
      return {
        ready: remainingMs <= 0,
        syncing: mapped.syncing,
        remainingMs: Math.max(0, remainingMs),
        uncertaintyMs: mapped.uncertaintyMs,
      };
    },

    get sampleCount() { return offsets.length; },
    get bestRtt() { return offsets.length ? offsets[0].rtt : null; },
  };
}
