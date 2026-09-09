/**
 * Afterlight house chess — rulesVersion 1
 *
 * A compact original JS rules engine with FIDE special moves (castling,
 * en passant, promotion to Q/R/B/N). This is house chess: not a claim of
 * tournament-federation compliance. Do not add an npm chess library; the
 * Elixir twin is Afterlight.Activities.Chess.
 *
 * House rules:
 * - Slot 0 is White, slot 1 is Black.
 * - Only legal moves are accepted. Out-of-turn play and moves that leave
 *   the mover's king in check are rejected; the position is unchanged.
 * - Checkmate and stalemate end the game automatically.
 * - Fifty-move (100 half-moves without a pawn move or capture) and
 *   threefold repetition draw automatically when they occur. A draw_offer
 *   also claims either condition if it is already available.
 * - Resignation awards the opponent. draw_offer + draw_accept is an
 *   agreed draw.
 * - Promotion defaults to queen when omitted; promo must be q/r/b/n.
 * - Threefold keys are board + side + castling + stored en-passant
 *   square (house simplification: EP is included whenever set).
 *
 * Spec: signature-place-activities (Quiet board games); design D1, D5, D7.
 */

export const CHESS_RULES_VERSION = 1;
export const CHESS_RULES_NAME = 'afterlight-house-chess';

export const START_BOARD =
  'RNBQKBNRPPPPPPPP................................pppppppprnbqkbnr';

const FILES = 'abcdefgh';
const KNIGHT_DELTAS = [
  [1, 2],
  [2, 1],
  [-1, 2],
  [-2, 1],
  [1, -2],
  [2, -1],
  [-1, -2],
  [-2, -1],
];
const KING_DELTAS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];
const BISHOP_DIRS = [
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];
const ROOK_DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];
const PROMO_TYPES = new Set(['q', 'r', 'b', 'n']);

export function fileOf(i) {
  return i & 7;
}

export function rankOf(i) {
  return i >> 3;
}

export function squareIndex(file, rank) {
  return rank * 8 + file;
}

export function inBoard(file, rank) {
  return file >= 0 && file < 8 && rank >= 0 && rank < 8;
}

export function algebraicToIndex(sq) {
  if (typeof sq === 'number' && sq >= 0 && sq < 64) return sq;
  if (typeof sq !== 'string' || sq.length < 2) return -1;
  const file = FILES.indexOf(sq[0].toLowerCase());
  const rank = Number(sq[1]) - 1;
  if (file < 0 || rank < 0 || rank > 7) return -1;
  return squareIndex(file, rank);
}

export function indexToAlgebraic(i) {
  if (i < 0 || i > 63) return null;
  return FILES[fileOf(i)] + String(rankOf(i) + 1);
}

export function pieceColor(p) {
  if (!p || p === '.') return null;
  return p === p.toUpperCase() ? 'w' : 'b';
}

export function pieceType(p) {
  return p ? p.toLowerCase() : '';
}

export function slotToColor(slot) {
  return Number(slot) === 1 ? 'b' : 'w';
}

export function colorToSlot(color) {
  return color === 'b' ? 1 : 0;
}

export function opponentColor(color) {
  return color === 'w' ? 'b' : 'w';
}

export function boardAt(board, i) {
  return board[i] || '.';
}

export function putSquare(board, i, piece) {
  return board.slice(0, i) + piece + board.slice(i + 1);
}

function cloneState(state) {
  return {
    ...state,
    positionCounts: { ...(state.positionCounts || {}) },
    lastMove: state.lastMove ? { ...state.lastMove } : null,
    environment: state.environment ? { ...state.environment } : null,
    activeSlots: Array.isArray(state.activeSlots) ? [...state.activeSlots] : [0, 1],
  };
}

function emptyCounts() {
  return {};
}

export function positionKey(state) {
  return `${state.board} ${state.turn} ${state.castling || '-'} ${state.epSquare || '-'}`;
}

function bumpRepetition(state) {
  const key = positionKey(state);
  const counts = { ...(state.positionCounts || {}) };
  counts[key] = (counts[key] || 0) + 1;
  state.positionCounts = counts;
  return counts[key];
}

