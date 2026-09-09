import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CHECK_IN_MS,
  MATCH_OUTCOME,
  MATCH_STATUS,
  TOURNAMENT_ERRORS,
  TOURNAMENT_STATUS,
  apply,
  assignedActivityFor,
  createIdle,
  occupiesTournamentSlot,
  publicSnapshot,
  statusCaption,
  walkoverLabel,
} from '../shared/tournamentModel.js';

function enrollAll(size, now = 1000) {
  let state = createIdle('theater');
  const ids = Array.from({ length: size }, (_, i) => `p${i}`);
  for (let i = 0; i < size; i++) {
    const result = apply(
      state,
      { type: 'enroll', playerId: ids[i], displayName: `Player ${i}`, size, tournamentId: 't_test' },
      now + i,
    );
    assert.equal(result.ok, true, result.error);
    state = result.state;
  }
  return { state, ids };
}

function checkInBoth(state, match, now) {
  let next = apply(state, { type: 'check_in', playerId: match.playerA }, now);
  assert.equal(next.ok, true, next.error);
  next = apply(next.state, { type: 'check_in', playerId: match.playerB }, now + 1);
  assert.equal(next.ok, true, next.error);
  return next.state;
}

test('four-player enrollment fills a single-elim bracket and starts check-in', () => {
  const { state, ids } = enrollAll(4);
  assert.equal(state.status, TOURNAMENT_STATUS.CHECK_IN);
  assert.equal(state.size, 4);
  assert.equal(state.matches.length, 3);
  const semis = state.matches.filter(m => m.round === 0);
  assert.equal(semis.length, 2);
  assert.deepEqual(
    [semis[0].playerA, semis[0].playerB, semis[1].playerA, semis[1].playerB],
    ids,
  );
  assert.equal(semis[0].status, MATCH_STATUS.CHECK_IN);
  assert.equal(state.checkInDeadline, 1003 + CHECK_IN_MS);
});

test('cannot occupy a casual pool slot and a tournament slot together', () => {
  const idle = createIdle('theater');
  const blocked = apply(
    idle,
    { type: 'enroll', playerId: 'p0', size: 4 },
    1,
    { casualPlayerIds: ['p0'] },
  );
  assert.equal(blocked.ok, false);
  assert.equal(blocked.error, TOURNAMENT_ERRORS.CASUAL_SLOT);
  assert.equal(occupiesTournamentSlot(blocked.state, 'p0'), false);

  const enrolled = apply(idle, { type: 'enroll', playerId: 'p0', size: 4 }, 1);
  assert.equal(occupiesTournamentSlot(enrolled.state, 'p0'), true);
  assert.equal(assignedActivityFor(enrolled.state, 'p0'), null);
});

test('duplicate enroll is rejected; size is locked by the first player', () => {
  let state = apply(createIdle(), { type: 'enroll', playerId: 'a', size: 4 }, 1).state;
  const dup = apply(state, { type: 'enroll', playerId: 'a', size: 8 }, 2);
  assert.equal(dup.error, TOURNAMENT_ERRORS.ALREADY_ENROLLED);
  const wrong = apply(createIdle(), { type: 'enroll', playerId: 'a', size: 5 }, 1);
  assert.equal(wrong.error, TOURNAMENT_ERRORS.SIZE);
});

test('no-show: one checked-in player advances by labeled walkover without played-match credit', () => {
  let { state } = enrollAll(4, 5000);
  const match = state.matches.find(m => m.id === state.activeMatchId);
  state = apply(state, { type: 'check_in', playerId: match.playerA }, 5100).state;
  const after = apply(state, { type: 'tick' }, state.checkInDeadline);
  assert.equal(after.ok, true);
  const done = after.state.matches.find(m => m.id === match.id);
  assert.equal(done.outcome, MATCH_OUTCOME.WALKOVER);
  assert.equal(done.winnerId, match.playerA);
  assert.equal(done.credited, false);
  assert.match(walkoverLabel(done), /Walkover/);
  const final = after.state.matches.find(m => m.round === 1);
  assert.equal(final.playerA, match.playerA);
});

test('no-show: neither present cancels the pairing without fictional match wins', () => {
  let { state } = enrollAll(4, 0);
  const match = state.matches.find(m => m.id === state.activeMatchId);
  const after = apply(state, { type: 'tick' }, state.checkInDeadline);
  const done = after.state.matches.find(m => m.id === match.id);
  assert.equal(done.outcome, MATCH_OUTCOME.CANCELLED);
  assert.equal(done.winnerId, null);
  assert.equal(done.credited, false);
  const final = after.state.matches.find(m => m.round === 1);
  assert.equal(final.playerA, null);
});

