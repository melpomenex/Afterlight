/**
 * Pure local presentation/audio policy for floating mini-game media
 * (add-floating-minigame-media, design D3/D4).
 *
 * This module owns no DOM, no engine and no network. It is a small reducer
 * plus selectors so the theater UI can answer:
 *   - which presentation a current item gets while an activity is active
 *     (primary | waiting | floating | hidden),
 *   - what the effective local volume is under the master Sound gate, the
 *     user's mute choice and the temporary activity entry mute,
 *   - what a one-action "unmute the stream" must additionally turn on or
 *     restore, so a label never claims audibility an audio gate prevents,
 *   - which audio preferences an exit may restore (only fields the user did
 *     not explicitly edit during the activity).
 *
 * Audio rules (D3):
 *   - Every distinct game entry forces the temporary activity mute, even if
 *     the stream was audible or the user unmuted the previous game.
 *   - Duplicate lifecycle events for one entry never re-mute a user who
 *     explicitly unmuted.
 *   - Explicit user edits win over baseline restoration on exit; a dynamic
 *     mix gain and the master switch are never snapshotted or restored.
 */

export const PRESENTATION_MODE = Object.freeze({
  PRIMARY: 'primary', // no activity token: world/cinema selects presentation
  WAITING: 'waiting', // activity + no current item: no empty frame, keep token
  FLOATING: 'floating',
  HIDDEN: 'hidden', // hide/restore chip only; playback and audio continue
});

export const MEDIA_ACTION = Object.freeze({
  ENTRY: 'entry',
  REPLACE: 'replace',
  EXIT: 'exit',
  USER_MUTE: 'user_mute',
  USER_UNMUTE: 'user_unmute',
  SET_VOLUME: 'set_volume',
  SET_MASTER_SOUND: 'set_master_sound',
  SET_MIX_GAIN: 'set_mix_gain',
  HIDE: 'hide',
  RESTORE: 'restore',
  SET_EXPANDED: 'set_expanded',
  SET_ITEM: 'set_item',
});

const clamp01 = (value, fallback = 1) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(1, Math.max(0, n));
};

/**
 * @typedef {object} MediaActivityToken
 * @property {string} id
 * @property {number} [generation]
 * @property {number} [attempt]
 */

export function createInitialMediaPresentationState(overrides = {}) {
  return {
    // Persistent local media preferences (the booth slider / speaker choice).
    userMuted: false,
    volume: 1,
    lastNonZeroVolume: 1,
    // Application audio gates — never snapshotted/restored by an activity.
    masterSound: false,
    mixGain: 1,
    // The contiguous activity span: first entry snapshots the baseline.
    activity: null,
    activityMuted: false,
    baseline: null, // { userMuted, volume, revisions: { userMuted, volume } }
    revisions: { userMuted: 0, volume: 0 },
    // Presentation state within the span.
    hidden: false,
    expanded: false,
    hasItem: false,
    ...overrides,
  };
}

function sameToken(a, b) {
  if (!a || !b) return false;
  if (a.id !== b.id) return false;
  const aGen = a.generation ?? null;
  const bGen = b.generation ?? null;
  const aAtt = a.attempt ?? null;
  const bAtt = b.attempt ?? null;
  return aGen === bGen && aAtt === bAtt;
}

function beginActivitySpan(state, activity) {
  const firstOfSpan = !state.activity;
  const baseline = firstOfSpan
    ? {
      userMuted: state.userMuted,
      volume: state.volume,
      revisions: { ...state.revisions },
    }
    : state.baseline; // same-room replacement keeps the span's baseline
  return {
    ...state,
    activity: activity ? { ...activity } : null,
    baseline,
    activityMuted: true, // entry mute happens before any load/admission
    hidden: false,
    expanded: false,
  };
}

/**
 * Pure reducer. Returns the same object for no-op/duplicate events so callers
 * can cheaply detect "nothing changed".
 *
 * @param {ReturnType<typeof createInitialMediaPresentationState>} state
 * @param {object} action
 */