function hasCastling(castling, flag) {
  return typeof castling === 'string' && castling.includes(flag);
}

function stripCastling(castling, flags) {
  let next = castling || '';
  for (const flag of flags) next = next.replace(flag, '');
  return next || '-';
}

export function findKing(board, color) {
  const needle = color === 'w' ? 'K' : 'k';
  const i = board.indexOf(needle);
  return i;
}

function pawnAttackDeltas(color) {
  return color === 'w'
    ? [
        [-1, 1],
        [1, 1],
      ]
    : [
        [-1, -1],
        [1, -1],
      ];
}

export function squareAttacked(board, square, byColor) {
  if (square < 0 || square > 63) return false;
  const tf = fileOf(square);
  const tr = rankOf(square);

  for (const [df, dr] of pawnAttackDeltas(byColor)) {
    const f = tf - df;
    const r = tr - dr;
    if (!inBoard(f, r)) continue;
    const p = boardAt(board, squareIndex(f, r));
    if (pieceColor(p) === byColor && pieceType(p) === 'p') return true;
  }

  for (const [df, dr] of KNIGHT_DELTAS) {
    const f = tf + df;
    const r = tr + dr;
    if (!inBoard(f, r)) continue;
    const p = boardAt(board, squareIndex(f, r));
    if (pieceColor(p) === byColor && pieceType(p) === 'n') return true;
  }

  for (const [df, dr] of KING_DELTAS) {
    const f = tf + df;
    const r = tr + dr;
    if (!inBoard(f, r)) continue;
    const p = boardAt(board, squareIndex(f, r));
    if (pieceColor(p) === byColor && pieceType(p) === 'k') return true;
  }

  const sliderHits = (dirs, types) => {
    for (const [df, dr] of dirs) {
      let f = tf + df;
      let r = tr + dr;
      while (inBoard(f, r)) {
        const p = boardAt(board, squareIndex(f, r));
        if (p !== '.') {
          if (pieceColor(p) === byColor && types.includes(pieceType(p))) return true;
          break;
        }
        f += df;
        r += dr;
      }
    }
    return false;
  };

  if (sliderHits(BISHOP_DIRS, ['b', 'q'])) return true;
  if (sliderHits(ROOK_DIRS, ['r', 'q'])) return true;
  return false;
}

export function isInCheck(board, color) {
  const king = findKing(board, color);
  if (king < 0) return false;
  return squareAttacked(board, king, opponentColor(color));
}

function pushMove(moves, from, to, extra = {}) {
  moves.push({ from, to, ...extra });
}

