/**
 * Authoritative Understory light/music cooperative puzzle.
 *
 * Specifications:
 * - openspec/changes/add-place-activities-program/specs/signature-place-activities/spec.md
 *   (Requirement: Cooperative light music and photographs — Shared puzzle)
 * - design.md (D7)
 *
 * Guarantees:
 * - One to four people press a shared four-pad sequence.
 * - Bounded inputs (pad 0–3 or reset). Wrong press resets progress.
 * - Shared completion with no ranking, XP, or currency.
 */

export const LIGHT_MUSIC_RULES_VERSION = 1;
export const LIGHT_MUSIC_PAD_COUNT = 4;
export const LIGHT_MUSIC_SEQUENCE_LENGTH = 8;
export const LIGHT_MUSIC_MAX_PLAYERS = 4;
export const LIGHT_MUSIC_DT = 1 / 60;

export const LIGHT_MUSIC_PADS = Object.freeze([
  Object.freeze({ id: 0, name: 'Spore', color: '#7ee8b0', midi: 60 }),
  Object.freeze({ id: 1, name: 'Amber', color: '#edb66c', midi: 64 }),
  Object.freeze({ id: 2, name: 'Teal', color: '#38bdf8', midi: 67 }),
  Object.freeze({ id: 3, name: 'Violet', color: '#a78bfa', midi: 71 }),
]);

/**
 * Deterministic LCG sequence of pad indices from an explicit seed.
 * @param {number} seed
 * @param {number} [length=LIGHT_MUSIC_SEQUENCE_LENGTH]
 * @returns {number[]}
 */
export function generateLightMusicSequence(seed, length = LIGHT_MUSIC_SEQUENCE_LENGTH) {
  const seq = [];
  let s = (Number(seed) || 0) >>> 0;
  for (let i = 0; i < length; i++) {
    s = (s * 1664525 + 1013904223) >>> 0;
    seq.push(s % LIGHT_MUSIC_PAD_COUNT);
  }
  return seq;
}

/**
 * @param {any} controls
 * @returns {{ valid: boolean, sanitized?: object, error?: string }}
 */
export function validateLightMusicInput(controls) {
  if (!controls || typeof controls !== 'object' || Array.isArray(controls)) {
    return { valid: false, error: 'controls must be an object' };
  }
  const kind = typeof controls.kind === 'string' ? controls.kind : 'press';
  if (kind === 'neutral') {
    return { valid: true, sanitized: { kind: 'neutral' } };
  }
  if (kind === 'reset') {
    return { valid: true, sanitized: { kind: 'reset' } };
  }
  if (kind === 'press') {
    const pad = Number(controls.pad);
    if (!Number.isInteger(pad) || pad < 0 || pad >= LIGHT_MUSIC_PAD_COUNT) {
      return { valid: false, error: 'pad must be an integer 0-3' };
    }
    return { valid: true, sanitized: { kind: 'press', pad } };
  }
  return { valid: false, error: 'unknown kind' };
}

/**
 * @param {object} [opts]
 * @param {number[]} [opts.activeSlots]
 * @param {number} [opts.seed]
 * @returns {object}
 */
export function initLightMusicState({ activeSlots = [0], seed = 42 } = {}) {
  const slots = (activeSlots || [0]).filter((s) => s >= 0 && s < LIGHT_MUSIC_MAX_PLAYERS);
  const participants = {};
  for (const slot of slots) {
    participants[slot] = { slot, presses: 0 };
  }
  return {
    rulesVersion: LIGHT_MUSIC_RULES_VERSION,
    status: 'playing',
    seed,
    sequence: generateLightMusicSequence(seed),
    progress: 0,
    lastPad: null,
    lastSlot: null,
    lastResult: null,
    completed: false,
    winner: null,
    standings: [],
    activeSlots: [...slots],
    participants,
    lastCommitId: null,
    elapsedMs: 0,
    tickCount: 0,
  };
}

function cloneState(simState) {
  return JSON.parse(JSON.stringify(simState));
}

/**
 * Apply a bounded pad press or reset. Completion is shared — no ranking.
 * @param {object} simState
 * @param {number} slot
 * @param {object} controls
 * @returns {{ simState: object, event: object|null }}
 */
export function applyLightMusicInput(simState, slot, controls) {
  if (!simState || simState.status === 'complete') {
    return { simState, event: null };
  }
  const valid = validateLightMusicInput(controls);
  if (!valid.valid) return { simState, event: null };

  const input = valid.sanitized;
  if (input.kind === 'neutral') return { simState, event: null };

  const commitId = controls.commitId ?? controls.commit_id ?? null;
  if (commitId != null && commitId === simState.lastCommitId) {
    return { simState, event: null };
  }

  const state = cloneState(simState);
  state.lastCommitId = commitId;
  const slotKey = state.participants[slot] ? slot : String(slot);
  const participant = state.participants[slot] ?? state.participants[slotKey];
  if (!participant) return { simState, event: null };

  if (input.kind === 'reset') {
    state.progress = 0;
    state.lastPad = null;
    state.lastSlot = slot;
    state.lastResult = 'reset';
    return {
      simState: state,
      event: { type: 'sequence_reset', slot, payload: { slot, progress: 0, reason: 'manual' } },
    };
  }

  participant.presses += 1;
  state.lastPad = input.pad;
  state.lastSlot = slot;

  const expected = state.sequence[state.progress];
  if (input.pad !== expected) {
    state.progress = 0;
    state.lastResult = 'miss';
    return {
      simState: state,
      event: { type: 'sequence_reset', slot, payload: { slot, pad: input.pad, progress: 0, reason: 'miss' } },
    };
  }

  state.progress += 1;
  state.lastResult = 'hit';

  if (state.progress >= state.sequence.length) {
    state.status = 'complete';
    state.completed = true;
    state.winner = null;
    state.standings = [];
    return {
      simState: state,
      event: {
        type: 'puzzle_complete',
        slot: null,
        payload: {
          progress: state.progress,
          sequence: state.sequence,
          participants: state.activeSlots,
          ranked: false,
        },
      },
    };
  }

  return {
    simState: state,
    event: {
      type: 'pad_hit',
      slot,
      payload: { slot, pad: input.pad, progress: state.progress, remaining: state.sequence.length - state.progress },
    },
  };
}

/**
 * Timekeeping only — sequence state changes exclusively through applyLightMusicInput.
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

export function stepLightMusicSimulation(simState, players = {}, steps = 1) {
  if (!simState) return { simState, event: null };
  let state = simState;
  if (state.status !== 'complete' && steps > 0) {
    state = cloneState(state);
    state.elapsedMs += Math.round(steps * LIGHT_MUSIC_DT * 1000);
    state.tickCount += steps;
  }
  if (state.status === 'complete') return { simState: state, event: null };
  for (const slot of state.activeSlots || []) {
    const input = playerInput(players, slot);
    if (!input) continue;
    const applied = applyLightMusicInput(state, slot, input);
    if (applied.event) return applied;
    state = applied.simState;
  }
  return { simState: state, event: null };
}