export function reduceMediaPresentation(state, action) {
  if (!state || typeof state !== 'object') {
    throw new Error('mediaPresentationState requires a state object');
  }
  const type = action?.type;

  if (type === MEDIA_ACTION.ENTRY || type === MEDIA_ACTION.REPLACE) {
    const activity = action.activity || null;
    if (!activity?.id) return state;
    // Duplicate lifecycle notification for the same attempt: the user's
    // explicit audio choice for this entry must survive it.
    if (sameToken(state.activity, activity)) return state;
    return beginActivitySpan(state, activity);
  }

  if (type === MEDIA_ACTION.EXIT) {
    if (!state.activity) return state;
    const baseline = state.baseline;
    let userMuted = state.userMuted;
    let volume = state.volume;
    if (baseline) {
      // Restore only fields with no explicit user edit during the span.
      if (state.revisions.userMuted === baseline.revisions.userMuted) {
        userMuted = baseline.userMuted;
      }
      if (state.revisions.volume === baseline.revisions.volume) {
        volume = baseline.volume;
      }
    }
    return {
      ...state,
      userMuted,
      volume,
      activity: null,
      activityMuted: false,
      baseline: null,
      hidden: false,
      expanded: false,
    };
  }

  if (type === MEDIA_ACTION.USER_MUTE) {
    return {
      ...state,
      userMuted: true,
      revisions: { ...state.revisions, userMuted: state.revisions.userMuted + 1 },
    };
  }

  if (type === MEDIA_ACTION.USER_UNMUTE) {
    return {
      ...state,
      userMuted: false,
      activityMuted: false,
      revisions: { ...state.revisions, userMuted: state.revisions.userMuted + 1 },
    };
  }

  if (type === MEDIA_ACTION.SET_VOLUME) {
    const volume = clamp01(action.value, 1);
    return {
      ...state,
      volume,
      lastNonZeroVolume: volume > 0 ? volume : state.lastNonZeroVolume,
      revisions: { ...state.revisions, volume: state.revisions.volume + 1 },
    };
  }

  if (type === MEDIA_ACTION.SET_MASTER_SOUND) {
    const masterSound = action.enabled === true;
    if (masterSound === state.masterSound) return state;
    return { ...state, masterSound };
  }

  if (type === MEDIA_ACTION.SET_MIX_GAIN) {
    const mixGain = clamp01(action.gain, 1);
    if (mixGain === state.mixGain) return state;
    return { ...state, mixGain };
  }

  if (type === MEDIA_ACTION.HIDE) {
    if (state.hidden) return state;
    return { ...state, hidden: true };
  }

  if (type === MEDIA_ACTION.RESTORE) {
    if (!state.hidden) return state;
    return { ...state, hidden: false };
  }

  if (type === MEDIA_ACTION.SET_EXPANDED) {
    const expanded = action.expanded === true;
    if (expanded === state.expanded) return state;
    return { ...state, expanded };
  }

  if (type === MEDIA_ACTION.SET_ITEM) {
    const hasItem = action.hasItem === true;
    if (hasItem === state.hasItem) return state;
    return { ...state, hasItem };
  }

  return state;
}

/**
 * Effective local output under the gates: master Sound off, the user's mute,
 * or the temporary activity mute all silence it; otherwise the user volume
 * scaled by the current mix gain/duck.
 */
export function effectiveMediaVolume(state) {
  if (!state?.masterSound) return 0;
  if (state.userMuted || state.activityMuted) return 0;
  return state.volume * state.mixGain;
}

/** Which presentation the current item should get right now. */
export function presentationMode(state) {
  if (!state?.activity) return PRESENTATION_MODE.PRIMARY;
  if (!state.hasItem) return PRESENTATION_MODE.WAITING;
  if (state.hidden) return PRESENTATION_MODE.HIDDEN;
  return PRESENTATION_MODE.FLOATING;
}

/**
 * What a one-action unmute must additionally do to be truthful:
 *   - `needsMaster`: the app Sound gate is off and must be turned on;
 *   - `targetVolume`: the stored slider is zero; restoring this memorized
 *     nonzero volume (fallback 1) is part of the same explicit action.
 * Returns null-free fields; both may be false/null when plain unmute works.
 */
export function unmutePlan(state) {
  const targetVolume = state.volume <= 0
    ? (state.lastNonZeroVolume > 0 ? state.lastNonZeroVolume : 1)
    : null;
  return {
    needsMaster: !state.masterSound,
    targetVolume,
  };
}

/**
 * Whether entering a game should be advertised as automatically muted right
 * now. Degraded providers cannot honor it — the UI shows its honest notice
 * instead of this being true.
 */
export function isEntrySilent(state) {
  return effectiveMediaVolume(state) <= 0;
}

/**
 * Small imperative wrapper for UI code. The reducer remains the testable
 * core; this only remembers the latest state.
 */
export function createMediaPresentation(initial = {}) {
  let state = createInitialMediaPresentationState(initial);
  return {
    get state() { return state; },
    dispatch(action) {
      state = reduceMediaPresentation(state, action);
      return state;
    },
    effectiveVolume() {
      return effectiveMediaVolume(state);
    },
    mode() {
      return presentationMode(state);
    },
    unmutePlan() {
      return unmutePlan(state);
    },
  };
}