function generatePseudoLegal(state, color) {
  const board = state.board;
  const moves = [];
  const ep = state.epSquare ? algebraicToIndex(state.epSquare) : -1;
  const forward = color === 'w' ? 1 : -1;
  const startRank = color === 'w' ? 1 : 6;
  const promoRank = color === 'w' ? 7 : 0;

  for (let i = 0; i < 64; i++) {
    const p = boardAt(board, i);
    if (pieceColor(p) !== color) continue;
    const type = pieceType(p);
    const f = fileOf(i);
    const r = rankOf(i);

    if (type === 'p') {
      const nf = f;
      const nr = r + forward;
      if (inBoard(nf, nr) && boardAt(board, squareIndex(nf, nr)) === '.') {
        const to = squareIndex(nf, nr);
        if (nr === promoRank) {
          for (const promo of ['q', 'r', 'b', 'n']) pushMove(moves, i, to, { promo });
        } else {
          pushMove(moves, i, to);
        }
        const nr2 = r + forward * 2;
        if (r === startRank && inBoard(nf, nr2) && boardAt(board, squareIndex(nf, nr2)) === '.') {
          pushMove(moves, i, squareIndex(nf, nr2), { double: true });
        }
      }
      for (const df of [-1, 1]) {
        const cf = f + df;
        const cr = r + forward;
        if (!inBoard(cf, cr)) continue;
        const to = squareIndex(cf, cr);
        const target = boardAt(board, to);
        if (pieceColor(target) === opponentColor(color)) {
          if (cr === promoRank) {
            for (const promo of ['q', 'r', 'b', 'n']) pushMove(moves, i, to, { promo, capture: true });
          } else {
            pushMove(moves, i, to, { capture: true });
          }
        } else if (to === ep && target === '.') {
          pushMove(moves, i, to, { capture: true, enPassant: true });
        }
      }
      continue;
    }

    if (type === 'n') {
      for (const [df, dr] of KNIGHT_DELTAS) {
        const nf = f + df;
        const nr = r + dr;
        if (!inBoard(nf, nr)) continue;
        const to = squareIndex(nf, nr);
        const target = boardAt(board, to);
        if (pieceColor(target) === color) continue;
        pushMove(moves, i, to, { capture: target !== '.' });
      }
      continue;
    }

    if (type === 'k') {
      for (const [df, dr] of KING_DELTAS) {
        const nf = f + df;
        const nr = r + dr;
        if (!inBoard(nf, nr)) continue;
        const to = squareIndex(nf, nr);
        const target = boardAt(board, to);
        if (pieceColor(target) === color) continue;
        pushMove(moves, i, to, { capture: target !== '.' });
      }
      continue;
    }

    const dirs = type === 'b' ? BISHOP_DIRS : type === 'r' ? ROOK_DIRS : [...BISHOP_DIRS, ...ROOK_DIRS];
    for (const [df, dr] of dirs) {
      let nf = f + df;
      let nr = r + dr;
      while (inBoard(nf, nr)) {
        const to = squareIndex(nf, nr);
        const target = boardAt(board, to);
        if (target === '.') {
          pushMove(moves, i, to);
        } else {
          if (pieceColor(target) !== color) pushMove(moves, i, to, { capture: true });
          break;
        }
        nf += df;
        nr += dr;
      }
    }
  }

  addCastling(state, color, moves);
  return moves;
}

function addCastling(state, color, moves) {
  const board = state.board;
  const rights = state.castling || '';
  const kingFrom = color === 'w' ? 4 : 60;
  if (boardAt(board, kingFrom) !== (color === 'w' ? 'K' : 'k')) return;
  if (isInCheck(board, color)) return;
  const enemy = opponentColor(color);

  const trySide = (flag, kingTo, rookFrom, empties, path) => {
    if (!hasCastling(rights, flag)) return;
    if (boardAt(board, rookFrom) !== (color === 'w' ? 'R' : 'r')) return;
    for (const sq of empties) {
      if (boardAt(board, sq) !== '.') return;
    }
    for (const sq of path) {
      if (squareAttacked(board, sq, enemy)) return;
    }
    pushMove(moves, kingFrom, kingTo, { castle: flag === 'K' || flag === 'k' ? 'kingside' : 'queenside' });
  };

  if (color === 'w') {
    trySide('K', 6, 7, [5, 6], [4, 5, 6]);
    trySide('Q', 2, 0, [1, 2, 3], [4, 3, 2]);
  } else {
    trySide('k', 62, 63, [61, 62], [60, 61, 62]);
    trySide('q', 58, 56, [57, 58, 59], [60, 59, 58]);
  }
}

