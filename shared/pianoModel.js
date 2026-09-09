/**
 * Authoritative Orpheum spatial piano — note events only, never raw audio.
 *
 * Specifications:
 * - openspec/changes/add-place-activities-program/specs/signature-place-activities/spec.md
 *   (Requirement: Cooperative light music and photographs — Piano cleanup)
 * - design.md (D6, D7)
 *
 * Guarantees:
 * - Maximum 20 note-on events per second.
 * - Eight-note polyphony (oldest note is stolen).
 * - Two-second maximum note duration, refreshed while held.
 * - All notes off on blur / travel / leave.
 * - Mute is respected locally; the wire carries note events only.
 */

export const PIANO_RULES_VERSION = 1;
export const PIANO_MAX_NOTES_PER_SEC = 20;
export const PIANO_MAX_POLYPHONY = 8;
export const PIANO_MAX_NOTE_MS = 2000;
export const PIANO_MIN_MIDI = 48;
export const PIANO_MAX_MIDI = 72;
export const PIANO_DT = 1 / 60;
export const PIANO_RATE_WINDOW_MS = 1000;

/**
 * @param {any} controls
 * @returns {{ valid: boolean, sanitized?: object, error?: string }}
 */
export function validatePianoInput(controls) {
  if (!controls || typeof controls !== 'object' || Array.isArray(controls)) {
    return { valid: false, error: 'controls must be an object' };
  }
  const kind = typeof controls.kind === 'string' ? controls.kind : '';
  if (kind === 'neutral') {
    return { valid: true, sanitized: { kind: 'neutral' } };
  }
  if (kind === 'all_off' || kind === 'all-off') {
    return { valid: true, sanitized: { kind: 'all_off' } };
  }
  if (kind === 'mute') {
    return { valid: true, sanitized: { kind: 'mute', muted: !!controls.muted } };
  }
  if (kind === 'note_on' || kind === 'note_off' || kind === 'sustain') {
    const midi = Number(controls.midi);
    if (!Number.isInteger(midi) || midi < PIANO_MIN_MIDI || midi > PIANO_MAX_MIDI) {
      return { valid: false, error: 'midi must be an integer 48-72' };
    }
    return { valid: true, sanitized: { kind: kind === 'note_on' ? 'note_on' : kind === 'sustain' ? 'sustain' : 'note_off', midi } };
  }
  return { valid: false, error: 'unknown kind' };
}

/**
 * @param {object} [opts]
 * @param {number[]} [opts.activeSlots]
 * @returns {object}
 */
export function initPianoState({ activeSlots = [0] } = {}) {
  return {
    rulesVersion: PIANO_RULES_VERSION,
    status: 'playing',
    nowMs: 0,
    activeNotes: [],
    noteOnTimes: [],
    muted: false,
    lastKind: null,
    lastCommitId: null,
    activeSlots: [...(activeSlots || [0]).slice(0, 1)],
    elapsedMs: 0,
    tickCount: 0,
  };
}

function cloneState(simState) {
  return JSON.parse(JSON.stringify(simState));
}

function pruneRateWindow(times, nowMs) {
  return (times || []).filter((t) => nowMs - t < PIANO_RATE_WINDOW_MS);
}

function expireNotes(notes, nowMs) {
  return (notes || []).filter((n) => n.expiresAt > nowMs);
}

/**
 * Apply a note-on / note-off / sustain / all-off / mute event.
 * @param {object} simState
 * @param {number} slot
 * @param {object} controls
 * @returns {{ simState: object, event: object|null }}
 */
