import test from 'node:test';
import assert from 'node:assert/strict';
import {
  registerActivityModule,
  getActivityModule,
  hasActivityModule,
  unregisterActivityModule,
  clearActivityModules,
} from '../src/activities/registry.js';
import { createActivityRuntime } from '../src/activities/runtime.js';
import { createCompositePlaceController } from '../src/activities/compositeController.js';
import { PongModule } from '../src/activities/pong.js';

test('activity registry registers, looks up, and enforces valid activity types', () => {
  clearActivityModules();

  const dummyPong = {
    initialize: () => ({ update: () => {}, dispose: () => {} }),
  };

  registerActivityModule('pong', dummyPong);
  assert.equal(hasActivityModule('pong'), true);
  assert.equal(getActivityModule('pong'), dummyPong);

  // Rejects unknown activity type
  assert.throws(
    () => registerActivityModule('laser_tag_unknown', dummyPong),
    /Cannot register unknown activity type/,
  );

  // Rejects duplicate registration
  assert.throws(
    () => registerActivityModule('pong', dummyPong),
    /Duplicate activity module registration/,
  );

  // Rejects module without initialize()
  assert.throws(
    () => registerActivityModule('rain-runner', {}),
    /must implement initialize/,
  );

  unregisterActivityModule('pong');
  assert.equal(hasActivityModule('pong'), false);
  clearActivityModules();
});

test('composite place controller composes venue controller and activity runtime cleanly', () => {
  clearActivityModules();

  const activations = [];
  const deactivations = [];

  const venueController = {
    active: false,
    activate(seam) {
      this.active = true;
      activations.push(['venue', seam.roomId]);
    },
    deactivate() {
      this.active = false;
      deactivations.push('venue');
    },
    onSeatChanged(detail) {
      activations.push(['seat', detail.seated]);
    },
    openScreen() {
      activations.push(['screen']);
    },
  };

  const activityRuntime = createActivityRuntime();

  const composite = createCompositePlaceController({
    placeController: venueController,
    activityRuntime,
  });

  assert.equal(composite.active, false);

  // Activate composite
  const seam = {
    roomId: 'theater',
    world: { group: {} },
    generation: 1,
    def: { id: 'theater', activities: [] },
  };
  composite.activate(seam);
  assert.equal(composite.active, true);
  assert.equal(activityRuntime.active, true);
  assert.equal(venueController.active, true);
  assert.deepEqual(activations, [['venue', 'theater']]);

  // Venue-specific delegations
  composite.onSeatChanged({ seated: true });
  composite.openScreen();
  assert.deepEqual(activations, [['venue', 'theater'], ['seat', true], ['screen']]);

  // Deactivate composite
  composite.deactivate();
  assert.equal(composite.active, false);
  assert.equal(activityRuntime.active, false);
  assert.equal(venueController.active, false);
  assert.deepEqual(deactivations, ['venue']);

  // Idempotent deactivation: calling deactivate again does not throw
  assert.doesNotThrow(() => composite.deactivate());
});

test('prepare failure in an activity module is isolated; world and other activities stay playable', () => {
  clearActivityModules();

  const brokenModule = {
    initialize: () => {
      throw new Error('Simulation worker crashed during init');
    },
  };

  const workingModuleCalls = [];
  const workingModule = {
    initialize: ({ activityDef }) => {
      workingModuleCalls.push(activityDef.id);
      return {
        update: () => {},
        dispose: () => {},
      };
    },
  };

  registerActivityModule('pong', workingModule);
  registerActivityModule('rain-runner', brokenModule);

  const runtime = createActivityRuntime();

  const seam = {
    roomId: 'court',
    world: { group: {} },
    generation: 1,
    def: {
      id: 'court',
      activities: [
        { id: 'pong_court', type: 'pong' },
        { id: 'broken_cabinet', type: 'rain-runner' },
      ],
    },
  };

  // Activation must NOT throw despite the broken activity
  let result;
  assert.doesNotThrow(() => {
    result = runtime.activate(seam);
  });

  assert.equal(result.status, 'ok');
  assert.equal(runtime.active, true);
  assert.equal(runtime.getInstance('pong_court') !== null, true);
  assert.equal(runtime.getInstance('broken_cabinet'), null);

  // Check isolated error record
  const errors = runtime.getErrors();
  assert.equal(errors.has('broken_cabinet'), true);
  assert.ok(errors.get('broken_cabinet').message.includes('Simulation worker crashed'));

  // The working activity was initialized
  assert.deepEqual(workingModuleCalls, ['pong_court']);

  runtime.deactivate();
  clearActivityModules();
});

