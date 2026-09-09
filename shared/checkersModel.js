/**
 * Authoritative English draughts / American checkers rules.
 *
 * Place Activities Program (Phase 5, Task 8.3).
 *
 * Spec: signature-place-activities — Quiet board games and puzzles.
 * Design: D1 (plain model + small adapter), D5 (pure server reducer),
 * D7 (Rain Court `court-checkers`).
 *
 * House rules (English draughts, not international 10×10):
 * - 8×8 board, dark squares only. Slot 0 (dark) moves first.
 * - Men move diagonally forward one square; kings one square any diagonal.
 * - Captures are mandatory. Any legal capturing sequence may be chosen
 *   (no majority-capture / flying-king rules).
 * - A jump chain is one input: `from`, `to`, optional landing `path`.
 *   Captured pieces are removed immediately. Crowning ends the turn.
 * - A side with no legal move loses. Resignation awards the opponent.
 *   A draw requires both sides to offer/agree.
 * - No XP, currency, or economy writes.
 */

export const CHECKERS_RULES_VERSION = 1;
export const CHECKERS_FILES = 'abcdefgh';
export const CHECKERS_TABLE_POSITION = Object.freeze([6.4, 0, 5.5]);

const BLACK_DIRS = Object.freeze([
  [1, 1],
  [1, -1],
]);
const WHITE_DIRS = Object.freeze([
  [-1, 1],
  [-1, -1],
]);
const KING_DIRS = Object.freeze([
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
]);

const clone = (value) => JSON.parse(JSON.stringify(value));

function actionType(controls) {
  if (!controls || typeof controls !== 'object' || Array.isArray(controls)) return '';
  const raw = controls.type ?? controls.kind ?? '';
  return typeof raw === 'string' ? raw.trim().toLowerCase() : '';
}

function fileIndex(file) {
  if (typeof file === 'number' && Number.isInteger(file)) return file;
  if (typeof file === 'string' && file.length === 1) {
    return CHECKERS_FILES.indexOf(file.toLowerCase());
  }
  return -1;
}

/**
 * Parse a dark-square name (`c3`), `{file, rank}`, or `[fileIndex, rank]`.
 * @param {any} value
 * @returns {string | null} algebraic square or null
 */
export function normalizeSquare(value) {
  if (typeof value === 'string') {
    const raw = value.trim().toLowerCase();
    if (!/^[a-h][1-8]$/.test(raw)) return null;
    const file = CHECKERS_FILES.indexOf(raw[0]);
    const rank = Number(raw[1]);
    if (!isPlayable(file, rank)) return null;
    return raw;
  }
  if (Array.isArray(value) && value.length >= 2) {
    const file = fileIndex(value[0]);
    const rank = Number(value[1]);
    if (!Number.isInteger(rank) || !isPlayable(file, rank)) return null;
    return `${CHECKERS_FILES[file]}${rank}`;
  }
  if (value && typeof value === 'object') {
    const file = fileIndex(value.file ?? value.x ?? value.col);
    const rank = Number(value.rank ?? value.y ?? value.row);
    if (!Number.isInteger(rank) || !isPlayable(file, rank)) return null;
    return `${CHECKERS_FILES[file]}${rank}`;
  }
  return null;
}

export function isPlayable(file, rank) {
  return file >= 0 && file < 8 && rank >= 1 && rank <= 8 && ((file + rank) & 1) === 1;
}

export function squareCoords(square) {
  const sq = normalizeSquare(square);
  if (!sq) return null;
  return { file: CHECKERS_FILES.indexOf(sq[0]), rank: Number(sq[1]) };
}

function promotionRank(slot) {
  return Number(slot) === 0 ? 8 : 1;
}

function dirsFor(piece) {
  if (piece.king) return KING_DIRS;
  return Number(piece.slot) === 0 ? BLACK_DIRS : WHITE_DIRS;
}

function offsetSquare(square, dRank, dFile) {
  const at = squareCoords(square);
  if (!at) return null;
  const file = at.file + dFile;
  const rank = at.rank + dRank;
  if (!isPlayable(file, rank)) return null;
  return `${CHECKERS_FILES[file]}${rank}`;
}

export function normalizePiece(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const slot = Number(raw.slot ?? raw.color);
  if (slot !== 0 && slot !== 1) return null;
  return { slot, king: Boolean(raw.king) };
}

