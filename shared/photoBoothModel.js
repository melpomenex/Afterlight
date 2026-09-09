/**
 * Authoritative Orpheum photo booth — opt-in roster, local strip only.
 *
 * Specifications:
 * - openspec/changes/add-place-activities-program/specs/signature-place-activities/spec.md
 *   (Requirement: Cooperative light music and photographs — Photo consent)
 * - design.md (D6, D7)
 *
 * Guarantees:
 * - Two to three avatars. Every pictured participant opts in.
 * - Declines and departures exclude that person.
 * - Capture waits while anyone is still pending, or proceeds without declined people.
 * - Four poses. Capture is booth-only; no theater media, chat, or bystanders.
 * - The wire never carries image bytes. Download is local only. No upload.
 */

export const PHOTO_BOOTH_RULES_VERSION = 1;
export const PHOTO_BOOTH_MIN_PLAYERS = 2;
export const PHOTO_BOOTH_MAX_PLAYERS = 3;
export const PHOTO_BOOTH_POSE_COUNT = 4;
export const PHOTO_BOOTH_COUNTDOWN_MS = 3000;
export const PHOTO_BOOTH_POSE_MS = 1200;
export const PHOTO_BOOTH_DT = 1 / 60;

export const PHOTO_BOOTH_POSES = Object.freeze(['wave', 'peace', 'lean', 'together']);

export const PHOTO_BOOTH_CAPTURE_RULES = Object.freeze({
  includeTheaterMedia: false,
  includeChat: false,
  includeBystanders: false,
  upload: false,
  download: 'local',
  scene: 'booth-offscreen',
});

/**
 * @param {any} controls
 * @returns {{ valid: boolean, sanitized?: object, error?: string }}
 */
export function validatePhotoBoothInput(controls) {
  if (!controls || typeof controls !== 'object' || Array.isArray(controls)) {
    return { valid: false, error: 'controls must be an object' };
  }
  const kind = typeof controls.kind === 'string' ? controls.kind : '';
  if (kind === 'neutral') {
    return { valid: true, sanitized: { kind: 'neutral' } };
  }
  if (kind === 'invite') {
    const raw = Array.isArray(controls.slots) ? controls.slots : [];
    const slots = [];
    for (const value of raw) {
      const slot = Number(value);
      if (!Number.isInteger(slot) || slot < 0 || slot >= PHOTO_BOOTH_MAX_PLAYERS) {
        return { valid: false, error: 'invite slots must be integers 0-2' };
      }
      if (!slots.includes(slot)) slots.push(slot);
    }
    if (slots.length < PHOTO_BOOTH_MIN_PLAYERS || slots.length > PHOTO_BOOTH_MAX_PLAYERS) {
      return { valid: false, error: 'invite requires 2-3 slots' };
    }
    return { valid: true, sanitized: { kind: 'invite', slots } };
  }
  if (kind === 'accept' || kind === 'decline' || kind === 'depart' || kind === 'start' || kind === 'reset') {
    return { valid: true, sanitized: { kind } };
  }
  return { valid: false, error: 'unknown kind' };
}

function emptyRoster(slots) {
  const roster = {};
  for (const slot of slots) {
    roster[slot] = 'pending';
  }
  return roster;
}

/**
 * @param {object} [opts]
 * @param {number[]} [opts.activeSlots]
 * @returns {object}
 */
export function initPhotoBoothState({ activeSlots = [0, 1] } = {}) {
  const slots = (activeSlots || [0, 1]).slice(0, PHOTO_BOOTH_MAX_PLAYERS);
  return {
    rulesVersion: PHOTO_BOOTH_RULES_VERSION,
    status: 'idle',
    proposedSlots: [...slots],
    roster: emptyRoster(slots),
    acceptedSlots: [],
    declinedSlots: [],
    departedSlots: [],
    countdownMs: 0,
    poseIndex: 0,
    poses: [...PHOTO_BOOTH_POSES],
    poseMs: 0,
    stripReady: false,
    captureAllowed: false,
    captureRules: { ...PHOTO_BOOTH_CAPTURE_RULES },
    imageBytes: null,
    uploadRequested: false,
    lastCommitId: null,
    elapsedMs: 0,
    tickCount: 0,
  };
}

function cloneState(simState) {
  return JSON.parse(JSON.stringify(simState));
}

