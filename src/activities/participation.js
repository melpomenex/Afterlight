/**
 * Activity participation: contextual E/button entry, anchor poses,
 * and safe dismount choices for place activities.
 *
 * Implements the lifecycle and participation contracts specified in:
 *   - openspec/changes/add-place-activities-program/specs/place-activities/spec.md
 *   - openspec/changes/add-place-activities-program/design.md (D2)
 *
 * Key guarantees:
 *   - Clean state machine: idle -> joining -> participating | watching | queued -> leaving -> idle
 *   - Safe dismount: authored points -> directional candidates -> place safe spawn -> fallback
 *   - Participant anchor pose snapping and movement broadcasting
 *   - Remote avatars and Kiln remain fully visible in the 3D world
 *   - Contextual E or button click leaves immediately if participating or cancels if joining
 *   - Escape closes dialogs first, otherwise leaves activity mode before settings
 *   - Travel during join immediately releases pending membership and resets state
 */

const isFiniteNumber = (val) => typeof val === 'number' && Number.isFinite(val);

function normalizeProtocolRole(role) {
  if (role === 'player' || role === 'play') return 'play';
  if (role === 'spectator' || role === 'watch') return 'watch';
  if (role === 'queue') return 'queue';
  return 'play';
}

/**
 * Choose a safe dismount point when leaving an activity.
 * Evaluates in order:
 *   1. Authored dismount points on the participant anchor ({ x, z })
 *   2. Authored dismount points on the activity definition
 *   3. Directional step-out candidates based on anchor position & facing (0.8m distance)
 *   4. Safe place spawn fallback
 *   5. Anchor position as last resort
 *
 * @param {object} anchor
 * @param {object} activityDef
 * @param {object} worldFacts
 * @param {object} [worldFacts.bounds]
 * @param {Array} [worldFacts.obstacles]
 * @param {Function} [worldFacts.isWalkable]
 * @param {Array|object} [worldFacts.spawn]
 * @returns {{ x: number, z: number, fallback: boolean }}
 */
export function chooseActivityDismount(
  anchor,
  activityDef = null,
  { bounds = null, obstacles = [], isWalkable = () => true, spawn = null } = {},
) {
  // 1. Authored dismount candidates on the participant anchor
  if (Array.isArray(anchor?.dismount)) {
    for (const pt of anchor.dismount) {
      if (pt && isFiniteNumber(pt.x) && isFiniteNumber(pt.z)) {
        if (isWalkable(bounds, obstacles, pt.x, pt.z)) {
          return { x: pt.x, z: pt.z, fallback: false };
        }
      }
    }
  }

  // 2. Authored dismount candidates on the activity definition
  if (Array.isArray(activityDef?.dismount)) {
    for (const pt of activityDef.dismount) {
      if (pt && isFiniteNumber(pt.x) && isFiniteNumber(pt.z)) {
        if (isWalkable(bounds, obstacles, pt.x, pt.z)) {
          return { x: pt.x, z: pt.z, fallback: false };
        }
      }
    }
  }

  // 3. Directional candidates based on anchor position and facing
  const pos = anchor?.position;
  if (Array.isArray(pos) && pos.length >= 2) {
    const ax = pos[0];
    const az = pos.length === 3 ? pos[2] : pos[1];
    const facing = isFiniteNumber(anchor?.facing) ? anchor.facing : 0;
    const dist = 0.8;

    // Directional candidates:
    // (a) Step back (away from object: opposite of facing)
    // (b) Step right (+90 deg)
    // (c) Step left (-90 deg)
    // (d) Step front
    const candidates = [
      { x: ax - Math.sin(facing) * dist, z: az - Math.cos(facing) * dist },
      { x: ax - Math.cos(facing) * dist, z: az + Math.sin(facing) * dist },
      { x: ax + Math.cos(facing) * dist, z: az - Math.sin(facing) * dist },
      { x: ax + Math.sin(facing) * dist, z: az + Math.cos(facing) * dist },
    ];

    for (const cand of candidates) {
      if (isWalkable(bounds, obstacles, cand.x, cand.z)) {
        return { x: cand.x, z: cand.z, fallback: false };
      }
    }
  }

  // 4. Fallback to place safe spawn if available
  const safe = Array.isArray(spawn) ? { x: spawn[0], z: spawn[1] } : spawn;
  if (safe && isFiniteNumber(safe.x) && isFiniteNumber(safe.z)) {
    return { x: safe.x, z: safe.z, fallback: true };
  }

  // 5. Final fallback: anchor position or origin
  if (Array.isArray(pos) && pos.length >= 2) {
    return { x: pos[0], z: pos.length === 3 ? pos[2] : pos[1], fallback: true };
  }
  return { x: 0, z: 0, fallback: true };
}

