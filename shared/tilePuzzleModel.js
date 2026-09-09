/**
 * Authoritative Paper Catacombs shared tile-arrangement puzzle.
 *
 * Part of the Place Activities Program (Phase 5, Task 8.4).
 *
 * Specifications:
 * - openspec/changes/add-place-activities-program/specs/signature-place-activities/spec.md
 *   (Requirement: Quiet board games and puzzles — Puzzle collaboration)
 * - design.md (D1, D5, D7)
 *
 * Guarantees:
 * - One 4x4 manuscript-tile board shared by up to four visitors.
 * - Concurrent slide/swap/reset inputs apply in a single (seq, slot) order.
 * - Progress and solved state are identical for every observer.
 * - Reset is allowed after solved (and during arrangement).
 * - No XP, currency, or economy writes.
 */

export const TILE_RULES_VERSION = 1;
export const TILE_GRID = 4;
export const TILE_CELL_COUNT = TILE_GRID * TILE_GRID;
export const EMPTY_TILE = 0;
export const TILE_ACTIVITY_POSITION = Object.freeze([5.2, 0, 1.0]);
export const TILE_MAX_PLAYERS = 4;

/** Home arrangement: tiles 1–15, empty well in the lower-right. */
export const TILE_SOLVED_BOARD = Object.freeze([
  1, 2, 3, 4,
  5, 6, 7, 8,
  9, 10, 11, 12,
  13, 14, 15, 0,
]);

/**
 * Shared opening scramble. Fixed so every client and the Elixir authority
 * start from the same manuscript — no PRNG portability risk.
 */
export const TILE_INITIAL_BOARD = Object.freeze([
  15, 14, 13, 12,
  11, 10, 9, 8,
  7, 6, 5, 4,
  3, 1, 2, 0,
]);

function cloneBoard(board) {
  return Array.isArray(board) ? board.map((n) => n) : [...TILE_INITIAL_BOARD];
}

function cloneState(simState) {
  return JSON.parse(JSON.stringify(simState));
}

function slotKey(slot) {
  return String(slot);
}