function rosterOf(state) {
  return state.roster || {};
}

function slotsWith(state, status) {
  return Object.entries(rosterOf(state))
    .filter(([, value]) => value === status)
    .map(([key]) => Number(key));
}

function refreshDerived(state) {
  state.acceptedSlots = slotsWith(state, 'accepted');
  state.declinedSlots = slotsWith(state, 'declined');
  state.departedSlots = slotsWith(state, 'departed');
  return state;
}

function picturedSlots(state) {
  return slotsWith(state, 'accepted');
}

function pendingCount(state) {
  return slotsWith(state, 'pending').length;
}

function canCapture(state) {
  return picturedSlots(state).length >= PHOTO_BOOTH_MIN_PLAYERS && pendingCount(state) === 0;
}

/**
 * Subjects that may appear in the booth-only offscreen capture.
 * Never includes declined, departed, bystanders, chat, or theater media.
 * @param {object} simState
 * @returns {{ slots: number[], includeTheaterMedia: false, includeChat: false, includeBystanders: false }}
 */
export function photoBoothCaptureSubjects(simState) {
  const slots = picturedSlots(simState);
  return {
    slots,
    includeTheaterMedia: false,
    includeChat: false,
    includeBystanders: false,
    upload: false,
    scene: 'booth-offscreen',
  };
}

/**
 * Local download descriptor — never an upload URL.
 * @param {object} simState
 * @returns {{ localOnly: true, upload: false, filename: string } | null}
 */
export function photoBoothLocalDownload(simState) {
  if (!simState?.stripReady) return null;
  return {
    localOnly: true,
    upload: false,
    filename: 'afterlight-orpheum-strip.png',
  };
}

/**
 * @param {object} simState
 * @param {number} slot
 * @param {object} controls
 * @returns {{ simState: object, event: object|null }}
 */
export function applyPhotoBoothInput(simState, slot, controls) {
  if (!simState) return { simState, event: null };
  const valid = validatePhotoBoothInput(controls);
  if (!valid.valid) return { simState, event: null };

  const input = valid.sanitized;
  if (input.kind === 'neutral') return { simState, event: null };

  const commitId = controls.commitId ?? controls.commit_id ?? null;
  if (commitId != null && commitId === simState.lastCommitId) {
    return { simState, event: null };
  }

  const state = cloneState(simState);
  state.lastCommitId = commitId;

  if (input.kind === 'reset') {
    const next = initPhotoBoothState({ activeSlots: state.proposedSlots?.length ? state.proposedSlots : [0, 1] });
    next.elapsedMs = state.elapsedMs;
    next.tickCount = state.tickCount;
    return { simState: next, event: { type: 'booth_reset', slot, payload: { slot } } };
  }

  if (input.kind === 'invite') {
    if (state.status !== 'idle' && state.status !== 'inviting') {
      return { simState, event: null };
    }
    state.status = 'inviting';
    state.proposedSlots = input.slots;
    state.roster = emptyRoster(input.slots);
    state.stripReady = false;
    state.captureAllowed = false;
    state.poseIndex = 0;
    state.imageBytes = null;
    state.uploadRequested = false;
    refreshDerived(state);
    return {
      simState: state,
      event: { type: 'invite', slot, payload: { slots: input.slots } },
    };
  }

  if (input.kind === 'accept' || input.kind === 'decline' || input.kind === 'depart') {
    const key = state.roster[slot] != null ? slot : String(slot);
    if (state.roster[key] == null && state.roster[slot] == null) {
      return { simState, event: null };
    }
    const status = input.kind === 'accept' ? 'accepted' : input.kind === 'decline' ? 'declined' : 'departed';
    state.roster[key] = status;
    refreshDerived(state);

    if (status !== 'accepted') {
      state.captureAllowed = false;
    }

    if (state.status === 'countdown' || state.status === 'posing') {
      if (picturedSlots(state).length < PHOTO_BOOTH_MIN_PLAYERS) {
        state.status = 'inviting';
        state.countdownMs = 0;
        state.captureAllowed = false;
        state.poseIndex = 0;
        return {
          simState: state,
          event: {
            type: 'capture_aborted',
            slot,
            payload: { slot, reason: status, acceptedSlots: state.acceptedSlots },
          },
        };
      }
    }

    return {
      simState: state,
      event: {
        type: status,
        slot,
        payload: {
          slot,
          acceptedSlots: state.acceptedSlots,
          pending: pendingCount(state),
          canCapture: canCapture(state),
          excluded: status !== 'accepted',
        },
      },
    };
  }

  if (input.kind === 'start') {
    refreshDerived(state);
    if (pendingCount(state) > 0) {
      return {
        simState: state,
        event: {
          type: 'capture_wait',
          slot,
          payload: { reason: 'pending', pending: pendingCount(state) },
        },
      };
    }
    if (picturedSlots(state).length < PHOTO_BOOTH_MIN_PLAYERS) {
      return {
        simState: state,
        event: {
          type: 'capture_wait',
          slot,
          payload: { reason: 'need_two', acceptedSlots: state.acceptedSlots },
        },
      };
    }
    state.status = 'countdown';
    state.countdownMs = PHOTO_BOOTH_COUNTDOWN_MS;
    state.poseIndex = 0;
    state.poseMs = 0;
    state.stripReady = false;
    state.captureAllowed = false;
    state.imageBytes = null;
    return {
      simState: state,
      event: {
        type: 'countdown',
        slot,
        payload: {
          countdownMs: state.countdownMs,
          subjects: photoBoothCaptureSubjects(state),
        },
      },
    };
  }

  return { simState, event: null };
}

