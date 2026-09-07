import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldApplyRoomFrame, jitteredRejoinDelay } from '../../src/net/roomEpoch.js';

test('discards stale-epoch snapshot after newer epoch seen', () => {
  const epochs = new Map([['theater', 3]]);

  assert.equal(
    shouldApplyRoomFrame(epochs, 'theater', { type: 'presence_update', epoch: 2, players: [] }),
    false,
  );

  assert.equal(
    shouldApplyRoomFrame(epochs, 'theater', { type: 'presence_update', epoch: 4, players: [] }),
    true,
  );
  assert.equal(epochs.get('theater'), 4);
});

test('jittered rejoin delay is bounded', () => {
  const d = jitteredRejoinDelay(500);
  assert.ok(d >= 500 && d < 1500);
});
