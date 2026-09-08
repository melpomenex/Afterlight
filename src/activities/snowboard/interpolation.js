/**
 * Summit Run remote rider interpolation
 * (add-multiplayer-snowboard-arcade 5.5, design D8).
 *
 * Buffers ~100 ms (two snapshots) of authoritative rider states and
 * interpolates by serverTick between them; extrapolates at most 100 ms
 * beyond the newest snapshot, then holds with a stale indicator. Wrong
 * epoch/session/match and non-increasing snapshotSeq frames are dropped;
 * equal lifecycle revision with newer motion is ACCEPTED (revision equality
 * is not staleness). resetSeq increments (crash teleports, respawns) clear
 * the buffer — interpolation never animates across a recovery teleport.
 *
 * Positions/velocities interpolate in course space (s, u, y, v, vu); yaw is
 * derived by callers from the tangent and lateral velocity (no Euler wrap
 * snap here).
 */

export const INTERPOLATION_TUNING = Object.freeze({
  bufferMs: 100,
  extrapolationMaxMs: 100,
});

function toTime(timestampMs, serverTick) {
  // Prefer the sender's correlated timestamp; fall back to tick-derived time.
  return Number.isFinite(timestampMs) ? timestampMs : serverTick * (1000 / 30);
}

export function createRemoteRiderBuffer(tuning = {}) {
  const t = { ...INTERPOLATION_TUNING, ...tuning };
  let buffer = []; // [{ at, serverTick, snapshotSeq, resetSeq, state }]
  let lastSeq = 0;
  let stale = false;

  function acceptable(frame) {
    if (!frame || !frame.state) return false;
    if (frame.snapshotSeq <= lastSeq) return false;
    return true;
  }

  return {
    /** Feed one authoritative rider state. Returns true when accepted. */
    push(frame) {
      if (!acceptable(frame)) return false;
      lastSeq = frame.snapshotSeq;

      // Session resets clear the buffer so no teleport is ever animated.
      const previous = buffer[buffer.length - 1];
      if (previous && frame.resetSeq !== previous.resetSeq) {
        buffer = [];
      }

      buffer.push({
        at: toTime(frame.at, frame.serverTick),
        serverTick: frame.serverTick,
        snapshotSeq: frame.snapshotSeq,
        resetSeq: frame.resetSeq ?? 0,
        state: frame.state,
      });
      if (buffer.length > 8) buffer = buffer.slice(-8);
      stale = false;
      return true;
    },

    /** Drop everything (wrong epoch/session/match, session reset, exit). */
    clear() {
      buffer = [];
      stale = false;
    },

    /**
     * Sample the buffered rider at `renderAtMs`. Returns
     * `{ state, stale, extrapolated }` or null when nothing is buffered.
     */
    sample(renderAtMs) {
      if (buffer.length === 0) return null;

      const newest = buffer[buffer.length - 1];

      // Interpolate target sits 100 ms behind the newest arrival.
      const target = renderAtMs - t.bufferMs;

      if (target >= newest.at) {
        const over = Math.min(target - newest.at, t.extrapolationMaxMs);
        if (target - newest.at > t.extrapolationMaxMs) stale = true;
        return {
          state: extrapolate(newest.state, over / 1000),
          stale,
          extrapolated: over > 0,
        };
      }

      // Find the bracketing pair and interpolate by serverTick/time.
      for (let index = buffer.length - 2; index >= 0; index--) {
        const a = buffer[index];
        const b = buffer[index + 1];
        if (target >= a.at) {
          const span = Math.max(1e-6, b.at - a.at);
          const alpha = (target - a.at) / span;
          return { state: lerpState(a.state, b.state, alpha), stale: false, extrapolated: false };
        }
      }

      return { state: { ...buffer[0].state }, stale: false, extrapolated: false };
    },

    get bufferedCount() {
      return buffer.length;
    },
  };
}

const LERP_FIELDS = ['s', 'u', 'y', 'v', 'vu', 'vy', 'jumpCharge'];

function lerpState(a, b, alpha) {
  const out = { ...b };
  for (const field of LERP_FIELDS) {
    const va = Number.isFinite(a[field]) ? a[field] : 0;
    const vb = Number.isFinite(b[field]) ? b[field] : 0;
    out[field] = va + (vb - va) * alpha;
  }
  // Discrete fields never interpolate.
  out.grounded = alpha < 0.5 ? a.grounded : b.grounded;
  out.nextCheckpoint = b.nextCheckpoint;
  out.recoveryTicks = b.recoveryTicks;
  out.dnfReason = b.dnfReason ?? null;
  return out;
}

function extrapolate(state, seconds) {
  if (seconds <= 0) return { ...state };
  const out = { ...state };
  out.s = (state.s ?? 0) + (state.v ?? 0) * seconds;
  out.u = (state.u ?? 0) + (state.vu ?? 0) * seconds;
  // Ballistic vertical motion only while airborne.
  if (!state.grounded) {
    out.y = (state.y ?? 0) + (state.vy ?? 0) * seconds - 10 * seconds * seconds;
  }
  return out;
}