export function normalizeBoard(board) {
  const next = {};
  if (!board || typeof board !== 'object') return next;
  for (const [key, value] of Object.entries(board)) {
    const sq = normalizeSquare(key);
    const piece = normalizePiece(value);
    if (sq && piece) next[sq] = piece;
  }
  return next;
}

export function startingBoard() {
  const board = {};
  for (let rank = 1; rank <= 3; rank += 1) {
    for (let file = 0; file < 8; file += 1) {
      if (isPlayable(file, rank)) {
        board[`${CHECKERS_FILES[file]}${rank}`] = { slot: 0, king: false };
      }
    }
  }
  for (let rank = 6; rank <= 8; rank += 1) {
    for (let file = 0; file < 8; file += 1) {
      if (isPlayable(file, rank)) {
        board[`${CHECKERS_FILES[file]}${rank}`] = { slot: 1, king: false };
      }
    }
  }
  return board;
}

function pathLandings(from, to, path) {
  const landings = [];
  if (Array.isArray(path)) {
    for (const step of path) {
      const sq = normalizeSquare(step);
      if (!sq) return { valid: false, error: 'invalid_path' };
      if (sq !== from) landings.push(sq);
    }
  }
  const dest = normalizeSquare(to);
  if (dest && (landings.length === 0 || landings[landings.length - 1] !== dest)) {
    landings.push(dest);
  }
  if (landings.length === 0) return { valid: false, error: 'missing_destination' };
  return { valid: true, landings, to: landings[landings.length - 1] };
}

/**
 * @param {any} controls
 * @returns {{ valid: boolean, sanitized?: object, error?: string }}
 */
export function validateCheckersControls(controls) {
  const type = actionType(controls);
  if (!type) return { valid: false, error: 'invalid_controls' };
  if (type === 'neutral' || type === 'ready') {
    return { valid: true, sanitized: { type } };
  }
  if (type === 'resign' || type === 'draw') {
    return { valid: true, sanitized: { type } };
  }
  if (type !== 'move') return { valid: false, error: 'unknown_type' };

  const from = normalizeSquare(controls.from);
  if (!from) return { valid: false, error: 'invalid_from' };
  const parsed = pathLandings(from, controls.to, controls.path);
  if (!parsed.valid) return { valid: false, error: parsed.error };
  return {
    valid: true,
    sanitized: {
      type: 'move',
      from,
      to: parsed.to,
      path: parsed.landings,
    },
  };
}

function captureSequences(board, from, piece, already) {
  const results = [];
  for (const [dRank, dFile] of dirsFor(piece)) {
    const mid = offsetSquare(from, dRank, dFile);
    const land = offsetSquare(from, dRank * 2, dFile * 2);
    if (!mid || !land) continue;
    const victim = board[mid];
    if (!victim || Number(victim.slot) === Number(piece.slot)) continue;
    if (already.has(mid) || board[land]) continue;

    const nextBoard = { ...board };
    delete nextBoard[from];
    delete nextBoard[mid];
    const promoted = !piece.king && squareCoords(land).rank === promotionRank(piece.slot);
    const nextPiece = { slot: piece.slot, king: piece.king || promoted };
    nextBoard[land] = nextPiece;

    const step = { from, to: land, capture: mid, promoted };
    if (promoted) {
      results.push([step]);
      continue;
    }

    const further = captureSequences(nextBoard, land, nextPiece, new Set([...already, mid]));
    if (further.length === 0) {
      results.push([step]);
    } else {
      for (const chain of further) results.push([step, ...chain]);
    }
  }
  return results;
}

function quietMoves(board, from, piece) {
  const moves = [];
  for (const [dRank, dFile] of dirsFor(piece)) {
    const to = offsetSquare(from, dRank, dFile);
    if (!to || board[to]) continue;
    const promoted = !piece.king && squareCoords(to).rank === promotionRank(piece.slot);
    moves.push({
      from,
      to,
      path: [to],
      captures: [],
      promoted,
    });
  }
  return moves;
}

function describeCapture(steps) {
  const last = steps[steps.length - 1];
  return {
    from: steps[0].from,
    to: last.to,
    path: steps.map((step) => step.to),
    captures: steps.map((step) => step.capture),
    promoted: steps.some((step) => step.promoted),
  };
}

/**
 * Legal complete moves for the side to play. Captures are exclusive
 * when any capture exists.
 *
 * @param {object} state
 * @param {number} [slot]
 * @returns {object[]}
 */
