/**
 * Verified leaderboard model (task 3.10, design D8).
 *
 * Pure functions: normalization of server boards, local-best merging,
 * pagination math, rules-version separation and honest recording labels.
 * No DOM, network or storage access lives here.
 */

export const LEADERBOARD_PAGE_SIZE = 10;
export const MAX_LEADERBOARD_PAGE = 100;

export const RECORDING_LABELS = Object.freeze({
  verified: 'Verified',
  pending: 'Pending',
  unrecorded: 'Unrecorded',
  local: 'Local best',
});

export const ARCADE_GAMES = Object.freeze(['rain-runner', 'signal-lost', 'sporefall']);

const GAME_TITLES = Object.freeze({
  'rain-runner': 'Rain Runner',
  'signal-lost': 'Signal Lost',
  sporefall: 'Sporefall',
});

export function gameTitle(game) {
  return GAME_TITLES[game] || game;
}

export function pageCount(total, pageSize = LEADERBOARD_PAGE_SIZE) {
  if (!Number.isFinite(total) || total <= 0) return 0;
  return Math.min(Math.ceil(total / pageSize), MAX_LEADERBOARD_PAGE + 1);
}

export function clampPage(page, total, pageSize = LEADERBOARD_PAGE_SIZE) {
  const p = Number.isInteger(page) && page >= 0 ? page : 0;
  const max = Math.max(pageCount(total, pageSize) - 1, 0);
  return Math.min(p, max);
}

/**
 * Normalize a server board payload. Unknown/malformed shapes normalize to an
 * empty board so the UI degrades honestly instead of lying.
 */
export function normalizeVerifiedBoard(payload) {
  const board = payload?.board || payload || {};
  const entries = Array.isArray(board.entries) ? board.entries : [];
  const total = Number.isInteger(board.total) ? board.total : entries.length;
  const rulesVersion = Number.isInteger(board.rulesVersion) ? board.rulesVersion : 1;
  const page = clampPage(Number.isInteger(board.page) ? board.page : 0, total);

  return {
    game: typeof board.game === 'string' ? board.game : null,
    rulesVersion,
    page,
    pageSize: Number.isInteger(board.pageSize) ? board.pageSize : LEADERBOARD_PAGE_SIZE,
    total,
    versions: Array.isArray(board.versions)
      ? board.versions.filter(v => Number.isInteger(v) && v >= 1).sort((a, b) => b - a)
      : [rulesVersion],
    entries: entries.map((e, i) => normalizeEntry(e, i, page, board.pageSize || LEADERBOARD_PAGE_SIZE)),
  };
}

function normalizeEntry(e, i, page, pageSize) {
  const score = Number.isFinite(e?.score) ? e.score : Number(e?.score) || 0;
  const endedAt = Number.isFinite(e?.endedAt) ? e.endedAt : 0;
  const rank = Number.isInteger(e?.rank)
    ? e.rank
    : page * pageSize + i + 1;
  return {
    rank,
    playerId: typeof e?.playerId === 'string' ? e.playerId : null,
    displayName: typeof e?.displayName === 'string' && e.displayName ? e.displayName : 'visitor',
    score,
    outcome: typeof e?.outcome === 'string' ? e.outcome : null,
    endedAt,
  };
}

/**
 * Local best record for one game/version, as stored by the client.
 * Recording states:
 *   - 'pending':    run ended; waiting for the server's verified record
 *   - 'verified':   the server confirmed the record (or it appears on the board)
 *   - 'unrecorded': the server reported the result could not be recorded
 * A crash before persistence can leave a result unrecorded; the label must
 * say so rather than claim a lossless write.
 */
export function normalizeLocalBest(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const score = Number.isFinite(raw.score) ? raw.score : Number(raw.score) || 0;
  const at = Number.isFinite(raw.at) ? raw.at : 0;
  const state = ['pending', 'verified', 'unrecorded'].includes(raw.state) ? raw.state : 'pending';
  return { score, at, state, rulesVersion: Number.isInteger(raw.rulesVersion) ? raw.rulesVersion : 1 };
}

/**
 * Recording-status events (broadcast by the session's completion path)
 * map onto local-best states. Returns null when the status is not terminal
 * enough to relabel a local best.
 */
export function recordingStatusToLocalState(status) {
  switch (status) {
    case 'recorded':
    case 'duplicate':
      return 'verified';
    case 'retrying':
      return 'pending';
    case 'recording_backlog_full':
    case 'recording_failed':
      return 'unrecorded';
    default:
      return null;
  }
}

/**
 * Merge local best into a verified board view: keep the ranked entries and
 * append a clearly labeled local row when the local best would not appear
 * on this page (or is pending/unrecorded).
 */
export function mergeLocalAndVerified(localBest, verified, { playerId = null } = {}) {
  const rows = verified.entries.map(e => ({
    kind: 'verified',
    label: RECORDING_LABELS.verified,
    rank: e.rank,
    displayName: e.displayName,
    score: e.score,
    endedAt: e.endedAt,
    isLocal: playerId != null && e.playerId === playerId,
  }));

  if (!localBest) return rows;

  const appearsOnBoard =
    (playerId != null && verified.entries.some(e => e.playerId === playerId)) ||
    rows.some(r => r.score >= localBest.score);

  if (appearsOnBoard) {
    return rows.map(r =>
      r.isLocal || (!playerId && r.score === localBest.score)
        ? { ...r, isLocal: true, label: `${RECORDING_LABELS.verified}` }
        : r,
    );
  }

  // The local best is better than (or absent from) the verified board: show
  // it without a fabricated rank.
  return [
    ...rows,
    {
      kind: 'local',
      label: localBest.state === 'pending' ? RECORDING_LABELS.pending : RECORDING_LABELS[localBest.state] || RECORDING_LABELS.local,
      rank: null,
      displayName: 'You',
      score: localBest.score,
      endedAt: localBest.at,
      isLocal: true,
    },
  ];
}