test('stale generation transitions are rejected without corrupting active generation', () => {
  clearActivityModules();

  const runtime = createActivityRuntime();

  // Initial activation with generation 5
  runtime.activate({
    roomId: 'court',
    world: { group: {} },
    generation: 5,
    def: { id: 'court', activities: [] },
  });
  assert.equal(runtime.activeGeneration, 5);
  assert.equal(runtime.activeRoomId, 'court');

  // Stale activation attempt with generation 4 (e.g. out-of-order async resolution)
  const staleResult = runtime.activate({
    roomId: 'theater',
    world: { group: {} },
    generation: 4,
    def: { id: 'theater', activities: [] },
  });

  assert.equal(staleResult.status, 'stale');
  assert.equal(staleResult.generation, 4);
  assert.equal(runtime.activeGeneration, 5, 'active generation must not regress');
  assert.equal(runtime.activeRoomId, 'court', 'active room must remain court');

  runtime.deactivate();
});

test('active-only update: instances only receive updates while the place is active', () => {
  clearActivityModules();

  let updates = 0;
  const testModule = {
    initialize: () => ({
      update: (t, dt) => { updates += 1; },
      dispose: () => {},
    }),
  };
  registerActivityModule('pong', testModule);

  const runtime = createActivityRuntime();

  // While inactive: update does 0 work
  runtime.update(100, 16);
  assert.equal(updates, 0);

  // Activate
  runtime.activate({
    roomId: 'court',
    world: { group: {} },
    generation: 1,
    def: { id: 'court', activities: [{ id: 'pong_court', type: 'pong' }] },
  });

  // Active: updates are processed
  runtime.update(116, 16);
  runtime.update(132, 16);
  assert.equal(updates, 2);

  // Deactivate: updates immediately stop
  runtime.deactivate();
  runtime.update(148, 16);
  assert.equal(updates, 2, 'updates must not fire after deactivation');

  clearActivityModules();
});

test('idempotent disposal: repeated deactivate calls are leak-free and safe', () => {
  clearActivityModules();

  let disposes = 0;
  const testModule = {
    initialize: () => ({
      update: () => {},
      dispose: () => { disposes += 1; },
    }),
  };
  registerActivityModule('pong', testModule);

  const runtime = createActivityRuntime();

  runtime.activate({
    roomId: 'court',
    world: { group: {} },
    generation: 1,
    def: { id: 'court', activities: [{ id: 'pong_court', type: 'pong' }] },
  });

  assert.equal(runtime.active, true);

  // 20 repeated deactivations (matching Scenario: Repeated travel)
  for (let i = 0; i < 20; i++) {
    assert.doesNotThrow(() => runtime.deactivate());
  }

  // Exactly 1 dispose call occurred
  assert.equal(disposes, 1);
  assert.equal(runtime.active, false);
  assert.equal(runtime.getInstance('pong_court'), null);
  assert.equal(runtime.getInstances().size, 0);

  clearActivityModules();
});

test('frame dispatch routes snapshots, events, results, and errors to matching active activity', () => {
  clearActivityModules();

  const framesReceived = [];
  const testModule = {
    initialize: () => ({
      update: () => {},
      acceptSnapshot: (f) => framesReceived.push(['snapshot', f.revision]),
      acceptEvent: (f) => framesReceived.push(['event', f.eventId]),
      acceptResult: (f) => framesReceived.push(['result', f.result.winner]),
      acceptError: (f) => framesReceived.push(['error', f.error]),
      dispose: () => {},
    }),
  };
  registerActivityModule('pong', testModule);

  const runtime = createActivityRuntime();
  runtime.activate({
    roomId: 'court',
    world: { group: {} },
    generation: 1,
    def: { id: 'court', activities: [{ id: 'pong_court', type: 'pong' }] },
  });

  // Valid frames matching room and activity
  runtime.acceptSnapshot({ roomId: 'court', activityId: 'pong_court', revision: 1 });
  runtime.acceptEvent({ roomId: 'court', activityId: 'pong_court', eventId: 'evt_1' });
  runtime.acceptResult({ roomId: 'court', activityId: 'pong_court', result: { winner: 'player_a' } });
  runtime.acceptError({ roomId: 'court', activityId: 'pong_court', error: 'slot_full' });

  assert.deepEqual(framesReceived, [
    ['snapshot', 1],
    ['event', 'evt_1'],
    ['result', 'player_a'],
    ['error', 'slot_full'],
  ]);

  // Frame from another room is rejected
  framesReceived.length = 0;
  const acceptedWrongRoom = runtime.acceptSnapshot({
    roomId: 'theater',
    activityId: 'pong_court',
    revision: 2,
  });
  assert.equal(acceptedWrongRoom, false);
  assert.equal(framesReceived.length, 0);

  // Frame for unknown activity is rejected
  const acceptedUnknown = runtime.acceptSnapshot({
    roomId: 'court',
    activityId: 'unknown_cabinet',
    revision: 2,
  });
  assert.equal(acceptedUnknown, false);
  assert.equal(framesReceived.length, 0);

  runtime.deactivate();
  clearActivityModules();
  registerActivityModule('pong', PongModule);
});
