import test from 'node:test';
import assert from 'node:assert/strict';
import { createPoolInstance } from '../src/activities/pool.js';
import { initGame, shoot } from '../shared/pool/rules.js';

test('F release sends one shot, accepts its acknowledgement and animates authoritative motion', () => {
  const inputs = [];
  const activityDef = { id: 'pool', type: 'pool' };
  const instance = createPoolInstance({
    activityDef,
    getParticipation: () => ({ isParticipating: true, currentActivity: activityDef,
      currentSlot: 0, sessionId: 'session', lease: 'lease' }),
    net: { sendActivityInput: input => inputs.push(input) },
  });
  try {
    instance.update(0, 0);
    instance.acceptResult({ result: 'ready' });
    assert.equal(instance.simState.status, 'aiming');
    instance.handlePrimaryAction(true);
    instance.update(0.4, 0.4);
    assert.equal(inputs.length, 0);
    instance.handlePrimaryAction(false);
    instance.handlePrimaryAction(false);
    assert.equal(inputs.length, 1);
    assert.equal(inputs[0].controls.action, 'shoot');
    assert.ok(inputs[0].controls.power > 0);
    instance.acceptResult({ result: 'input_accepted', ackSeq: inputs[0].seq });
    assert.equal(instance.simState.status, 'aiming', 'ack does not end the game');

    const { angle, power, spinX, spinY } = inputs[0].controls;
    const shot = shoot(initGame(), 0, angle, power, spinX, spinY);
    assert.equal(shot.ok, true);
    instance.acceptSnapshot({ state: { sim: shot.state } });
    assert.equal(instance.simState.status, 'shooting');
    const before = instance.simState.physics.balls[0].x;
    instance.update(0.45, 0.05);
    assert.notEqual(instance.simState.physics.balls[0].x, before, 'cue ball moves after release');

    // Settling restores controller shot power to baseline
    const settledSim = {
      ...shot.state,
      status: 'aiming',
      physics: { ...shot.state.physics, settled: true },
    };
    instance.acceptSnapshot({ state: { sim: settledSim } });
    instance.update(0.5, 0.05);
    assert.equal(instance.controller.shotPower, 0.35, 'power resets to baseline after shot settles');
  } finally {
    instance.dispose();
  }
});

test('acceptError unlocks controller shooting state and restores baseline power', () => {
  const inputs = [];
  const activityDef = { id: 'pool', type: 'pool' };
  const instance = createPoolInstance({
    activityDef,
    getParticipation: () => ({ isParticipating: true, currentActivity: activityDef,
      currentSlot: 0, sessionId: 'session', lease: 'lease' }),
    net: { sendActivityInput: input => inputs.push(input) },
  });
  try {
    instance.update(0, 0);
    instance.handlePrimaryAction(true);
    instance.update(0.8, 0.8);
    instance.handlePrimaryAction(false);
    assert.equal(inputs.length, 1);

    // Server rejects with error (e.g. pocket_call_required)
    instance.acceptError({ error: 'pocket_call_required' });
    assert.equal(instance.controller.shotPower, 0.35);

    // Can charge and shoot again immediately without stall
    instance.handlePrimaryAction(true);
    instance.update(0.2, 0.2);
    instance.handlePrimaryAction(false);
    assert.equal(inputs.length, 2, 'second shot successfully sent after error recovery');
  } finally {
    instance.dispose();
  }
});

test('calledPocket passed with shoot satisfies 8-ball pocket call when group is cleared', () => {
  const game = initGame();
  // Simulate cleared solids group (balls 1-7 pocketed)
  for (let i = 1; i <= 7; i++) {
    game.physics.balls[i].state = 'pocketed';
  }
  game.table_open = false;
  game.groups = { '0': 'solids', '1': 'stripes' };

  // Without called pocket, shot is rejected
  const rejected = shoot(game, 0, 0, 1.0, 0, 0, null);
  assert.equal(rejected.ok, false);
  assert.equal(rejected.error, 'pocket_call_required');

  // With called pocket passed directly with shot, shot succeeds
  const accepted = shoot(game, 0, 0, 1.0, 0, 0, 'corner_tl');
  assert.equal(accepted.ok, true);
  assert.equal(accepted.state.status, 'shooting');
  assert.equal(accepted.state.current_shot.called_pocket, 'corner_tl');
});