test('verified semifinal advances once; retrying the same result is idempotent', () => {
  let { state } = enrollAll(4, 0);
  const match = state.matches.find(m => m.id === state.activeMatchId);
  state = checkInBoth(state, match, 10);
  assert.equal(state.matches.find(m => m.id === match.id).status, MATCH_STATUS.ASSIGNED);
  assert.equal(assignedActivityFor(state, match.playerA), 'orpheum-pool');

  const payload = {
    type: 'verified_result',
    matchId: match.id,
    winnerId: match.playerA,
    outcome: 'eight_ball',
    verifiedMatchId: 'rec_1',
  };
  const first = apply(state, payload, 20);
  assert.equal(first.ok, true);
  const advanced = first.state.matches.find(m => m.round === 1);
  assert.equal(advanced.playerA, match.playerA);

  const retry = apply(first.state, payload, 21);
  assert.equal(retry.ok, true);
  assert.equal(retry.state.matches.find(m => m.round === 1).playerA, match.playerA);
  assert.equal(
    retry.state.matches.filter(m => m.round === 1 && m.playerA === match.playerA).length,
    1,
  );
  const played = retry.state.matches.find(m => m.id === match.id);
  assert.equal(played.credited, true);
  assert.equal(played.outcome, MATCH_OUTCOME.PLAYED);
});

test('complete four-player bracket from verified results names a champion', () => {
  let { state, ids } = enrollAll(4, 0);

  for (const winnerIndex of [0, 2, 0]) {
    const match = state.matches.find(m => m.id === state.activeMatchId);
    state = checkInBoth(state, match, state.revision);
    const winnerId = ids[winnerIndex] === match.playerA || ids[winnerIndex] === match.playerB
      ? ids[winnerIndex]
      : match.playerA;
    const result = apply(
      state,
      { type: 'verified_result', matchId: match.id, winnerId, outcome: 'completed' },
      state.revision + 1,
    );
    assert.equal(result.ok, true, result.error);
    state = result.state;
  }

  assert.equal(state.status, TOURNAMENT_STATUS.COMPLETE);
  assert.equal(state.championId, ids[0]);
  assert.equal(state.matches.filter(m => m.credited).length, 3);
});

test('server restart cancels unfinished matches and keeps completed played records', () => {
  let { state } = enrollAll(4, 0);
  const match = state.matches.find(m => m.id === state.activeMatchId);
  state = checkInBoth(state, match, 10);
  state = apply(
    state,
    { type: 'verified_result', matchId: match.id, winnerId: match.playerA, outcome: 'completed' },
    20,
  ).state;

  const cancelled = apply(state, { type: 'server_restart' }, 30).state;
  assert.equal(cancelled.status, TOURNAMENT_STATUS.CANCELLED);
  assert.equal(cancelled.cancelReason, 'server_restart');
  const kept = cancelled.matches.find(m => m.id === match.id);
  assert.equal(kept.outcome, MATCH_OUTCOME.PLAYED);
  assert.equal(kept.credited, true);
  assert.equal(kept.winnerId, match.playerA);
  const unfinished = cancelled.matches.filter(m => m.id !== match.id);
  assert.ok(unfinished.every(m => m.status === MATCH_STATUS.CANCELLED || m.status === MATCH_STATUS.COMPLETE));
  assert.equal(occupiesTournamentSlot(cancelled, match.playerA), false);
});

test('eight-player bracket has seven matches and walks over a withdrawn player', () => {
  const { state, ids } = enrollAll(8, 0);
  assert.equal(state.matches.length, 7);
  const match = state.matches.find(m => m.id === state.activeMatchId);
  const after = apply(state, { type: 'withdraw', playerId: match.playerB }, 50).state;
  const snap = publicSnapshot(after);
  const walked = snap.matches.find(m => m.id === match.id);
  assert.equal(walked.outcome, MATCH_OUTCOME.WALKOVER);
  assert.equal(walked.winnerId, match.playerA);
  assert.equal(walked.credited, false);
  assert.ok(!occupiesTournamentSlot(snap, ids[1]));
});

test('status captions stay honest about walkovers and restart cancellation', () => {
  const idle = createIdle('theater');
  assert.match(statusCaption(idle), /No pool tournament/);
  const cancelled = apply(idle, { type: 'enroll', playerId: 'a', size: 4 }, 1).state;
  const stopped = apply(cancelled, { type: 'server_restart' }, 2).state;
  assert.match(statusCaption(stopped), /cancelled when the room restarted/);
});