function applyRawMove(state, move) {
  const next = cloneState(state);
  let board = next.board;
  const from = move.from;
  const to = move.to;
  const mover = boardAt(board, from);
  const color = pieceColor(mover);
  const type = pieceType(mover);
  let captured = boardAt(board, to);
  if (captured === '.') captured = null;

  if (move.enPassant) {
    const capIdx = color === 'w' ? to - 8 : to + 8;
    captured = boardAt(board, capIdx);
    board = putSquare(board, capIdx, '.');
  }

  board = putSquare(board, from, '.');
  let placed = mover;
  if (type === 'p' && (rankOf(to) === 7 || rankOf(to) === 0)) {
    const promo = (move.promo || 'q').toLowerCase();
    placed = color === 'w' ? promo.toUpperCase() : promo;
  }
  board = putSquare(board, to, placed);

  if (move.castle === 'kingside') {
    const rookFrom = color === 'w' ? 7 : 63;
    const rookTo = color === 'w' ? 5 : 61;
    const rook = boardAt(board, rookFrom);
    board = putSquare(board, rookFrom, '.');
    board = putSquare(board, rookTo, rook);
  } else if (move.castle === 'queenside') {
    const rookFrom = color === 'w' ? 0 : 56;
    const rookTo = color === 'w' ? 3 : 59;
    const rook = boardAt(board, rookFrom);
    board = putSquare(board, rookFrom, '.');
    board = putSquare(board, rookTo, rook);
  }

  let castling = next.castling || '-';
  if (type === 'k') {
    castling = stripCastling(castling, color === 'w' ? ['K', 'Q'] : ['k', 'q']);
  }
  if (from === 0 || to === 0) castling = stripCastling(castling, ['Q']);
  if (from === 7 || to === 7) castling = stripCastling(castling, ['K']);
  if (from === 56 || to === 56) castling = stripCastling(castling, ['q']);
  if (from === 63 || to === 63) castling = stripCastling(castling, ['k']);

  let epSquare = null;
  if (move.double) {
    const mid = color === 'w' ? from + 8 : from - 8;
    epSquare = indexToAlgebraic(mid);
  }

  const pawnOrCapture = type === 'p' || !!captured || !!move.enPassant;
  next.board = board;
  next.castling = castling;
  next.epSquare = epSquare;
  next.halfmove = pawnOrCapture ? 0 : (next.halfmove || 0) + 1;
  if (color === 'b') next.fullmove = (next.fullmove || 1) + 1;
  next.turn = opponentColor(color);
  next.lastMove = {
    from: indexToAlgebraic(from),
    to: indexToAlgebraic(to),
    promo: move.promo || null,
    captured: captured || null,
    castle: move.castle || null,
    enPassant: !!move.enPassant,
  };
  next.drawOffer = null;
  return next;
}

export function legalMoves(state, fromSq = null) {
  if (!state || state.status !== 'playing') return [];
  const color = state.turn;
  const fromFilter = fromSq == null ? -1 : algebraicToIndex(fromSq);
  const generated = generatePseudoLegal(state, color);
  const legal = [];
  for (const move of generated) {
    if (fromFilter >= 0 && move.from !== fromFilter) continue;
    const next = applyRawMove(state, move);
    if (isInCheck(next.board, color)) continue;
    legal.push({
      from: indexToAlgebraic(move.from),
      to: indexToAlgebraic(move.to),
      promo: move.promo || null,
      castle: move.castle || null,
      enPassant: !!move.enPassant,
    });
  }
  return legal;
}

function concludeIfNeeded(state) {
  const color = state.turn;
  const moves = legalMoves(state);
  const checked = isInCheck(state.board, color);
  state.inCheck = checked;
  if (moves.length === 0) {
    state.status = 'complete';
    if (checked) {
      state.reason = 'checkmate';
      state.winner = colorToSlot(opponentColor(color));
    } else {
      state.reason = 'stalemate';
      state.winner = null;
    }
    return;
  }
  if ((state.halfmove || 0) >= 100) {
    state.status = 'complete';
    state.reason = 'fifty_move';
    state.winner = null;
    return;
  }
  const reps = state.positionCounts?.[positionKey(state)] || 0;
  if (reps >= 3) {
    state.status = 'complete';
    state.reason = 'threefold';
    state.winner = null;
  }
}

function claimableDraw(state) {
  if (!state || state.status !== 'playing') return null;
  if ((state.halfmove || 0) >= 100) return 'fifty_move';
  if ((state.positionCounts?.[positionKey(state)] || 0) >= 3) return 'threefold';
  return null;
}

function normalizePromo(value) {
  if (value == null || value === '') return null;
  if (typeof value !== 'string') return null;
  const promo = value.toLowerCase();
  return PROMO_TYPES.has(promo) ? promo : null;
}

function parseControls(controls) {
  if (!controls || typeof controls !== 'object' || Array.isArray(controls)) {
    return { error: 'invalid_controls' };
  }
  const type = String(controls.type || controls.action || '').toLowerCase();
  if (!['move', 'resign', 'draw_offer', 'draw_accept'].includes(type)) {
    return { error: 'invalid_controls' };
  }
  if (type !== 'move') return { type };
  const from = algebraicToIndex(controls.from);
  const to = algebraicToIndex(controls.to);
  if (from < 0 || to < 0) return { error: 'invalid_controls' };
  let promo = null;
  if (controls.promo != null && controls.promo !== '') {
    promo = normalizePromo(controls.promo);
    if (!promo) return { error: 'invalid_controls' };
  }
  return { type, from, to, promo };
}