/**
 * Advance countdown and four-pose capture. Never stores image bytes.
 * @param {object} simState
 * @param {object} [_players]
 * @param {number} [steps=1]
 * @returns {{ simState: object, event: object|null }}
 */
function playerInput(players, slot) {
  if (!players) return null;
  const entry = players[slot] ?? players[String(slot)];
  if (!entry) return null;
  return entry.input_state || entry.inputState || entry.controls || null;
}

export function stepPhotoBoothSimulation(simState, players = {}, steps = 1) {
  if (!simState) return { simState, event: null };
  let working = simState;
  if (steps > 0) {
    working = cloneState(simState);
  }
  const state = working;
  if (steps <= 0) {
    return consumePhotoInputs(state, players);
  }
  const addMs = Math.round(steps * PHOTO_BOOTH_DT * 1000);
  state.elapsedMs = (state.elapsedMs || 0) + addMs;
  state.tickCount = (state.tickCount || 0) + steps;

  if (state.status === 'countdown') {
    state.countdownMs = Math.max(0, (state.countdownMs || 0) - addMs);
    if (state.countdownMs <= 0) {
      state.status = 'posing';
      state.poseIndex = 0;
      state.poseMs = 0;
      state.captureAllowed = true;
      return {
        simState: state,
        event: {
          type: 'pose',
          slot: null,
          payload: { poseIndex: 0, pose: state.poses[0], subjects: photoBoothCaptureSubjects(state) },
        },
      };
    }
    return consumePhotoInputs(state, players);
  }

  if (state.status === 'posing') {
    state.poseMs = (state.poseMs || 0) + addMs;
    if (state.poseMs >= PHOTO_BOOTH_POSE_MS) {
      state.poseMs = 0;
      state.poseIndex += 1;
      if (state.poseIndex >= PHOTO_BOOTH_POSE_COUNT) {
        state.status = 'ready';
        state.stripReady = true;
        state.captureAllowed = false;
        state.imageBytes = null;
        state.uploadRequested = false;
        return {
          simState: state,
          event: {
            type: 'strip_ready',
            slot: null,
            payload: {
              subjects: photoBoothCaptureSubjects(state),
              download: photoBoothLocalDownload(state),
              upload: false,
            },
          },
        };
      }
      return {
        simState: state,
        event: {
          type: 'pose',
          slot: null,
          payload: {
            poseIndex: state.poseIndex,
            pose: state.poses[state.poseIndex],
            subjects: photoBoothCaptureSubjects(state),
          },
        },
      };
    }
  }

  return consumePhotoInputs(state, players);
}

function consumePhotoInputs(state, players) {
  const slots = Object.keys(state.roster || {}).map(Number);
  const list = slots.length ? slots : (state.proposedSlots || []);
  for (const slot of list) {
    const input = playerInput(players, slot);
    if (!input) continue;
    const applied = applyPhotoBoothInput(state, slot, input);
    if (applied.event) return applied;
    state = applied.simState;
  }
  return { simState: state, event: null };
}