function asInt(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function asCell(value) {
  const i = asInt(value);
  if (i == null || i < 0 || i >= TILE_CELL_COUNT) return null;
  return i;
}

function asTileId(value) {
  const i = asInt(value);
  if (i == null || i < EMPTY_TILE || i >= TILE_CELL_COUNT) return null;
  return i;
}

function controlType(controls) {
  const raw = controls?.type ?? controls?.kind;
  return typeof raw === 'string' ? raw.toLowerCase() : '';
}

export function emptyIndex(board) {
  if (!Array.isArray(board)) return -1;
  return board.indexOf(EMPTY_TILE);
}

export function rowCol(index) {
  return {
    row: Math.floor(index / TILE_GRID),
    col: index % TILE_GRID,
  };
}

export function isAdjacent(a, b) {
  if (a == null || b == null) return false;
  const pa = rowCol(a);
  const pb = rowCol(b);
  return Math.abs(pa.row - pb.row) + Math.abs(pa.col - pb.col) === 1;
}

export function countCorrect(board, solved = TILE_SOLVED_BOARD) {
  if (!Array.isArray(board)) return 0;
  let n = 0;
  for (let i = 0; i < TILE_CELL_COUNT; i += 1) {
    if (board[i] === solved[i]) n += 1;
  }
  return n;
}

export function progressOf(board, solved = TILE_SOLVED_BOARD) {
  return countCorrect(board, solved) / TILE_CELL_COUNT;
}

export function isSolvedBoard(board, solved = TILE_SOLVED_BOARD) {
  if (!Array.isArray(board) || board.length !== TILE_CELL_COUNT) return false;
  for (let i = 0; i < TILE_CELL_COUNT; i += 1) {
    if (board[i] !== solved[i]) return false;
  }
  return true;
}

function progressFields(board) {
  const correctCount = countCorrect(board);
  const solved = correctCount === TILE_CELL_COUNT;
  return {
    correctCount,
    progress: correctCount / TILE_CELL_COUNT,
    solved,
    status: solved ? 'solved' : 'arranging',
    emptyIndex: emptyIndex(board),
  };
}

/**
 * Validate a player control payload.
 * Controls: type slide | swap | reset, plus tileId, from, to.
 *
 * @param {any} controls
 * @returns {{ valid: boolean, sanitized?: object, error?: string }}
 */
export function validateTileControls(controls) {
  if (!controls || typeof controls !== 'object' || Array.isArray(controls)) {
    return { valid: false, error: 'controls must be an object' };
  }

  const type = controlType(controls) || 'slide';
  if (type === 'neutral' || type === 'ready') {
    return { valid: true, sanitized: { type } };
  }
  if (type !== 'slide' && type !== 'swap' && type !== 'reset') {
    return { valid: false, error: 'unknown type' };
  }

  const seqRaw = asInt(controls.seq);
  const seq = seqRaw != null && seqRaw >= 0 ? seqRaw : null;

  if (type === 'reset') {
    return { valid: true, sanitized: { type: 'reset', tileId: null, from: null, to: null, seq } };
  }

  return {
    valid: true,
    sanitized: {
      type,
      tileId: asTileId(controls.tileId),
      from: asCell(controls.from),
      to: asCell(controls.to),
      seq,
    },
  };
}

function findTile(board, tileId) {
  return board.indexOf(tileId);
}

function resolveSlide(board, move) {
  const empty = emptyIndex(board);
  if (empty < 0) return { ok: false, error: 'missing empty' };

  let from = move.from;
  let to = move.to;

  if (from == null && move.tileId != null && move.tileId !== EMPTY_TILE) {
    from = findTile(board, move.tileId);
    if (from < 0) return { ok: false, error: 'unknown tile' };
  }

  if (to == null) to = empty;
  if (from == null) return { ok: false, error: 'slide requires tileId or from' };
  if (to !== empty) return { ok: false, error: 'slide target must be empty' };
  if (from === to) return { ok: false, error: 'tile already in well' };
  if (!isAdjacent(from, to)) return { ok: false, error: 'tile is not beside the well' };

  return {
    ok: true,
    from,
    to,
    tileId: board[from],
  };
}

function resolveSwap(board, move) {
  let from = move.from;
  let to = move.to;

  if (from == null && move.tileId != null) {
    from = findTile(board, move.tileId);
    if (from < 0) return { ok: false, error: 'unknown tile' };
  }

  if (from == null || to == null) return { ok: false, error: 'swap requires from and to' };
  if (from === to) return { ok: false, error: 'cannot swap a cell with itself' };

  return {
    ok: true,
    from,
    to,
    tileId: board[from],
  };
}

/**
 * Stable concurrent-move ordering: lower seq first, then lower slot.
 *
 * @param {Array<{ seq?: number, slot?: number }>} moves
 * @returns {typeof moves}
 */
export function orderConcurrentMoves(moves) {
  if (!Array.isArray(moves)) return [];
  return [...moves].sort((a, b) => {
    const seqA = asInt(a?.seq) ?? 0;
    const seqB = asInt(b?.seq) ?? 0;
    if (seqA !== seqB) return seqA - seqB;
    return (asInt(a?.slot) ?? 0) - (asInt(b?.slot) ?? 0);
  });
}

export function collectPendingMoves(players, appliedSeqBySlot = {}) {
  if (!players || typeof players !== 'object') return [];

  const moves = [];
  const entries = Array.isArray(players) ? players : Object.entries(players);

  const pushOne = (slot, entry, controls) => {
    if (!controls || typeof controls !== 'object' || Array.isArray(controls)) return;
    const type = controlType(controls);
    if (!type || type === 'neutral' || type === 'ready') return;

    const seq =
      asInt(controls.seq) ??
      asInt(entry?.last_seq) ??
      asInt(entry?.lastSeq) ??
      0;
    const applied = asInt(appliedSeqBySlot[slot] ?? appliedSeqBySlot[slotKey(slot)]) ?? -1;
    if (seq <= applied) return;

    moves.push({
      slot: asInt(slot) ?? 0,
      seq,
      controls,
    });
  };

  if (Array.isArray(players)) {
    for (const item of players) {
      pushOne(item?.slot, item, item?.controls || item?.input_state || item?.inputState || item);
    }
    return moves;
  }

  for (const [key, entry] of entries) {
    const slot = asInt(entry?.slot) ?? asInt(key) ?? 0;
    if (Array.isArray(entry?.pending)) {
      for (const pending of entry.pending) {
        pushOne(slot, { ...entry, last_seq: pending?.seq ?? entry?.last_seq }, pending);
      }
      continue;
    }
    const controls = entry?.input_state || entry?.inputState || entry?.controls || entry;
    pushOne(slot, entry, controls);
  }

  return moves;
}

/**
 * @param {object} [opts]
 * @param {number[]} [opts.activeSlots]
 * @param {number[]} [opts.board]
 * @returns {object}
 */
export function initTileSimState({
  activeSlots = [0, 1, 2, 3],
  board = TILE_INITIAL_BOARD,
} = {}) {
  const start = cloneBoard(board);
  const progress = progressFields(start);

  return {
    rulesVersion: TILE_RULES_VERSION,
    status: progress.status,
    board: start,
    initialBoard: cloneBoard(start),
    emptyIndex: progress.emptyIndex,
    correctCount: progress.correctCount,
    totalCells: TILE_CELL_COUNT,
    progress: progress.progress,
    solved: progress.solved,
    moveCount: 0,
    resetCount: 0,
    lastMove: null,
    appliedSeqBySlot: {},
    tickCount: 0,
    activeSlots: [...activeSlots],
    winner: null,
  };
}

function rememberSeq(state, slot, seq) {
  if (seq == null) return state;
  state.appliedSeqBySlot = {
    ...(state.appliedSeqBySlot || {}),
    [slotKey(slot)]: seq,
  };
  return state;
}

function applyProgress(state) {
  const fields = progressFields(state.board);
  state.emptyIndex = fields.emptyIndex;
  state.correctCount = fields.correctCount;
  state.progress = fields.progress;
  state.solved = fields.solved;
  state.status = fields.status;
  if (!fields.solved) state.winner = null;
  return fields.solved;
}

/**
 * Apply one committed input. Illegal moves are rejected without changing the
 * board, but their seq is consumed so they cannot retry every tick.
 *
 * @param {object} simState
 * @param {number} slot
 * @param {object} controls
 * @returns {{ simState: object, event: object|null }}
 */
export function applyTileInput(simState, slot, controls) {
  if (!simState) return { simState, event: null };

  const valid = validateTileControls(controls);
  if (!valid.valid) {
    return { simState, event: null };
  }

  const move = valid.sanitized;
  if (move.type === 'neutral' || move.type === 'ready') {
    return { simState, event: null };
  }

  const seq = move.seq;
  const applied = asInt(simState.appliedSeqBySlot?.[slot] ?? simState.appliedSeqBySlot?.[slotKey(slot)]) ?? -1;
  if (seq != null && seq <= applied) {
    return { simState, event: null };
  }

  const state = cloneState(simState);

  if (move.type === 'reset') {
    rememberSeq(state, slot, seq);
    state.board = cloneBoard(state.initialBoard);
    state.moveCount = 0;
    state.resetCount = (state.resetCount || 0) + 1;
    applyProgress(state);
    state.lastMove = {
      type: 'reset',
      slot,
      from: null,
      to: null,
      tileId: null,
    };
    return {
      simState: state,
      event: {
        type: 'puzzle_reset',
        slot,
        payload: {
          slot,
          board: cloneBoard(state.board),
          correctCount: state.correctCount,
          progress: state.progress,
          solved: state.solved,
          resetCount: state.resetCount,
        },
      },
    };
  }

  if (state.status === 'solved' || state.solved) {
    rememberSeq(state, slot, seq);
    return { simState: state, event: null };
  }

  const resolved = move.type === 'swap'
    ? resolveSwap(state.board, move)
    : resolveSlide(state.board, move);

  rememberSeq(state, slot, seq);

  if (!resolved.ok) {
    return { simState: state, event: null };
  }

  const { from, to, tileId } = resolved;
  const board = state.board;
  const tmp = board[from];
  board[from] = board[to];
  board[to] = tmp;

  state.moveCount = (state.moveCount || 0) + 1;
  const becameSolved = applyProgress(state);
  state.lastMove = {
    type: move.type,
    slot,
    from,
    to,
    tileId,
  };

  const eventType = becameSolved
    ? 'puzzle_solved'
    : (move.type === 'swap' ? 'tile_swapped' : 'tile_slid');

  return {
    simState: state,
    event: {
      type: eventType,
      slot,
      payload: {
        slot,
        type: move.type,
        from,
        to,
        tileId,
        board: cloneBoard(state.board),
        correctCount: state.correctCount,
        progress: state.progress,
        solved: state.solved,
        moveCount: state.moveCount,
      },
    },
  };
}

/**
 * Apply a batch of concurrent inputs with one authoritative (seq, slot) order.
 *
 * @param {object} simState
 * @param {Array<{ slot: number, seq?: number, controls?: object }>} moves
 * @returns {{ simState: object, event: object|null, events: object[] }}
 */
export function applyOrderedMoves(simState, moves) {
  const ordered = orderConcurrentMoves(moves);
  let state = simState;
  const events = [];

  for (const move of ordered) {
    const controls = move.controls
      ? { ...move.controls, seq: move.seq ?? move.controls.seq }
      : move;
    const applied = applyTileInput(state, move.slot, controls);
    state = applied.simState;
    if (applied.event) events.push(applied.event);
  }

  const solvedEvent = [...events].reverse().find((e) => e.type === 'puzzle_solved');
  return {
    simState: state,
    event: solvedEvent || events[events.length - 1] || null,
    events,
  };
}

function playerInput(players, slot) {
  if (!players) return null;
  const entry = players[slot] ?? players[String(slot)];
  if (!entry) return null;
  return entry.input_state || entry.inputState || entry.controls || entry;
}

/**
 * Advance the idle tick and apply any pending player inputs in (seq, slot) order.
 *
 * @param {object} simState
 * @param {object} [players]
 * @param {number} [steps=1]
 * @returns {{ simState: object, event: object|null }}
 */
export function stepTileSimulation(simState, players = {}, steps = 1) {
  if (!simState) return { simState, event: null };

  const state = cloneState(simState);
  const n = Math.max(0, Math.trunc(Number(steps) || 0));
  state.tickCount = (state.tickCount || 0) + n;

  const pending = collectPendingMoves(players, state.appliedSeqBySlot);
  if (pending.length === 0) {
    // Still consume a lone current input if collect missed struct shape.
    const slots = state.activeSlots?.length ? state.activeSlots : [0, 1, 2, 3];
    for (const slot of slots) {
      const input = playerInput(players, slot);
      if (!input || typeof input !== 'object') continue;
      pending.push({
        slot,
        seq: asInt(input.seq) ?? asInt(players[slot]?.last_seq) ?? asInt(players[slot]?.lastSeq) ?? 0,
        controls: input,
      });
    }
  }

  const unique = [];
  const seen = new Set();
  for (const move of pending) {
    const key = `${move.slot}:${move.seq}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(move);
  }

  return applyOrderedMoves(state, unique);
}
