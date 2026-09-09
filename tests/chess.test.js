import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CHESS_RULES_VERSION,
  CHESS_RULES_NAME,
  START_BOARD,
  initChessSimState,
  applyChessInput,
  applyChessMoves,
  legalMoves,
  samePosition,
  fromFen,
  toFen,
  stepChessSimulation,
} from '../shared/chessModel.js';

function play(state, slot, controls) {
  return applyChessInput(state, slot, controls);
}

function move(from, to, promo) {
  return { type: 'move', from, to, ...(promo ? { promo } : {}) };
}

test('chess rulesVersion 1 is Afterlight house chess', () => {
  const state = initChessSimState();
  assert.equal(CHESS_RULES_VERSION, 1);
  assert.equal(CHESS_RULES_NAME, 'afterlight-house-chess');
  assert.equal(state.rulesVersion, 1);
  assert.equal(state.rulesName, 'afterlight-house-chess');
  assert.equal(state.board, START_BOARD);
  assert.equal(state.turn, 'w');
  assert.match(toFen(state), /^rnbqkbnr\/pppppppp\/8\/8\/8\/8\/PPPPPPPP\/RNBQKBNR w KQkq - 0 1$/);
});

test('chess: out-of-turn and king-in-check moves are rejected; both boards stay identical', () => {
  const a = initChessSimState();
  const b = initChessSimState();
  assert.ok(samePosition(a, b));

  const blackFirst = play(a, 1, move('e7', 'e5'));
  assert.equal(blackFirst.ok, false);
  assert.equal(blackFirst.error, 'out_of_turn');
  assert.ok(samePosition(blackFirst.state, a));
  assert.ok(samePosition(blackFirst.state, b));

  const checked = fromFen('4k3/p7/8/4Q3/8/8/8/4K3 b - - 0 1');
  const other = fromFen('4k3/p7/8/4Q3/8/8/8/4K3 b - - 0 1');
  assert.equal(checked.inCheck, true);

  const ignored = play(checked, 1, move('a7', 'a5'));
  assert.equal(ignored.ok, false);
  assert.equal(ignored.error, 'king_in_check');
  assert.ok(samePosition(ignored.state, checked));
  assert.ok(samePosition(ignored.state, other));
  assert.equal(ignored.state.board, other.board);
});

test('chess: the same legal sequence keeps two boards on one position', () => {
  let a = initChessSimState();
  let b = initChessSimState();
  const sequence = [
    ['e2', 'e4'],
    ['e7', 'e5'],
    ['g1', 'f3'],
    ['b8', 'c6'],
  ];
  for (const [from, to] of sequence) {
    const slot = a.turn === 'w' ? 0 : 1;
    const ra = play(a, slot, move(from, to));
    const rb = play(b, slot, move(from, to));
    assert.equal(ra.ok, true);
    assert.equal(rb.ok, true);
    a = ra.state;
    b = rb.state;
    assert.ok(samePosition(a, b));
  }
  assert.equal(a.board[algebraicOffset('e4')], 'P');
  assert.equal(a.board[algebraicOffset('e5')], 'p');
});

function algebraicOffset(sq) {
  const file = 'abcdefgh'.indexOf(sq[0]);
  return (Number(sq[1]) - 1) * 8 + file;
}

