import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldApplyRoomFrame, envelopeMatchesRoom, jitteredRejoinDelay } from '../../src/net/roomEpoch.js';

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

// Task 3.2 (add-social-place-framework D3): tagged room output rejected
// before epoch bookkeeping.

test('a tagged frame from a previous room is rejected before any epoch bookkeeping', () => {
  const epochs = new Map();

  // Queued old-room output arriving after travel to 'b'.
  assert.equal(
    shouldApplyRoomFrame(epochs, 'b', { type: 'presence_update', roomId: 'a', epoch: 1, players: [{ id: 'ghost' }] }),
    false,
  );
  assert.equal(epochs.size, 0, 'nothing was recorded for either room');

  // Wrong-room HIGH epoch: rejected too, and it must not poison the new
  // room's epoch key (room identity gates, not epoch arithmetic).
  assert.equal(
    shouldApplyRoomFrame(epochs, 'b', { type: 'emote_broadcast', roomId: 'a', epoch: 99 }),
    false,
  );
  assert.equal(epochs.get('b'), undefined);
  assert.equal(epochs.get('a'), undefined);
});

test('tagged frames for the desired room apply, and a tagged frame keys by roomId when no room is joined yet', () => {
  const epochs = new Map();

  assert.equal(
    shouldApplyRoomFrame(epochs, 'theater', { type: 'presence_update', roomId: 'theater', epoch: 5, players: [] }),
    true,
  );
  assert.equal(epochs.get('theater'), 5);

  // desiredRoom not yet replayed: the frame's own tag becomes the key.
  assert.equal(
    shouldApplyRoomFrame(epochs, null, { type: 'presence_join', roomId: 'court', epoch: 2 }),
    true,
  );
  assert.equal(epochs.get('court'), 2);
});

test('untagged frames keep the legacy behavior (old servers never tagged)', () => {
  const epochs = new Map([['theater', 2]]);

  assert.equal(
    shouldApplyRoomFrame(epochs, 'theater', { type: 'presence_update', epoch: 2, players: [] }),
    true,
    'untagged room frame at the newest epoch applies as before',
  );

  // The theater/catalog reply path stays untouched: an untagged welcome
  // replays normally (the old code only writes the map when the epoch is
  // strictly greater than the default 0, so a 0-epoch frame applies
  // without recording).
  const fresh = new Map();
  assert.equal(shouldApplyRoomFrame(fresh, 'theater', { type: 'welcome', epoch: 0 }), true);
  assert.equal(fresh.get('theater'), undefined);
});

test('theater_state without epoch applies after newer presence epoch', () => {
  const epochs = new Map([['theater', 3]]);

  assert.equal(
    shouldApplyRoomFrame(epochs, 'theater', { type: 'theater_state', roomId: 'theater' }),
    true,
    'bill snapshots omit epoch and must not be discarded after presence',
  );
  assert.equal(epochs.get('theater'), 3);
});

test('explicit stale epoch on a presence frame is still discarded', () => {
  const epochs = new Map([['theater', 3]]);

  assert.equal(
    shouldApplyRoomFrame(epochs, 'theater', { type: 'presence_update', roomId: 'theater', epoch: 2 }),
    false,
  );
});

test('binary envelopes match by room before consumption; untagged envelopes stay legacy', () => {
  assert.equal(envelopeMatchesRoom('theater', 'theater'), true);
  assert.equal(envelopeMatchesRoom('theater', 'market'), false);
  // Untagged (old server): always applies.
  assert.equal(envelopeMatchesRoom('theater', undefined), true);
  assert.equal(envelopeMatchesRoom('theater', null), true);
  // No desired room replayed yet: nothing to mismatch.
  assert.equal(envelopeMatchesRoom(null, 'market'), true);
  assert.equal(envelopeMatchesRoom(undefined, undefined), true);
});

test('jittered rejoin delay is bounded', () => {
  const d = jitteredRejoinDelay(500);
  assert.ok(d >= 500 && d < 1500);
});
