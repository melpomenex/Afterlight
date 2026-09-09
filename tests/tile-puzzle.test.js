import test from 'node:test';
import assert from 'node:assert/strict';

import {
  TILE_RULES_VERSION,
  TILE_CELL_COUNT,
  TILE_MAX_PLAYERS,
  TILE_ACTIVITY_POSITION,
  TILE_SOLVED_BOARD,
  TILE_INITIAL_BOARD,
  countCorrect,
  progressOf,
  isSolvedBoard,
  isAdjacent,
  emptyIndex,
  validateTileControls,
  orderConcurrentMoves,
  collectPendingMoves,
  initTileSimState,
  applyTileInput,
  applyOrderedMoves,
  stepTileSimulation,
} from '../shared/tilePuzzleModel.js';
import { hasActivityModule } from '../src/activities/registry.js';
import '../src/activities/tilePuzzle.js';

test('tile-puzzle: module registers as tile-puzzle', () => {
  assert.equal(hasActivityModule('tile-puzzle'), true);
});

test('tile-puzzle: shared opening board is deterministic and unsolved', () => {
  const a = initTileSimState();
  const b = initTileSimState({ activeSlots: [0, 1, 2, 3] });

  assert.equal(a.rulesVersion, TILE_RULES_VERSION);
  assert.equal(a.status, 'arranging');
  assert.equal(a.solved, false);
  assert.equal(a.winner, null);
  assert.deepEqual(a.board, [...TILE_INITIAL_BOARD]);
  assert.deepEqual(b.board, a.board);
  assert.deepEqual(a.activeSlots, [0, 1, 2, 3]);
  assert.equal(a.activeSlots.length, TILE_MAX_PLAYERS);
  assert.deepEqual(TILE_ACTIVITY_POSITION, [5.2, 0, 1.0]);
  assert.equal(isSolvedBoard(a.board), false);
  assert.ok(a.correctCount < TILE_CELL_COUNT);
  assert.equal(a.progress, a.correctCount / TILE_CELL_COUNT);
  assert.ok(!('xp' in a) && !('currency' in a) && !('ash' in a));
});

test('tile-puzzle: progress counts home cells including the empty well', () => {
  assert.equal(countCorrect(TILE_SOLVED_BOARD), TILE_CELL_COUNT);
  assert.equal(progressOf(TILE_SOLVED_BOARD), 1);
  assert.equal(isSolvedBoard(TILE_SOLVED_BOARD), true);
  assert.equal(countCorrect(TILE_INITIAL_BOARD), 2);
  assert.equal(emptyIndex(TILE_INITIAL_BOARD), 15);
  assert.equal(isAdjacent(14, 15), true);
  assert.equal(isAdjacent(14, 12), false);
});

test('tile-puzzle: validateTileControls accepts slide/swap/reset and rejects junk', () => {
  assert.equal(validateTileControls(null).valid, false);
  assert.equal(validateTileControls({ type: 'teleport' }).valid, false);
  assert.equal(validateTileControls({ kind: 'ready' }).sanitized.type, 'ready');

  const slide = validateTileControls({ type: 'slide', tileId: 2, from: 1, to: 5, seq: 3 });
  assert.equal(slide.valid, true);
  assert.deepEqual(slide.sanitized, { type: 'slide', tileId: 2, from: 1, to: 5, seq: 3 });

  const swap = validateTileControls({ type: 'swap', from: 0, to: 1 });
  assert.equal(swap.valid, true);
  assert.equal(swap.sanitized.type, 'swap');

  const reset = validateTileControls({ type: 'reset' });
  assert.equal(reset.valid, true);
  assert.equal(reset.sanitized.type, 'reset');
});

test('tile-puzzle: a legal slide moves a tile into the empty well', () => {
  const start = initTileSimState({
    board: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 0, 15],
  });
  assert.equal(start.correctCount, 14);

  const moved = applyTileInput(start, 0, { type: 'slide', tileId: 15, from: 15, to: 14, seq: 1 });
  assert.equal(moved.event.type, 'puzzle_solved');
  assert.equal(moved.simState.solved, true);
  assert.equal(moved.simState.status, 'solved');
  assert.deepEqual(moved.simState.board, [...TILE_SOLVED_BOARD]);
  assert.equal(moved.simState.correctCount, TILE_CELL_COUNT);
  assert.equal(moved.simState.progress, 1);
  assert.equal(moved.simState.winner, null);
});

test('tile-puzzle: illegal slides are rejected and leave the board unchanged', () => {
  const start = initTileSimState();
  const before = [...start.board];
  const far = applyTileInput(start, 0, { type: 'slide', from: 0, to: 15, seq: 1 });
  assert.equal(far.event, null);
  assert.deepEqual(far.simState.board, before);
  assert.equal(far.simState.appliedSeqBySlot['0'], 1);
});

test('tile-puzzle: swap exchanges two cells and is visible in progress', () => {
  const start = initTileSimState({
    board: [2, 1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 0],
  });
  assert.equal(start.correctCount, 14);

  const swapped = applyTileInput(start, 2, { type: 'swap', from: 0, to: 1, seq: 4 });
  assert.equal(swapped.event.type, 'puzzle_solved');
  assert.deepEqual(swapped.simState.board, [...TILE_SOLVED_BOARD]);
  assert.equal(swapped.simState.lastMove.slot, 2);
});

