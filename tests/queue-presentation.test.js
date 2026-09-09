import test from 'node:test';
import assert from 'node:assert/strict';
import {
  inventsWinner,
  queueRows,
  queuePositionFor,
  nextPlayerId,
  winnerKeepsSlot,
  rotationPlan,
  describeQueue,
} from '../src/ui/queuePresentation.js';

test('ties and aborts invent no winner', () => {
  assert.equal(inventsWinner({ reason: 'aborted' }), false);
  assert.equal(inventsWinner({ reason: 'tie', winner: 'ghost' }), false);
  assert.equal(inventsWinner({ reason: 'score', winner: 'p1' }), true);
});

test('queue positions are visible and FIFO next-player is the head', () => {
  const state = {
    queue: [{ playerId: 'q1', position: 1 }, { playerId: 'q2', position: 2 }],
    nextPlayer: 'q1',
  };
  assert.deepEqual(queueRows(state).map((r) => r.position), [1, 2]);
  assert.equal(queuePositionFor(state, 'q2'), 2);
  assert.equal(nextPlayerId(state), 'q1');
  const copy = describeQueue(state, 'q2');
  assert.match(copy.text, /#2/);
});

test('winner keeps a slot only when present and willing', () => {
  const outcome = { winner: 'champ', reason: 'score' };
  assert.equal(winnerKeepsSlot(outcome, { present: true, willing: true }), true);
  assert.equal(winnerKeepsSlot(outcome, { present: true, willing: false }), false);
  assert.equal(winnerKeepsSlot(outcome, { present: false, willing: true }), false);
});

test('winner departure offers both slots; empty queue waits', () => {
  const seated = [{ slot: 0, playerId: 'champ' }, { slot: 1, playerId: 'foe' }];
  const departed = rotationPlan({
    outcome: { winner: 'champ', reason: 'score' },
    seated,
    winnerPresent: false,
    winnerWilling: false,
    queueLength: 2,
  });
  assert.deepEqual(departed.keepSlots, []);
  assert.equal(departed.offerBoth, true);
  assert.equal(departed.inventWinner, false);

  const noChallenger = rotationPlan({
    outcome: { winner: 'champ', reason: 'score' },
    seated,
    winnerPresent: true,
    winnerWilling: true,
    queueLength: 0,
  });
  assert.deepEqual(noChallenger.keepSlots, [0]);
  assert.equal(noChallenger.waiting, true);
});