export function applyPianoInput(simState, slot, controls) {
  if (!simState) return { simState, event: null };
  const valid = validatePianoInput(controls);
  if (!valid.valid) return { simState, event: null };

  const input = valid.sanitized;
  if (input.kind === 'neutral') return { simState, event: null };

  const commitId = controls.commitId ?? controls.commit_id ?? null;
  if (commitId != null && commitId === simState.lastCommitId) {
    return { simState, event: null };
  }

  const state = cloneState(simState);
  state.lastCommitId = commitId;
  const now = state.nowMs || 0;
  state.activeNotes = expireNotes(state.activeNotes, now);
  state.noteOnTimes = pruneRateWindow(state.noteOnTimes, now);
  state.lastKind = input.kind;

  if (input.kind === 'mute') {
    state.muted = !!input.muted;
    if (state.muted) {
      const released = state.activeNotes.map((n) => n.midi);
      state.activeNotes = [];
      return {
        simState: state,
        event: { type: 'all_off', slot, payload: { slot, midis: released, reason: 'mute' } },
      };
    }
    return {
      simState: state,
      event: { type: 'mute', slot, payload: { slot, muted: false } },
    };
  }

  if (input.kind === 'all_off') {
    const released = state.activeNotes.map((n) => n.midi);
    state.activeNotes = [];
    return {
      simState: state,
      event: { type: 'all_off', slot, payload: { slot, midis: released, reason: 'all_off' } },
    };
  }

  if (input.kind === 'note_off') {
    const before = state.activeNotes.length;
    state.activeNotes = state.activeNotes.filter((n) => n.midi !== input.midi);
    if (state.activeNotes.length === before) {
      return { simState: state, event: null };
    }
    return {
      simState: state,
      event: { type: 'note_off', slot, payload: { slot, midi: input.midi } },
    };
  }

  if (input.kind === 'sustain') {
    const note = state.activeNotes.find((n) => n.midi === input.midi);
    if (!note) return { simState, event: null };
    note.expiresAt = now + PIANO_MAX_NOTE_MS;
    return {
      simState: state,
      event: { type: 'sustain', slot, payload: { slot, midi: input.midi, expiresAt: note.expiresAt } },
    };
  }

  // note_on
  if (state.noteOnTimes.length >= PIANO_MAX_NOTES_PER_SEC) {
    return {
      simState: state,
      event: { type: 'rate_limited', slot, payload: { slot, midi: input.midi } },
    };
  }

  const existing = state.activeNotes.find((n) => n.midi === input.midi);
  if (existing) {
    existing.expiresAt = now + PIANO_MAX_NOTE_MS;
    existing.startedAt = now;
    return {
      simState: state,
      event: { type: 'sustain', slot, payload: { slot, midi: input.midi, expiresAt: existing.expiresAt } },
    };
  }

  if (state.activeNotes.length >= PIANO_MAX_POLYPHONY) {
    state.activeNotes.sort((a, b) => a.startedAt - b.startedAt);
    state.activeNotes.shift();
  }

  state.noteOnTimes.push(now);
  const note = {
    midi: input.midi,
    slot,
    startedAt: now,
    expiresAt: now + PIANO_MAX_NOTE_MS,
  };
  state.activeNotes.push(note);
  return {
    simState: state,
    event: { type: 'note_on', slot, payload: { slot, midi: input.midi, expiresAt: note.expiresAt } },
  };
}

/**
 * Advance the piano clock and expire held notes past two seconds.
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

export function stepPianoSimulation(simState, players = {}, steps = 1) {
  if (!simState) return { simState, event: null };
  let state = simState;
  if (steps > 0) {
    state = cloneState(state);
    const addMs = Math.round(steps * PIANO_DT * 1000);
    state.nowMs = (state.nowMs || 0) + addMs;
    state.elapsedMs = (state.elapsedMs || 0) + addMs;
    state.tickCount = (state.tickCount || 0) + steps;
    const before = state.activeNotes.map((n) => n.midi);
    state.activeNotes = expireNotes(state.activeNotes, state.nowMs);
    state.noteOnTimes = pruneRateWindow(state.noteOnTimes, state.nowMs);
    const expired = before.filter((m) => !state.activeNotes.some((n) => n.midi === m));
    if (expired.length) {
      return {
        simState: state,
        event: { type: 'notes_expired', slot: null, payload: { midis: expired } },
      };
    }
  }
  for (const slot of state.activeSlots || [0]) {
    const input = playerInput(players, slot);
    if (!input) continue;
    const applied = applyPianoInput(state, Number(slot), input);
    if (applied.event) return applied;
    state = applied.simState;
  }
  return { simState: state, event: null };
}
