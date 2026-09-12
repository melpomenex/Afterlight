/**
 * Activity media presentation leases (add-floating-minigame-media, design D2).
 *
 * A client-only, generation/attempt-fenced lease for one contiguous
 * mini-game presentation span. It owns no DOM, renderer or network: the
 * activity runtime composes it and bridges enter/exit/replace/phase events
 * to the theater UI (which floats the one existing playback surface).
 *
 * Guarantees:
 *   - A token is acquired BEFORE lazy loading or a direct join, so the
 *     stream is floating as the transition starts.
 *   - Duplicate begin() for the same activity + generation reuses the token
 *     and never fires a second entry (which would re-mute an explicit
 *     unmute).
 *   - end() only acts on the matching token and is idempotent; a stale
 *     completion cannot terminate or revive a newer span.
 *   - Modules may opt out of floating media (`floatingMedia: false`) and
 *     expose bounded HUD reservations; non-play roles never auto-float.
 *   - A room/place generation change releases the current span.
 */

import { getActivityMediaPolicy } from './registry.js';

export const MEDIA_LEASE_PHASE = Object.freeze({
  LOADING: 'loading',
  JOINING: 'joining',
  PARTICIPATING: 'participating',
});

const normalizeRole = (role) => {
  if (role === 'player' || role === 'play') return 'play';
  if (role === 'spectator' || role === 'watch') return 'watch';
  if (role === 'queue') return 'queue';
  return 'play';
};

/**
 * @typedef {object} MediaEntryToken
 * @property {string} activityId
 * @property {number} generation
 * @property {number} attempt
 * @property {string} role
 * @property {string} phase
 * @property {number} startedAt
 */

/**
 * @param {object} [options]
 * @param {Function} [options.getPolicy] (activityType) => normalized policy
 * @param {Function} [options.onEnter]   (lease) => void
 * @param {Function} [options.onPhase]   (lease, phase) => void
 * @param {Function} [options.onReplace] (lease, previousLease) => void
 * @param {Function} [options.onExit]    (lease, reason) => void
 * @param {Function} [options.isEnabled] () => boolean global developer gate
 * @param {Function} [options.now]       () => number
 */
export function createMediaPresentationLease({
  getPolicy = getActivityMediaPolicy,
  onEnter = null,
  onPhase = null,
  onReplace = null,
  onExit = null,
  isEnabled = () => true,
  now = () => Date.now(),
} = {}) {
  let generation = 0;
  let attemptCounter = 0;
  /** @type {{ token: MediaEntryToken, activity: object, policy: object } | null} */
  let active = null;
  let lastExitReason = null;

  function policyFor(activity) {
    if (!activity) return null;
    const type = activity.type || activity.activityType || null;
    let policy = null;
    try {
      policy = type && typeof getPolicy === 'function' ? getPolicy(type) : null;
    } catch (err) {
      console.warn('[MediaPresentationLease] policy lookup failed:', err);
    }
    return policy || { floatingMedia: true, reservedRects: null };
  }

  function release(reason = 'release') {
    if (!active) return false;
    const lease = active;
    active = null;
    lastExitReason = reason;
    try {
      onExit?.(lease, reason);
    } catch (err) {
      console.warn('[MediaPresentationLease] onExit failed:', err);
    }
    return true;
  }

  return {
    get active() {
      return active;
    },

    get token() {
      return active?.token || null;
    },

    get generation() {
      return generation;
    },

    get lastExitReason() {
      return lastExitReason;
    },

    /**
     * Acquire (or reuse) the presentation token for an activity entry.
     * Returns null when the module opted out, the role is not play, or the
     * attempt belongs to a stale generation.
     *
     * @param {object} activity def ({ id, type, title })
     * @param {object} [opts]
     * @param {number} [opts.generation]
     * @param {number} [opts.attempt]
     * @param {string} [opts.role]
     * @returns {MediaEntryToken|null}
     */
    begin(activity, { generation: gen = null, attempt = null, role = 'play' } = {}) {
      if (!isEnabled()) return null;
      if (!activity?.id) return null;
      const nextGeneration = Number.isFinite(gen) ? gen : generation;
      if (nextGeneration < generation) return null; // stale request
      // A newer place generation always invalidates the previous span.
      if (nextGeneration > generation) {
        release('generation');
        generation = nextGeneration;
      }
      if (normalizeRole(role) !== 'play') return null; // queued/watching never auto-float
      const policy = policyFor(activity);
      if (!policy || policy.floatingMedia === false) return null;
      if (active && active.token.activityId === activity.id && active.token.generation === generation) {
        return active.token; // duplicate entry: reuse, never re-mute
      }
      attemptCounter = Number.isFinite(attempt) ? attempt : attemptCounter + 1;
      const token = {
        activityId: activity.id,
        generation,
        attempt: attemptCounter,
        role: 'play',
        phase: MEDIA_LEASE_PHASE.LOADING,
        startedAt: now(),
      };
      active = { token, activity, policy };
      try {
        onEnter?.(active);
      } catch (err) {
        console.warn('[MediaPresentationLease] onEnter failed:', err);
      }
      return token;
    },

    /** Update the phase of the current token (stale tokens are ignored). */
    phase(token, phase) {
      if (!active || !token || token !== active.token) return false;
      if (!Object.values(MEDIA_LEASE_PHASE).includes(phase)) return false;
      if (active.token.phase === phase) return true;
      active.token.phase = phase;
      try {
        onPhase?.(active, phase);
      } catch (err) {
        console.warn('[MediaPresentationLease] onPhase failed:', err);
      }
      return true;
    },

    /**
     * Same-room replacement (one eligible game replaces another): the new
     * activity gets a fresh token/entry mute while the span baseline and the
     * one media session are retained.
     */
    replace(token, nextActivity, { attempt = null } = {}) {
      if (!active || !token || token !== active.token) return null;
      if (!nextActivity?.id) return null;
      const previous = active;
      attemptCounter = Number.isFinite(attempt) ? attempt : attemptCounter + 1;
      const nextToken = {
        activityId: nextActivity.id,
        generation,
        attempt: attemptCounter,
        role: 'play',
        phase: previous.token.phase,
        startedAt: now(),
      };
      active = { token: nextToken, activity: nextActivity, policy: policyFor(nextActivity) };
      try {
        onReplace?.(active, previous);
      } catch (err) {
        console.warn('[MediaPresentationLease] onReplace failed:', err);
      }
      return nextToken;
    },

    /**
     * Release exactly the given token. A stale token never ends or revives a
     * newer span. Idempotent.
     */
    end(token, reason = 'end') {
      if (!active || !token || token !== active.token) return false;
      return release(reason);
    },

    /** Release whatever is active (runtime deactivate/dispose/travel). */
    release(reason = 'release') {
      return release(reason);
    },
  };
}
