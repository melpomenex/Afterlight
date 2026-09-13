/**
 * Pure billiards audio-event normalization, reconciliation and cue ownership
 * (Spec convincing-billiards-audio; no DOM, no WebAudio, no network).
 *
 * Every ingestion path (local prediction steps, authoritative snapshots,
 * activity events, the local cue animation) funnels through this module so
 * the sample engine only ever sees normalized, deduplicated contacts:
 *
 *   - normalizePoolAudioEvent(): accepts current AND legacy payloads
 *     (`speed` / `relativeSpeed`, `pocketed` / `pocket`), preserves zero
 *     intensity, caps unreasonable speeds, rejects malformed contacts, and
 *     falls back to known pocket centers for legacy positions.
 *   - createShotEventReconciler(): bounded shot-scoped replay tracking. A
 *     contact already presented by local prediction is consumed silently
 *     when the authoritative copy arrives (and vice versa); distinct later
 *     contacts between the same balls stay eligible. Never wall-clock pair
 *     cooldowns — matching is by contact identity within a time window.
 *   - createCueStrikeTracker(): one cue strike per presented shot — the
 *     shooter's animation impact owns the sound; witnesses play it at the
 *     first observed accepted shot start; joins/reconnects mid-shot and
 *     canceled strokes stay silent.
 */

import { POCKETS, POOL_MIN_CUE_SPEED, POOL_MAX_CUE_SPEED, POOL_POWER_EXPONENT } from '../../../shared/pool/physics.js';

/** Hard bounds shared by every normalized contact. */
export const POOL_AUDIO_LIMITS = Object.freeze({
  /** Capped contact speed (m/s). Physics tops out at 50; beyond is malformed. */
  MAX_SPEED: 50,
  /** Legacy rail/pocket payloads carry no speed; this stands in (soft thud). */
  DEFAULT_RAIL_SPEED: 1.2,
  /** Pocket drops without speed metadata use a consistent medium drop. */
  DEFAULT_POCKET_SPEED: 2.0,
});

const POCKET_BY_ID = new Map(POCKETS.map((p) => [p.id, p]));

function finiteNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function finiteInt(value) {
  const n = Number(value);
  return Number.isInteger(n) ? n : null;
}

function ballId(value) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 && n <= 15 ? n : null;
}

/**
 * Normalizes one raw pool event into the presentation shape, or returns null
 * for anything malformed. Zero speed is preserved (a grazing touch is valid);
 * non-finite/absent speed falls back per-kind before rejection.
 *
 * @returns {null | {
 *   kind: 'ball'|'cushion'|'pocket',
 *   speed: number, x: number|null, z: number|null,
 *   shot: number|null, step: number|null, t: number|null, key: string,
 * }}
 */
export function normalizePoolAudioEvent(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const type = raw.type;

  if (type === 'ball_collision' || type === 'ball_hit') {
    const a = ballId(raw.ballA);
    const b = ballId(raw.ballB);
    if (a === null || b === null || a === b) return null;
    let speed = finiteNumber(raw.speed);
    if (speed === null) speed = finiteNumber(raw.relativeSpeed);
    if (speed === null || speed < 0) return null;
    const x = finiteNumber(raw.x);
    const z = finiteNumber(raw.z);
    return {
      kind: 'ball',
      speed: Math.min(speed, POOL_AUDIO_LIMITS.MAX_SPEED),
      x: x === null || z === null ? null : x,
      z: x === null || z === null ? null : z,
      shot: finiteInt(raw.shot),
      step: finiteInt(raw.step),
      t: finiteNumber(raw.t),
      key: `ball:${Math.min(a, b)}-${Math.max(a, b)}`,
    };
  }

  if (type === 'rail_collision') {
    const id = ballId(raw.ballId);
    if (id === null) return null;
    let speed = finiteNumber(raw.speed);
    if (speed === null || speed < 0) speed = POOL_AUDIO_LIMITS.DEFAULT_RAIL_SPEED;
    const x = finiteNumber(raw.x);
    const z = finiteNumber(raw.z);
    const rail = typeof raw.rail === 'string' ? raw.rail : '?';
    return {
      kind: 'cushion',
      speed: Math.min(speed, POOL_AUDIO_LIMITS.MAX_SPEED),
      x: x === null || z === null ? null : x,
      z: x === null || z === null ? null : z,
      shot: finiteInt(raw.shot),
      step: finiteInt(raw.step),
      t: finiteNumber(raw.t),
      key: `rail:${id}:${rail}`,
    };
  }

  if (type === 'pocketed' || type === 'pocket') {
    const id = ballId(raw.ballId);
    if (id === null) return null;
    let speed = finiteNumber(raw.speed);
    if (speed === null || speed < 0) speed = POOL_AUDIO_LIMITS.DEFAULT_POCKET_SPEED;
    const pocketId = typeof raw.pocketId === 'string' ? raw.pocketId : null;
    const pocket = pocketId ? POCKET_BY_ID.get(pocketId) : null;
    // Position falls back to the known pocket center, then table center.
    const x = finiteNumber(raw.x) ?? pocket?.x ?? 0;
    const z = finiteNumber(raw.z) ?? pocket?.z ?? 0;
    return {
      kind: 'pocket',
      speed: Math.min(speed, POOL_AUDIO_LIMITS.MAX_SPEED),
      x,
      z,
      shot: finiteInt(raw.shot),
      step: finiteInt(raw.step),
      t: finiteNumber(raw.t),
      key: `pocket:${id}:${pocketId ?? '?'}`,
    };
  }

  return null;
}

