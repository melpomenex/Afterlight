/**
 * Downhill Mayhem remote interpolation
 * (integrate-multiplayer-downhill-mayhem-arcade 10.2).
 *
 * Buffers authoritative snapshots and renders remotes interpolated between the
 * two snapshots that bracket the render tick. Never animates across a crash
 * recovery/teleport (`resetSeq` clears the buffer) and never trusts a remote's
 * own transforms.
 */

export const INTERPOLATION_TUNING = Object.freeze({
  bufferMs: 100, // ~two 20 Hz snapshots
  maxSnapshots: 12,
  extrapolationMaxMs: 100,
});

const NUMERIC = ['s', 'lat', 'y', 'vs', 'vlat', 'vy', 'steerPos', 'meter', 'airTime', 'draftT', 'rubber'];
const DISCRETE = ['crashed', 'grounded', 'finished', 'trick', 'chain', 'boosting', 'invuln', 'racePos', 'punchAnimT', 'kickAnimT'];

function lerp(a, b, t) { return a + (b - a) * t; }

function interpolateRider(a, b, t) {
  if (!a) return b;
  if (!b) return a;
  const out = { ...a };
  for (const k of NUMERIC) {
    const av = a[k], bv = b[k];
    out[k] = (typeof av === 'number' && typeof bv === 'number') ? lerp(av, bv, t) : av;
  }
  for (const k of DISCRETE) out[k] = a[k];
  out.resetSeq = a.resetSeq;
  return out;
}

export function createRemoteInterpolator(tuning = {}) {
  const t = { ...INTERPOLATION_TUNING, ...tuning };
  let buffer = []; // ascending serverTick: {tick, riders}
  let lastTick = -1;
  let lastResetSeqs = {};

  return {
    push(frame) {
      if (!frame || !Number.isFinite(frame.serverTick)) return false;
      if (frame.serverTick <= lastTick) return false;
      const riders = frame.riders ?? frame.sim?.riders ?? {};
      const resetSeqs = frame.resetSeqs ?? {};
      // A changed resetSeq for any slot means a teleport/recovery: drop history.
      for (const [slot, seq] of Object.entries(resetSeqs)) {
        if (lastResetSeqs[slot] !== undefined && lastResetSeqs[slot] !== seq) buffer = [];
      }
      lastResetSeqs = { ...lastResetSeqs, ...resetSeqs };
      lastTick = frame.serverTick;
      buffer.push({ tick: frame.serverTick, riders });
      if (buffer.length > t.maxSnapshots) buffer.splice(0, buffer.length - t.maxSnapshots);
      return true;
    },

    clear() {
      buffer = [];
      lastTick = -1;
      lastResetSeqs = {};
    },

    /** Sample the whole field at an authoritative render tick. */
    sample(renderTick) {
      if (buffer.length === 0) return null;
      if (buffer.length === 1) return { riders: buffer[0].riders, extrapolated: false, stale: false };
      const first = buffer[0];
      const last = buffer[buffer.length - 1];
      const target = Math.max(Math.min(renderTick, last.tick), first.tick - (1000 / 30));

      if (target >= last.tick) {
        const stale = renderTick - last.tick > 10;
        return { riders: last.riders, extrapolated: !stale, stale };
      }
      let a = first, b = last;
      for (let i = 0; i < buffer.length - 1; i++) {
        if (buffer[i].tick <= target && target <= buffer[i + 1].tick) { a = buffer[i]; b = buffer[i + 1]; break; }
      }
      const span = b.tick - a.tick || 1;
      const alpha = (target - a.tick) / span;
      const slots = new Set([...Object.keys(a.riders), ...Object.keys(b.riders)]);
      const riders = {};
      for (const slot of slots) {
        riders[slot] = interpolateRider(a.riders[slot], b.riders[slot], alpha);
      }
      return { riders, extrapolated: false, stale: false };
    },

    get bufferedCount() { return buffer.length; },
    get latestTick() { return lastTick; },
  };
}
