/**
 * Room-local pool tournament reducer (tasks 10.6–10.7, design D8).
 *
 * Pure functions only: 4/8-player single-elim brackets, check-in, 60s
 * no-shows, labeled walkovers, match assignment and idempotent advancement.
 * No DOM, network, XP or currency.
 *
 * Tournament v1 is pool-only and lives in one room. Server restart cancels
 * unfinished brackets; completed (played) matches stay on the snapshot so
 * the board can still show verified results.
 */

export const TOURNAMENT_GAME = 'pool';
export const TOURNAMENT_SIZES = Object.freeze([4, 8]);
export const CHECK_IN_MS = 60_000;
export const DEFAULT_ACTIVITY_ID = 'orpheum-pool';

export const TOURNAMENT_STATUS = Object.freeze({
  IDLE: 'idle',
  ENROLLING: 'enrolling',
  CHECK_IN: 'check_in',
  IN_PROGRESS: 'in_progress',
  COMPLETE: 'complete',
  CANCELLED: 'cancelled',
});

export const MATCH_STATUS = Object.freeze({
  PENDING: 'pending',
  CHECK_IN: 'check_in',
  ASSIGNED: 'assigned',
  COMPLETE: 'complete',
  CANCELLED: 'cancelled',
});

export const MATCH_OUTCOME = Object.freeze({
  PLAYED: 'played',
  WALKOVER: 'walkover',
  CANCELLED: 'cancelled',
});

export const TOURNAMENT_ERRORS = Object.freeze({
  INVALID: 'invalid_request',
  FULL: 'tournament_full',
  ALREADY_ENROLLED: 'already_enrolled',
  NOT_ENROLLED: 'not_enrolled',
  NOT_OPEN: 'tournament_not_open',
  CASUAL_SLOT: 'casual_tournament_conflict',
  SIZE: 'invalid_size',
  UNKNOWN_MATCH: 'unknown_match',
});

const PLAYED_OUTCOMES = new Set([
  'completed',
  'played',
  'eight_ball',
  'early_eight',
  'wrong_pocket_eight',
  'scratch_on_eight',
  'resignation',
  'score',
]);

export function isPlayedMatchOutcome(outcome) {
  return typeof outcome === 'string' && PLAYED_OUTCOMES.has(outcome);
}

export function createIdle(roomId = null) {
  return freezeState({
    id: null,
    roomId,
    game: TOURNAMENT_GAME,
    rulesVersion: 1,
    size: null,
    status: TOURNAMENT_STATUS.IDLE,
    cancelReason: null,
    players: [],
    matches: [],
    activeMatchId: null,
    checkInDeadline: null,
    activityId: DEFAULT_ACTIVITY_ID,
    championId: null,
    revision: 0,
  });
}

/**
 * Apply one action. `ctx.casualPlayerIds` lists identities occupying a
 * casual pool play slot in this room — they cannot also take a tournament
 * slot, and the reverse is enforced by the caller on activity_join.
 */
export function apply(state, action, now = 0, ctx = {}) {
  if (!state || typeof state !== 'object') {
    return fail(createIdle(), TOURNAMENT_ERRORS.INVALID);
  }
  if (!action || typeof action !== 'object') {
    return fail(state, TOURNAMENT_ERRORS.INVALID);
  }

  switch (action.type) {
    case 'enroll':
      return enroll(state, action, now, ctx);
    case 'withdraw':
      return withdraw(state, action, now);
    case 'check_in':
      return checkIn(state, action, now);
    case 'tick':
      return tick(state, now);
    case 'verified_result':
      return verifiedResult(state, action, now);
    case 'server_restart':
      return serverRestart(state, now);
    case 'cancel':
      return cancel(state, action.reason || 'cancelled', now);
    default:
      return fail(state, TOURNAMENT_ERRORS.INVALID);
  }
}

export function occupiesTournamentSlot(state, playerId) {
  if (!state || !playerId) return false;
  if (
    state.status === TOURNAMENT_STATUS.IDLE ||
    state.status === TOURNAMENT_STATUS.COMPLETE ||
    state.status === TOURNAMENT_STATUS.CANCELLED
  ) {
    return false;
  }
  return state.players.some(p => p.playerId === playerId && p.status !== 'withdrawn');
}