export function samePosition(a, b) {
  if (!a || !b) return false;
  return (
    a.board === b.board &&
    a.turn === b.turn &&
    (a.castling || '-') === (b.castling || '-') &&
    (a.epSquare || null) === (b.epSquare || null) &&
    (a.status || 'playing') === (b.status || 'playing') &&
    (a.reason || null) === (b.reason || null) &&
    (a.winner ?? null) === (b.winner ?? null)
  );
}

export function toFen(state) {
  const ranks = [];
  for (let r = 7; r >= 0; r--) {
    let row = '';
    let empty = 0;
    for (let f = 0; f < 8; f++) {
      const p = boardAt(state.board, squareIndex(f, r));
      if (p === '.') {
        empty += 1;
      } else {
        if (empty) {
          row += String(empty);
          empty = 0;
        }
        row += p;
      }
    }
    if (empty) row += String(empty);
    ranks.push(row);
  }
  const ep = state.epSquare || '-';
  const castle = state.castling && state.castling !== '-' ? state.castling : '-';
  return `${ranks.join('/')} ${state.turn} ${castle} ${ep} ${state.halfmove || 0} ${state.fullmove || 1}`;
}

export function fromFen(fen, extra = {}) {
  if (typeof fen !== 'string') throw new Error('fen must be a string');
  const parts = fen.trim().split(/\s+/);
  const rows = parts[0].split('/');
  if (rows.length !== 8) throw new Error('invalid fen board');
  let board = '';
  for (let r = 0; r < 8; r++) {
    const row = rows[7 - r];
    for (const ch of row) {
      if (ch >= '1' && ch <= '8') {
        board += '.'.repeat(Number(ch));
      } else {
        board += ch;
      }
    }
  }
  if (board.length !== 64) throw new Error('invalid fen length');
  const turn = parts[1] === 'b' ? 'b' : 'w';
  const castling = parts[2] && parts[2] !== '-' ? parts[2] : '-';
  const epSquare = parts[3] && parts[3] !== '-' ? parts[3] : null;
  const halfmove = Number(parts[4] || 0);
  const fullmove = Number(parts[5] || 1);
  const state = initChessSimState({
    ...extra,
    board,
    turn,
    castling,
    epSquare,
    halfmove,
    fullmove,
  });
  return state;
}

export function initChessSimState({
  activeSlots = [0, 1],
  slots = null,
  environment = null,
  board = START_BOARD,
  turn = 'w',
  castling = 'KQkq',
  epSquare = null,
  halfmove = 0,
  fullmove = 1,
} = {}) {
  const resolvedSlots = Array.isArray(slots) ? slots : activeSlots;
  const state = {
    rulesVersion: CHESS_RULES_VERSION,
    rulesName: CHESS_RULES_NAME,
    status: 'playing',
    turn,
    board,
    castling: castling || '-',
    epSquare: epSquare || null,
    halfmove: Number.isFinite(halfmove) ? halfmove : 0,
    fullmove: Number.isFinite(fullmove) ? fullmove : 1,
    drawOffer: null,
    winner: null,
    reason: null,
    inCheck: false,
    lastMove: null,
    positionCounts: emptyCounts(),
    activeSlots: [...resolvedSlots],
    environment: environment ? { ...environment } : null,
  };
  state.inCheck = isInCheck(state.board, state.turn);
  bumpRepetition(state);
  concludeIfNeeded(state);
  return state;
}

function gameOverEvent(state) {
  return {
    type: 'game_over',
    reason: state.reason,
    winner: state.winner,
  };
}

