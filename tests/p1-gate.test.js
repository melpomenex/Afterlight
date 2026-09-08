import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createPongInstance } from '../src/activities/pong.js';
import { createActivityRuntime } from '../src/activities/runtime.js';
import { createCompositePlaceController } from '../src/activities/compositeController.js';
import { PONG_ACTIVITY_DEFINITION } from '../shared/placeDefinitions.js';
import { clearActivityModules, registerActivityModule, hasActivityModule } from '../src/activities/registry.js';
import { PongModule } from '../src/activities/pong.js';

test('1. P1 Gate: two-player + one-observer same-result assertions and client state reconciliation', () => {
  const worldGroup1 = new THREE.Group();
  const worldGroup2 = new THREE.Group();
  const worldGroupObs = new THREE.Group();

  let p1CameraAcquired = false;
  let p2CameraAcquired = false;
  let obsCameraAcquired = false;

  const p1Inputs = [];
  const p2Inputs = [];
  const obsInputs = [];

  const p1Instance = createPongInstance({
    activityDef: PONG_ACTIVITY_DEFINITION,
    world: { group: worldGroup1 },
    net: {
      sendActivityReady: () => {},
      sendActivityInput: (req) => p1Inputs.push(req),
    },
    setActivityCamera: () => { p1CameraAcquired = true; },
    clearActivityCamera: () => { p1CameraAcquired = false; },
  });

  const p2Instance = createPongInstance({
    activityDef: PONG_ACTIVITY_DEFINITION,
    world: { group: worldGroup2 },
    net: {
      sendActivityReady: () => {},
      sendActivityInput: (req) => p2Inputs.push(req),
    },
    setActivityCamera: () => { p2CameraAcquired = true; },
    clearActivityCamera: () => { p2CameraAcquired = false; },
  });

  const obsInstance = createPongInstance({
    activityDef: PONG_ACTIVITY_DEFINITION,
    world: { group: worldGroupObs },
    net: {
      sendActivityReady: () => {},
      sendActivityInput: (req) => obsInputs.push(req),
    },
    setActivityCamera: () => { obsCameraAcquired = true; },
    clearActivityCamera: () => { obsCameraAcquired = false; },
  });

  // P1 joins slot 0, P2 joins slot 1, Obs is spectator
  p1Instance.acceptResult({ result: { result: 'seated', slot: 0, role: 'player', leaseId: 'l1' } });
  p2Instance.acceptResult({ result: { result: 'seated', slot: 1, role: 'player', leaseId: 'l2' } });
  obsInstance.acceptResult({ result: { result: 'watching', role: 'spectator' } });

  // Players can acquire activity camera on interaction; observer does not
  p1Instance.attachControls();
  p2Instance.attachControls();

  assert.equal(p1CameraAcquired, true);
  assert.equal(p2CameraAcquired, true);
  assert.equal(obsCameraAcquired, false);

  // Authoritative server starts match
  const matchStartedEvent = {
    type: 'match_started',
    payload: { matchId: 'm_gate_101', rulesVersion: 1 },
  };

  p1Instance.acceptEvent(matchStartedEvent);
  p2Instance.acceptEvent(matchStartedEvent);
  obsInstance.acceptEvent(matchStartedEvent);

  // Authoritative snapshot broadcast
  const rallySnapshot = {
    type: 'activity_state',
    activityId: 'orpheum-pong',
    revision: 10,
    state: {
      status: 'in_progress',
      matchId: 'm_gate_101',
      sim: {
        width: 800,
        height: 500,
        ball: { x: 400, y: 250, vx: 6.0, vy: 2.0, radius: 8 },
        paddles: {
          '0': { x: 40, y: 240, width: 14, height: 70 },
          '1': { x: 760, y: 260, width: 14, height: 70 },
        },
        score: { '0': 4, '1': 3 },
        targetScore: 7,
        state: 'rally',
      },
    },
  };

  p1Instance.acceptSnapshot({ payload: rallySnapshot });
  p2Instance.acceptSnapshot({ payload: rallySnapshot });
  obsInstance.acceptSnapshot({ payload: rallySnapshot });

  // Advance frame
  p1Instance.update(0.1, 0.016);
  p2Instance.update(0.1, 0.016);
  obsInstance.update(0.1, 0.016);

  // Assert identical state across all three
  assert.equal(p1Instance.latestSnapshot.state.sim.score['0'], 4);
  assert.equal(p2Instance.latestSnapshot.state.sim.score['0'], 4);
  assert.equal(obsInstance.latestSnapshot.state.sim.score['0'], 4);

  assert.equal(p1Instance.latestSnapshot.state.sim.score['1'], 3);
  assert.equal(p2Instance.latestSnapshot.state.sim.score['1'], 3);
  assert.equal(obsInstance.latestSnapshot.state.sim.score['1'], 3);

  // Terminal match_ended event broadcast
  const matchEndedEvent = {
    type: 'match_ended',
    payload: {
      matchId: 'm_gate_101',
      winner: 'p1_id',
      winnerSlot: 0,
      score: { '0': 7, '1': 3 },
      reason: 'score',
    },
  };

  p1Instance.acceptEvent(matchEndedEvent);
  p2Instance.acceptEvent(matchEndedEvent);
  obsInstance.acceptEvent(matchEndedEvent);

  // Verify all 3 instances show identical end-of-match state
  assert.equal(p1Instance.matchState, 'ended');
  assert.equal(p2Instance.matchState, 'ended');
  assert.equal(obsInstance.matchState, 'ended');

  assert.equal(p1Instance.matchOutcome.winner, 'p1_id');
  assert.equal(p2Instance.matchOutcome.winner, 'p1_id');
  assert.equal(obsInstance.matchOutcome.winner, 'p1_id');

  assert.equal(p1Instance.matchOutcome.score['0'], 7);
  assert.equal(p2Instance.matchOutcome.score['0'], 7);
  assert.equal(obsInstance.matchOutcome.score['0'], 7);

  // Cleanup instances
  p1Instance.dispose();
  p2Instance.dispose();
  obsInstance.dispose();

  assert.equal(p1CameraAcquired, false);
  assert.equal(p2CameraAcquired, false);
});