/** Velocity layer for ball-to-ball contacts (m/s closing speed). */
export function ballImpactLayer(speed) {
  if (speed < 2) return 'soft';
  if (speed < 6) return 'med';
  return 'hard';
}

/** Velocity layer for cue strikes (normalized power 0..1). */
export function cueLayer(power) {
  return power < 0.45 ? 'soft' : 'hard';
}

/**
 * Bounded family gain from contact speed: soft contacts stay clearly softer
 * than hard contacts, with saturation before the ceiling.
 */
export function impactGain(kind, speed) {
  const s = Math.max(0, Math.min(speed, POOL_AUDIO_LIMITS.MAX_SPEED));
  switch (kind) {
    case 'ball':
      return Math.min(1, 0.22 + 0.78 * Math.min(s / 8, 1));
    case 'cushion':
      return Math.min(1, 0.18 + 0.82 * Math.min(s / 6, 1));
    case 'pocket':
      return Math.min(1, 0.5 + 0.5 * Math.min(s / 6, 1));
    default:
      return 0.5;
  }
}

/**
 * Inverse of normalizedPowerToCueSpeed: estimates the shooter's power from
 * the cue ball's launch speed in an authoritative snapshot (witness cue
 * layer choice). Clamped to 0..1; non-finite input maps to a medium shot.
 */
export function cuePowerFromBallSpeed(ballSpeed) {
  const v = finiteNumber(ballSpeed);
  if (v === null) return 0.5;
  if (v <= POOL_MIN_CUE_SPEED) return 0;
  const span = POOL_MAX_CUE_SPEED - POOL_MIN_CUE_SPEED;
  const u = Math.max(0, Math.min(1, (v - POOL_MIN_CUE_SPEED) / span));
  return Math.pow(u, 1 / POOL_POWER_EXPONENT);
}

/**
 * Shot-scoped reconciliation between predicted and authoritative contacts.
 *
 * The client presents contacts from its own rules stepping immediately; when
 * the authoritative snapshot's copies arrive they are matched against the
 * bounded queue of already-presented contacts (same key, within a
 * simulation-time window) and consumed silently. Contacts the prediction
 * missed are presented once. Authoritative contacts that are played are also
 * recorded, so duplicate/delayed snapshots stay silent. History is cleared
 * whenever the shot identity or the shooting status changes — reracks and
 * reconnects never inherit stale entries.
 */
export function createShotEventReconciler({
  maxHistory = 512,
  matchWindowMs = 1200,
  now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now()),
} = {}) {
  /** key -> array of { at, consumed } in presentation order. */
  const presented = new Map();
  let size = 0;
  let scopeKey = 'init';

  function evict() {
    while (size > maxHistory) {
      let oldestKey = null;
      let oldestAt = Infinity;
      for (const [k, entries] of presented) {
        // Entries are appended in order; the head is always the oldest.
        if (entries.length && entries[0].at < oldestAt) {
          oldestAt = entries[0].at;
          oldestKey = k;
        }
      }
      if (!oldestKey) break;
      const entries = presented.get(oldestKey);
      entries.shift();
      if (!entries.length) presented.delete(oldestKey);
      size -= 1;
    }
  }

  function record(event) {
    let entries = presented.get(event.key);
    if (!entries) {
      entries = [];
      presented.set(event.key, entries);
    }
    entries.push({ at: now(), t: event.t, consumed: false });
    size += 1;
    evict();
  }

  /**
   * Match an authoritative contact against presented history.
   *
   * With `t` metadata on both sides (every current physics event carries it),
   * matching is time-identified: the oldest unconsumed entry within ±TOL of
   * the authoritative contact time is consumed; an already-consumed entry at
   * the same contact time is a duplicate packet and matches silently; a
   * contact at a different time is genuinely distinct and stays eligible —
   * even between the same balls. Legacy payloads without `t` fall back to
   * bounded window matching (reduced precision, never rejection).
   */
  const T_MATCH_TOLERANCE_SEC = 0.15;

  function consumeMatch(event) {
    const entries = presented.get(event.key);
    if (!entries) return false;

    if (event.t !== null) {
      let duplicate = false;
      for (const entry of entries) {
        if (entry.t === null) continue;
        if (Math.abs(entry.t - event.t) > T_MATCH_TOLERANCE_SEC) continue;
        if (entry.consumed) {
          duplicate = true;
        } else {
          entry.consumed = true;
          return true;
        }
      }
      if (duplicate) return true;
      // Time-identified contacts that match nothing are distinct: present.
      // (Fall through only for t-bearing events against t-less entries.)
      if (entries.some((entry) => entry.t !== null)) return false;
    }

    const windowStart = now() - matchWindowMs;
    let sawConsumedInWindow = false;
    for (let i = 0; i < entries.length; i++) {
      if (entries[i].at < windowStart) continue; // too old to be the same contact
      if (entries[i].consumed) {
        sawConsumedInWindow = true;
        continue;
      }
      entries[i].consumed = true;
      return true;
    }
    return sawConsumedInWindow;
  }

  return {
    /**
     * Feed the current sim scope. Any shot/status transition clears history:
     * every shot passes through a non-shooting status before the next strike,
     * so a rerack can never alias an old shot's contacts.
     */
    scope({ shot = null, status = null } = {}) {
      const next = `${shot ?? 'x'}|${status ?? 'x'}`;
      if (next !== scopeKey) {
        scopeKey = next;
        presented.clear();
        size = 0;
      }
    },

    /** Local prediction contacts: present everything, record each. */
    admitPredicted(events) {
      const out = [];
      if (!Array.isArray(events)) return out;
      for (const raw of events) {
        const event = normalizePoolAudioEvent(raw);
        if (!event) continue;
        record(event);
        out.push(event);
      }
      return out;
    },

    /**
     * Authoritative contacts: silent when a presented copy is matched,
     * presented (and recorded) otherwise.
     */
    admitAuthoritative(events) {
      const out = [];
      if (!Array.isArray(events)) return out;
      for (const raw of events) {
        const event = normalizePoolAudioEvent(raw);
        if (!event) continue;
        if (!consumeMatch(event)) {
          record(event);
          out.push(event);
        }
      }
      return out;
    },

    /** Watermark without playback (joining/reconnecting mid-shot). */
    baseline(events) {
      if (!Array.isArray(events)) return;
      for (const raw of events) {
        const event = normalizePoolAudioEvent(raw);
        if (event) record(event);
      }
    },

    clear() {
      presented.clear();
      size = 0;
      scopeKey = 'cleared';
    },

    get size() {
      return size;
    },
  };
}

