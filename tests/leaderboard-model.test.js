import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ARCADE_GAMES,
  RECORDING_LABELS,
  clampPage,
  gameTitle,
  mergeLocalAndVerified,
  normalizeVerifiedBoard,
  pageCount,
  recordingStatusToLocalState,
} from '../shared/leaderboardModel.js';
import {
  applyRecordingStatus,
  bestsKey,
  getBest,
  listBests,
  recordRun,
  reconcileWithVerified,
  resetForTests,
} from '../src/activities/localBests.js';

test('verified board normalization tolerates unknown shapes and separates versions', () => {
  const board = normalizeVerifiedBoard({
    board: {
      game: 'sporefall',
      rulesVersion: 2,
      page: 0,
      pageSize: 10,
      total: 3,
      versions: [1, 2, 3],
      entries: [
        { rank: 1, playerId: 'p1', displayName: 'Kiln', score: 900, outcome: 'top_out', endedAt: 111 },
        { playerId: 'p2', score: '400' },
        'garbage',
      ],
    },
  });

  assert.equal(board.game, 'sporefall');
  assert.equal(board.rulesVersion, 2);
  assert.deepEqual(board.versions, [3, 2, 1]);
  assert.equal(board.entries.length, 3);
  assert.equal(board.entries[0].displayName, 'Kiln');
  assert.equal(board.entries[1].score, 400);
  assert.equal(board.entries[1].rank, 2, 'missing ranks derive from page position');
  assert.equal(board.entries[2].displayName, 'visitor');

  const empty = normalizeVerifiedBoard(null);
  assert.equal(empty.total, 0);
  assert.deepEqual(empty.entries, []);
});

test('pagination math is bounded and pages clamp', () => {
  assert.equal(pageCount(0), 0);
  assert.equal(pageCount(35), 4);
  assert.equal(clampPage(9, 35), 3);
  assert.equal(clampPage(-1, 35), 0);
  assert.equal(clampPage(2, 0), 0);
});

test('recording statuses map to honest local labels', () => {
  assert.equal(recordingStatusToLocalState('recorded'), 'verified');
  assert.equal(recordingStatusToLocalState('duplicate'), 'verified');
  assert.equal(recordingStatusToLocalState('retrying'), 'pending');
  assert.equal(recordingStatusToLocalState('recording_backlog_full'), 'unrecorded');
  assert.equal(recordingStatusToLocalState('recording_failed'), 'unrecorded');
  assert.equal(recordingStatusToLocalState('mystery'), null);
});

test('merge keeps verified ranking and appends an unranked labeled local row', () => {
  const board = normalizeVerifiedBoard({
    board: {
      game: 'sporefall',
      rulesVersion: 1,
      page: 0,
      total: 2,
      entries: [
        { rank: 1, playerId: 'p1', displayName: 'Kiln', score: 900, endedAt: 111 },
        { rank: 2, playerId: 'p2', displayName: 'Rust', score: 700, endedAt: 222 },
      ],
    },
  });

  const pendingBest = { score: 1200, at: 333, state: 'pending' };
  const rows = mergeLocalAndVerified(pendingBest, board, { playerId: 'me' });

  assert.equal(rows.length, 3);
  assert.deepEqual(
    rows.map(r => r.rank),
    [1, 2, null],
    'local best never fabricates a rank',
  );
  const local = rows[2];
  assert.equal(local.kind, 'local');
  assert.equal(local.label, RECORDING_LABELS.pending);
  assert.equal(local.isLocal, true);

  // When the local best would not outrank the board, it does not append.
  const small = mergeLocalAndVerified({ score: 100, at: 1, state: 'pending' }, board, { playerId: 'me' });
  assert.equal(small.length, 2);

  // Without a local best, the board passes through unchanged.
  assert.equal(mergeLocalAndVerified(null, board, { playerId: 'me' }).length, 2);
});

test('arcade catalog is bounded to the first-release cabinets', () => {
  assert.deepEqual(ARCADE_GAMES, ['rain-runner', 'signal-lost', 'sporefall']);
  assert.equal(gameTitle('sporefall'), 'Sporefall');
});

test('local bests keep the higher score and start pending', () => {
  resetForTests();

  const first = recordRun('sporefall', 1, 400);
  assert.equal(first.improved, true);
  assert.equal(first.best.state, 'pending');

  const lower = recordRun('sporefall', 1, 100);
  assert.equal(lower.improved, false);
  assert.equal(getBest('sporefall', 1).score, 400);

  const higher = recordRun('sporefall', 1, 900);
  assert.equal(higher.improved, true);
  assert.equal(getBest('sporefall', 1).score, 900);
  assert.equal(bestsKey('sporefall', 1), 'sporefall:v1');

  // Versions stay separated.
  recordRun('sporefall', 2, 50);
  assert.equal(getBest('sporefall', 2).score, 50);
  assert.equal(getBest('sporefall', 1).score, 900);
  assert.equal(listBests().length, 2);
});

test('recording status relabels local bests; unknown statuses change nothing', () => {
  resetForTests();
  recordRun('rain-runner', 1, 250);

  assert.equal(applyRecordingStatus({ game: 'rain-runner', rulesVersion: 1, status: 'retrying' }), false);
  assert.equal(getBest('rain-runner', 1).state, 'pending');

  assert.equal(applyRecordingStatus({ game: 'rain-runner', rulesVersion: 1, status: 'recorded' }), true);
  assert.equal(getBest('rain-runner', 1).state, 'verified');

  recordRun('rain-runner', 2, 90);
  assert.equal(applyRecordingStatus({ game: 'rain-runner', rulesVersion: 2, status: 'recording_backlog_full' }), true);
  assert.equal(getBest('rain-runner', 2).state, 'unrecorded');

  assert.equal(applyRecordingStatus({ game: 'rain-runner', rulesVersion: 1, status: 'shrug' }), false);
});

test('verified board entries with the local player verify the local best', () => {
  resetForTests();
  recordRun('signal-lost', 1, 800);

  const board = normalizeVerifiedBoard({
    board: {
      game: 'signal-lost',
      rulesVersion: 1,
      total: 1,
      entries: [{ rank: 1, playerId: 'me', score: 950, endedAt: 5 }],
    },
  });

  assert.equal(reconcileWithVerified('signal-lost', 1, board, 'me'), true);
  assert.equal(getBest('signal-lost', 1).state, 'verified');

  const lowBoard = normalizeVerifiedBoard({
    board: { game: 'signal-lost', rulesVersion: 1, total: 1, entries: [{ playerId: 'me', score: 10, endedAt: 5 }] },
  });
  assert.equal(reconcileWithVerified('signal-lost', 1, lowBoard, 'me'), false);
});
