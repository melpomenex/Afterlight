import test from 'node:test';
import assert from 'node:assert/strict';

import {
  RC_BOAT_RULES_VERSION,
  RC_BOAT_COURSE_ID,
  RC_BOAT_TOTAL_LAPS,
  RC_BOAT_CHECKPOINTS,
  RC_BOAT_SPAWN_DOCKS,
  initRcBoatSimState,
  validateRcBoatControls,
  stepRcBoatSimulation,
  markRcBoatDnf,
} from '../shared/rcBoatModel.js';

test('rc boats: initRcBoatSimState initializes course, laps, and spawn docks', () => {
  const state = initRcBoatSimState({ activeSlots: [0, 1, 2, 3] });
  assert.equal(state.courseId, RC_BOAT_COURSE_ID);
  assert.equal(state.totalLaps, RC_BOAT_TOTAL_LAPS);
  assert.equal(state.status, 'racing');
  assert.equal(Object.keys(state.boats).length, 4);

  for (let s = 0; s < 4; s++) {
    const boat = state.boats[s];
    assert.equal(boat.slot, s);
    assert.equal(boat.currentLap, 1);
    assert.equal(boat.nextCheckpoint, 0);
    assert.equal(boat.checkpointsHit, 0);
    assert.equal(boat.finished, false);
    assert.equal(boat.dnf, false);
    assert.deepEqual(boat.position, [...RC_BOAT_SPAWN_DOCKS[s].position]);
  }
});

test('rc boats: validateRcBoatControls clamps and sanitizes inputs', () => {
  const def = validateRcBoatControls({});
  assert.equal(def.valid, true);
  assert.equal(def.sanitized.throttle, 0.0);
  assert.equal(def.sanitized.steer, 0.0);
  assert.equal(def.sanitized.recover, false);

  const clamped = validateRcBoatControls({
    throttle: 5.0,
    steer: -10.0,
    recover: true,
  });
  assert.equal(clamped.valid, true);
  assert.equal(clamped.sanitized.throttle, 1.0);
  assert.equal(clamped.sanitized.steer, -1.0);
  assert.equal(clamped.sanitized.recover, true);

  const reverseClamped = validateRcBoatControls({
    throttle: -2.0,
  });
  assert.equal(reverseClamped.sanitized.throttle, -0.5);
});

test('rc boats: sequential buoy advancement only counts in order', () => {
  let state = initRcBoatSimState({ activeSlots: [0] });

  // Place boat at Buoy 1 directly without clearing Buoy 0
  state.boats[0].position = [...RC_BOAT_CHECKPOINTS[1].position];
  let res = stepRcBoatSimulation(state, { 0: { throttle: 0.0 } }, 1);
  state = res.simState;

  // Next checkpoint should STILL be 0 because Buoy 0 was not passed
  assert.equal(state.boats[0].nextCheckpoint, 0);
  assert.equal(state.boats[0].checkpointsHit, 0);

  // Now place boat at Buoy 0
  state.boats[0].position = [...RC_BOAT_CHECKPOINTS[0].position];
  res = stepRcBoatSimulation(state, { 0: { throttle: 0.0 } }, 1);
  state = res.simState;

  // Buoy 0 cleared, now waiting for Buoy 1!
  assert.equal(state.boats[0].nextCheckpoint, 1);
  assert.equal(state.boats[0].checkpointsHit, 1);
});

test('rc boats: canal wall collision triggers bounce and stun cooldown', () => {
  let state = initRcBoatSimState({ activeSlots: [0] });
  // Drive boat towards east wall (X = 2.3)
  state.boats[0].position = [2.2, 0.23, 5.0];
  state.boats[0].yaw = Math.PI / 2; // facing east
  state.boats[0].speed = 5.0;

  const res = stepRcBoatSimulation(state, { 0: { throttle: 1.0 } }, 5);
  const boat = res.simState.boats[0];

  assert.ok(boat.collisionCount > 0, 'collisionCount should increment');
  assert.ok(boat.stunTicks > 0, 'stunTicks should be active');
  assert.ok(boat.speed < 0, 'speed should reverse on bounce');
});

test('rc boats: manual recovery resets boat to last cleared checkpoint', () => {
  let state = initRcBoatSimState({ activeSlots: [0] });

  // Clear Buoy 0
  state.boats[0].position = [...RC_BOAT_CHECKPOINTS[0].position];
  state = stepRcBoatSimulation(state, {}, 1).simState;
  assert.equal(state.boats[0].nextCheckpoint, 1);

  // Drive out into the weeds and get stuck
  state.boats[0].position = [2.1, 0.23, 8.8];
  state.boats[0].speed = 4.0;

  // Trigger recovery
  const res = stepRcBoatSimulation(state, { 0: { recover: true } }, 1);
  const boat = res.simState.boats[0];

  assert.equal(boat.position[0], RC_BOAT_CHECKPOINTS[0].position[0]);
  assert.equal(boat.position[2], RC_BOAT_CHECKPOINTS[0].position[2]);
  assert.equal(boat.speed, 0.0);
  assert.ok(boat.stunTicks > 0);
});

test('rc boats: leaving racer is marked DNF and remaining racers complete normally', () => {
  let state = initRcBoatSimState({ activeSlots: [0, 1] });

  // Slot 1 disconnects / leaves
  const dnfRes = markRcBoatDnf(state, 1, 'disconnect');
  state = dnfRes.simState;

  assert.equal(state.boats[1].dnf, true);
  assert.equal(state.status, 'racing'); // Still racing since Slot 0 is active

  // Slot 0 finishes laps
  for (let lap = 1; lap <= RC_BOAT_TOTAL_LAPS; lap++) {
    for (let cp = 0; cp < RC_BOAT_CHECKPOINTS.length; cp++) {
      state.boats[0].position = [...RC_BOAT_CHECKPOINTS[cp].position];
      state = stepRcBoatSimulation(state, {}, 1).simState;
    }
  }

  // Cross start/finish to complete
  state.boats[0].position = [...RC_BOAT_CHECKPOINTS[0].position];
  const finalRes = stepRcBoatSimulation(state, {}, 1);
  state = finalRes.simState;

  assert.equal(state.status, 'complete');
  assert.equal(state.winner, 0);
  assert.equal(state.standings[0].slot, 0);
  assert.equal(state.standings[0].finished, true);
  assert.equal(state.standings[1].slot, 1);
  assert.equal(state.standings[1].dnf, true);
});
