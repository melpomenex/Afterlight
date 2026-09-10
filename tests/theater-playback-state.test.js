/**
 * Pure tests for the theater playback supervision state machine
 * (src/ui/theaterPlaybackState.js; fix-theater-second-player-playback D2).
 * No DOM, no renderer — the function is the contract.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  PLAYBACK_ACTION,
  nextPlaybackAction,
  shouldRetryPlayerReady,
  updateProgress,
} from '../src/ui/theaterPlaybackState.js';

const NOW = 1_000_000;
const base = (over = {}) => ({
  wantPlaying: true,
  engineState: 'playing',
  positionSec: 10,
  targetSec: 10,
  nowMs: NOW,
  lastProgressAt: NOW - 500,
  needsGesture: false,
  seekAllowed: true,
  ...over,
});

test('healthy playback inside the drift threshold needs no action', () => {
  assert.equal(nextPlaybackAction(base()), PLAYBACK_ACTION.NONE);
  assert.equal(nextPlaybackAction(base({ positionSec: 10.4 })), PLAYBACK_ACTION.NONE);
});

test('playing but drifted seeks to the shared position', () => {
  assert.equal(nextPlaybackAction(base({ positionSec: 4, targetSec: 20 })), PLAYBACK_ACTION.SEEK);
});

test('live HLS (seek not allowed) never gets a seek action', () => {
  assert.equal(
    nextPlaybackAction(base({ positionSec: 4, targetSec: 20, seekAllowed: false })),
    PLAYBACK_ACTION.NONE,
  );
});

test('bill paused pauses a playing engine, and a paused engine is left alone', () => {
  assert.equal(nextPlaybackAction(base({ wantPlaying: false })), PLAYBACK_ACTION.PAUSE);
  assert.equal(
    nextPlaybackAction(base({ wantPlaying: false, engineState: 'paused' })),
    PLAYBACK_ACTION.NONE,
  );
});

test('never-started YouTube (cued/unstarted) tries to play, then asks for a gesture', () => {
  const fresh = base({ engineState: 'cued', positionSec: 0, lastProgressAt: NOW - 500 });
  assert.equal(nextPlaybackAction(fresh), PLAYBACK_ACTION.PLAY);

  const stalled = base({ engineState: 'unstarted', positionSec: 0, lastProgressAt: NOW - 5000 });
  assert.equal(nextPlaybackAction(stalled), PLAYBACK_ACTION.NEEDS_GESTURE);
});

test('a player that starts and then stops is detected (paused after progress)', () => {
  const drifting = base({ engineState: 'paused', positionSec: 3, targetSec: 9, lastProgressAt: NOW - 1000 });
  assert.equal(nextPlaybackAction(drifting), PLAYBACK_ACTION.PLAY);

  const stalled = base({ engineState: 'paused', positionSec: 3, targetSec: 9, lastProgressAt: NOW - 5000 });
  assert.equal(nextPlaybackAction(stalled), PLAYBACK_ACTION.NEEDS_GESTURE);
});

test('buffering is not treated as a blocked autoplay even when long', () => {
  const buffering = base({ engineState: 'buffering', lastProgressAt: NOW - 30_000 });
  assert.equal(nextPlaybackAction(buffering), PLAYBACK_ACTION.NONE);
});

test('a refused play keeps asking for the gesture until it is cleared', () => {
  assert.equal(
    nextPlaybackAction(base({ engineState: 'playing', needsGesture: true })),
    PLAYBACK_ACTION.NEEDS_GESTURE,
  );
});

test('error and ended engines never get played or paused by supervision', () => {
  assert.equal(nextPlaybackAction(base({ engineState: 'error' })), PLAYBACK_ACTION.NONE);
  assert.equal(nextPlaybackAction(base({ engineState: 'ended' })), PLAYBACK_ACTION.NONE);
  assert.equal(nextPlaybackAction(base({ engineState: 'error', wantPlaying: false })), PLAYBACK_ACTION.NONE);
});

test('loading/unknown states are left alone; missing input is safe', () => {
  assert.equal(nextPlaybackAction(base({ engineState: 'loading' })), PLAYBACK_ACTION.NONE);
  assert.equal(nextPlaybackAction(base({ engineState: null })), PLAYBACK_ACTION.NONE);
  assert.equal(nextPlaybackAction({}), PLAYBACK_ACTION.NONE);
  assert.equal(nextPlaybackAction(), PLAYBACK_ACTION.NONE);
});

test('a custom stall window is honored', () => {
  const input = base({ engineState: 'paused', lastProgressAt: NOW - 2500 });
  assert.equal(nextPlaybackAction(input), PLAYBACK_ACTION.PLAY);
  assert.equal(nextPlaybackAction({ ...input, stallMs: 2000 }), PLAYBACK_ACTION.NEEDS_GESTURE);
});

test('updateProgress: first observation arms the clock, movement re-arms it', () => {
  const first = updateProgress({}, 0, NOW);
  assert.equal(first.lastPositionSec, 0);
  assert.equal(first.lastProgressAt, NOW);

  const still = updateProgress(first, 0, NOW + 2000);
  assert.equal(still.lastProgressAt, NOW, 'a frozen position must not refresh the stall clock');

  const moving = updateProgress(still, 1.5, NOW + 4000);
  assert.equal(moving.lastPositionSec, 1.5);
  assert.equal(moving.lastProgressAt, NOW + 4000);
});

test('updateProgress: sub-epsilon jitter is not progress; invalid positions are ignored', () => {
  const tracked = updateProgress({ lastPositionSec: 5, lastProgressAt: NOW }, 5.1, NOW + 3000);
  assert.equal(tracked.lastProgressAt, NOW);

  const invalid = updateProgress(tracked, null, NOW + 5000);
  assert.equal(invalid.lastPositionSec, 5);
  assert.equal(invalid.lastProgressAt, NOW);
});

test('shouldRetryPlayerReady: one bounded rebuild per item, never while ready or waiting', () => {
  // Ready players are never rebuilt.
  assert.equal(shouldRetryPlayerReady({ ready: true, waitedMs: 99_999, timeoutMs: 9000 }), false);
  // Not timed out yet.
  assert.equal(shouldRetryPlayerReady({ ready: false, waitedMs: 8000, timeoutMs: 9000 }), false);
  // Timed out with no previous retry: rebuild once.
  assert.equal(shouldRetryPlayerReady({ ready: false, waitedMs: 9000, timeoutMs: 9000 }), true);
  // A second timeout for the same item must not loop.
  assert.equal(
    shouldRetryPlayerReady({ ready: false, waitedMs: 30_000, timeoutMs: 9000, alreadyRetried: true }),
    false,
  );
});
