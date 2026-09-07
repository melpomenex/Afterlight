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

  cases.push(recordCall({ id: 'emotes/table', fn: () => EMOTES, args: [] }));
  cases.push(recordCall({ id: 'emotes/duration', fn: () => EMOTE_DURATION, args: [] }));
  for (const e of ['wave', 'dance', 'cheer', 'heart', 'bow', 'shrug', 'floss', 'WAVE', '']) {
    cases.push(recordCall({ id: `emote/is-emote-${e || 'empty'}`, fn: isEmote, args: [e] }));
  }

  return cases;
}

export const worldCases = build();
export const worldHazards = {
  'number-coercion': ['movement/flags-coerced', 'movement/rot-string'],
  'null-undefined-absent': ['movement/flags-omitted', 'movement/null-pose'],
  'error-strings': ['emote/*'],
};