export function applyChessInput(simState, slot, controls) {
  if (!simState || typeof simState !== 'object') {
    return { ok: false, error: 'invalid_controls', state: simState };
  }
  if (simState.status && simState.status !== 'playing') {
    return { ok: false, error: 'game_over', state: simState };
  }

  const parsed = parseControls(controls);
  if (parsed.error) return { ok: false, error: parsed.error, state: simState };

  const playerSlot = Number(slot);
  if (playerSlot !== 0 && playerSlot !== 1) {
    return { ok: false, error: 'invalid_controls', state: simState };
  }

  if (parsed.type === 'resign') {
    const next = cloneState(simState);
    next.status = 'complete';
    next.reason = 'resignation';
    next.winner = playerSlot === 0 ? 1 : 0;
    next.drawOffer = null;
    return {
      ok: true,
      state: next,
      events: [
        { type: 'resigned', slot: playerSlot, winner: next.winner },
        gameOverEvent(next),
      ],
    };
  }

  if (parsed.type === 'draw_offer') {
    const claim = claimableDraw(simState);
    if (claim) {
      const next = cloneState(simState);
      next.status = 'complete';
      next.reason = claim;
      next.winner = null;
      next.drawOffer = null;
      return { ok: true, state: next, events: [gameOverEvent(next)] };
    }
    if (slotToColor(playerSlot) !== simState.turn) {
      return { ok: false, error: 'out_of_turn', state: simState };
    }
    const next = cloneState(simState);
    next.drawOffer = playerSlot;
    return { ok: true, state: next, events: [{ type: 'draw_offered', slot: playerSlot }] };
  }

  if (parsed.type === 'draw_accept') {
    if (simState.drawOffer == null) {
      return { ok: false, error: 'no_pending_draw', state: simState };
    }
    if (Number(simState.drawOffer) === playerSlot) {
      return { ok: false, error: 'invalid_controls', state: simState };
    }
    const next = cloneState(simState);
    next.status = 'complete';
    next.reason = 'agreement';
    next.winner = null;
    next.drawOffer = null;
    return {
      ok: true,
      state: next,
      events: [{ type: 'draw_agreed' }, gameOverEvent(next)],
    };
  }

  if (slotToColor(playerSlot) !== simState.turn) {
    return { ok: false, error: 'out_of_turn', state: simState };
  }

  const legal = legalMoves(simState, indexToAlgebraic(parsed.from));
  const match = legal.find((m) => {
    if (algebraicToIndex(m.to) !== parsed.to) return false;
    if (m.promo) return (parsed.promo || 'q') === m.promo;
    return parsed.promo == null;
  });
  if (!match) {
    const wouldMove = generatePseudoLegal(simState, simState.turn).some(
      (m) => m.from === parsed.from && m.to === parsed.to,
    );
    return {
      ok: false,
      error: wouldMove ? 'king_in_check' : 'illegal_move',
      state: simState,
    };
  }

  const raw = {
    from: parsed.from,
    to: parsed.to,
    promo: match.promo,
    castle: match.castle,
    enPassant: match.enPassant,
    double: pieceType(boardAt(simState.board, parsed.from)) === 'p' && Math.abs(rankOf(parsed.to) - rankOf(parsed.from)) === 2,
  };
  const next = applyRawMove(simState, raw);
  bumpRepetition(next);
  concludeIfNeeded(next);
  const events = [
    {
      type: 'moved',
      slot: playerSlot,
      from: next.lastMove.from,
      to: next.lastMove.to,
      promo: next.lastMove.promo,
      captured: next.lastMove.captured,
      check: next.inCheck,
      status: next.status,
      reason: next.reason,
    },
  ];
  if (next.status === 'complete') events.push(gameOverEvent(next));
  return { ok: true, state: next, events };
}

export function applyChessMoves(simState, moves) {
  let state = simState;
  for (const move of moves) {
    const slot = colorToSlot(state.turn);
    const result = applyChessInput(state, slot, { type: 'move', ...move });
    if (!result.ok) return result;
    state = result.state;
  }
  return { ok: true, state, events: [] };
}

export function stepChessSimulation(simState, _players = [], _steps = 1) {
  if (simState?.status === 'complete') {
    return {
      state: simState,
      matchEnded: {
        winner: simState.winner ?? null,
        reason: simState.reason || 'complete',
      },
    };
  }
  return { state: simState, matchEnded: null };
}