export function assignedActivityFor(state, playerId) {
  if (!occupiesTournamentSlot(state, playerId)) return null;
  const match = state.matches.find(m => m.id === state.activeMatchId);
  if (!match || match.status !== MATCH_STATUS.ASSIGNED) return null;
  if (match.playerA === playerId || match.playerB === playerId) return state.activityId;
  return null;
}

export function publicSnapshot(state) {
  const s = state || createIdle();
  return {
    id: s.id,
    roomId: s.roomId,
    game: s.game,
    rulesVersion: s.rulesVersion,
    size: s.size,
    status: s.status,
    cancelReason: s.cancelReason,
    players: s.players.map(p => ({ ...p })),
    matches: s.matches.map(({ _advanced, ...m }) => m),
    activeMatchId: s.activeMatchId,
    checkInDeadline: s.checkInDeadline,
    activityId: s.activityId,
    championId: s.championId,
    revision: s.revision,
  };
}

export function roundCount(size) {
  if (size === 4) return 2;
  if (size === 8) return 3;
  return 0;
}

export function matchesInRound(size, round) {
  const total = roundCount(size);
  if (round < 0 || round >= total) return 0;
  return size / 2 ** (round + 1);
}

export function walkoverLabel(match) {
  if (!match || match.outcome !== MATCH_OUTCOME.WALKOVER) return null;
  const winner = match.winnerId;
  const other = match.playerA === winner ? match.playerB : match.playerA;
  return `Walkover — ${winner || 'player'} advances; ${other || 'opponent'} did not check in. Not a played match.`;
}

export function roundTitle(size, round) {
  const last = roundCount(size) - 1;
  if (round === last) return 'Final';
  if (round === last - 1) return size === 8 ? 'Semifinals' : 'Semifinals';
  return 'Quarterfinals';
}

export function matchCaption(match, names = {}) {
  if (!match) return '';
  const a = names[match.playerA] || match.playerA || 'TBD';
  const b = names[match.playerB] || match.playerB || 'TBD';
  if (match.outcome === MATCH_OUTCOME.WALKOVER) {
    return `${a} vs ${b} — walkover (not a played match)`;
  }
  if (match.outcome === MATCH_OUTCOME.CANCELLED) {
    return `${a} vs ${b} — pairing cancelled`;
  }
  if (match.outcome === MATCH_OUTCOME.PLAYED && match.winnerId) {
    const w = names[match.winnerId] || match.winnerId;
    return `${a} vs ${b} — ${w} wins`;
  }
  if (match.status === MATCH_STATUS.CHECK_IN) return `${a} vs ${b} — check in`;
  if (match.status === MATCH_STATUS.ASSIGNED) return `${a} vs ${b} — at the table`;
  return `${a} vs ${b}`;
}

export function statusCaption(state) {
  switch (state?.status) {
    case TOURNAMENT_STATUS.IDLE:
      return 'No pool tournament is open. Enroll four or eight players to start a bracket.';
    case TOURNAMENT_STATUS.ENROLLING:
      return `Enrolling ${state.players.length}/${state.size}. The bracket opens when the field is full.`;
    case TOURNAMENT_STATUS.CHECK_IN:
      return 'Check in for your match. Missing the 60-second deadline is a labeled walkover, not a played win.';
    case TOURNAMENT_STATUS.IN_PROGRESS:
      return 'A tournament match is on the billiards table.';
    case TOURNAMENT_STATUS.COMPLETE: {
      const name = state.players.find(p => p.playerId === state.championId)?.displayName || state.championId;
      return `${name || 'A player'} won the bracket.`;
    }
    case TOURNAMENT_STATUS.CANCELLED:
      if (state.cancelReason === 'server_restart') {
        return 'The unfinished tournament was cancelled when the room restarted. Completed matches still stand.';
      }
      return 'This tournament was cancelled. Completed matches still stand.';
    default:
      return '';
  }
}

