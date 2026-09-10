import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DOWNHILL_MAYHEM_ACTIVITY_TYPE,
  DOWNHILL_COURSE_IDS,
  DOWNHILL_DIFFICULTIES,
  validateDownhillControls,
  validateDownhillFence,
  validateDownhillConfig,
  ACTIVITY_COMMANDS,
  ACTIVITY_ERRORS,
} from '../shared/activityProtocol.js';
import { normalizeControls } from '../shared/downhill/rules.js';

const HASH = 'a'.repeat(64);

test('downhill protocol constants are stable', () => {
  assert.equal(DOWNHILL_MAYHEM_ACTIVITY_TYPE, 'downhill-mayhem');
  assert.deepEqual([...DOWNHILL_COURSE_IDS], ['classic', 'timber', 'rock', 'daily']);
  assert.deepEqual([...DOWNHILL_DIFFICULTIES], ['chill', 'mayhem', 'brutal']);
  assert.equal(ACTIVITY_COMMANDS.CONFIG, 'activity_config');
  assert.equal(ACTIVITY_ERRORS.COURSE_MISMATCH, 'course_mismatch');
});

test('validateDownhillControls accepts and sanitizes ride controls', () => {
  const { valid, sanitized } = validateDownhillControls({
    kind: 'ride', steer: 0.5, pedal: true, brake: false, boost: true,
    hopPressed: true, punchPressed: false, kickPressed: true, trick: 'backflip',
  });
  assert.equal(valid, true);
  assert.deepEqual(sanitized, {
    kind: 'ride', steer: 0.5, pedal: true, brake: false, boost: true,
    hopPressed: true, punchPressed: false, kickPressed: true, trick: 'backflip',
  });
});

test('validateDownhillControls rejects unknown fields, bad steer and bad tricks', () => {
  assert.equal(validateDownhillControls({ kind: 'ride', steer: 0, tuck: true }).valid, false);
  assert.equal(validateDownhillControls({ kind: 'ride', steer: 2 }).valid, false);
  assert.equal(validateDownhillControls({ kind: 'ride', steer: NaN }).valid, false);
  assert.equal(validateDownhillControls({ kind: 'ride', steer: 0, trick: 'method' }).valid, false);
  assert.equal(validateDownhillControls({ kind: 'neutral', x: 1 }).valid, false);
  assert.equal(validateDownhillControls({ kind: 'fly', steer: 0 }).valid, false);
});

test('validateDownhillControls checks the loaded course handshake', () => {
  const ok = validateDownhillControls({ kind: 'loaded', courseId: 'classic', courseVersion: 1, courseHash: HASH });
  assert.equal(ok.valid, true);
  assert.equal(validateDownhillControls({ kind: 'loaded', courseId: 'nope', courseVersion: 1, courseHash: HASH }).valid, false);
  assert.equal(validateDownhillControls({ kind: 'loaded', courseId: 'classic', courseVersion: 0, courseHash: HASH }).valid, false);
  assert.equal(validateDownhillControls({ kind: 'loaded', courseId: 'classic', courseVersion: 1, courseHash: 'zz' }).valid, false);
  const mismatch = validateDownhillControls(
    { kind: 'loaded', courseId: 'classic', courseVersion: 1, courseHash: HASH },
    { courseHash: 'b'.repeat(64) },
  );
  assert.equal(mismatch.valid, false);
});

test('validateDownhillConfig is captain settings only', () => {
  assert.equal(validateDownhillConfig({ mountain: 'rock', difficulty: 'brutal' }).valid, true);
  assert.equal(validateDownhillConfig({ mountain: 'nope' }).valid, false);
  assert.equal(validateDownhillConfig({ difficulty: 'nightmare' }).valid, false);
  assert.equal(validateDownhillConfig({ winnerStays: true }).valid, false);
});

test('validateDownhillFence mirrors the snowboard fence', () => {
  assert.equal(validateDownhillFence({ sessionId: 's', lease: 'l', matchId: 'm' }).valid, true);
  assert.equal(validateDownhillFence({ sessionId: 's', lease: 'l' }).valid, false);
  assert.equal(validateDownhillFence({ lease: 'l', matchId: 'm' }).valid, false);
});

test('normalizeControls maps wire action names to intent fields', () => {
  const c = normalizeControls({ steer: 3, pedal: true, hopPressed: true, punchPressed: true, kickPressed: true, trick: 'heel' });
  assert.deepEqual(c, { pedal: 1, brake: 0, steer: 1, hop: true, boost: false, punch: true, kick: true, trick: 'heel' });
});