/**
 * Find the participant anchor for a given slot.
 *
 * @param {object} activityDef
 * @param {number|string} slot
 * @returns {object|null}
 */
export function findAnchorForSlot(activityDef, slot) {
  const anchors = activityDef?.participantAnchors;
  if (!Array.isArray(anchors) || anchors.length === 0) return null;
  if (slot !== undefined && slot !== null) {
    const match = anchors.find(a => a.slot === slot || String(a.slot) === String(slot));
    if (match) return match;
    if (typeof slot === 'number') {
      if (anchors[slot]) return anchors[slot];
      if (anchors[slot - 1]) return anchors[slot - 1];
    }
  }
  return anchors[0];
}

/**
 * Creates the activity participation controller.
 *
 * @param {object} options
 * @param {object} options.net
 * @param {Function} [options.applyAnchor]
 * @param {Function} [options.applyDismount]
 * @param {Function} [options.worldFacts]
 * @param {Function} [options.sendMovement]
 * @param {Function} [options.clearMovement]
 * @param {Function} [options.toast]
 * @param {Function} [options.getRoomId]
 * @param {Function} [options.onStateChange]
 * @returns {object}
 */
export function createParticipationController({
  net = null,
  applyAnchor = null,
  applyDismount = null,
  worldFacts = null,
  sendMovement = null,
  clearMovement = null,
  toast = null,
  getRoomId = null,
  onStateChange = null,
} = {}) {
  let state = 'idle'; // 'idle' | 'joining' | 'participating' | 'watching' | 'queued' | 'leaving'
  let currentActivity = null;
  let currentSlot = null;
  let currentAnchor = null;
  let currentRole = null;
  let lease = null;
  let sessionId = null;
  // Summit Run mutation fence (D7): the match identity the client last saw
  // authoritatively; travels on leave/ready so a stale packet can never
  // mutate a newer race.
  let currentMatchId = null;

  function resetSession() {
    currentActivity = null;
    currentSlot = null;
    currentAnchor = null;
    currentRole = null;
    lease = null;
    sessionId = null;
    currentMatchId = null;
  }

  function safeDismount() {
    const facts = worldFacts?.() || {};
    const point = chooseActivityDismount(currentAnchor, currentActivity, facts);
    try {
      applyDismount?.(point);
    } catch (err) {
      console.warn('[ParticipationController] Error during applyDismount:', err);
    }
    try {
      clearMovement?.();
    } catch {}
    try {
      sendMovement?.(false);
    } catch {}
    return point;
  }

  return {
    get state() { return state; },
    get currentActivity() { return currentActivity; },
    get currentSlot() { return currentSlot; },
    get currentAnchor() { return currentAnchor; },
    get currentRole() { return currentRole; },
    get lease() { return lease; },
    get sessionId() { return sessionId; },
    get currentMatchId() { return currentMatchId; },
    get roomId() { return getRoomId?.() || ''; },

    get isParticipating() { return state === 'participating'; },
    get isJoining() { return state === 'joining'; },
    get isWatching() { return state === 'watching'; },
    get isQueued() { return state === 'queued'; },
    get isOccupied() { return state !== 'idle'; },

    /**
     * Request to join an activity.
     */
    join(activityDef, { role = 'player', requestedSlot = null } = {}) {
      if (state !== 'idle') return false;
      if (!activityDef?.id) return false;

      state = 'joining';
      currentActivity = activityDef;
      currentRole = role;
      currentSlot = null;
      currentAnchor = null;
      lease = null;
      sessionId = null;

      const actTitle = activityDef.title || activityDef.id;
      toast?.('Joining Activity', `Joining ${actTitle}... Press E or Esc to cancel.`, 'ACTIVITY');

      try {
        net?.sendActivityJoin?.({
          roomId: getRoomId?.() || '',
          activityId: activityDef.id,
          role: normalizeProtocolRole(role),
          requestedSlot,
        });
      } catch (err) {
        console.warn('[ParticipationController] sendActivityJoin failed:', err);
      }

      onStateChange?.('joining', { activity: activityDef, role });
      return true;
    },

    /**
     * Cancel a pending join.
     */
    cancelJoin() {
      if (state !== 'joining') return false;

      const activityId = currentActivity?.id;
      state = 'idle';
      const act = currentActivity;
      resetSession();

      try {
        net?.sendActivityLeave?.({
          roomId: getRoomId?.() || '',
          activityId,
          ...(currentMatchId ? { matchId: currentMatchId } : {}),
        });
      } catch {}

      toast?.('Cancelled', 'Activity join cancelled.', 'ACTIVITY');
      onStateChange?.('idle', { reason: 'cancel', previousActivity: act });
      return true;
    },

    /**
     * Leave the activity immediately with safe dismount.
     */
    leave() {
      if (state === 'idle') return false;
      if (state === 'joining') return this.cancelJoin();

      const wasParticipating = state === 'participating';
      const actId = currentActivity?.id;
      const actTitle = currentActivity?.title || actId;
      const act = currentActivity;

      state = 'leaving';

      if (wasParticipating) {
        safeDismount();
      }

      try {
        net?.sendActivityLeave?.({
          roomId: getRoomId?.() || '',
          activityId: actId,
          ...(currentMatchId ? { matchId: currentMatchId } : {}),
        });
      } catch {}

      state = 'idle';
      currentActivity = null;
      currentSlot = null;
      currentAnchor = null;
      currentRole = null;
      lease = null;
      sessionId = null;

      try {
        clearMovement?.();
      } catch {}

      toast?.('Left Activity', `Left ${actTitle}.`, 'ACTIVITY');
      onStateChange?.('idle', { reason: 'leave', previousActivity: act });
      return true;
    },

    /**
     * Accept authoritative activity_result frame.
     */
    handleResult(frame) {
      if (state !== 'joining' && state !== 'participating' && state !== 'queued' && state !== 'watching') {
        return false;
      }
      if (frame?.activityId && currentActivity && frame.activityId !== currentActivity.id) {
        return false;
      }

      const status = frame?.status;

      if (status === 'seated' || frame?.result === 'seated' || frame?.result === 'accepted_offer' || frame?.role === 'player') {
        state = 'participating';
        currentSlot = frame?.slot ?? null;
        lease = frame?.lease ?? frame?.leaseId ?? null;
        sessionId = frame?.sessionId ?? null;
        if (typeof frame?.matchId === 'string' && frame.matchId) {
          currentMatchId = frame.matchId;
        }
        currentAnchor = findAnchorForSlot(currentActivity, currentSlot);

        // Accepting the seat readies the player: the server starts the match
        // only when every seated player is ready (design D2/D4), and AFK
        // readiness still expires server-side after 60 seconds. Rematches
        // stay explicit (R on the cabinet screen). EXCEPTION
        // (add-multiplayer-snowboard-arcade 6.4, extended by
        // integrate-multiplayer-downhill-mayhem-arcade D7): the alpine races
        // use EXPLICIT readiness only — and only after the course handshake.
        const explicitReadiness = currentActivity.type === 'snowboard-race'
          || currentActivity.type === 'downhill-mayhem';
        if (!explicitReadiness) {
          try {
            net?.sendActivityReady?.({ activityId: currentActivity.id, ready: true });
          } catch {}
        }

        if (currentAnchor) {
          try {
            applyAnchor?.(currentAnchor, currentSlot);
          } catch (err) {
            console.warn('[ParticipationController] Error during applyAnchor:', err);
          }
        }

        try {
          clearMovement?.();
        } catch {}
        try {
          sendMovement?.(false);
        } catch {}

        const actTitle = currentActivity?.title || currentActivity?.id || 'Activity';
        toast?.(actTitle, `Playing as Slot ${currentSlot ?? 1}. Press E or Esc to leave.`, 'ACTIVITY');
        onStateChange?.('participating', { slot: currentSlot, anchor: currentAnchor, lease });
        return true;
      }

      if (status === 'queued' || frame?.role === 'queue') {
        state = 'queued';
        const actTitle = currentActivity?.title || currentActivity?.id || 'Activity';
        const posStr = frame?.queuePosition ? ` (position ${frame.queuePosition})` : '';
        toast?.(actTitle, `Queued for play${posStr}. Press E or Esc to leave queue.`, 'ACTIVITY');
        onStateChange?.('queued', { position: frame?.queuePosition });
        return true;
      }

      if (status === 'spectating' || frame?.role === 'spectator') {
        state = 'watching';
        const actTitle = currentActivity?.title || currentActivity?.id || 'Activity';
        toast?.(actTitle, 'Spectating. Press E or Esc to stop watching.', 'ACTIVITY');
        onStateChange?.('watching', {});
        return true;
      }

      if (status === 'left' || status === 'forfeit' || status === 'aborted') {
        const wasParticipating = state === 'participating';
        if (wasParticipating) {
          safeDismount();
        }
        state = 'idle';
        const act = currentActivity;
        resetSession();
        toast?.('Activity Ended', `Session ended (${status}).`, 'ACTIVITY');
        onStateChange?.('idle', { status, previousActivity: act });
        return true;
      }

      return false;
    },

    /**
     * Accept authoritative activity_error frame.
     */
    handleError(frame) {
      if (frame?.activityId && currentActivity && frame.activityId !== currentActivity.id) {
        return false;
      }

      // Pool rule rejections reject the command, not the player's seat.
      // In particular, releasing a charged shot in the lobby must not dismount.
      const poolCommandRejected = currentActivity?.type === 'pool' && [
        'not_in_progress', 'out_of_turn', 'balls_in_motion', 'not_aiming',
        'must_place_cue_ball', 'pocket_call_required', 'overlap_placement',
        'invalid_state', 'no_ball_in_hand', 'invalid_call',
      ].includes(frame?.error);
      const recoverable = poolCommandRejected || frame?.error === 'not_loaded'
        || frame?.error === 'invalid_request'
        || frame?.error === 'invalid_input'
        || frame?.error === 'stale_match'
        || frame?.error === 'stale_sequence';
      if (recoverable && (state === 'participating' || state === 'joining')) {
        const msg = frame?.message || frame?.error || 'Activity command failed';
        toast?.('Activity', msg, 'ACTIVITY');
        return true;
      }

      if (state === 'joining' || state === 'participating' || state === 'queued' || state === 'watching') {
        const wasParticipating = state === 'participating';
        if (wasParticipating) {
          safeDismount();
        }
        state = 'idle';
        const act = currentActivity;
        resetSession();

        const msg = frame?.message || frame?.reason || 'Could not join activity';
        toast?.('Activity Error', msg, 'ACTIVITY');
        onStateChange?.('idle', { error: frame, previousActivity: act });
        return true;
      }
      return false;
    },

    /**
     * Accept authoritative activity_state snapshot.
     */
    handleSnapshot(frame) {
      if (frame?.activityId && currentActivity && frame.activityId !== currentActivity.id) {
        return false;
      }
      if (typeof frame?.matchId === 'string' && frame.matchId) {
        currentMatchId = frame.matchId;
      }
      if (state !== 'participating' || !frame) return;
      if (typeof frame.matchId === 'string' && frame.matchId) currentMatchId = frame.matchId;

      // Ejection check: if the snapshot carries players and local slot is not in it
      if (Array.isArray(frame.players) && currentSlot !== null) {
        const stillIn = frame.players.some(p => p.slot === currentSlot || String(p.slot) === String(currentSlot));
        if (!stillIn) {
          safeDismount();
          state = 'idle';
          const act = currentActivity;
          resetSession();
          toast?.('Activity Ended', 'You are no longer seated at this match.', 'ACTIVITY');
          onStateChange?.('idle', { reason: 'snapshot_ejection', previousActivity: act });
        }
      }
    },

    /**
     * Dispatch an interaction (e.g. from E press or click on interactable).
     *
     * @param {object} item
     * @returns {{ handled: boolean, action?: string }}
     */
    interact(item) {
      if (this.isOccupied) {
        this.leave();
        return { handled: true, action: 'leave' };
      }
      if (item && (item.type === 'activity' || item.activityDef)) {
        const actDef = item.activityDef || item;
        this.join(actDef);
        return { handled: true, action: 'join' };
      }
      return { handled: false };
    },

    /**
     * Deactivate immediately on travel, room change, or disconnect.
     * Clean and idempotent.
     */
    deactivate() {
      if (state === 'idle') return;

      const leavePayload = () => ({
        roomId: getRoomId?.() || '',
        activityId: currentActivity?.id,
        ...(currentMatchId ? { matchId: currentMatchId } : {}),
      });

      if (state === 'joining') {
        try {
          net?.sendActivityLeave?.(leavePayload());
        } catch {}
      } else if (state === 'participating') {
        safeDismount();
        try {
          net?.sendActivityLeave?.(leavePayload());
        } catch {}
      } else if (state === 'watching' || state === 'queued') {
        try {
          net?.sendActivityLeave?.(leavePayload());
        } catch {}
      }

      state = 'idle';
      const act = currentActivity;
      resetSession();

      try {
        clearMovement?.();
      } catch {}

      onStateChange?.('idle', { reason: 'deactivate', previousActivity: act });
    },
  };
}