function enroll(state, action, now, ctx) {
  const playerId = cleanId(action.playerId);
  if (!playerId) return fail(state, TOURNAMENT_ERRORS.INVALID);

  if (occupiesTournamentSlot(state, playerId)) {
    return fail(state, TOURNAMENT_ERRORS.ALREADY_ENROLLED);
  }

  const casual = Array.isArray(ctx.casualPlayerIds) ? ctx.casualPlayerIds : [];
  if (casual.includes(playerId)) {
    return fail(state, TOURNAMENT_ERRORS.CASUAL_SLOT);
  }

  if (state.status === TOURNAMENT_STATUS.IDLE) {
    const size = Number(action.size);
    if (!TOURNAMENT_SIZES.includes(size)) return fail(state, TOURNAMENT_ERRORS.SIZE);
    const next = mutate(state, {
      id: typeof action.tournamentId === 'string' ? action.tournamentId : `t_${now}_${playerId}`,
      size,
      status: TOURNAMENT_STATUS.ENROLLING,
      cancelReason: null,
      championId: null,
      players: [makePlayer(playerId, action.displayName, now)],
      matches: [],
      activeMatchId: null,
      checkInDeadline: null,
    });
    return ok(next);
  }

  if (state.status !== TOURNAMENT_STATUS.ENROLLING) {
    return fail(state, TOURNAMENT_ERRORS.NOT_OPEN);
  }

  if (state.players.length >= state.size) return fail(state, TOURNAMENT_ERRORS.FULL);

  const next = mutate(state, {
    players: [...state.players, makePlayer(playerId, action.displayName, now)],
  });
  if (next.players.length === next.size) {
    return ok(openBracket(next, now));
  }
  return ok(next);
}

function withdraw(state, action, now) {
  const playerId = cleanId(action.playerId);
  if (!playerId) return fail(state, TOURNAMENT_ERRORS.INVALID);
  const idx = state.players.findIndex(p => p.playerId === playerId);
  if (idx < 0) return fail(state, TOURNAMENT_ERRORS.NOT_ENROLLED);

  if (state.status === TOURNAMENT_STATUS.ENROLLING) {
    const players = state.players.filter(p => p.playerId !== playerId);
    if (players.length === 0) return ok(bump(createIdle(state.roomId), state.revision + 1));
    return ok(mutate(state, { players }));
  }

  if (
    state.status !== TOURNAMENT_STATUS.CHECK_IN &&
    state.status !== TOURNAMENT_STATUS.IN_PROGRESS
  ) {
    return fail(state, TOURNAMENT_ERRORS.NOT_OPEN);
  }

  const players = state.players.map(p =>
    p.playerId === playerId ? { ...p, status: 'withdrawn', checkedIn: false } : p,
  );
  let next = mutate(state, { players });
  const active = next.matches.find(m => m.id === next.activeMatchId);
  if (active && (active.playerA === playerId || active.playerB === playerId)) {
    const other = active.playerA === playerId ? active.playerB : active.playerA;
    if (other && playerActive(next, other)) {
      next = completeMatch(next, active, {
        winnerId: other,
        outcome: MATCH_OUTCOME.WALKOVER,
        credited: false,
      });
      next = advanceWinner(next, active, other);
    } else {
      next = completeMatch(next, active, {
        winnerId: null,
        outcome: MATCH_OUTCOME.CANCELLED,
        credited: false,
      });
    }
  }
  return ok(progress(next, now));
}

