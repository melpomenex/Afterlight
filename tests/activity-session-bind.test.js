import test from 'node:test';
import assert from 'node:assert/strict';

import { bindParticipation, extractActivitySim } from '../src/activities/sessionBind.js';

test('extractActivitySim prefers nested SessionServer state.sim over the lobby wrapper', () => {
  const envelope = {
    type: 'activity_state',
    activityId: 'orpheum-foosball',
    state: {
      status: 'lobby',
      players: [{ slot: 0, playerId: 'a' }],
      sim: { score: { '0': 2, '1': 1 }, ball: { x: 60, y: 35 } },
    },
  };
  const sim = extractActivitySim(envelope);
  assert.equal(sim.score['0'], 2);
  assert.equal(sim.ball.x, 60);
  assert.equal(sim.status, undefined);
});

test('extractActivitySim still accepts a bare sim object', () => {
  const sim = extractActivitySim({ turn: 0, physics: { settled: true } });
  assert.equal(sim.turn, 0);
});

test('bindParticipation calls onJoin once the seat is accepted', () => {
  const joins = [];
  const leaves = [];
  const participation = {
    isParticipating: true,
    currentActivity: { id: 'orpheum-pool' },
    currentSlot: 1,
    currentRole: 'player',
  };
  const seated = bindParticipation({
    getParticipation: () => participation,
    activityId: 'orpheum-pool',
    isParticipant: false,
    onJoin: (info) => joins.push(info),
    onLeave: () => leaves.push(true),
  });
  assert.equal(seated, true);
  assert.deepEqual(joins, [{ slot: 1, role: 'player' }]);
  assert.equal(leaves.length, 0);
});

test('bindParticipation ignores other tables and bystanders', () => {
  const joins = [];
  bindParticipation({
    getParticipation: () => ({
      isParticipating: true,
      currentActivity: { id: 'orpheum-pool' },
      currentSlot: 0,
    }),
    activityId: 'orpheum-darts',
    isParticipant: false,
    onJoin: (info) => joins.push(info),
    onLeave: () => {},
  });
  assert.equal(joins.length, 0);

  bindParticipation({
    getParticipation: () => ({ isParticipating: false, currentActivity: null }),
    activityId: 'orpheum-darts',
    isParticipant: false,
    onJoin: (info) => joins.push(info),
    onLeave: () => {},
  });
  assert.equal(joins.length, 0);
});

test('bindParticipation leaves when the seat is released', () => {
  let left = false;
  bindParticipation({
    getParticipation: () => ({ isParticipating: false, currentActivity: null }),
    activityId: 'orpheum-foosball',
    isParticipant: true,
    onJoin: () => {},
    onLeave: () => { left = true; },
  });
  assert.equal(left, true);
});
