/**
 * Seat generalization tests (task 2.2): pure normalization, safe dismount
 * choice, controller sequencing and the throttled pose-packet guarantee.
 * Theater presentation itself is covered in tests/theater-place-adapter.test.js.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

import {
  normalizeSeat,
  chooseDismount,
  createSeatController,
  LEGACY_SEAT_POSE,
} from '../src/social/seating.js';
import { createInteractionRegistry, registerCoreInteractions } from '../src/social/interactions.js';
import { getPlaceDefinition } from '../shared/placeDefinitions.js';
import { buildDistrict } from '../src/districts.js';
import { isWalkable, getBoundsForRoom } from '../src/world/bounds.js';

// A real, historical Orpheum seat item, exactly as the builder pushes it.
function aTheaterSeat() {
  const world = buildDistrict(getPlaceDefinition('theater'));
  return world.items.find(item => item.type === 'seat');
}

test('historical Theater seats normalize to the exact legacy offsets', () => {
  const seat = normalizeSeat(aTheaterSeat());

  assert.equal(seat.type, 'seat');
  assert.equal(seat.legacy, true, 'missing metadata is recognized as the historical shape');
  assert.deepEqual(seat.sit, {
    x: seat.x,
    y: 0,
    z: seat.z - 0.08, // the seated spot stays just inside the chair's collision rect
    rotY: Math.PI,    // facing the screen
  });
  assert.deepEqual(seat.dismount, [{ x: seat.x, z: seat.z - 0.8 }], 'one clear front dismount, 0.8 out');
  assert.equal(seat.animationProfile, 'folded');
  assert.equal(LEGACY_SEAT_POSE.rotY, Math.PI);
});

test('every Theater seat in the built house normalizes with a walkable front dismount', () => {
  const world = buildDistrict(getPlaceDefinition('theater'));
  const bounds = getBoundsForRoom('theater');
  const dismounts = [];

  for (const item of world.items.filter(i => i.type === 'seat')) {
    const seat = normalizeSeat(item);
    assert.equal(seat.sit.rotY, Math.PI);
    const point = chooseDismount(seat, { bounds, obstacles: world.obstacles, isWalkable, spawn: [-9, 0] });
    dismounts.push(point.fallback);
  }

  assert.equal(dismounts.filter(f => f).length, 0, 'no seat needed the spawn fallback');
});

test('a rotated seat keeps its explicit world-space pose and facing', () => {
  const item = {
    type: 'seat', id: 'fire-seat-1', x: 4, z: 3,
    sit: { x: 4, y: 0, z: 3, rotY: -Math.PI / 4 }, // facing a campfire to the north-east
    dismount: [{ x: 4.9, z: 3.8 }, { x: 3.1, z: 2.2 }],
    groupId: 'fire-circle', acousticZoneId: 'fire-hum',
  };
  const seat = normalizeSeat(item);

  assert.equal(seat.legacy, false);
  assert.deepEqual(seat.sit, { x: 4, y: 0, z: 3, rotY: -Math.PI / 4 });
  assert.deepEqual(seat.dismount, [{ x: 4.9, z: 3.8 }, { x: 3.1, z: 2.2 }]);
  assert.equal(seat.groupId, 'fire-circle');
  assert.equal(seat.acousticZoneId, 'fire-hum');
});

test('seats without explicit poses must not silently guess a facing', () => {
  // The legacy fallback exists only for the historical Theater items; an
  // explicitly authored seat with a broken pose is an authoring error.
  assert.throws(
    () => normalizeSeat({ type: 'seat', id: 'bench', x: 1, z: 2, sit: { x: 1, z: 2 } }),
    /finite rotY/,
    'an explicit pose without rotY is rejected',
  );
  assert.throws(
    () => normalizeSeat({ type: 'seat', id: 'bench', x: 1, z: 2, sit: { x: 1, y: 1.2, z: 2, rotY: 0 } }),
    /y must stay zero/,
    'elevated seated poses are rejected: avatars assume ground level',
  );
  assert.throws(
    () => normalizeSeat({ type: 'seat', id: 'bench', x: 1, z: 2, sit: { x: 1, z: 2, rotY: 0 }, dismount: [] }),
    /1-4/,
    'at least one dismount candidate is required',
  );
  assert.throws(
    () => normalizeSeat({
      type: 'seat', id: 'bench', x: 1, z: 2, sit: { x: 1, z: 2, rotY: 0 },
      dismount: [{ x: 1, z: 1 }, { x: 2, z: 2 }, { x: 3, z: 2 }, { x: 4, z: 2 }, { x: 5, z: 2 }],
    }),
    /1-4/,
    'more than four dismount candidates are rejected',
  );
});

function fakeFacts(obstacles, spawn = [-9, 0]) {
  const bounds = getBoundsForRoom('court');
  return { bounds, obstacles, isWalkable, spawn };
}

test('blocked dismounts fall back to another candidate, then to the safe spawn', () => {
  const seat = normalizeSeat({
    type: 'seat', x: 0, z: 0,
    sit: { x: 0, y: 0, z: 0, rotY: 0 },
    dismount: [{ x: 0, z: -1 }, { x: 2, z: 0 }, { x: -5, z: 5 }],
  });

  // Wall directly in front: the first candidate is blocked, the second free.
  const wallAhead = [{ x: 0, z: -1, w: 4, d: 1 }];
  const secondFree = chooseDismount(seat, fakeFacts(wallAhead));
  assert.deepEqual(
    { x: secondFree.x, z: secondFree.z, fallback: secondFree.fallback },
    { x: 2, z: 0, fallback: false },
    'the first walkable authored point wins',
  );

  // Every candidate wedged in: the place's verified safe spawn is used.
  const allBlocked = [
    { x: 0, z: -1, w: 4, d: 1 },
    { x: 2, z: 0, w: 1, d: 4 },
    { x: -5, z: 5, w: 4, d: 4 },
  ];
  const spawned = chooseDismount(seat, fakeFacts(allBlocked, [-9, 0]));
  assert.deepEqual(
    { x: spawned.x, z: spawned.z, fallback: spawned.fallback },
    { x: -9, z: 0, fallback: true },
    'standing uses the safe spawn instead of trapping the avatar',
  );
  assert.ok(isWalkable(getBoundsForRoom('court'), [], spawned.x, spawned.z), 'the fallback is walkable by construction');
});

function recordingController({ obstacles = [], spawn = [-9, 0] } = {}) {
  const events = [];
  const player = { x: 0, y: 0, z: 0, rotY: 0, legsFolded: 0 };
  const controller = createSeatController({
    worldFacts: () => ({ bounds: getBoundsForRoom('court'), obstacles, isWalkable, spawn }),
    applySit: (seat, pose) => {
      events.push(['sit', seat.id ?? seat.x, pose.rotY]);
      player.x = pose.x; player.z = pose.z; player.rotY = pose.rotY;
      player.legsFolded = 2;
    },
    applyStand: (seat, point) => {
      events.push(['stand', point.x, point.z, point.fallback === true]);
      player.x = point.x; player.z = point.z;
      player.legsFolded = 0;
    },
    sendMovement: (sitting) => events.push(['send', sitting]),
    onSeatChanged: (detail) => events.push(['changed', detail.seated]),
  });
  return { controller, events, player };
}

test('the controller sequences sit exactly like the historical sitOn', () => {
  const { controller, events } = recordingController();

  const seat = controller.sit(aTheaterSeat());
  assert.ok(seat, 'sitting on a free seat succeeds');
  assert.equal(controller.current, seat);
  assert.deepEqual(events, [
    ['sit', seat.x, Math.PI],   // pose applied first (position, folded legs)
    ['send', true],             // then the seated wire flag
    ['changed', true],          // then the place notification (cinema)
  ]);

  // Sitting again while seated is a no-op, exactly as before.
  assert.equal(controller.sit(aTheaterSeat()), null);
  assert.equal(events.length, 3);
});

test('standing chooses a walkable dismount and clears the pose', () => {
  const { controller, events } = recordingController();
  const seat = controller.sit(aTheaterSeat());
  events.length = 0;

  const point = controller.stand();
  assert.deepEqual(events, [
    ['stand', seat.x, seat.z - 0.8, false],
    ['send', false],
    ['changed', false],
  ]);
  assert.equal(controller.current, null);
  assert.equal(point.fallback, false);
  assert.equal(controller.stand(), null, 'standing while standing is a no-op');
});

test('a sit/stand inside the 80 ms movement throttle still lands on the wire', () => {
  // The NetworkClient caps movement packets at ~12 Hz and silently drops
  // sooner sends; the frame loop re-sends `!!controller.current` on the next
  // permitted tick, so the pose always reaches the server.
  let now = 10_000;
  let lastSend = 0;
  const packets = [];
  const throttledSend = (sitting) => {
    if (now - lastSend < 80) return; // the client's exact self-throttle
    lastSend = now;
    packets.push(sitting);
  };

  const controller = createSeatController({
    worldFacts: () => ({ bounds: getBoundsForRoom('court'), obstacles: [], isWalkable, spawn: [-9, 0] }),
    applySit: () => {},
    applyStand: () => {},
    sendMovement: throttledSend,
  });

  const frameSend = () => throttledSend(!!controller.current);

  frameSend();          // a normal frame passes just before the player presses E
  controller.sit(aTheaterSeat()); // the sit's own packet lands inside the throttle: dropped
  assert.deepEqual(packets, [false], 'the throttled immediate send was dropped');

  now += 100;           // the next permitted frame tick
  frameSend();
  assert.deepEqual(packets, [false, true], 'the next permitted transmission carries the seated state');

  now += 100;
  controller.stand();   // standing inside the window is likewise dropped…
  frameSend();          // …and carried by the following frame
  assert.deepEqual(packets, [false, true, false], 'stand is ultimately transmitted too');
});

test('seating works with every optional surface absent — no capture, no presentation', () => {
  // "Voice unavailable": with no place runtime, no adapter and no announce
  // wired, sitting and standing still work and nothing tries to capture.
  const controller = createSeatController({
    applySit: () => {},
    applyStand: () => {},
    sendMovement: () => {},
  });
  const seat = controller.sit(aTheaterSeat());
  assert.ok(seat);
  assert.ok(controller.stand());
  assert.equal(controller.current, null);
});

test('the interaction registry routes seats and gates, and defers everything else', () => {
  const registry = createInteractionRegistry();
  const routed = [];
  registerCoreInteractions(registry, {
    travel: (roomId) => routed.push(['travel', roomId]),
    gardenRoom: () => 'garden:guest_9',
    seatControl: {
      sit: (item) => routed.push(['sit', item.x, item.z]),
    },
    readFieldNote: (item) => routed.push(['note', item.sub]),
    openScreen: (item) => routed.push(['screen', item.type]),
  });

  const seat = aTheaterSeat();
  assert.equal(registry.dispatch(seat).handled, true);
  assert.deepEqual(routed.at(-1), ['sit', seat.x, seat.z]);

  registry.dispatch({ type: 'district_gate', targetDistrict: 'canal' });
  registry.dispatch({ type: 'market_gate' });
  registry.dispatch({ type: 'garden_gate' });
  registry.dispatch({ type: 'field-note', sub: 'The last gardener', body: '“…”' });
  registry.dispatch({ type: 'theater_screen' });

  assert.deepEqual(routed, [
    ['sit', seat.x, seat.z],
    ['travel', 'canal'],
    ['travel', 'market'],
    ['travel', 'garden:guest_9'],
    ['note', 'The last gardener'],
    ['screen', 'theater_screen'],
  ]);

  // Unknown types return unhandled so the legacy dispatch runs.
  assert.deepEqual(registry.dispatch({ type: 'landmark' }), { handled: false });
  assert.deepEqual(registry.dispatch({ type: 'bed', bedIndex: 2 }), { handled: false });
  assert.deepEqual(registry.dispatch(null), { handled: false });
});