export function listLegalMoves(state, slot = state?.turn) {
  const board = normalizeBoard(state?.board);
  const side = Number(slot);
  const captures = [];
  const quiets = [];

  for (const [from, raw] of Object.entries(board)) {
    const piece = normalizePiece(raw);
    if (!piece || piece.slot !== side) continue;
    const chains = captureSequences(board, from, piece, new Set());
    for (const steps of chains) captures.push(describeCapture(steps));
    if (captures.length === 0) {
      quiets.push(...quietMoves(board, from, piece));
    }
  }

  if (captures.length > 0) return captures;
  return quiets;
}

function sameMove(legal, want) {
  if (legal.from !== want.from || legal.to !== want.to) return false;
  if (want.path.length === 1) return true;
  if (legal.path.length !== want.path.length) return false;
  return legal.path.every((sq, i) => sq === want.path[i]);
}

function matchLegalMove(legals, want) {
  const matches = legals.filter((legal) => sameMove(legal, want));
  if (matches.length === 1) return { ok: true, move: matches[0] };
  if (matches.length === 0) return { ok: false, error: 'illegal_move' };
  return { ok: false, error: 'ambiguous_path' };
}

function applyLegalMove(state, slot, move) {
  const board = normalizeBoard(state.board);
  const piece = normalizePiece(board[move.from]);
  delete board[move.from];
  for (const captured of move.captures) delete board[captured];
  board[move.to] = { slot, king: Boolean(piece?.king) || Boolean(move.promoted) };

  const next = {
    ...state,
    board,
    turn: 1 - slot,
    ply: (state.ply || 0) + 1,
    lastMove: {
      from: move.from,
      to: move.to,
      path: [...move.path],
      captures: [...move.captures],
      slot,
      promoted: Boolean(move.promoted),
    },
    drawOfferedBy: null,
    moveNumber: slot === 1 ? (state.moveNumber || 1) + 1 : (state.moveNumber || 1),
  };

  const replies = listLegalMoves(next, next.turn);
  if (replies.length === 0) {
    next.status = 'complete';
    next.winner = slot;
    next.result = 'no_legal_move';
  } else {
    next.status = 'playing';
    next.winner = null;
    next.result = null;
  }
  return next;
}

function emptyPlayers(slots) {
  const players = {};
  for (const slot of slots) {
    players[slot] = { slot, ready: false };
    players[String(slot)] = players[slot];
  }
  return players;
}

/**
 * @param {object} [opts]
 */
export function initCheckersSimState(opts = {}) {
  const slots = Array.isArray(opts.slots) && opts.slots.length ? [...opts.slots] : [0, 1];
  const board = opts.board ? normalizeBoard(opts.board) : startingBoard();
  const turn = opts.turn === 1 ? 1 : 0;

  return {
    rulesVersion: CHECKERS_RULES_VERSION,
    status: 'playing',
    turn,
    ply: 0,
    moveNumber: 1,
    board,
    lastMove: null,
    drawOfferedBy: opts.drawOfferedBy === 0 || opts.drawOfferedBy === 1 ? opts.drawOfferedBy : null,
    winner: null,
    result: null,
    activeSlots: slots,
    players: emptyPlayers(slots),
  };
}

function finishResign(state, slot) {
  return {
    ...state,
    status: 'complete',
    winner: 1 - Number(slot),
    result: 'resign',
    drawOfferedBy: null,
  };
}

function finishDraw(state) {
  return {
    ...state,
    status: 'complete',
    winner: null,
    result: 'draw',
    drawOfferedBy: null,
  };
}

/**
 * Apply one draughts input. Illegal and out-of-turn moves leave the
 * position unchanged so concurrent clients converge on the same board.
 *
 * @param {object} simState
 * @param {number} slot
 * @param {object} controls
 * @returns {{ simState: object, event: object|null }}
 */