test('2. P1 Gate: twenty-cycle travel cleanup and resource audit', () => {
  if (!hasActivityModule('pong')) {
    registerActivityModule('pong', PongModule);
  }

  let totalDisposes = 0;
  let activeCameraChanges = 0;
  let defaultCameraActive = true;

  const mockActiveCamera = new THREE.PerspectiveCamera();
  const mockWorldGroup = new THREE.Group();

  const activityRuntime = createActivityRuntime();
  const mockVenueController = {
    active: false,
    activate: () => { mockVenueController.active = true; },
    deactivate: () => { mockVenueController.active = false; },
  };

  const composite = createCompositePlaceController({
    placeController: mockVenueController,
    activityRuntime,
  });

  const seamTheater = {
    roomId: 'theater',
    world: { group: mockWorldGroup },
    generation: 1,
    def: {
      id: 'theater',
      activities: [PONG_ACTIVITY_DEFINITION],
    },
    getActiveCamera: () => mockActiveCamera,
    setActivityCamera: () => {
      activeCameraChanges += 1;
      defaultCameraActive = false;
    },
    clearActivityCamera: () => {
      activeCameraChanges += 1;
      defaultCameraActive = true;
    },
    getPlayer: () => ({ position: new THREE.Vector3(8.0, 0.0, -3.5) }),
  };

  // Perform 20 travel cycles: Enter Theater -> participate -> Exit Theater
  for (let cycle = 1; cycle <= 20; cycle++) {
    seamTheater.generation = cycle;

    // 1. Enter theater
    composite.activate(seamTheater);
    assert.equal(composite.active, true);
    assert.equal(activityRuntime.active, true);

    const pong = activityRuntime.getInstance('orpheum-pong');
    assert.ok(pong !== null, `Pong instance must exist on cycle ${cycle}`);

    // 2. Participate and focus camera
    pong.attachControls();
    assert.equal(defaultCameraActive, false);

    // 3. Step frame animation
    activityRuntime.update(cycle * 100, 0.016);

    // 4. Travel away from theater (Deactivate)
    composite.deactivate();
    assert.equal(composite.active, false);
    assert.equal(activityRuntime.active, false);
    assert.equal(defaultCameraActive, true, `Camera must be restored on cycle ${cycle}`);

    // Verify instance cleaned up
    assert.equal(activityRuntime.getInstance('orpheum-pong'), null);
    assert.equal(mockWorldGroup.children.length, 0, `World group must have 0 children after cycle ${cycle}`);
  }

  // After 20 cycles:
  assert.equal(activityRuntime.getInstances().size, 0);
  assert.equal(mockWorldGroup.children.length, 0);
  assert.equal(defaultCameraActive, true);
  assert.equal(activeCameraChanges, 40); // 20 camera acquisitions, 20 clean releases
});

test('3. P1 Gate: mid-match resnapshot re-hydrates live simulation cleanly without object leaks', () => {
  const worldGroup = new THREE.Group();
  const instance = createPongInstance({
    activityDef: PONG_ACTIVITY_DEFINITION,
    world: { group: worldGroup },
    net: { sendActivityReady: () => {}, sendActivityInput: () => {} },
  });

  const childrenBefore = worldGroup.children.length;

  // Deliver 10 resnapshots in rapid succession (simulating reconnect & resync)
  for (let i = 1; i <= 10; i++) {
    instance.acceptSnapshot({
      payload: {
        revision: i,
        activityId: 'orpheum-pong',
        sessionId: 'sess_reconnect_test',
        status: 'in_progress',
        sim: {
          width: 800,
          height: 500,
          ball: { x: 300 + i * 10, y: 200, vx: 5, vy: 1, radius: 8 },
          paddles: {
            '0': { x: 40, y: 200 + i, width: 14, height: 70 },
            '1': { x: 760, y: 200 - i, width: 14, height: 70 },
          },
          score: { '0': 3, '1': 2 },
          targetScore: 7,
          state: 'rally',
        },
      },
    });

    instance.update(i * 0.1, 0.016);
  }

  // Children count must remain strictly constant (no duplicate meshes/textures)
  assert.equal(worldGroup.children.length, childrenBefore);
  assert.equal(instance.latestSnapshot.revision, 10);
  assert.equal(instance.latestSnapshot.sim.ball.x, 400);

  instance.dispose();
  assert.equal(worldGroup.children.length, 0);
});

test('4. P1 Gate: safe dismount and escape hierarchy restores usable world state', () => {
  let cameraRestored = false;
  const instance = createPongInstance({
    activityDef: PONG_ACTIVITY_DEFINITION,
    world: { group: new THREE.Group() },
    net: { sendActivityReady: () => {}, sendActivityInput: () => {} },
    clearActivityCamera: () => { cameraRestored = true; },
  });

  instance.attachControls();
  assert.equal(instance.isParticipating, true);

  // Dismount
  instance.detachControls();
  assert.equal(instance.isParticipating, false);
  assert.equal(cameraRestored, true);

  instance.dispose();
});
