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
  } finally {
    instance.dispose();
  }
});
