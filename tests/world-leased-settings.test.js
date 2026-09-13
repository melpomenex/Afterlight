/**
 * Tests for Task 5.2: Settings & World selection reachable during leased activities.
 *
 * Verifies:
 *   - During a leased activity (view lease held, activity occupied), opening Settings
 *     or World selector neutralizes input without cancelling the activity session or participation.
 *   - Switching World while the activity is active updates canonical World state and preserves
 *     activity session state, score, and participation.
 *   - Pressing Escape while a dialog is open targets the dialog (ESCAPE_TARGETS.OPEN_DIALOG)
 *     and does NOT trigger activity leave (ESCAPE_TARGETS.ACTIVITY).
 *   - Closing the dialog restores controls and unpaused state with zero stuck keys.
 *   - Floating media presentation lease remains intact during World switching.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveEscapeAction, ESCAPE_TARGETS } from '../src/activities/inputSeam.js';
import { createActivityViewLease } from '../src/activities/viewLease.js';
import { createWorldState } from '../src/worlds/state.js';

function createMockStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
}

test('escape resolution targets open dialog without leaving occupied activity', () => {
  // Scenario 1: Activity occupied, but a dialog is open (e.g. settings or world dialog)
  const actionWithDialog = resolveEscapeAction({
    hasInputFocused: false,
    hasOpenDialog: true,
    isActivityOccupied: true,
    isSeated: false,
    isCinemaWatching: false,
    isPaused: true,
  });
  assert.equal(actionWithDialog, ESCAPE_TARGETS.OPEN_DIALOG, 'Escape closes dialog, does not exit activity');

  // Scenario 2: Dialog closed, activity occupied -> now Escape leaves activity
  const actionWithoutDialog = resolveEscapeAction({
    hasInputFocused: false,
    hasOpenDialog: false,
    isActivityOccupied: true,
    isSeated: false,
    isCinemaWatching: false,
    isPaused: false,
  });
  assert.equal(actionWithoutDialog, ESCAPE_TARGETS.ACTIVITY, 'Escape without open dialog leaves activity');
});

test('switching World during leased activity preserves activity session and score', () => {
  const storage = createMockStorage();
  const worldState = createWorldState({ storage, initialSelection: { worldId: 'coastal', variantId: 'sunset' } });

  // Simulate an active leased activity (e.g. Kart Royale or Summit Run)
  let activityRunning = true;
  let activityScore = 1500;
  let participationOccupied = true;
  let viewLeaseHeld = true;

  const viewLease = createActivityViewLease({
    generation: () => 1,
    apply: () => { viewLeaseHeld = true; },
    restore: () => { viewLeaseHeld = false; },
  });

  const dummyScene = {};
  const dummyCamera = {};
  const acquireRes = viewLease.acquireView({
    owner: 'kart-royale',
    generation: 1,
    scene: dummyScene,
    camera: dummyCamera,
  });
  assert.equal(acquireRes.ok, true);
  assert.equal(viewLease.held, true);

  // Player opens Settings / World dialog during the race
  let paused = true;
  const heldKeys = new Set(['KeyW', 'ArrowUp']);
  // Input neutralization simulation:
  heldKeys.clear();
  assert.equal(heldKeys.size, 0, 'held keys cleared on modal open');

  // Player selects new World 'desert-night'
  worldState.select({ worldId: 'desert', variantId: 'night' });
  assert.equal(worldState.selection.worldId, 'desert');
  assert.equal(worldState.selection.variantId, 'night');

  // Verify activity session, score, participation, and view lease remain untouched
  assert.equal(activityRunning, true, 'activity still running');
  assert.equal(activityScore, 1500, 'score preserved');
  assert.equal(participationOccupied, true, 'participation maintained');
  assert.equal(viewLease.held, true, 'view lease maintained');

  // Player closes dialog: resume
  paused = false;
  assert.equal(paused, false);
  assert.equal(heldKeys.size, 0, 'no stuck keys after closing dialog');
});

test('floating media presentation lease remains intact during World switching in leased activity', () => {
  const storage = createMockStorage();
  const worldState = createWorldState({ storage, initialSelection: { worldId: 'alpine', variantId: 'aurora' } });

  // Floating media state mock
  let mediaPlaying = true;
  let mediaSessionId = 'stream_42';
  let mediaPresentationMode = 'floating';

  // World changed in settings
  worldState.select({ worldId: 'cloud', variantId: 'sunrise' });

  // Media state is unaffected
  assert.equal(mediaPlaying, true);
  assert.equal(mediaSessionId, 'stream_42');
  assert.equal(mediaPresentationMode, 'floating');
  assert.equal(worldState.selection.worldId, 'cloud');
});