function checkIn(state, action, now) {
  const playerId = cleanId(action.playerId);
  if (!playerId) return fail(state, TOURNAMENT_ERRORS.INVALID);
  if (state.status !== TOURNAMENT_STATUS.CHECK_IN) {
    return fail(state, TOURNAMENT_ERRORS.NOT_OPEN);
  }
  const match = state.matches.find(m => m.id === state.activeMatchId);
  if (!match || match.status !== MATCH_STATUS.CHECK_IN) {
    return fail(state, TOURNAMENT_ERRORS.UNKNOWN_MATCH);
  }
  if (match.playerA !== playerId && match.playerB !== playerId) {
    return fail(state, TOURNAMENT_ERRORS.NOT_ENROLLED);
  }

  const players = state.players.map(p =>
    p.playerId === playerId ? { ...p, checkedIn: true } : p,
  );
  let next = mutate(state, { players });
  const aIn = checkedIn(next, match.playerA);
  const bIn = checkedIn(next, match.playerB);
  if (aIn && bIn) {
    next = mutate(next, {
      status: TOURNAMENT_STATUS.IN_PROGRESS,
      checkInDeadline: null,
      matches: next.matches.map(m =>
        m.id === match.id
          ? { ...m, status: MATCH_STATUS.ASSIGNED, activityId: next.activityId }
          : m,
      ),
    });
  }
  return ok(next);
}

function tick(state, now) {
  if (state.status !== TOURNAMENT_STATUS.CHECK_IN) return ok(state);
  if (state.checkInDeadline == null || now < state.checkInDeadline) return ok(state);
  const match = state.matches.find(m => m.id === state.activeMatchId);
  if (!match || match.status !== MATCH_STATUS.CHECK_IN) return ok(state);
  return ok(progress(resolveNoShow(state, match, now), now));
}

function verifiedResult(state, action, now) {
  if (
    state.status !== TOURNAMENT_STATUS.IN_PROGRESS &&
    state.status !== TOURNAMENT_STATUS.CHECK_IN
  ) {
    return fail(state, TOURNAMENT_ERRORS.NOT_OPEN);
  }

  const match = findAssignedMatch(state, action);
  if (!match) return fail(state, TOURNAMENT_ERRORS.UNKNOWN_MATCH);

  if (match.status === MATCH_STATUS.COMPLETE || match.status === MATCH_STATUS.CANCELLED) {
    return ok(state);
  }

  if (match.status !== MATCH_STATUS.ASSIGNED) {
    return fail(state, TOURNAMENT_ERRORS.UNKNOWN_MATCH);
  }

  const winnerId = cleanId(action.winnerId);
  if (!winnerId || (winnerId !== match.playerA && winnerId !== match.playerB)) {
    return fail(state, TOURNAMENT_ERRORS.INVALID);
  }

  const credited = isPlayedMatchOutcome(action.outcome);
  if (!credited && action.outcome !== 'forfeit') {
    return fail(state, TOURNAMENT_ERRORS.INVALID);
  }

  const next = completeMatch(state, match, {
    winnerId,
    outcome: credited ? MATCH_OUTCOME.PLAYED : 'forfeit',
    credited,
    verifiedMatchId: typeof action.verifiedMatchId === 'string' ? action.verifiedMatchId : match.id,
  });
  return ok(progress(next, now));
}

function serverRestart(state, _now) {
  return cancelUnfinished(state, 'server_restart');
}

function cancel(state, reason, _now) {
  return cancelUnfinished(state, reason || 'cancelled');
}

function cancelUnfinished(state, reason) {
  if (
    state.status === TOURNAMENT_STATUS.IDLE ||
    state.status === TOURNAMENT_STATUS.COMPLETE ||
    state.status === TOURNAMENT_STATUS.CANCELLED
  ) {
    return ok(state);
  }
  const matches = state.matches.map(m => {
    if (m.status === MATCH_STATUS.COMPLETE || m.status === MATCH_STATUS.CANCELLED) return m;
    return {
      ...m,
      status: MATCH_STATUS.CANCELLED,
      outcome: MATCH_OUTCOME.CANCELLED,
      credited: false,
      winnerId: null,
    };
  });
  return ok(
    mutate(state, {
      status: TOURNAMENT_STATUS.CANCELLED,
      cancelReason: reason,
      matches,
      activeMatchId: null,
      checkInDeadline: null,
      championId: null,
    }),
  );
}

function openBracket(state, now) {
  const matches = buildMatches(state.id, state.size, state.players);
  const next = mutate(state, {
    matches,
    status: TOURNAMENT_STATUS.CHECK_IN,
  });
  return startNextCheckIn(next, now);
}

