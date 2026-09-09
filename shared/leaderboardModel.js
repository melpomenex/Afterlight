/**
 * Verified leaderboard model (task 3.10, design D8).
 *
 * Pure functions: normalization of server boards, local-best merging,
 * pagination math, rules-version separation and honest recording labels.
 * No DOM, network or storage access lives here.
 */

export const LEADERBOARD_PAGE_SIZE = 10;
export const MAX_LEADERBOARD_PAGE = 100;
/** Spec: rankings are paginated and capped at 100 entries per response. */
export const MAX_LEADERBOARD_PAGE_SIZE = 100;

export const RECORDING_LABELS = Object.freeze({
  verified: 'Verified',
  pending: 'Pending',
  unrecorded: 'Unrecorded',
  local: 'Local best',
});

export const ARCADE_GAMES = Object.freeze(['rain-runner', 'signal-lost', 'sporefall']);
export const MATCH_GAMES = Object.freeze(['pool', 'pong', 'billiards']);
export const PROFILE_GAMES = Object.freeze([...ARCADE_GAMES, ...MATCH_GAMES]);

export const IDENTITY_KIND = Object.freeze({
  signed: 'signed',
  guest: 'guest',
});

const GAME_TITLES = Object.freeze({
  'rain-runner': 'Rain Runner',
  'signal-lost': 'Signal Lost',
  sporefall: 'Sporefall',
  pool: 'Billiards',
  billiards: 'Billiards',
  pong: 'Pong',
});

const NON_PLAYED_MATCH_OUTCOMES = Object.freeze(['aborted', 'forfeit', 'walkover', 'cancelled']);

export function gameTitle(game) {
  return GAME_TITLES[game] || game;
}

export function clampPageSize(pageSize = LEADERBOARD_PAGE_SIZE) {
  if (!Number.isInteger(pageSize) || pageSize < 1) return LEADERBOARD_PAGE_SIZE;
  return Math.min(pageSize, MAX_LEADERBOARD_PAGE_SIZE);
}

export function pageCount(total, pageSize = LEADERBOARD_PAGE_SIZE) {
  if (!Number.isFinite(total) || total <= 0) return 0;
  const size = clampPageSize(pageSize);
  return Math.min(Math.ceil(total / size), MAX_LEADERBOARD_PAGE + 1);
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
  const pageSize = clampPageSize(
    Number.isInteger(board.pageSize) ? board.pageSize : LEADERBOARD_PAGE_SIZE,
  );
  const page = clampPage(Number.isInteger(board.page) ? board.page : 0, total, pageSize);
  const kind = MATCH_GAMES.includes(board.game) ? 'wins' : 'score';

  return {
    game: typeof board.game === 'string' ? board.game : null,
    kind,
    rulesVersion,
    page,
    pageSize,
    total,
    versions: Array.isArray(board.versions)
      ? board.versions.filter(v => Number.isInteger(v) && v >= 1).sort((a, b) => b - a)
      : [rulesVersion],
    entries: entries.slice(0, MAX_LEADERBOARD_PAGE_SIZE).map((e, i) =>
      normalizeEntry(e, i, page, pageSize),
    ),
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
    wins: Number.isInteger(e?.wins) ? e.wins : null,
    gamesPlayed: Number.isInteger(e?.gamesPlayed) ? e.gamesPlayed : null,
    streak: Number.isInteger(e?.streak) ? e.streak : null,
    outcome: typeof e?.outcome === 'string' ? e.outcome : null,
    endedAt,
  };
}

export function isPlayedMatchOutcome(outcome) {
  return typeof outcome === 'string' && !NON_PLAYED_MATCH_OUTCOMES.includes(outcome);
}

export function identityKindFromPlayerId(playerId) {
  if (typeof playerId !== 'string' || !playerId) return IDENTITY_KIND.guest;
  return playerId.startsWith('acct_') ? IDENTITY_KIND.signed : IDENTITY_KIND.guest;
}

export function continuityNote(kind) {
  if (kind === IDENTITY_KIND.signed) {
    return 'Verified records stay attached to your signed identity when you rename.';
  }
  return 'Guest records stay with this identity on this browser. They are not recovered on another device.';
}

export function identityLabel(kind) {
  return kind === IDENTITY_KIND.signed ? 'Signed identity' : 'Guest (this browser)';
}

/**
 * Profile payload: games / wins / streaks / bests keyed by signed identity,
 * never by display name. Unknown shapes normalize empty so the UI stays honest.
 */
export function normalizeProfile(payload) {
  const raw = payload?.profile || payload || {};
  const playerId = typeof raw.playerId === 'string' ? raw.playerId : null;
  const kind = raw.identity === IDENTITY_KIND.signed || raw.identity === IDENTITY_KIND.guest
    ? raw.identity
    : identityKindFromPlayerId(playerId);
  const games = Array.isArray(raw.games) ? raw.games : [];

  return {
    playerId,
    displayName: typeof raw.displayName === 'string' && raw.displayName ? raw.displayName : 'visitor',
    identity: kind,
    identityLabel: identityLabel(kind),
    continuityNote: typeof raw.continuityNote === 'string' && raw.continuityNote
      ? raw.continuityNote
      : continuityNote(kind),
    recording: ['verified', 'pending', 'unrecorded'].includes(raw.recording)
      ? raw.recording
      : 'verified',
    games: games
      .filter(g => g && typeof g.game === 'string')
      .map(g => ({
        game: g.game,
        title: gameTitle(g.game),
        rulesVersion: Number.isInteger(g.rulesVersion) ? g.rulesVersion : 1,
        gamesPlayed: Number.isInteger(g.gamesPlayed) ? g.gamesPlayed : 0,
        wins: Number.isInteger(g.wins) ? g.wins : 0,
        currentStreak: Number.isInteger(g.currentStreak) ? g.currentStreak : 0,
        bestStreak: Number.isInteger(g.bestStreak) ? g.bestStreak : 0,
        bestScore: Number.isFinite(g.bestScore) ? g.bestScore : null,
      })),
  };
}

/**
 * Rebuildable per-game stats from verified match rows. Walkovers, forfeits
 * and aborts never count as played games or wins.
 */
export function deriveMatchStats(rows, playerId) {
  const played = (Array.isArray(rows) ? rows : [])
    .filter(r => r && isPlayedMatchOutcome(r.outcome))
    .filter(r => participantIds(r).includes(playerId))
    .sort((a, b) => (a.endedAt || 0) - (b.endedAt || 0) || String(a.matchId || '').localeCompare(String(b.matchId || '')));

  let wins = 0;
  let currentStreak = 0;
  let bestStreak = 0;
  let streak = 0;
  for (const row of played) {
    const won = row.winnerId === playerId;
    if (won) {
      wins += 1;
      streak += 1;
      currentStreak = streak;
      if (streak > bestStreak) bestStreak = streak;
    } else {
      streak = 0;
      currentStreak = 0;
    }
  }

  return {
    gamesPlayed: played.length,
    wins,
    currentStreak,
    bestStreak,
  };
}

function participantIds(row) {
  const p = row?.participants;
  if (Array.isArray(p)) return p.filter(id => typeof id === 'string');
  if (p && typeof p === 'object') return Object.values(p).filter(id => typeof id === 'string');
  return [];
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