/**
 * Cue strike ownership. The shooter's animation impact plays the cue sound
 * and registers a pending strike; the next observed accepted shot start
 * consumes it instead of echoing. Witnesses play the cue once at the first
 * newly observed shot start. A first-ever observation (fresh activation or
 * reconnect) baselines without sound, and a canceled/refused stroke clears
 * the pending strike before it can own anything.
 */
export function createCueStrikeTracker({
  // The pending strike must outlast slow authoritative echoes: a shot input
  // travels to the server and the first `shooting` snapshot can return well
  // after the local animation impact. Cancellation/refusal clears the
  // pending claim explicitly, so the window only guards against staleness
  // from abandoned flows (leave-table without error).
  pendingTimeoutMs = 8000,
  // Conversely, the server can also WIN the race: the first `shooting`
  // snapshot may arrive before the animation impact. A local strike within
  // this window after an observed shot start is that echo — suppressed.
  observedShotGraceMs = 450,
  now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now()),
} = {}) {
  let pendingLocal = null; // { at, power }
  let shotStartedAtObserved = null;
  let hasBaseline = false;
  let inShot = false;

  return {
    /**
     * The shooter's animated cue impact. Returns the strike to play (always
     * at most one per animation impact) and holds it pending against the
     * authoritative shot-start echo — in both race directions.
     */
    localStrike(power) {
      if (shotStartedAtObserved !== null && now() - shotStartedAtObserved <= observedShotGraceMs) {
        return { play: false, power }; // the shot was already heard via its snapshot
      }
      pendingLocal = { at: now(), power };
      return { play: true, power };
    },

    /** Cancellation or server refusal before the strike: drop the pending
     *  claim. A refusal AFTER the local strike cannot undo played sound. */
    cancelPending() {
      pendingLocal = null;
    },

    /**
     * Observed sim update. The very first observation baselines silently
     * (a fresh activation or reconnect mid-shot replays no cue). Afterwards
     * each aiming→shooting transition is a new shot start: a fresh pending
     * local strike is consumed (the shooter already heard it), anything else
     * plays one witness strike. Shot ids are advisory only — transitions are
     * tracked by status so a rerack reusing shot numbers still counts.
     */
    observedSim({ status, cueBallSpeed = null } = {}) {
      if (!hasBaseline) {
        hasBaseline = true;
        inShot = status === 'shooting';
        if (inShot) pendingLocal = null; // a join mid-shot owns nothing
        return { play: false, power: null };
      }

      if (status !== 'shooting') {
        inShot = false;
        shotStartedAtObserved = null;
        return { play: false, power: null };
      }
      if (inShot) return { play: false, power: null };
      inShot = true;
      shotStartedAtObserved = now();

      if (pendingLocal && now() - pendingLocal.at <= pendingTimeoutMs) {
        pendingLocal = null;
        return { play: false, power: null }; // the shooter already heard their own strike
      }
      pendingLocal = null;

      return { play: true, power: cuePowerFromBallSpeed(cueBallSpeed) };
    },

    reset() {
      pendingLocal = null;
      shotStartedAtObserved = null;
      hasBaseline = false;
      inShot = false;
    },
  };
}
