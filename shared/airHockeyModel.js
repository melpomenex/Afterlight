/**
 * Shared authoritative Air Hockey simulation and rules engine.
 *
 * Implements:
 * - Table dimensions: 200 x 100 with 30-unit goal mouths on end rails.
 * - Mallet constraints: strictly constrained to defensive halves, speed-capped.
 * - Sub-stepping continuous collision detection (CCD) for rails and mallets at high speed.
 * - Goal mouth detection with double-goal prevention lock.
 * - First-to-seven scoring per game.
 * - Selectable series (single game / best-of-3 / best-of-5 / best-of-7), locked at start.
 */

export const TABLE_LENGTH = 200.0;
export const TABLE_WIDTH = 100.0;
export const CENTER_X = 100.0;
export const CENTER_Y = 50.0;

export const PUCK_RADIUS = 4.0;
export const MALLET_RADIUS = 7.0;

export const GOAL_WIDTH = 30.0;
export const GOAL_TOP = (TABLE_WIDTH - GOAL_WIDTH) / 2.0;       // 35.0
export const GOAL_BOTTOM = (TABLE_WIDTH + GOAL_WIDTH) / 2.0;    // 65.0

export const MAX_MALLET_SPEED = 8.0;   // Units per 60Hz tick
export const MAX_PUCK_SPEED = 25.0;     // Units per 60Hz tick
export const PUCK_FRICTION = 0.998;
export const RESTITUTION_RAIL = 0.98;
export const RESTITUTION_MALLET = 1.15;

export const SERVE_DELAY_TICKS = 45;   // ~0.75s
export const GOAL_DELAY_TICKS = 60;    // ~1.0s
export const GAME_BREAK_TICKS = 90;    // ~1.5s
export const WINNING_POINTS = 7;

export const VALID_SERIES_LENGTHS = Object.freeze([1, 3, 5, 7]);

export function winsNeededForSeries(seriesLength) {
  const len = VALID_SERIES_LENGTHS.includes(seriesLength) ? seriesLength : 1;
  return Math.floor(len / 2) + 1;
}

export function initAirHockeyState(opts = {}) {
  const seriesLength = VALID_SERIES_LENGTHS.includes(opts.seriesLength) ? opts.seriesLength : 1;
  const servingTo = opts.servingTo === 1 ? 1 : 0;
  const initialPuckVx = servingTo === 0 ? -4.0 : 4.0;

  return {
    width: Math.round(TABLE_WIDTH),
    length: Math.round(TABLE_LENGTH),
    state: 'serving',               // 'serving' | 'rally' | 'goal' | 'game_break' | 'ended'
    serveDelay: SERVE_DELAY_TICKS,
    goalDelay: 0,
    gameBreakDelay: 0,
    puck: {
      x: CENTER_X,
      y: CENTER_Y,
      vx: initialPuckVx,
      vy: 0.5,
      radius: PUCK_RADIUS,
    },
    mallets: {
      '0': {
        x: 30.0,
        y: CENTER_Y,
        vx: 0.0,
        vy: 0.0,
        radius: MALLET_RADIUS,
      },
      '1': {
        x: 170.0,
        y: CENTER_Y,
        vx: 0.0,
        vy: 0.0,
        radius: MALLET_RADIUS,
      },
    },
    score: { '0': 0, '1': 0 },
    seriesScore: { '0': 0, '1': 0 },
    targetScore: WINNING_POINTS,
    seriesLength,
    winsNeeded: winsNeededForSeries(seriesLength),
    currentGame: 1,
    gamesHistory: [],
    lastGoalBy: null,
    lastScorerSlot: null,
    winner: null,
    tick: 0,
  };
}

/**
 * Clamps mallet target position to player half and enforces speed limit.
 */