function buildMatches(tournamentId, size, players) {
  const matches = [];
  const rounds = roundCount(size);
  for (let round = 0; round < rounds; round++) {
    const count = matchesInRound(size, round);
    for (let index = 0; index < count; index++) {
      const id = `${tournamentId}:r${round}:m${index}`;
      let playerA = null;
      let playerB = null;
      if (round === 0) {
        playerA = players[index * 2]?.playerId ?? null;
        playerB = players[index * 2 + 1]?.playerId ?? null;
      }
      matches.push({
        id,
        round,
        index,
        playerA,
        playerB,
        winnerId: null,
        outcome: null,
        status: MATCH_STATUS.PENDING,
        activityId: null,
        credited: false,
        verifiedMatchId: null,
      });
    }
  }
  return matches;
}

function startNextCheckIn(state, now) {
  const nextPending = state.matches.find(
    m =>
      m.status === MATCH_STATUS.PENDING &&
      m.playerA &&
      m.playerB,
  );
  if (nextPending) {
    const players = state.players.map(p => ({ ...p, checkedIn: false }));
    return mutate(state, {
      status: TOURNAMENT_STATUS.CHECK_IN,
      activeMatchId: nextPending.id,
      checkInDeadline: now + CHECK_IN_MS,
      players,
      matches: state.matches.map(m =>
        m.id === nextPending.id ? { ...m, status: MATCH_STATUS.CHECK_IN } : m,
      ),
    });
  }

  const unresolved = state.matches.find(
    m => m.status === MATCH_STATUS.PENDING && (!m.playerA || !m.playerB),
  );
  if (unresolved) {
    if (!unresolved.playerA && !unresolved.playerB) {
      const cancelled = completeMatch(state, unresolved, {
        winnerId: null,
        outcome: MATCH_OUTCOME.CANCELLED,
        credited: false,
      });
      return startNextCheckIn(cancelled, now);
    }
    const present = unresolved.playerA || unresolved.playerB;
    const walkover = completeMatch(state, unresolved, {
      winnerId: present,
      outcome: MATCH_OUTCOME.WALKOVER,
      credited: false,
    });
    return startNextCheckIn(advanceWinner(walkover, unresolved, present), now);
  }

  return finishIfDone(state);
}

function resolveNoShow(state, match, now) {
  const aIn = checkedIn(state, match.playerA) && playerActive(state, match.playerA);
  const bIn = checkedIn(state, match.playerB) && playerActive(state, match.playerB);

  if (aIn && !bIn) {
    const next = completeMatch(state, match, {
      winnerId: match.playerA,
      outcome: MATCH_OUTCOME.WALKOVER,
      credited: false,
    });
    return advanceWinner(next, match, match.playerA);
  }
  if (bIn && !aIn) {
    const next = completeMatch(state, match, {
      winnerId: match.playerB,
      outcome: MATCH_OUTCOME.WALKOVER,
      credited: false,
    });
    return advanceWinner(next, match, match.playerB);
  }
  return completeMatch(state, match, {
    winnerId: null,
    outcome: MATCH_OUTCOME.CANCELLED,
    credited: false,
  });
}

function progress(state, now) {
  const withAdvance = maybeAdvancePlayed(state);
  return startNextCheckIn(withAdvance, now);
}

function maybeAdvancePlayed(state) {
  const just = state.matches.find(
    m => m.status === MATCH_STATUS.COMPLETE && m.winnerId && !m._advanced,
  );
  if (!just) return state;
  return advanceWinner(state, just, just.winnerId);
}

function advanceWinner(state, match, winnerId) {
  const nextRound = match.round + 1;
  const nextIndex = Math.floor(match.index / 2);
  const nextId = `${state.id}:r${nextRound}:m${nextIndex}`;
  const slot = match.index % 2 === 0 ? 'playerA' : 'playerB';
  const marked = {
    ...state,
    matches: state.matches.map(m => {
      if (m.id === match.id) return { ...m, _advanced: true };
      if (m.id !== nextId) return m;
      if (m[slot] === winnerId) return m;
      return { ...m, [slot]: winnerId };
    }),
    activeMatchId: state.activeMatchId === match.id ? null : state.activeMatchId,
    checkInDeadline: state.activeMatchId === match.id ? null : state.checkInDeadline,
  };
  return finishIfDone(marked);
}

