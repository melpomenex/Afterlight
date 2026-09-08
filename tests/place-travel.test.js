/**
 * Travel transition tests for the place runtime (tasks 2.1). Every test
 * drives the production coordinator (src/places/runtime.js) through injected
 * builders, network, input and UI seams — reset effects and call order are
 * asserted against the coordinator's behavior, never against source strings.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { createPlaceRuntime } from '../src/places/runtime.js';
import {
  createTransientInput,
  resetTransientInput,
  resolveRoomRequest,
  worldUpdateInput,
  actorSpawnsFor,
} from '../src/places/travelState.js';

const DEFS = {
  theater: { id: 'theater', name: 'The Orpheum', spawn: [-9, 0], companionSpawn: [-8.2, 1] },
  court: { id: 'court', name: 'The Rain Court', spawn: [-9, 0], companionSpawn: [-8.2, 1] },
  canal: { id: 'canal', name: 'The Sluiceworks', spawn: [-9, 0], companionSpawn: [-8.2, 1] },
};

function makeWorld(id) {
  return {
    id,
    group: { visible: false },
    obstacles: [],
    items: [],
    updates: [],
    update(time, input) { this.updates.push(input); },
    environment: { zones: [] },
  };
}

function createHarness({ build, callAdapter } = {}) {
  const calls = [];
  const presented = [];
  const networkPresents = [];
  const joinedRooms = [];
  const transient = createTransientInput();
  const worlds = new Map();
  const local = { activeId: null, activeWorld: null, player: null, kiln: null };

  const theaterController = {
    activations: 0,
    deactivations: 0,
    seatEvents: [],
    activate() { this.activations += 1; },
    deactivate() { this.deactivations += 1; },
    onSeatChanged(detail) { this.seatEvents.push(detail); },
  };

  const defaultBuild = (res) => {
    calls.push(['build', res.roomId]);
    if (!worlds.has(res.roomId)) worlds.set(res.roomId, makeWorld(res.roomId));
    return worlds.get(res.roomId);
  };

  const runtime = createPlaceRuntime({
    resolve: (requested) => resolveRoomRequest(requested, { hasDefinition: (id) => DEFS[id] ?? null }),
    build: build ?? defaultBuild,
    controllerFor: (res) => (res.roomId === 'theater' ? theaterController : null),
    callAdapter: callAdapter ?? null,
    seatControl: { standUp: () => calls.push(['standUp']) },
    resetInput: () => {
      calls.push(['resetInput']);
      resetTransientInput(transient);
    },
    placeActors: (res, spawns) => {
      calls.push(['placeActors', res.roomId]);
      local.player = spawns.spawn;
      local.kiln = spawns.companionSpawn;
    },
    bindNetwork: (roomId) => {
      calls.push(['joinRoom', roomId]);
      joinedRooms.push(roomId);
    },
    clearRoster: () => calls.push(['clearRoster']),
    persistVisit: (res) => calls.push(['persistVisit', res.roomId]),
    adoptWorld: (world, res) => {
      calls.push(['adoptWorld', res.roomId]);
      local.activeWorld = world;
    },
    present: {
      destination: (res) => {
        local.activeId = res.roomId;
        calls.push(['present', res.roomId]);
      },
      fallback: (res) => presented.push(`fallback:${res.requested}`),
      travelError: (res) => presented.push(`error:${res.requested ?? res.roomId}`),
      network: (status) => networkPresents.push(status.phase),
      arrived: (res) => calls.push(['arrived', res.roomId]),
    },
  });

  return { runtime, calls, presented, networkPresents, joinedRooms, transient, worlds, local, theaterController };
}

const sequenceOf = (calls, name) => calls.map(entry => entry[0]);
const indexOf = (calls, name) => sequenceOf(calls).indexOf(name);

test('a committed travel prepares before it commits, in the contract order', () => {
  const h = createHarness();

  h.runtime.travel('court');

  const seq = sequenceOf(h.calls);
  assert.equal(seq[0], 'build', 'the destination world is prepared first');
  assert.equal(h.calls[0][1], 'court');
  assert.ok(indexOf(h.calls, 'adoptWorld') < indexOf(h.calls, 'resetInput'), 'the world swaps before transient input resets');
  assert.ok(indexOf(h.calls, 'resetInput') < indexOf(h.calls, 'placeActors'), 'input resets before actor placement');
  assert.ok(indexOf(h.calls, 'placeActors') < indexOf(h.calls, 'present'), 'actors are placed before presentation');
  assert.ok(indexOf(h.calls, 'persistVisit') < indexOf(h.calls, 'joinRoom'), 'the save is local work, not network acceptance');
  assert.equal(seq[seq.length - 1], 'arrived', 'local readiness is announced last');

  // Group visibility: exactly the destination is shown.
  assert.equal(h.worlds.get('court').group.visible, true);
  assert.equal(h.local.activeId, 'court');
  const snap = h.runtime.snapshot();
  assert.equal(snap.phase, 'active');
  assert.equal(snap.network.phase, 'joining', 'joining is local; acceptance needs server evidence');
  assert.deepEqual([h.local.player, h.local.kiln], [[-9, 0], [-8.2, 1]], 'player and Kiln spawn at the declared points');
});

test('travel resets nearest, keys, press, target, marker, queued jump and seat', () => {
  const h = createHarness();

  // Held-over state from the old room: a selected item, held movement, a
  // live pointer gesture, a walk target with marker, a queued jump and an
  // active seat.
  h.transient.nearest = { type: 'seat', x: 3, z: 4 };
  h.transient.keys.add('KeyW');
  h.transient.keys.add('Space');
  h.transient.press = { x: 1, y: 2, dragging: false };
  h.transient.target = { x: 5, z: 5 };
  h.transient.markerVisible = true;
  h.transient.jumpQueued = true;
  h.transient.seated = { x: 3, z: 3.92, rotY: Math.PI };

  h.runtime.travel('court');

  assert.deepEqual(h.transient, {
    nearest: null,
    target: null,
    markerVisible: false,
    keys: new Set(),
    press: null,
    jumpQueued: false,
    seated: null,
  }, 'travel clears every transient input of the previous room');
  assert.equal(sequenceOf(h.calls).includes('standUp'), true, 'the actor is stood up locally during the commit');
});

test('an asynchronous preparation that finishes after a newer travel is discarded', () => {
  const built = new Map();
  const make = (id) => {
    if (!built.has(id)) built.set(id, makeWorld(id));
    return built.get(id);
  };
  let releaseB;
  const build = (res) => {
    if (res.roomId === 'canal') {
      return new Promise((resolve) => { releaseB = () => resolve(make('canal')); });
    }
    return make(res.roomId);
  };
  const h = createHarness({ build });

  h.runtime.travel('court');
  const pendingB = h.runtime.travel('canal'); // preparing, nothing committed yet
  assert.equal(h.local.activeId, 'court', 'the prior place keeps the screen while B prepares');
  assert.equal(h.joinedRooms.at(-1), 'court', 'no JOIN_ROOM for the preparing destination yet');

  h.runtime.travel('theater'); // C overtakes the pending B
  assert.equal(h.local.activeId, 'theater');

  releaseB();
  return pendingB.then((outcome) => {
    assert.equal(outcome.status, 'stale', 'the stale attempt reports itself');
    assert.equal(h.local.activeId, 'theater', 'the stale result cannot change the active place');
    assert.equal(h.joinedRooms.at(-1), 'theater', 'no membership crossed travel');
    assert.equal(built.get('canal').group.visible, false, 'the stale world stays hidden');
    assert.equal(h.runtime.snapshot().activeId, 'theater');
  });
});

test('a builder rejection preserves the prior room, membership and HUD', () => {
  const built = new Map();
  const make = (id) => {
    if (!built.has(id)) built.set(id, makeWorld(id));
    return built.get(id);
  };
  let canalAttempts = 0;
  const build = (res) => {
    if (res.roomId === 'canal' && canalAttempts === 0) {
      canalAttempts += 1;
      throw new Error('collapsed mid-build');
    }
    return make(res.roomId);
  };
  const h = createHarness({ build });

  h.runtime.travel('court');
  const outcome = h.runtime.travel('canal');

  assert.equal(outcome.status, 'build-failed');
  assert.ok(outcome.error instanceof Error);
  assert.equal(h.local.activeId, 'court', 'the previous place stays active');
  assert.equal(h.joinedRooms.includes('canal'), false, 'no JOIN_ROOM was sent for the failed destination');
  assert.equal(h.runtime.snapshot().phase, 'failed');
  assert.ok(h.presented.includes('error:canal'), 'a retryable travel error is surfaced');
  assert.equal(built.get('court').group.visible, true, 'the prior world keeps rendering');

  // Picking the place again retries the preparation.
  const retried = h.runtime.travel('canal');
  assert.equal(retried.status, 'ok');
  assert.equal(h.local.activeId, 'canal');
});

test('an unknown deep link visibly falls back to Theater and joins the rendered room', () => {
  const h = createHarness();

  const outcome = h.runtime.travel('mystery-villa');

  assert.equal(outcome.status, 'fallback');
  assert.equal(outcome.roomId, 'theater');
  assert.ok(h.presented.includes('fallback:mystery-villa'), 'the fallback is explained');
  assert.equal(h.local.activeId, 'theater', 'the rendered place is Theater');
  assert.equal(h.joinedRooms.at(-1), 'theater', 'the requested room equals the rendered room');
  assert.equal(h.worlds.get('theater').group.visible, true);
  assert.equal(h.worlds.has('mystery-villa'), false, 'no invisible unknown world was built');
});

test('absent request stays the default place without an invented fallback', () => {
  const h = createHarness();
  const outcome = h.runtime.travel(undefined);
  assert.equal(outcome.status, 'ok');
  assert.equal(outcome.roomId, 'theater');
  assert.equal(h.presented.filter(p => p.startsWith('fallback')).length, 0);
});

test('a stale garden snapshot never becomes district completion state', () => {
  const h = createHarness();
  h.runtime.travel('court');

  // A late GARDEN_STATE may refresh the cache while a district is active…
  const gardenBeds = [{ stage: 5 }, { stage: 1 }];

  // …but the typed update input for the active district is still a strict
  // boolean: the bed snapshot cannot masquerade as restoration completion.
  const input = worldUpdateInput({
    isGardenRoom: false,
    gardenBeds,
    completed: false,
  });
  assert.deepEqual(input, { kind: 'district', value: false });
  h.local.activeWorld.update(1, input.value);
  assert.deepEqual(h.local.activeWorld.updates, [false], 'the district world received a boolean, not the beds');

  // Garden rooms receive their beds explicitly (null before the first state).
  assert.deepEqual(
    worldUpdateInput({ isGardenRoom: true, gardenBeds: null }),
    { kind: 'garden', value: null },
  );
  assert.deepEqual(
    worldUpdateInput({ isGardenRoom: true, gardenBeds }),
    { kind: 'garden', value: gardenBeds },
  );
  // And an uncompleted district never reads truthy by accident.
  assert.equal(worldUpdateInput({ isGardenRoom: false, gardenBeds, completed: undefined }).value, false);
  assert.equal(worldUpdateInput({ isGardenRoom: false, gardenBeds, completed: 'truthy junk' }).value, false);
});

test('reconnect and retry never rebuild geometry nor start capture', () => {
  const callAdapter = {
    leavingCalls: 0,
    readyCalls: 0,
    onPlaceLeaving() { this.leavingCalls += 1; },
    onPlaceReady() { this.readyCalls += 1; },
  };
  const h = createHarness({ callAdapter });
  h.runtime.travel('court');
  const buildCountAfterTravel = h.runtime.snapshot().buildCount;
  const worldBefore = h.local.activeWorld;

  // The socket drops: the destination stays rendered, marked offline.
  h.runtime.markNetworkOffline();
  assert.equal(h.runtime.snapshot().network.phase, 'offline');
  assert.equal(h.local.activeId, 'court', 'the destination still renders offline');
  assert.deepEqual(h.networkPresents.at(-1), 'offline');

  // Retry rebinds membership only: same world object, no rebuild.
  h.runtime.retry();
  assert.equal(h.joinedRooms.at(-1), 'court');
  assert.equal(h.runtime.snapshot().buildCount, buildCountAfterTravel, 'retry rebuilds nothing');
  assert.equal(h.local.activeWorld, worldBefore, 'the world object is untouched');
  assert.equal(h.runtime.snapshot().network.phase, 'joining');

  // Acceptance evidence arrives: online, again without any rebuild.
  h.runtime.markNetworkOnline();
  assert.equal(h.runtime.snapshot().network.phase, 'online');
  assert.equal(h.runtime.snapshot().buildCount, buildCountAfterTravel);

  // The optional call adapter was consulted once by travel, never by the
  // network transitions — reconnect never starts capture.
  assert.equal(callAdapter.readyCalls, 1);
  assert.equal(callAdapter.leavingCalls, 0);
});

test('repeated travel through cached places keeps one active runtime and hides the rest', () => {
  const h = createHarness();
  h.runtime.travel('theater');
  h.runtime.travel('court');
  h.runtime.travel('theater');

  assert.equal(h.theaterController.activations, 2, 'the venue controller activates per entry');
  assert.equal(h.theaterController.deactivations, 1, 'it deactivated exactly when the theater was left');
  assert.equal(h.worlds.get('court').group.visible, false, 'the hidden place stays dark');
  assert.equal(h.worlds.get('theater').group.visible, true);
  assert.equal(h.networkPresents.filter(p => p === 'joining').length, 3, 'each travel waits for its own acceptance');
});

test('a failing venue controller cannot corrupt travel', () => {
  const h = createHarness();
  h.theaterController.activate = () => { throw new Error('booth on fire'); };

  const outcome = h.runtime.travel('theater');
  assert.equal(outcome.status, 'ok', 'travel still commits');
  assert.equal(h.local.activeId, 'theater');
  assert.equal(h.joinedRooms.at(-1), 'theater', 'membership is intact');
  assert.equal(h.runtime.snapshot().activeController, null, 'the failed controller is not retained');
});

test('actorSpawnsFor keeps the historical market and garden entrances', () => {
  assert.deepEqual(actorSpawnsFor({ kind: 'place', def: DEFS.court }).spawn, [-9, 0]);
  assert.deepEqual(actorSpawnsFor({ kind: 'garden' }), { spawn: [-9.5, 0], companionSpawn: [-8.7, 1] });
  assert.deepEqual(actorSpawnsFor({ kind: 'market' }), { spawn: [0, 3], companionSpawn: [0.8, 4] });
  const noSpawn = actorSpawnsFor({ kind: 'place', def: { id: 'x' } });
  assert.deepEqual(noSpawn.spawn, [-9, 0], 'definitions without a spawn keep the legacy entrance');
});

test('resolveRoomRequest keeps market and personal gardens on their adapters', () => {
  const hasDefinition = (id) => DEFS[id] ?? null;
  assert.equal(resolveRoomRequest('market', { hasDefinition }).roomId, 'market');
  assert.equal(resolveRoomRequest('garden:guest_1', { hasDefinition }).kind, 'garden');
  assert.equal(resolveRoomRequest('garden:guest_1', { hasDefinition }).roomId, 'garden:guest_1');
  const unknown = resolveRoomRequest('nope', { hasDefinition });
  assert.equal(unknown.status, 'unknown');
  assert.equal(unknown.roomId, 'theater');
  assert.equal(unknown.fallback, true);
});
