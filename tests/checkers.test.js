import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CHECKERS_RULES_VERSION,
  CHECKERS_TABLE_POSITION,
  startingBoard,
  normalizeSquare,
  validateCheckersControls,
  listLegalMoves,
  initCheckersSimState,
  applyCheckersInput,
  stepCheckersSimulation,
} from '../shared/checkersModel.js';
import { hasActivityModule } from '../src/activities/registry.js';
import { createCheckersInstance } from '../src/activities/checkers.js';
import '../src/activities/checkers.js';

function boardOf(entries) {
  const board = {};
  for (const [sq, slot, king = false] of entries) {
    board[sq] = { slot, king };
  }
  return board;
}

function apply(state, slot, controls) {
  return applyCheckersInput(state, slot, controls);
}

test('checkers: module registers as checkers', () => {
  assert.equal(hasActivityModule('checkers'), true);
});

test('checkers: Rain Court table attaches at court-checkers [6.4, 0, 5.5]', () => {
  const world = {
    group: {
      children: [],
      add(child) {
        this.children.push(child);
        child.parent = this;
      },
    },
  };

  const instance = createCheckersInstance({
    activityDef: {
      id: 'court-checkers',
      type: 'checkers',
      transform: { position: [...CHECKERS_TABLE_POSITION], rotationY: 0 },
    },
    world,
    roomId: 'court',
  });

  assert.equal(world.group.children.length, 1);
  assert.equal(instance.group.parent, world.group);
  assert.deepEqual(instance.group.position.toArray(), [6.4, 0, 5.5]);
  assert.equal(instance.id, 'court-checkers');
  instance.dispose();
});

test('checkers: starting position has twelve men per side and dark to move', () => {
  const state = initCheckersSimState();
  assert.equal(state.rulesVersion, CHECKERS_RULES_VERSION);
  assert.equal(state.status, 'playing');
  assert.equal(state.turn, 0);
  assert.equal(Object.keys(startingBoard()).length, 24);
  assert.equal(Object.values(state.board).filter((p) => p.slot === 0).length, 12);
  assert.equal(Object.values(state.board).filter((p) => p.slot === 1).length, 12);
  const opening = listLegalMoves(state);
  assert.ok(opening.some((m) => m.from === 'c3' && m.to === 'd4'));
  assert.ok(opening.every((m) => m.captures.length === 0));
});

test('checkers: validateCheckersControls accepts type/kind move/resign/draw and a path', () => {
  assert.equal(validateCheckersControls(null).valid, false);
  assert.equal(validateCheckersControls({ type: 'teleport' }).valid, false);
  assert.equal(validateCheckersControls({ type: 'move', from: 'c3' }).valid, false);

  const move = validateCheckersControls({
    kind: 'move',
    from: 'C3',
    to: 'g7',
    path: ['e5', 'g7'],
  });
  assert.equal(move.valid, true);
  assert.deepEqual(move.sanitized, {
    type: 'move',
    from: 'c3',
    to: 'g7',
    path: ['e5', 'g7'],
  });
  assert.equal(validateCheckersControls({ type: 'resign' }).sanitized.type, 'resign');
  assert.equal(validateCheckersControls({ type: 'draw' }).sanitized.type, 'draw');
  assert.equal(normalizeSquare('b1'), null);
  assert.equal(normalizeSquare('c3'), 'c3');
});

test('checkers: out-of-turn and illegal moves are rejected without changing the board', () => {
  const origin = initCheckersSimState();
  const snapshot = JSON.stringify(origin.board);

  const whiteFirst = apply(origin, 1, { type: 'move', from: 'b6', to: 'a5' });
  assert.equal(whiteFirst.event.type, 'illegal_move');
  assert.equal(whiteFirst.event.reason, 'out_of_turn');
  assert.equal(JSON.stringify(whiteFirst.simState.board), snapshot);
  assert.equal(whiteFirst.simState.turn, 0);

  const ghost = apply(origin, 0, { type: 'move', from: 'c3', to: 'e5' });
  assert.equal(ghost.event.type, 'illegal_move');
  assert.equal(JSON.stringify(ghost.simState.board), snapshot);

  const opening = apply(origin, 0, { type: 'move', from: 'c3', to: 'd4' });
  assert.equal(opening.event.type, 'moved');
  assert.equal(opening.simState.board.d4.slot, 0);
  assert.equal(opening.simState.board.c3, undefined);
  assert.equal(opening.simState.turn, 1);
});

