/**
 * Activity runtime: manages activity lifecycles in the active place.
 *
 * Implements the lifecycle contracts specified in:
 *   - openspec/changes/add-place-activities-program/specs/place-activities/spec.md
 *   - openspec/changes/add-place-activities-program/design.md (D1, D2, D4)
 *
 * Features:
 *   - Compose cleanly with place/theater controllers
 *   - Prepare failure isolation (a failing activity never breaks the world or other activities)
 *   - Stale generation protection (stale transitions do not capture state)
 *   - Active-only updates (zero CPU/GPU overhead when place is inactive or hidden)
 *   - Idempotent disposal (repeated deactivate/dispose calls are safe and leak-free)
 */

import { getActivityModule, hasActivityModule } from './registry.js';
import { getPlaceActivities } from '../../shared/placeDefinitions.js';
import { createParticipationController } from './participation.js';
import { createMediaPresentationLease, MEDIA_LEASE_PHASE } from './mediaPresentation.js';
import {
  EMPTY_ACTIVITY_AVAILABILITY,
  normalizeActivityAvailability,
  isActivityClosed as isActivityClosedState,
  closedActivityLabel,
} from './availability.js';

export function createActivityRuntime({
  net = null,
  getActiveCamera = null,
  getCanvas = null,
  getRenderer = null,
  getPlayer = null,
  audioMixer = null,
  participation: injectedParticipation = null,
  applyAnchor = null,
  applyDismount = null,
  worldFacts = null,
  sendMovement = null,
  clearMovement = null,
  toast = null,
  onParticipationStateChange = null,
  onMediaPresentationEnter = null,
  onMediaPresentationPhase = null,
  onMediaPresentationReplace = null,
  onMediaPresentationExit = null,
  isFloatingMediaEnabled = null,
  setActivityCamera = null,
  clearActivityCamera = null,
  acquireView = null,
  releaseView = null,
  scheduleGraphicsJob = null,
  runGraphicsTransaction = null,
  cancelGraphicsJobs = null,
} = {}) {
  let active = false;
  let activeRoomId = null;
  let activeGeneration = 0;
  const instances = new Map();
  const activityDefs = new Map();
  const errors = new Map();
  let theaterIdlePrefetchScheduled = false;
  // Server-authoritative closed-game snapshot for the active room (see
  // src/activities/availability.js): presentation only, never permission.
  let availability = EMPTY_ACTIVITY_AVAILABILITY;

  // One generation/attempt-fenced presentation lease per runtime. The league
  // owns no DOM: main.js bridges enter/exit/replace to the theater UI.
  const mediaPresentation = createMediaPresentationLease({
    isEnabled: typeof isFloatingMediaEnabled === 'function' ? isFloatingMediaEnabled : () => true,
    onEnter: (lease) => {
      try { onMediaPresentationEnter?.(lease); } catch (err) { console.warn('[ActivityRuntime] media enter bridge failed:', err); }
    },
    onPhase: (lease, phase) => {
      try { onMediaPresentationPhase?.(lease, phase); } catch (err) { console.warn('[ActivityRuntime] media phase bridge failed:', err); }
    },
    onReplace: (lease, previous) => {
      try { onMediaPresentationReplace?.(lease, previous); } catch (err) { console.warn('[ActivityRuntime] media replace bridge failed:', err); }
    },
    onExit: (lease, reason) => {
      try { onMediaPresentationExit?.(lease, reason); } catch (err) { console.warn('[ActivityRuntime] media exit bridge failed:', err); }
    },
  });

  /**
   * Participation state feeds the media lease: provisional entries release
   * on queue/watch/ejection/deactivate, while promotion into play starts a
   * fresh entry (new attempt, new entry mute).
   */
  function handleParticipationStateChange(state, info = {}) {
    try {
      if (state === 'participating') {
        const act = info.activity || participation.currentActivity;
        const current = mediaPresentation.active;
        if (act && (!current || current.token.activityId !== act.id)) {
          mediaPresentation.begin(act, { generation: activeGeneration, role: 'play' });
        } else if (current) {
          mediaPresentation.phase(current.token, MEDIA_LEASE_PHASE.PARTICIPATING);
        }
      } else if (state === 'queued' || state === 'watching') {
        mediaPresentation.release(state);
      } else if (state === 'idle') {
        mediaPresentation.release(info.reason || 'idle');
      }
    } catch (err) {
      console.warn('[ActivityRuntime] media lease update failed:', err);
    }
    try { onParticipationStateChange?.(state, info); } catch (err) { console.warn('[ActivityRuntime] participation callback failed:', err); }
  }

  const participation = injectedParticipation || createParticipationController({
    net,
    applyAnchor,
    applyDismount,
    worldFacts,
    sendMovement,
    clearMovement,
    toast,
    getRoomId: () => activeRoomId,
    onStateChange: handleParticipationStateChange,
    // Acquire/adopt the provisional token BEFORE the join frame is sent, so
    // non-interaction admission paths float media from the first instant.
    beforeJoin: (activityDef, { role = 'play' } = {}) => {
      mediaPresentation.begin(activityDef, { generation: activeGeneration, role });
    },
  });

  /** Find a previously activated activity definition by id. */
  function findActivityDef(id) {
    return activityDefs.get(id) || null;
  }

  /**
   * Terminal presentation release for one activity (lazy adapters report
   * cancellation/failure through their initialize() context). Only the
   * matching active token is ended; stale notifications are inert.
   */
  function endMediaPresentationFor(activityId, reason = 'terminal') {
    const current = mediaPresentation.active;
    if (!current) return false;
    if (activityId && current.token.activityId !== activityId) return false;
    return mediaPresentation.end(current.token, reason);
  }

  /** The first active activity instance declaring a hook of this name. */
  function firstWithHook(hook) {
    for (const instance of instances.values()) {
      if (typeof instance?.[hook] === 'function') return instance;
    }
    return null;
  }

  return {
    get active() {
      return active;
    },

    get activeRoomId() {
      return activeRoomId;
    },

    get activeGeneration() {
      return activeGeneration;
    },

    get participation() {
      return participation;
    },

    /** The generation/attempt-fenced media presentation lease. */
    get mediaPresentation() {
      return mediaPresentation;
    },

    getInstance(activityId) {
      return instances.get(activityId) || null;
    },

    getInstances() {
      return new Map(instances);
    },

    getErrors() {
      return new Map(errors);
    },

    getActivityDef(activityId) {
      return findActivityDef(activityId);
    },

    /**
     * Activates activities declared for the place.
     * Stale generations are rejected.
     * Prepare failures are isolated: world remains playable.
     *
     * @param {object} seam
     * @param {string} seam.roomId
     * @param {object} seam.world
     * @param {number} seam.generation
     * @param {object} [seam.def]
     */
    activate(seam = {}) {
      const { roomId, world, generation, def = null } = seam;
      // Stale generation guard: a newer travel or lower generation is discarded
      if (typeof generation === 'number' && generation < activeGeneration) {
        return { status: 'stale', generation, activeGeneration };
      }

      // Deactivate prior place's activities first
      this.deactivate();

      active = true;
      activeRoomId = roomId;
      activeGeneration = typeof generation === 'number' ? generation : activeGeneration + 1;
      errors.clear();
      availability = EMPTY_ACTIVITY_AVAILABILITY;

      // Read activities from manifest definition or lookup
      const activities = def?.activities || (roomId ? getPlaceActivities(roomId) : []) || [];

      for (const actDef of activities) {
        if (!actDef || !actDef.id || !actDef.type) continue;

        if (!hasActivityModule(actDef.type)) {
          errors.set(actDef.id, new Error(`No module registered for activity type "${actDef.type}"`));
          continue;
        }

        const module = getActivityModule(actDef.type);
        activityDefs.set(actDef.id, actDef);
        try {
          const instance = module.initialize({
            activityDef: actDef,
            world,
            net,
            generation: activeGeneration,
            roomId,
            getActiveCamera: seam.getActiveCamera || getActiveCamera,
            getCanvas: seam.getCanvas || getCanvas,
            // integrate-kart-royale-arcade D3: the shared WebGLRenderer for
            // hosted games that present through their own composer.
            getRenderer: seam.getRenderer || getRenderer,
            getPlayer: seam.getPlayer || getPlayer,
            // integrate-kart-royale-arcade D7: optional host audio mixer
            // accessor handed to activity modules so a hosted game can ride
            // the host's AudioContext/buses instead of creating its own.
            audioMixer: seam.audioMixer || audioMixer,
            setActivityCamera: seam.setActivityCamera || setActivityCamera,
            clearActivityCamera: seam.clearActivityCamera || clearActivityCamera,
            getParticipation: () => participation,
            // Terminal cancellation/failure notification for lazy adapters
            // (add-floating-minigame-media D2): releases the provisional
            // floating token even when participation never left idle.
            notifyPresentationTerminal: (reason = 'terminal') => endMediaPresentationFor(actDef.id, reason),
            acquireView: seam.acquireView || acquireView,
            releaseView: seam.releaseView || releaseView,
            scheduleGraphicsJob: seam.scheduleGraphicsJob || scheduleGraphicsJob,
            runGraphicsTransaction: seam.runGraphicsTransaction || runGraphicsTransaction,
            cancelGraphicsJobs: seam.cancelGraphicsJobs || cancelGraphicsJobs,
          });
          if (instance) {
            instances.set(actDef.id, instance);
          }
        } catch (err) {
          // Prepare failure isolation: record error, but keep world playable
          console.warn(`[ActivityRuntime] Prepare failure for activity "${actDef.id}":`, err);
          errors.set(actDef.id, err);
        }
      }

      return {
        status: 'ok',
        roomId,
        generation: activeGeneration,
        count: instances.size,
        errors: errors.size,
      };
    },

    /**
     * Deactivates all active activities and releases resources.
     * Idempotent: repeated calls are safe and perform no extra work.
     */
    deactivate() {
      try {
        participation.deactivate?.();
      } catch (err) {
        console.warn('[ActivityRuntime] Error deactivating participation:', err);
      }

      // Leaving the place releases any floating presentation ownership, even
      // when participation was already idle (stale tokens become inert).
      try {
        mediaPresentation.release('deactivate');
      } catch (err) {
        console.warn('[ActivityRuntime] Error releasing media presentation:', err);
      }

      try {
        cancelGraphicsJobs?.();
      } catch (err) {
        console.warn('[ActivityRuntime] Error cancelling graphics jobs:', err);
      }

      if (!active && instances.size === 0) return;

      active = false;
      activeRoomId = null;
      theaterIdlePrefetchScheduled = false;
      availability = EMPTY_ACTIVITY_AVAILABILITY;

      for (const [id, instance] of instances) {
        try {
          instance.dispose?.();
        } catch (err) {
          console.warn(`[ActivityRuntime] Error disposing activity "${id}":`, err);
        }
      }
      instances.clear();
      activityDefs.clear();
      errors.clear();
    },

    /**
     * Active-only frame loop update.
     * If runtime is inactive, performs ZERO work.
     *
     * @param {number} time
     * @param {number} delta
     */
    update(time, delta) {
      if (!active) return;

      for (const instance of instances.values()) {
        try {
          instance.update?.(time, delta);
        } catch (err) {
          console.warn('[ActivityRuntime] Error during activity update:', err);
        }
      }
    },

    /**
     * Accepts an authoritative activity_state snapshot.
     * @param {object} frame
     */
    acceptSnapshot(frame) {
      if (!active || !frame || frame.roomId !== activeRoomId) return false;
      let handled = false;
      try {
        if (participation.handleSnapshot?.(frame)) handled = true;
      } catch (err) {
        console.warn('[ActivityRuntime] Error handling snapshot in participation:', err);
      }
      const instance = instances.get(frame.activityId);
      if (instance && typeof instance.acceptSnapshot === 'function') {
        instance.acceptSnapshot(frame);
        handled = true;
      }
      return handled;
    },

    /**
     * Accepts an activity_event.
     * @param {object} frame
     */
    acceptEvent(frame) {
      if (!active || !frame || frame.roomId !== activeRoomId) return false;
      const instance = instances.get(frame.activityId);
      if (instance && typeof instance.acceptEvent === 'function') {
        instance.acceptEvent(frame);
        return true;
      }
      return false;
    },

    /**
     * Accepts an activity_result.
     * @param {object} frame
     */
    acceptResult(frame) {
      if (!active || !frame || frame.roomId !== activeRoomId) return false;
      let handled = false;
      try {
        if (participation.handleResult?.(frame)) handled = true;
      } catch (err) {
        console.warn('[ActivityRuntime] Error handling result in participation:', err);
      }
      const instance = instances.get(frame.activityId);
      if (instance && typeof instance.acceptResult === 'function') {
        instance.acceptResult(frame);
        handled = true;
      }
      return handled;
    },

    /**
     * Accepts an activity_error.
     * @param {object} frame
     */
    acceptError(frame) {
      if (!active || !frame) return false;
      if (frame.roomId && frame.roomId !== activeRoomId) return false;
      let handled = false;
      try {
        if (participation.handleError?.(frame)) handled = true;
      } catch (err) {
        console.warn('[ActivityRuntime] Error handling error in participation:', err);
      }
      if (frame.activityId) {
        const instance = instances.get(frame.activityId);
        if (instance && typeof instance.acceptError === 'function') {
          instance.acceptError(frame);
          handled = true;
        }
      }
      return handled;
    },

    /**
     * Accept a server `activity_availability` snapshot for the active room.
     * Frames for other rooms are ignored; an absent snapshot (old server)
     * keeps every cabinet playable.
     * @param {object} frame `{ roomId, closed: [...] }`
     */
    acceptAvailability(frame) {
      if (!active) return false;
      availability = normalizeActivityAvailability(frame, { roomId: activeRoomId });
      return true;
    },

    /**
     * True when the server marked this activity closed (coming soon).
     * Presentation gating only: the server remains the admission authority.
     * @param {object} activityDef
     */
    isActivityClosed(activityDef) {
      return active && isActivityClosedState(availability, activityDef);
    },

    /**
     * Player-facing label for a closed activity, or null when open.
     * @param {object} activityDef
     */
    closedActivityInfo(activityDef) {
      if (!this.isActivityClosed(activityDef)) return null;
      const row = activityDef?.id ? availability.closedById.get(activityDef.id) : null;
      return closedActivityLabel(row, activityDef);
    },

    /**
     * The single activity entry route (add-floating-minigame-media D2).
     * main.js calls this for every activity interaction instead of splitting
     * "load-before-join" modules from generic immediate joins:
     *
     *   1. acquire a provisional media presentation token BEFORE any lazy
     *      code runs or a direct join is sent (a token is available even when
     *      the module opts out or there is no current media — it is inert),
     *   2. activity modules declaring instance.beginParticipation load first;
     *      all others join immediately through the participation controller
     *      (whose beforeJoin callback adopts/reuses the same token),
     *   3. a rejected join releases the provisional token.
     *
     * @param {object} item world interaction ({ activityId, activityDef })
     * @param {{ role?: string }} [opts]
     * @returns {{ handled: boolean, action?: 'begin'|'join', token?: object|null }}
     */
    enterActivity(item, { role = 'play' } = {}) {
      if (!item) return { handled: false, token: null };
      const id = item.activityId ?? item.id;
      if (!id) return { handled: false, token: null };
      const actDef = item.activityDef || findActivityDef(id) || item;
      if (!actDef?.id) return { handled: false, token: null };

      // A pending/active span for a DIFFERENT activity is not stolen: the
      // caller must leave it first (main.js handles that before entry).
      const occupied = participation.isOccupied === true;
      if (occupied && participation.currentActivity?.id !== actDef.id) {
        return { handled: false, token: null };
      }

      const token = mediaPresentation.begin(actDef, { generation: activeGeneration, role });

      const instance = instances.get(actDef.id);
      if (instance && typeof instance.beginParticipation === 'function') {
        // Fire-and-forget by design, but a rejection (graphics reset mid-init,
        // a stale-deploy chunk import) must never surface as an unhandled
        // rejection: the activities report player-facing failure themselves.
        // A false/failed completion with no participation state releases the
        // provisional floating token immediately (terminal notification).
        // Invoke synchronously (the lazy module starts its work immediately),
        // but never let a synchronous throw escape the interaction route.
        let beginPromise;
        try {
          beginPromise = Promise.resolve(instance.beginParticipation());
        } catch (error) {
          beginPromise = Promise.reject(error);
        }
        beginPromise.then((ok) => {
          if (ok === false && participation.isOccupied !== true) {
            endMediaPresentationFor(actDef.id, 'failed');
          }
        }).catch((error) => {
          console.warn('[ActivityRuntime] beginParticipation rejected:', error);
          if (participation.isOccupied !== true) {
            endMediaPresentationFor(actDef.id, 'failed');
          }
        });
        return { handled: true, action: 'begin', token };
      }

      // Duplicate entry for the same pending join reuses the attempt (and its
      // token) instead of sending a second join and releasing the first.
      if (occupied) return { handled: true, action: 'reuse', token };

      const joined = participation.join(actDef, { role });
      if (!joined) {
        mediaPresentation.end(token, 'rejected');
        return { handled: false, token: null };
      }
      return { handled: true, action: 'join', token };
    },

    /**
     * Back-compat wrapper for the pre-3.2 interaction route: returns true only
     * for modules that declare a pre-join load. Prefer enterActivity().
     */
    beginParticipationFor(item) {
      const result = this.enterActivity(item, { role: 'play' });
      return result.handled && result.action === 'begin';
    },

    /** Release the floating presentation for one activity (or all when omitted). */
    endActivityPresentationFor(activityId, reason = 'terminal') {
      return endMediaPresentationFor(activityId, reason);
    },

    /**
     * Neutralize input on blur, chat focus, dialog open, or leave.
     */
    neutralizeInput() {
      for (const instance of instances.values()) {
        try {
          instance.neutralizeInput?.();
        } catch (err) {
          console.warn('[ActivityRuntime] Error neutralizing input:', err);
        }
      }
    },

    scheduleGraphicsJob(job) {
      return scheduleGraphicsJob?.(job) ?? { ok: false, reason: 'unavailable' };
    },

    runGraphicsTransaction(fn) {
      if (!runGraphicsTransaction) return Promise.reject(new Error('graphics_transaction_unavailable'));
      return runGraphicsTransaction(fn);
    },

    cancelGraphicsJobs() {
      cancelGraphicsJobs?.();
    },

    /**
     * Background-preparation frame budget for any hosted activity that
     * declares the hooks (Kart Royale, Downhill Mayhem). Activities without
     * them stay lazy until explicit entry.
     */
    getBackgroundPrepareFrameBudgetMs() {
      if (!active || activeRoomId !== 'theater') return 0;
      const instance = firstWithHook('getPrepareFrameBudgetMs');
      return instance ? instance.getPrepareFrameBudgetMs() : 0;
    },

    /** Back-compat alias for the Kart-era name. */
    getKartPrepareFrameBudgetMs() {
      return this.getBackgroundPrepareFrameBudgetMs();
    },

    tickBackgroundPreparation(opts = {}) {
      if (!active || activeRoomId !== 'theater') {
        return { ran: false, reason: 'not_theater' };
      }
      const instance = firstWithHook('tickBackgroundPreparation');
      if (!instance) return { ran: false, reason: 'no_prepare_instance' };
      return instance.tickBackgroundPreparation(opts);
    },

    scheduleTheaterIdlePrefetches() {
      if (!active || activeRoomId !== 'theater') {
        return { scheduled: false, reason: 'not_theater' };
      }
      if (theaterIdlePrefetchScheduled) {
        return { scheduled: false, reason: 'already_scheduled' };
      }

      const instance = firstWithHook('scheduleIdleModulePrefetch');
      if (!instance) return { scheduled: false, reason: 'no_prepare_instance' };

      const result = instance.scheduleIdleModulePrefetch({ roomId: activeRoomId });
      if (result?.scheduled) {
        theaterIdlePrefetchScheduled = true;
        return result;
      }
      return result ?? { scheduled: false, reason: 'instance_declined' };
    },
  };
}