test('chess: castling (kingside and queenside)', () => {
  const cleared = applyChessMoves(initChessSimState(), [
    { from: 'e2', to: 'e4' },
    { from: 'e7', to: 'e5' },
    { from: 'g1', to: 'f3' },
    { from: 'b8', to: 'c6' },
    { from: 'f1', to: 'e2' },
    { from: 'g8', to: 'f6' },
  ]);
  assert.equal(cleared.ok, true);
  const castle = play(cleared.state, 0, move('e1', 'g1'));
  assert.equal(castle.ok, true);
  assert.equal(castle.state.lastMove.castle, 'kingside');
  assert.equal(castle.state.board[algebraicOffset('g1')], 'K');
  assert.equal(castle.state.board[algebraicOffset('f1')], 'R');
  assert.equal(castle.state.board[algebraicOffset('e1')], '.');
  assert.equal(castle.state.board[algebraicOffset('h1')], '.');
  assert.ok(!castle.state.castling.includes('K'));
  assert.ok(!castle.state.castling.includes('Q'));

  const queenSide = fromFen('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
  const oooo = play(queenSide, 0, move('e1', 'c1'));
  assert.equal(oooo.ok, true);
  assert.equal(oooo.state.lastMove.castle, 'queenside');
  assert.equal(oooo.state.board[algebraicOffset('c1')], 'K');
  assert.equal(oooo.state.board[algebraicOffset('d1')], 'R');
});

test('chess: en passant', () => {
  const ready = applyChessMoves(initChessSimState(), [
    { from: 'e2', to: 'e4' },
    { from: 'a7', to: 'a6' },
    { from: 'e4', to: 'e5' },
    { from: 'd7', to: 'd5' },
  ]);
  assert.equal(ready.ok, true);
  assert.equal(ready.state.epSquare, 'd6');
  const ep = play(ready.state, 0, move('e5', 'd6'));
  assert.equal(ep.ok, true);
  assert.equal(ep.state.lastMove.enPassant, true);
  assert.equal(ep.state.board[algebraicOffset('d6')], 'P');
  assert.equal(ep.state.board[algebraicOffset('d5')], '.');
  assert.equal(ep.state.board[algebraicOffset('e5')], '.');
});

test('chess: promotion defaults to queen and accepts underpromotion', () => {
  const queen = fromFen('4k3/P7/8/8/8/8/8/4K3 w - - 0 1');
  const q = play(queen, 0, move('a7', 'a8'));
  assert.equal(q.ok, true);
  assert.equal(q.state.board[algebraicOffset('a8')], 'Q');

  const knight = fromFen('4k3/P7/8/8/8/8/8/4K3 w - - 0 1');
  const n = play(knight, 0, move('a7', 'a8', 'n'));
  assert.equal(n.ok, true);
  assert.equal(n.state.board[algebraicOffset('a8')], 'N');
});

test('chess: checkmate (fool\'s mate)', () => {
  const result = applyChessMoves(initChessSimState(), [
    { from: 'f2', to: 'f3' },
    { from: 'e7', to: 'e5' },
    { from: 'g2', to: 'g4' },
    { from: 'd8', to: 'h4' },
  ]);
  assert.equal(result.ok, true);
  assert.equal(result.state.status, 'complete');
  assert.equal(result.state.reason, 'checkmate');
  assert.equal(result.state.winner, 1);
  assert.equal(legalMoves(result.state).length, 0);
  const stepped = stepChessSimulation(result.state, [], 1);
  assert.equal(stepped.matchEnded.reason, 'checkmate');
  assert.equal(stepped.matchEnded.winner, 1);
});

test('chess: stalemate', () => {
  const state = fromFen('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1');
  assert.equal(state.status, 'complete');
  assert.equal(state.reason, 'stalemate');
  assert.equal(state.winner, null);
  assert.equal(state.inCheck, false);
});

test('chess: fifty-move draw after 100 quiet half-moves', () => {
  const state = fromFen('4k3/8/8/8/8/8/8/4K3 w - - 99 1');
  assert.equal(state.status, 'playing');
  const quiet = play(state, 0, move('e1', 'e2'));
  assert.equal(quiet.ok, true);
  assert.equal(quiet.state.halfmove, 100);
  assert.equal(quiet.state.status, 'complete');
  assert.equal(quiet.state.reason, 'fifty_move');
  assert.equal(quiet.state.winner, null);
});

test('chess: threefold repetition of the start position', () => {
  const shuffle = [
    { from: 'g1', to: 'f3' },
    { from: 'g8', to: 'f6' },
    { from: 'f3', to: 'g1' },
    { from: 'f6', to: 'g8' },
    { from: 'g1', to: 'f3' },
    { from: 'g8', to: 'f6' },
    { from: 'f3', to: 'g1' },
    { from: 'f6', to: 'g8' },
  ];
  const result = applyChessMoves(initChessSimState(), shuffle);
  assert.equal(result.ok, true);
  assert.equal(result.state.status, 'complete');
  assert.equal(result.state.reason, 'threefold');
  assert.equal(result.state.winner, null);
});

test('chess: resignation awards the opponent', () => {
  const state = initChessSimState();
  const whiteResigns = play(state, 0, { type: 'resign' });
  assert.equal(whiteResigns.ok, true);
  assert.equal(whiteResigns.state.status, 'complete');
  assert.equal(whiteResigns.state.reason, 'resignation');
  assert.equal(whiteResigns.state.winner, 1);

  const blackResigns = play(initChessSimState(), 1, { type: 'resign' });
  assert.equal(blackResigns.state.winner, 0);
});

test('chess: agreed draw via offer and accept', () => {
  const opening = play(initChessSimState(), 0, move('e2', 'e4'));
  const offered = play(opening.state, 1, { type: 'draw_offer' });
  assert.equal(offered.ok, true);
  assert.equal(offered.state.drawOffer, 1);
  const accepted = play(offered.state, 0, { type: 'draw_accept' });
  assert.equal(accepted.ok, true);
  assert.equal(accepted.state.reason, 'agreement');
  assert.equal(accepted.state.winner, null);
});