export function clampMalletPosition(slot, currentPos, targetPos, maxSpeed = MAX_MALLET_SPEED) {
  const isSlot0 = slot === 0 || slot === '0';

  // Boundaries for slot 0: [MALLET_RADIUS, CENTER_X - MALLET_RADIUS]
  // Boundaries for slot 1: [CENTER_X + MALLET_RADIUS, TABLE_LENGTH - MALLET_RADIUS]
  const minX = isSlot0 ? MALLET_RADIUS : CENTER_X + MALLET_RADIUS;
  const maxX = isSlot0 ? CENTER_X - MALLET_RADIUS : TABLE_LENGTH - MALLET_RADIUS;
  const minY = MALLET_RADIUS;
  const maxY = TABLE_WIDTH - MALLET_RADIUS;

  const clampedTargetX = Math.max(minX, Math.min(maxX, targetPos.x));
  const clampedTargetY = Math.max(minY, Math.min(maxY, targetPos.y));

  const dx = clampedTargetX - currentPos.x;
  const dy = clampedTargetY - currentPos.y;
  const dist = Math.hypot(dx, dy);

  if (dist > maxSpeed && dist > 1e-6) {
    const scale = maxSpeed / dist;
    return {
      x: currentPos.x + dx * scale,
      y: currentPos.y + dy * scale,
      vx: dx * scale,
      vy: dy * scale,
    };
  }

  return {
    x: clampedTargetX,
    y: clampedTargetY,
    vx: dx,
    vy: dy,
  };
}

/**
 * Resolves keyboard or continuous input to target mallet position.
 */
export function resolveMalletInput(slot, currentPos, inputState) {
  if (!inputState || typeof inputState !== 'object') {
    return { x: currentPos.x, y: currentPos.y, vx: 0, vy: 0 };
  }

  // Pointer/touch or analog position input
  if (typeof inputState.x === 'number' && typeof inputState.y === 'number') {
    return clampMalletPosition(slot, currentPos, { x: inputState.x, y: inputState.y });
  }
  if (typeof inputState.targetX === 'number' && typeof inputState.targetY === 'number') {
    return clampMalletPosition(slot, currentPos, { x: inputState.targetX, y: inputState.targetY });
  }

  // Digital keyboard inputs
  let dx = 0;
  let dy = 0;
  if (inputState.up || inputState.KeyW || inputState.ArrowUp) dy -= MAX_MALLET_SPEED;
  if (inputState.down || inputState.KeyS || inputState.ArrowDown) dy += MAX_MALLET_SPEED;
  if (inputState.left || inputState.KeyA || inputState.ArrowLeft) dx -= MAX_MALLET_SPEED;
  if (inputState.right || inputState.KeyD || inputState.ArrowRight) dx += MAX_MALLET_SPEED;

  if (dx !== 0 && dy !== 0) {
    const norm = MAX_MALLET_SPEED / Math.hypot(dx, dy);
    dx *= norm;
    dy *= norm;
  }

  const target = { x: currentPos.x + dx, y: currentPos.y + dy };
  return clampMalletPosition(slot, currentPos, target);
}

/**
 * Steps the Air Hockey simulation by `steps` discrete ticks (60 Hz).
 */
export function stepAirHockey(state, players = {}, steps = 1) {
  let currState = state;
  let outcome = null;

  for (let s = 0; s < steps; s++) {
    const [nextState, nextOutcome] = stepSingleTick(currState, players);
    currState = nextState;
    if (nextOutcome) {
      outcome = nextOutcome;
      break;
    }
  }

  return [currState, outcome];
}

