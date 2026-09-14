import test from 'node:test';
import assert from 'node:assert/strict';
import { MSG_TYPES } from '../shared/protocol.js';
import { shouldApplyRoomFrame } from '../src/net/roomEpoch.js';
import {
  EMPTY_ACTIVITY_AVAILABILITY,
  normalizeActivityAvailability,
  isActivityClosed,
  closedActivityLabel,
} from '../src/activities/availability.js';
import { createActivityRuntime } from '../src/activities/runtime.js';

const downhillDef = { id: 'orpheum-downhill-mayhem', type: 'downhill-mayhem', title: 'Downhill Mayhem' };
const pongDef = { id: 'orpheum-pong', type: 'pong', title: 'Pong Cabinet' };

const closedFrame = {
  type: 'activity_availability',
  roomId: 'theater',
  closed: [
    { id: 'orpheum-downhill-mayhem', type: 'downhill-mayhem', title: 'Downhill Mayhem' },
    { id: 'summit-run', type: 'snowboard-race', title: 'Summit Run' },
  ],
};

test('protocol carries the additive activity_availability server push', () => {
  assert.equal(MSG_TYPES.ACTIVITY_AVAILABILITY, 'activity_availability');
});

test('availability frames are room-scoped: wrong-room frames never apply', () => {
  const epochs = new Map();
  // Same-room and untagged frames apply; a tagged frame from another room is
  // dropped before it could mark the new room's cabinets as closed.
  assert.equal(shouldApplyRoomFrame(epochs, 'theater', closedFrame), true);
  assert.equal(
    shouldApplyRoomFrame(epochs, 'court', { ...closedFrame, roomId: 'theater' }),
    false,
  );
  assert.equal(shouldApplyRoomFrame(epochs, 'theater', { type: 'activity_availability' }), true);
});

test('normalizeActivityAvailability parses closed rows and stays empty on malformed input', () => {
  assert.equal(normalizeActivityAvailability(null), EMPTY_ACTIVITY_AVAILABILITY);
  assert.equal(normalizeActivityAvailability({}), EMPTY_ACTIVITY_AVAILABILITY);
  assert.equal(normalizeActivityAvailability({ roomId: 'theater' }), EMPTY_ACTIVITY_AVAILABILITY);

  const state = normalizeActivityAvailability(closedFrame);
  assert.equal(state.roomId, 'theater');
  assert.equal(state.closedById.size, 2);
  assert.equal(state.closedById.get('orpheum-downhill-mayhem').title, 'Downhill Mayhem');
  assert.ok(state.closedTypes.has('snowboard-race'));

  // Rows without id or type are ignored; long values are bounded.
  const messy = normalizeActivityAvailability({
    roomId: 'theater',
    closed: [null, {}, { id: 'x'.repeat(200), type: 'pong' }, { title: 'no ids' }],
  });
  assert.equal(messy.closedById.size, 1);
  assert.equal(messy.closedById.keys().next().value.length, 64);

  // A frame for a different room than the active scope is ignored entirely.
  const scoped = normalizeActivityAvailability(closedFrame, { roomId: 'court' });
  assert.equal(scoped, EMPTY_ACTIVITY_AVAILABILITY);
});

test('isActivityClosed matches by id first, then by type, and never blocks on missing state', () => {
  const state = normalizeActivityAvailability(closedFrame);
  assert.equal(isActivityClosed(state, downhillDef), true);
  // Id unknown to the snapshot but the type is closed (e.g. a second
  // instance of a gated game in another place): still closed.
  assert.equal(isActivityClosed(state, { id: 'other-hill', type: 'snowboard-race' }), true);
  assert.equal(isActivityClosed(state, pongDef), false);
  assert.equal(isActivityClosed(EMPTY_ACTIVITY_AVAILABILITY, downhillDef), false);
  assert.equal(isActivityClosed(null, downhillDef), false);
  assert.equal(isActivityClosed(state, null), false);
});

test('closedActivityLabel names the game honestly in the game voice', () => {
  const state = normalizeActivityAvailability(closedFrame);
  const label = closedActivityLabel(state.closedById.get(downhillDef.id), downhillDef);
  assert.equal(label.title, 'Downhill Mayhem');
  assert.match(label.sub, /coming soon/i);

  assert.equal(closedActivityLabel(null, downhillDef).title, 'Downhill Mayhem');
  assert.equal(closedActivityLabel(null, null).title, 'This cabinet');
});

test('activity runtime: availability marks cabinets closed per room and resets on travel', () => {
  const runtime = createActivityRuntime({ net: null });

  runtime.activate({ roomId: 'theater', world: { group: {} }, generation: 1, def: { activities: [] } });
  assert.equal(runtime.isActivityClosed(downhillDef), false, 'no snapshot yet: playable');

  assert.equal(runtime.acceptAvailability(closedFrame), true);
  assert.equal(runtime.isActivityClosed(downhillDef), true);
  assert.equal(runtime.closedActivityInfo(downhillDef).title, 'Downhill Mayhem');
  assert.equal(runtime.isActivityClosed(pongDef), false, 'open games stay playable');

  // A stale frame for another room never marks the active room's cabinets.
  runtime.acceptAvailability({ ...closedFrame, roomId: 'court' });
  assert.equal(runtime.isActivityClosed(downhillDef), false, 'other-room frame ignored');

  // Travel resets the closed set: the new room starts from no snapshot.
  runtime.activate({ roomId: 'court', world: { group: {} }, generation: 2, def: { activities: [] } });
  assert.equal(runtime.isActivityClosed(downhillDef), false);

  runtime.deactivate();
  assert.equal(runtime.isActivityClosed(downhillDef), false);
});
