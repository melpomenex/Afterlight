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

export function createActivityRuntime({
  net = null,
  getActiveCamera = null,
  getPlayer = null,
  participation: injectedParticipation = null,
  applyAnchor = null,
  applyDismount = null,
  worldFacts = null,
  sendMovement = null,
  clearMovement = null,
  toast = null,
  onParticipationStateChange = null,
  setActivityCamera = null,
  clearActivityCamera = null,
} = {}) {
  let active = false;
  let activeRoomId = null;
  let activeGeneration = 0;
  const instances = new Map();
  const errors = new Map();

  const participation = injectedParticipation || createParticipationController({
    net,
    applyAnchor,
    applyDismount,
    worldFacts,
    sendMovement,
    clearMovement,
    toast,
    getRoomId: () => activeRoomId,
    onStateChange: onParticipationStateChange,
  });

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

    getInstance(activityId) {
      return instances.get(activityId) || null;
    },

    getInstances() {
      return new Map(instances);
    },

    getErrors() {
      return new Map(errors);
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

      // Read activities from manifest definition or lookup
      const activities = def?.activities || (roomId ? getPlaceActivities(roomId) : []) || [];

      for (const actDef of activities) {
        if (!actDef || !actDef.id || !actDef.type) continue;

        if (!hasActivityModule(actDef.type)) {
          errors.set(actDef.id, new Error(`No module registered for activity type "${actDef.type}"`));
          continue;
        }

        const module = getActivityModule(actDef.type);
        try {
          const instance = module.initialize({
            activityDef: actDef,
            world,
            net,
            generation: activeGeneration,
            roomId,
            getActiveCamera: seam.getActiveCamera || getActiveCamera,
            getPlayer: seam.getPlayer || getPlayer,
            setActivityCamera: seam.setActivityCamera || setActivityCamera,
            clearActivityCamera: seam.clearActivityCamera || clearActivityCamera,
            getParticipation: () => participation,
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

      if (!active && instances.size === 0) return;

      active = false;
      activeRoomId = null;

      for (const [id, instance] of instances) {
        try {
          instance.dispose?.();
        } catch (err) {
          console.warn(`[ActivityRuntime] Error disposing activity "${id}":`, err);
        }
      }
      instances.clear();
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
  };
}