test('tile-puzzle: concurrent inputs use one (seq, slot) ordering', () => {
  const moves = [
    { slot: 3, seq: 2, controls: { type: 'swap', from: 2, to: 3 } },
    { slot: 0, seq: 1, controls: { type: 'swap', from: 0, to: 1 } },
    { slot: 1, seq: 1, controls: { type: 'swap', from: 4, to: 5 } },
  ];
  const ordered = orderConcurrentMoves(moves);
  assert.deepEqual(ordered.map((m) => [m.seq, m.slot]), [[1, 0], [1, 1], [2, 3]]);

  const board = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 15, 14, 0];
  const lateFirst = applyOrderedMoves(initTileSimState({ board }), [...moves].reverse());
  const earlyFirst = applyOrderedMoves(initTileSimState({ board }), moves);

  assert.deepEqual(lateFirst.simState.board, earlyFirst.simState.board);
  assert.equal(lateFirst.simState.solved, earlyFirst.simState.solved);
  assert.equal(lateFirst.simState.correctCount, earlyFirst.simState.correctCount);
  assert.deepEqual(lateFirst.simState.board, [
    2, 1, 4, 3,
    6, 5, 7, 8,
    9, 10, 11, 12,
    13, 15, 14, 0,
  ]);
});

test('tile-puzzle: conflicting concurrent slides keep the first (seq, slot) move', () => {
  const board = [1, 2, 3, 4, 5, 0, 7, 8, 9, 6, 10, 12, 13, 14, 11, 15];
  // Empty at index 5. Adjacent slides: tile 7 at 6, tile 5 at 4.
  const moves = [
    { slot: 1, seq: 8, controls: { type: 'slide', from: 4, to: 5 } },
    { slot: 0, seq: 8, controls: { type: 'slide', from: 6, to: 5 } },
  ];

  const a = applyOrderedMoves(initTileSimState({ board }), moves);
  const b = applyOrderedMoves(initTileSimState({ board }), [...moves].reverse());

  assert.deepEqual(a.simState.board, b.simState.board);
  assert.equal(a.simState.board[5], 7);
  assert.equal(a.simState.board[6], 0);
  assert.equal(a.simState.board[4], 5);
  assert.equal(a.events.length, 1);
  assert.equal(a.events[0].payload.slot, 0);
});

test('tile-puzzle: solved boards reject slides and swaps but accept reset', () => {
  const almost = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 0, 15];
  let state = initTileSimState({ board: almost });
  state = applyTileInput(state, 0, { type: 'slide', from: 15, to: 14, seq: 1 }).simState;
  assert.equal(state.solved, true);

  const slide = applyTileInput(state, 0, { type: 'slide', from: 14, to: 15, seq: 2 });
  assert.equal(slide.event, null);
  assert.deepEqual(slide.simState.board, [...TILE_SOLVED_BOARD]);

  const swap = applyTileInput(slide.simState, 1, { type: 'swap', from: 0, to: 1, seq: 3 });
  assert.equal(swap.event, null);
  assert.equal(swap.simState.solved, true);

  const reset = applyTileInput(swap.simState, 3, { type: 'reset', seq: 4 });
  assert.equal(reset.event.type, 'puzzle_reset');
  assert.equal(reset.simState.solved, false);
  assert.equal(reset.simState.status, 'arranging');
  assert.deepEqual(reset.simState.board, almost);
  assert.equal(reset.simState.resetCount, 1);
  assert.equal(reset.simState.winner, null);
});

test('tile-puzzle: reset after a real scramble restores the shared opening', () => {
  let state = initTileSimState();
  const opening = [...state.board];
  state = applyTileInput(state, 0, { type: 'swap', from: 0, to: 1, seq: 1 }).simState;
  assert.notDeepEqual(state.board, opening);

  state = applyTileInput(state, 1, { type: 'reset', seq: 2 }).simState;
  assert.deepEqual(state.board, opening);
  assert.equal(state.resetCount, 1);
});

test('tile-puzzle: step applies pending player inputs once in (seq, slot) order', () => {
  const start = initTileSimState({
    board: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 15, 14, 0],
  });
  const players = {
    1: { last_seq: 4, input_state: { type: 'swap', from: 2, to: 3 } },
    0: { last_seq: 4, input_state: { type: 'swap', from: 0, to: 1 } },
  };

  const first = stepTileSimulation(start, players, 2);
  assert.equal(first.simState.tickCount, 2);
  assert.deepEqual(first.simState.board, [
    2, 1, 4, 3,
    5, 6, 7, 8,
    9, 10, 11, 12,
    13, 15, 14, 0,
  ]);

  const again = stepTileSimulation(first.simState, players, 1);
  assert.deepEqual(again.simState.board, first.simState.board);
  assert.equal(again.event, null);
});

test('tile-puzzle: collectPendingMoves skips already-applied seq values', () => {
  const pending = collectPendingMoves(
    { 0: { last_seq: 2, input_state: { type: 'reset' } } },
    { 0: 2 },
  );
  assert.deepEqual(pending, []);
});