export function applyCheckersInput(simState, slot, controls) {
  if (!simState || simState.status === 'complete') {
    return { simState, event: null };
  }

  const side = Number(slot);
  if (side !== 0 && side !== 1) {
    return { simState, event: { type: 'illegal_move', reason: 'invalid_slot', slot } };
  }

  const valid = validateCheckersControls(controls);
  if (!valid.valid) {
    return { simState, event: { type: 'illegal_move', reason: valid.error, slot: side } };
  }

  const type = valid.sanitized.type;
  if (type === 'neutral' || type === 'ready') {
    return { simState, event: { type, slot: side } };
  }

  if (type === 'resign') {
    const next = finishResign(clone(simState), side);
    return {
      simState: next,
      event: {
        type: 'match_ended',
        slot: side,
        winner: next.winner,
        result: 'resign',
      },
    };
  }

  if (type === 'draw') {
    const offered = simState.drawOfferedBy;
    if (offered === side) {
      return { simState, event: { type: 'draw_offered', slot: side } };
    }
    if (offered === 0 || offered === 1) {
      const next = finishDraw(clone(simState));
      return {
        simState: next,
        event: {
          type: 'match_ended',
          slot: side,
          winner: null,
          result: 'draw',
        },
      };
    }
    const next = clone(simState);
    next.drawOfferedBy = side;
    return { simState: next, event: { type: 'draw_offered', slot: side } };
  }

  if (Number(simState.turn) !== side) {
    return { simState, event: { type: 'illegal_move', reason: 'out_of_turn', slot: side } };
  }

  const want = valid.sanitized;
  const matched = matchLegalMove(listLegalMoves(simState, side), want);
  if (!matched.ok) {
    return { simState, event: { type: 'illegal_move', reason: matched.error, slot: side } };
  }

  const next = applyLegalMove(clone(simState), side, matched.move);
  const event = {
    type: next.status === 'complete' ? 'match_ended' : 'moved',
    slot: side,
    from: matched.move.from,
    to: matched.move.to,
    path: matched.move.path,
    captures: matched.move.captures,
    promoted: Boolean(matched.move.promoted),
    turn: next.turn,
    winner: next.winner,
    result: next.result,
  };
  return { simState: next, event };
}

function playerInput(players, slot) {
  if (!players || typeof players !== 'object') return null;
  const entry = players[slot] ?? players[String(slot)];
  if (!entry) return null;
  return entry.input_state || entry.inputState || entry.controls || entry;
}

function isMoveInput(input) {
  return actionType(input) === 'move';
}

function isResignInput(input) {
  return actionType(input) === 'resign';
}

function isDrawInput(input) {
  return actionType(input) === 'draw';
}

function matchEndedOutcome(state, event) {
  if (state.status !== 'complete') return event;
  return {
    type: 'match_ended',
    winnerSlot: state.winner,
    result: state.result,
    reason: state.result,
  };
}

/**
 * Authoritative concurrent ordering: resignations, then draw offers
 * (slot order), then the side-to-move's move only. Out-of-turn moves
 * in the same tick are ignored so both observers keep one position.
 *
 * @param {object} simState
 * @param {object} [players]
 * @param {number} [_steps]
 */
export function stepCheckersSimulation(simState, players = {}, _steps = 1) {
  if (!simState || simState.status === 'complete') {
    return { simState, outcome: null };
  }

  let state = simState;
  let lastEvent = null;
  const slots = [...new Set([
    ...((state.activeSlots || [0, 1]).map(Number)),
    ...Object.keys(players).map(Number),
  ])].filter((n) => n === 0 || n === 1).sort((a, b) => a - b);

  const resigners = slots.filter((slot) => isResignInput(playerInput(players, slot)));
  if (resigners.length >= 2) {
    state = finishDraw(clone(state));
    return { simState: state, outcome: matchEndedOutcome(state, { type: 'match_ended', result: 'draw' }) };
  }
  if (resigners.length === 1) {
    const applied = applyCheckersInput(state, resigners[0], { type: 'resign' });
    return { simState: applied.simState, outcome: matchEndedOutcome(applied.simState, applied.event) };
  }

  for (const slot of slots) {
    if (!isDrawInput(playerInput(players, slot))) continue;
    const applied = applyCheckersInput(state, slot, { type: 'draw' });
    state = applied.simState;
    lastEvent = applied.event;
    if (state.status === 'complete') {
      return { simState: state, outcome: matchEndedOutcome(state, lastEvent) };
    }
  }

  const turn = Number(state.turn);
  const turnInput = playerInput(players, turn);
  if (isMoveInput(turnInput)) {
    const applied = applyCheckersInput(state, turn, turnInput);
    state = applied.simState;
    lastEvent = applied.event;
  }

  return { simState: state, outcome: matchEndedOutcome(state, lastEvent) };
}

export const initSimState = initCheckersSimState;
export const applyInput = applyCheckersInput;
export const stepSimulation = stepCheckersSimulation;