test('checkers: captures are mandatory and chains must be completed in one path', () => {
  const forced = initCheckersSimState({
    board: boardOf([
      ['c3', 0],
      ['d4', 1],
      ['a1', 0],
      ['h8', 1],
    ]),
    turn: 0,
  });

  const quiet = apply(forced, 0, { type: 'move', from: 'a1', to: 'b2' });
  assert.equal(quiet.event.type, 'illegal_move');
  assert.equal(quiet.simState.board.d4.slot, 1);

  const take = apply(forced, 0, { type: 'move', from: 'c3', to: 'e5' });
  assert.equal(take.event.type, 'moved');
  assert.equal(take.simState.board.d4, undefined);
  assert.equal(take.simState.board.e5.slot, 0);

  const chainBoard = initCheckersSimState({
    board: boardOf([
      ['c3', 0],
      ['d4', 1],
      ['f6', 1],
    ]),
    turn: 0,
  });
  const incomplete = apply(chainBoard, 0, { type: 'move', from: 'c3', to: 'e5' });
  assert.equal(incomplete.event.type, 'illegal_move');
  assert.equal(incomplete.simState.board.c3.slot, 0);

  const complete = apply(chainBoard, 0, {
    type: 'move',
    from: 'c3',
    to: 'g7',
    path: ['e5', 'g7'],
  });
  assert.equal(complete.event.type, 'match_ended');
  assert.equal(complete.simState.result, 'no_legal_move');
  assert.equal(complete.simState.winner, 0);
  assert.equal(complete.simState.board.d4, undefined);
  assert.equal(complete.simState.board.f6, undefined);
  assert.equal(complete.simState.board.g7.slot, 0);
});

test('checkers: men crown on the back rank and kings capture backward', () => {
  const crown = initCheckersSimState({
    board: boardOf([
      ['c7', 0],
      ['h6', 1],
    ]),
    turn: 0,
  });
  const crowned = apply(crown, 0, { type: 'move', from: 'c7', to: 'b8' });
  assert.equal(crowned.simState.board.b8.king, true);
  assert.equal(crowned.simState.turn, 1);
  assert.equal(crowned.simState.status, 'playing');

  const midChainCrown = initCheckersSimState({
    board: boardOf([
      ['f6', 0],
      ['g7', 1],
      ['f2', 1],
    ]),
    turn: 0,
  });
  const stopped = apply(midChainCrown, 0, { type: 'move', from: 'f6', to: 'h8' });
  assert.equal(stopped.event.type, 'moved');
  assert.equal(stopped.simState.board.h8.king, true);
  assert.equal(stopped.simState.board.f2.slot, 1);

  const king = initCheckersSimState({
    board: boardOf([
      ['e5', 0, true],
      ['d4', 1],
    ]),
    turn: 0,
  });
  const backward = apply(king, 0, { type: 'move', from: 'e5', to: 'c3' });
  assert.equal(backward.event.type, 'match_ended');
  assert.equal(backward.simState.board.c3.king, true);
  assert.equal(backward.simState.board.d4, undefined);
});

test('checkers: no legal move, resignation, and agreed draw end the match', () => {
  const boxed = initCheckersSimState({
    board: boardOf([
      ['a1', 1],
      ['b2', 0],
      ['c1', 0],
    ]),
    turn: 1,
  });
  assert.equal(listLegalMoves(boxed).length, 0);
  const afterQuiet = apply(
    initCheckersSimState({
      board: boardOf([
        ['c3', 0],
        ['a1', 1],
        ['b2', 0],
        ['c1', 0],
      ]),
      turn: 0,
    }),
    0,
    { type: 'move', from: 'c3', to: 'd4' },
  );
  assert.equal(afterQuiet.simState.status, 'complete');
  assert.equal(afterQuiet.simState.result, 'no_legal_move');
  assert.equal(afterQuiet.simState.winner, 0);

  const resign = apply(initCheckersSimState(), 0, { type: 'resign' });
  assert.equal(resign.simState.status, 'complete');
  assert.equal(resign.simState.result, 'resign');
  assert.equal(resign.simState.winner, 1);

  let draw = apply(initCheckersSimState(), 0, { type: 'draw' }).simState;
  assert.equal(draw.status, 'playing');
  assert.equal(draw.drawOfferedBy, 0);
  draw = apply(draw, 1, { type: 'draw' }).simState;
  assert.equal(draw.status, 'complete');
  assert.equal(draw.result, 'draw');
  assert.equal(draw.winner, null);
});

test('checkers: concurrent moves keep one authoritative position', () => {
  const origin = initCheckersSimState();
  const both = {
    0: { input_state: { type: 'move', from: 'c3', to: 'd4' } },
    1: { input_state: { type: 'move', from: 'b6', to: 'a5' } },
  };

  const a = stepCheckersSimulation(origin, both, 1);
  const b = stepCheckersSimulation(origin, { 1: both[1], 0: both[0] }, 1);

  assert.deepEqual(a.simState.board, b.simState.board);
  assert.equal(a.simState.turn, 1);
  assert.equal(a.simState.board.d4.slot, 0);
  assert.equal(a.simState.board.b6.slot, 1);
  assert.equal(a.simState.board.a5, undefined);

  const whiteAlone = apply(origin, 1, both[1].input_state);
  assert.equal(whiteAlone.event.reason, 'out_of_turn');
  assert.deepEqual(whiteAlone.simState.board, origin.board);

  const afterBlack = apply(origin, 0, both[0].input_state).simState;
  const staleWhite = stepCheckersSimulation(origin, both, 1).simState;
  assert.deepEqual(staleWhite.board, afterBlack.board);

  const doubleOffer = stepCheckersSimulation(origin, {
    0: { input_state: { type: 'draw' } },
    1: { input_state: { type: 'draw' } },
  }, 1);
  assert.equal(doubleOffer.simState.status, 'complete');
  assert.equal(doubleOffer.simState.result, 'draw');
  assert.equal(doubleOffer.outcome.type, 'match_ended');
});