function finishIfDone(state) {
  const finalRound = roundCount(state.size) - 1;
  const final = state.matches.find(m => m.round === finalRound);
  if (!final) return state;
  if (final.status === MATCH_STATUS.COMPLETE && final.winnerId) {
    return mutate(state, {
      status: TOURNAMENT_STATUS.COMPLETE,
      championId: final.winnerId,
      activeMatchId: null,
      checkInDeadline: null,
    });
  }
  if (final.status === MATCH_STATUS.CANCELLED) {
    return mutate(state, {
      status: TOURNAMENT_STATUS.CANCELLED,
      cancelReason: state.cancelReason || 'empty_final',
      championId: null,
      activeMatchId: null,
      checkInDeadline: null,
    });
  }
  const open = state.matches.some(
    m => m.status === MATCH_STATUS.PENDING || m.status === MATCH_STATUS.CHECK_IN || m.status === MATCH_STATUS.ASSIGNED,
  );
  if (!open && state.status !== TOURNAMENT_STATUS.COMPLETE) {
    return mutate(state, {
      status: TOURNAMENT_STATUS.CANCELLED,
      cancelReason: state.cancelReason || 'empty_final',
      activeMatchId: null,
      checkInDeadline: null,
    });
  }
  return state;
}

function completeMatch(state, match, fields) {
  const status =
    fields.outcome === MATCH_OUTCOME.CANCELLED ? MATCH_STATUS.CANCELLED : MATCH_STATUS.COMPLETE;
  return mutate(state, {
    matches: state.matches.map(m =>
      m.id === match.id
        ? {
            ...m,
            status,
            winnerId: fields.winnerId,
            outcome: fields.outcome,
            credited: !!fields.credited,
            verifiedMatchId: fields.verifiedMatchId || null,
            activityId: fields.credited ? state.activityId : m.activityId,
          }
        : m,
    ),
    activeMatchId: state.activeMatchId === match.id ? null : state.activeMatchId,
    checkInDeadline: state.activeMatchId === match.id ? null : state.checkInDeadline,
  });
}

function findAssignedMatch(state, action) {
  if (typeof action.matchId === 'string') {
    return state.matches.find(m => m.id === action.matchId) || null;
  }
  const a = cleanId(action.playerA);
  const b = cleanId(action.playerB);
  if (!a || !b) {
    const active = state.matches.find(m => m.id === state.activeMatchId);
    return active && active.status === MATCH_STATUS.ASSIGNED ? active : null;
  }
  return (
    state.matches.find(
      m =>
        m.status === MATCH_STATUS.ASSIGNED &&
        ((m.playerA === a && m.playerB === b) || (m.playerA === b && m.playerB === a)),
    ) || null
  );
}

function checkedIn(state, playerId) {
  if (!playerId) return false;
  return state.players.some(p => p.playerId === playerId && p.checkedIn && p.status !== 'withdrawn');
}

function playerActive(state, playerId) {
  if (!playerId) return false;
  return state.players.some(p => p.playerId === playerId && p.status !== 'withdrawn');
}

function makePlayer(playerId, displayName, now) {
  return {
    playerId,
    displayName: typeof displayName === 'string' && displayName ? displayName : 'visitor',
    enrolledAt: now,
    checkedIn: false,
    status: 'enrolled',
  };
}

function cleanId(id) {
  return typeof id === 'string' && id && id.length <= 64 ? id : null;
}

function mutate(state, patch) {
  return freezeState({ ...state, ...patch, revision: state.revision + 1 });
}

function bump(state, revision) {
  return freezeState({ ...state, revision });
}

function freezeState(state) {
  return {
    ...state,
    players: state.players.map(p => ({ ...p })),
    matches: state.matches.map(m => ({ ...m })),
  };
}

function ok(state) {
  return { ok: true, state, error: null };
}

function fail(state, error) {
  return { ok: false, state, error };
}
