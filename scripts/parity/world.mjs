/**
 * Parity fixtures for shared/worldModel.js (Node movement semantics: finite
 * checks + `!!` flag coercion, NO clamping — the P3 Elixir clamp is a
 * documented deliberate tightening, spec-tested, not Node behavior) and
 * shared/emotes.js (allow-list).
 */

import { sanitizeMovement } from '../../shared/worldModel.js';
import { EMOTES, isEmote, EMOTE_DURATION } from '../../shared/emotes.js';
import { recordCall } from './harness.mjs';

function build() {
  const cases = [];

  const poses = [
    ['valid-full', { x: 1.5, z: -2.5, rotY: 0.75, walking: true, sitting: false, airborne: true }],
    ['flags-coerced', { x: 0, z: 0, rotY: 0, walking: 1, sitting: 'yes', airborne: undefined }],
    ['flags-omitted', { x: 3, z: 4, rotY: 1 }],
    ['negative-nan', { x: Number.NaN, z: 0, rotY: 0 }],
    ['z-infinity', { x: 1, z: Number.POSITIVE_INFINITY, rotY: 0 }],
    ['rot-string', { x: 1, z: 2, rotY: 'left' }],
    ['null-pose', null],
    ['bounds-edge-upper', { x: 11.3, z: 10.3, rotY: 0 }],
    ['bounds-edge-lower', { x: -11.3, z: -9.5, rotY: 0 }],
    ['outside-bounds-passes-validation', { x: 50, z: -50, rotY: 0 }],
  ];
  for (const [name, pose] of poses) {
    cases.push(recordCall({ id: `movement/${name}`, fn: sanitizeMovement, args: [pose] }));
  }

  cases.push(recordCall({ id: 'emotes/table', fn: emotesTable, args: [] }));
  cases.push(recordCall({ id: 'emotes/duration', fn: emoteDuration, args: [] }));
  for (const e of ['wave', 'dance', 'cheer', 'heart', 'bow', 'shrug', 'floss', 'WAVE', '']) {
    cases.push(recordCall({ id: `emote/is-emote-${e || 'empty'}`, fn: isEmote, args: [e] }));
  }

  // Presence payload shapes (server/world.js): the join-roster entry carries
  // the nickname and omits airborne; the 10 Hz flush entry carries airborne
  // and no nickname. This asymmetry is wire-observed Node behavior — the
  // P3 runtime's Frames renderer must reproduce both field sets exactly.
  cases.push(recordCall({ id: 'shape/join-roster-entry', fn: joinRosterEntry, args: [sampleSession] }));
  cases.push(recordCall({ id: 'shape/flush-entry', fn: flushEntry, args: [sampleSession] }));
  cases.push(recordCall({ id: 'shape/join-roster-coerced', fn: joinRosterEntry, args: [coercedSession] }));
  cases.push(recordCall({ id: 'shape/flush-coerced', fn: flushEntry, args: [coercedSession] }));

  return cases;
}

// A Node client session as `server/world.js` holds it: player identity nested
// under `player`, pose fields and relay flags flat on the session.
const sampleSession = {
  player: { id: 'guest_shapes', nickname: 'Mossy' },
  x: 2.5,
  z: -3.5,
  rotY: 1.25,
  walking: true,
  sitting: false,
  airborne: true,
};

// Pre-sanitization session: the entry builders read session fields directly,
// so truthy flags other than booleans pin the `!!` coercion points verbatim.
const coercedSession = {
  player: { id: 'guest_coerced', nickname: 'Fern' },
  x: -8,
  z: 6.25,
  rotY: -0.5,
  walking: 1,
  sitting: 'yes',
  airborne: 0,
};

// Literal port of the existingPlayers.push({...}) in server/world.js joinRoom.
function joinRosterEntry(session) {
  return {
    id: session.player.id,
    nickname: session.player.nickname,
    x: session.x,
    z: session.z,
    rotY: session.rotY,
    walking: session.walking,
    sitting: !!session.sitting,
  };
}

// Literal port of the updates.push({...}) in server/world.js tickMovementBroadcast.
function flushEntry(session) {
  return {
    id: session.player.id,
    x: session.x,
    z: session.z,
    rotY: session.rotY,
    walking: session.walking,
    sitting: !!session.sitting,
    airborne: !!session.airborne,
  };
}

function emotesTable() {
  return EMOTES;
}

function emoteDuration() {
  return EMOTE_DURATION;
}

export const worldCases = build();
export const worldHazards = {
  'number-coercion': ['movement/flags-coerced', 'movement/rot-string'],
  'null-undefined-absent': ['movement/flags-omitted', 'movement/null-pose'],
  'error-strings': ['emote/*'],
  'flag-coercion': ['shape/*'],
};