function stepSingleTick(state, players) {
  if (state.state === 'ended') {
    return [state, null];
  }

  const tick = (state.tick || 0) + 1;
  let nextState = { ...state, tick };

  // 1. Update mallet positions from player inputs
  const p0Input = players[0]?.input_state || players['0']?.input_state || {};
  const p1Input = players[1]?.input_state || players['1']?.input_state || {};

  const m0 = resolveMalletInput(0, state.mallets['0'], p0Input);
  const m1 = resolveMalletInput(1, state.mallets['1'], p1Input);

  nextState.mallets = {
    '0': { ...state.mallets['0'], ...m0 },
    '1': { ...state.mallets['1'], ...m1 },
  };

  // 2. Handle state transitions
  if (nextState.state === 'serving') {
    const delay = (nextState.serveDelay || 0) - 1;
    if (delay <= 0) {
      nextState.serveDelay = 0;
      nextState.state = 'rally';
    } else {
      nextState.serveDelay = delay;
    }
    return [nextState, null];
  }

  if (nextState.state === 'goal') {
    const delay = (nextState.goalDelay || 0) - 1;
    if (delay <= 0) {
      nextState.goalDelay = 0;
      // Reset puck to center serving to player who conceded
      const concededSlot = nextState.lastScorerSlot === 0 ? 1 : 0;
      const vx = concededSlot === 0 ? -4.0 : 4.0;
      nextState.puck = {
        x: CENTER_X,
        y: CENTER_Y,
        vx,
        vy: 0.5,
        radius: PUCK_RADIUS,
      };
      // Reset mallets
      nextState.mallets['0'].x = 30.0;
      nextState.mallets['0'].y = CENTER_Y;
      nextState.mallets['0'].vx = 0.0;
      nextState.mallets['0'].vy = 0.0;
      nextState.mallets['1'].x = 170.0;
      nextState.mallets['1'].y = CENTER_Y;
      nextState.mallets['1'].vx = 0.0;
      nextState.mallets['1'].vy = 0.0;
      nextState.state = 'serving';
      nextState.serveDelay = SERVE_DELAY_TICKS;
      nextState.lastGoalBy = null;
    } else {
      nextState.goalDelay = delay;
    }
    return [nextState, null];
  }

  if (nextState.state === 'game_break') {
    const delay = (nextState.gameBreakDelay || 0) - 1;
    if (delay <= 0) {
      nextState.gameBreakDelay = 0;
      nextState.score = { '0': 0, '1': 0 };
      nextState.currentGame += 1;
      const servingTo = (nextState.currentGame % 2 === 1) ? 0 : 1;
      const vx = servingTo === 0 ? -4.0 : 4.0;
      nextState.puck = {
        x: CENTER_X,
        y: CENTER_Y,
        vx,
        vy: 0.5,
        radius: PUCK_RADIUS,
      };
      nextState.mallets['0'].x = 30.0;
      nextState.mallets['0'].y = CENTER_Y;
      nextState.mallets['0'].vx = 0.0;
      nextState.mallets['0'].vy = 0.0;
      nextState.mallets['1'].x = 170.0;
      nextState.mallets['1'].y = CENTER_Y;
      nextState.mallets['1'].vx = 0.0;
      nextState.mallets['1'].vy = 0.0;
      nextState.state = 'serving';
      nextState.serveDelay = SERVE_DELAY_TICKS;
    } else {
      nextState.gameBreakDelay = delay;
    }
    return [nextState, null];
  }

  // 3. Rally simulation with Continuous Collision Detection (CCD sub-stepping)
  let puck = { ...nextState.puck };
  const puckSpeed = Math.hypot(puck.vx, puck.vy);
  const subSteps = puckSpeed > 6.0 ? 4 : 2;
  const dt = 1.0 / subSteps;

  let goalScoredBy = null;

  for (let step = 0; step < subSteps; step++) {
    puck.x += puck.vx * dt;
    puck.y += puck.vy * dt;

    // Rail collision: Top and bottom rails
    if (puck.y - PUCK_RADIUS < 0.0) {
      puck.y = PUCK_RADIUS;
      puck.vy = Math.abs(puck.vy) * RESTITUTION_RAIL;
    } else if (puck.y + PUCK_RADIUS > TABLE_WIDTH) {
      puck.y = TABLE_WIDTH - PUCK_RADIUS;
      puck.vy = -Math.abs(puck.vy) * RESTITUTION_RAIL;
    }

    // Rail / Goal collision: Left end rail (Slot 0 defends, x = 0)
    if (puck.x - PUCK_RADIUS <= 0.0) {
      const inGoalMouth = puck.y >= GOAL_TOP && puck.y <= GOAL_BOTTOM;
      if (inGoalMouth) {
        goalScoredBy = 1; // Slot 1 scored on Slot 0's goal
        break;
      } else {
        puck.x = PUCK_RADIUS;
        puck.vx = Math.abs(puck.vx) * RESTITUTION_RAIL;
      }
    }

    // Rail / Goal collision: Right end rail (Slot 1 defends, x = 200)
    if (puck.x + PUCK_RADIUS >= TABLE_LENGTH) {
      const inGoalMouth = puck.y >= GOAL_TOP && puck.y <= GOAL_BOTTOM;
      if (inGoalMouth) {
        goalScoredBy = 0; // Slot 0 scored on Slot 1's goal
        break;
      } else {
        puck.x = TABLE_LENGTH - PUCK_RADIUS;
        puck.vx = -Math.abs(puck.vx) * RESTITUTION_RAIL;
      }
    }

    // Mallet collisions (both mallets)
    for (const slotKey of ['0', '1']) {
      const mallet = nextState.mallets[slotKey];
      const dx = puck.x - mallet.x;
      const dy = puck.y - mallet.y;
      const dist = Math.hypot(dx, dy);
      const minDist = MALLET_RADIUS + PUCK_RADIUS; // 11.0

      if (dist < minDist) {
        const nx = dist > 1e-6 ? dx / dist : 1.0;
        const ny = dist > 1e-6 ? dy / dist : 0.0;

        // Separate puck outside mallet
        puck.x = mallet.x + nx * minDist;
        puck.y = mallet.y + ny * minDist;

        // Relative velocity
        const relVx = puck.vx - mallet.vx;
        const relVy = puck.vy - mallet.vy;
        const dot = relVx * nx + relVy * ny;

        if (dot < 0) {
          puck.vx -= (1.0 + RESTITUTION_MALLET) * dot * nx - mallet.vx * 0.5;
          puck.vy -= (1.0 + RESTITUTION_MALLET) * dot * ny - mallet.vy * 0.5;

          const newSpeed = Math.hypot(puck.vx, puck.vy);
          if (newSpeed > MAX_PUCK_SPEED) {
            const scale = MAX_PUCK_SPEED / newSpeed;
            puck.vx *= scale;
            puck.vy *= scale;
          }
        }
      }
    }
  }

  // 4. Apply air table friction
  puck.vx *= PUCK_FRICTION;
  puck.vy *= PUCK_FRICTION;

  // 5. Handle Goal Resolution
  if (goalScoredBy !== null) {
    puck.vx = 0.0;
    puck.vy = 0.0;

    const slotStr = String(goalScoredBy);
    const newGameScore = {
      ...nextState.score,
      [slotStr]: (nextState.score[slotStr] || 0) + 1,
    };

    nextState.score = newGameScore;
    nextState.puck = puck;
    nextState.lastGoalBy = goalScoredBy;
    nextState.lastScorerSlot = goalScoredBy;

    // Check if game won (points >= 7)
    if (newGameScore[slotStr] >= WINNING_POINTS) {
      const newSeriesScore = {
        ...nextState.seriesScore,
        [slotStr]: (nextState.seriesScore[slotStr] || 0) + 1,
      };
      nextState.seriesScore = newSeriesScore;

      const finishedGameRecord = {
        game: nextState.currentGame,
        winner: goalScoredBy,
        score: { ...newGameScore },
      };
      nextState.gamesHistory = [...nextState.gamesHistory, finishedGameRecord];

      // Check if series won
      if (newSeriesScore[slotStr] >= nextState.winsNeeded) {
        nextState.state = 'ended';
        nextState.winner = goalScoredBy;

        const outcome = {
          type: 'match_ended',
          winner_slot: goalScoredBy,
          details: {
            winner_slot: goalScoredBy,
            score: newGameScore,
            series_score: newSeriesScore,
            series_length: nextState.seriesLength,
            games: nextState.gamesHistory,
          },
        };
        return [nextState, outcome];
      } else {
        // More games in series needed
        nextState.state = 'game_break';
        nextState.gameBreakDelay = GAME_BREAK_TICKS;
        return [nextState, null];
      }
    } else {
      // Game continues
      nextState.state = 'goal';
      nextState.goalDelay = GOAL_DELAY_TICKS;
      return [nextState, null];
    }
  }

  nextState.puck = puck;
  return [nextState, null];
}
