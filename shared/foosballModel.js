/**
 * Shared authoritative Foosball simulation and rules engine.
 *
 * Implements:
 * - Table dimensions: 120 x 70 with 20-unit goal mouths on end rails.
 * - 8 rods total (4 per player):
 *   - Slot 0 (attacking +X, defending X=0):
 *     - Rod 0: Goalie (1 player) at X = 10.0
 *     - Rod 1: Defense (2 players) at X = 30.0
 *     - Rod 2: Midfield (5 players) at X = 66.0
 *     - Rod 3: Attack (3 players) at X = 80.0
 *   - Slot 1 (attacking -X, defending X=120):
 *     - Rod 0: Goalie (1 player) at X = 110.0
 *     - Rod 1: Defense (2 players) at X = 90.0
 *     - Rod 2: Midfield (5 players) at X = 54.0
 *     - Rod 3: Attack (3 players) at X = 40.0
 * - Bounded rod translation along Y.
 * - Bounded angular speed (<= 15 rad/s) and clamped angle ([-PI/2, PI/2]), preventing 360 spinning.
 * - Ball physics with rolling friction and corner ramp deflection.
 * - Ball-to-figure collision detection and kick impulse.
 * - Double-goal lock.
 * - First-to-five scoring per game.
 * - Selectable series (single game / best-of-3 / best-of-5), locked at start.
 * - Casual mode active-rod recommendation.
 */

export const TABLE_LENGTH = 120.0;
export const TABLE_WIDTH = 70.0;
export const CENTER_X = 60.0;
export const CENTER_Y = 35.0;

export const BALL_RADIUS = 2.0;
export const MAX_BALL_SPEED = 20.0; // Units per tick (60Hz)
export const BALL_FRICTION = 0.992;
export const RESTITUTION_RAIL = 0.85;

export const GOAL_WIDTH = 20.0;
export const GOAL_TOP = (TABLE_WIDTH - GOAL_WIDTH) / 2.0;    // 25.0
export const GOAL_BOTTOM = (TABLE_WIDTH + GOAL_WIDTH) / 2.0; // 45.0

export const MAX_ANGULAR_SPEED = 15.0 / 60.0; // max rad per 60Hz tick (~0.25 rad/tick)
export const MAX_ROD_TRANSLATION_SPEED = 4.0; // units per tick
export const MAX_ROD_ANGLE = Math.PI * 0.48;   // Clamped so no 360-degree spin can ever happen

export const SERVE_DELAY_TICKS = 45;   // ~0.75s
export const GOAL_DELAY_TICKS = 60;    // ~1.0s
export const GAME_BREAK_TICKS = 90;    // ~1.5s
export const WINNING_POINTS = 5;

export const VALID_SERIES_LENGTHS = Object.freeze([1, 3, 5]);

/**
 * Standard configuration for all 8 rods:
 * slot: 0 or 1
 * index: 0..3
 * x: fixed longitudinal position
 * playerCount: number of figures
 * offsets: array of lateral offsets from rod center
 * minY, maxY: lateral translation bounds for rod center
 */
export const ROD_CONFIGS = Object.freeze({
  '0': [
    { index: 0, x: 10.0, playerCount: 1, offsets: [0.0], minY: 25.0, maxY: 45.0, name: 'Goalie' },
    { index: 1, x: 30.0, playerCount: 2, offsets: [-15.0, 15.0], minY: 18.0, maxY: 52.0, name: 'Defense' },
    { index: 2, x: 66.0, playerCount: 5, offsets: [-24.0, -12.0, 0.0, 12.0, 24.0], minY: 10.0, maxY: 60.0, name: 'Midfield' },
    { index: 3, x: 80.0, playerCount: 3, offsets: [-18.0, 0.0, 18.0], minY: 15.0, maxY: 55.0, name: 'Attack' },
  ],
  '1': [
    { index: 0, x: 110.0, playerCount: 1, offsets: [0.0], minY: 25.0, maxY: 45.0, name: 'Goalie' },
    { index: 1, x: 90.0, playerCount: 2, offsets: [-15.0, 15.0], minY: 18.0, maxY: 52.0, name: 'Defense' },
    { index: 2, x: 54.0, playerCount: 5, offsets: [-24.0, -12.0, 0.0, 12.0, 24.0], minY: 10.0, maxY: 60.0, name: 'Midfield' },
    { index: 3, x: 40.0, playerCount: 3, offsets: [-18.0, 0.0, 18.0], minY: 15.0, maxY: 55.0, name: 'Attack' },
  ],
});

export function winsNeededForSeries(seriesLength) {
  const len = VALID_SERIES_LENGTHS.includes(seriesLength) ? seriesLength : 1;
  return Math.floor(len / 2) + 1;
}

export function initFoosballState(opts = {}) {
  const seriesLength = VALID_SERIES_LENGTHS.includes(opts.seriesLength) ? opts.seriesLength : 1;
  const servingTo = opts.servingTo === 1 ? 1 : 0;
  const initialBallVx = servingTo === 0 ? -3.0 : 3.0;

  const rods = {
    '0': [
      { y: CENTER_Y, angle: 0.0, vy: 0.0, omega: 0.0 },
      { y: CENTER_Y, angle: 0.0, vy: 0.0, omega: 0.0 },
      { y: CENTER_Y, angle: 0.0, vy: 0.0, omega: 0.0 },
      { y: CENTER_Y, angle: 0.0, vy: 0.0, omega: 0.0 },
    ],
    '1': [
      { y: CENTER_Y, angle: 0.0, vy: 0.0, omega: 0.0 },
      { y: CENTER_Y, angle: 0.0, vy: 0.0, omega: 0.0 },
      { y: CENTER_Y, angle: 0.0, vy: 0.0, omega: 0.0 },
      { y: CENTER_Y, angle: 0.0, vy: 0.0, omega: 0.0 },
    ],
  };

  return {
    width: Math.round(TABLE_WIDTH),
    length: Math.round(TABLE_LENGTH),
    state: 'serving', // 'serving' | 'rally' | 'goal' | 'game_break' | 'ended'
    serveDelay: SERVE_DELAY_TICKS,
    goalDelay: 0,
    gameBreakDelay: 0,
    ball: {
      x: CENTER_X,
      y: CENTER_Y,
      vx: initialBallVx,
      vy: 0.5,
      radius: BALL_RADIUS,
    },
    rods,
    activeRod: {
      '0': 2, // Default to Midfield
      '1': 2,
    },
    controlMode: {
      '0': 'casual', // 'casual' | 'advanced'
      '1': 'casual',
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
 * Returns the recommended active rod index (0..3) for a given slot based on ball X position.
 */
export function getRecommendedRod(slot, ballX) {
  const isSlot0 = slot === 0 || slot === '0';
  if (isSlot0) {
    if (ballX < 20.0) return 0;      // Goalie
    if (ballX < 48.0) return 1;      // Defense
    if (ballX < 74.0) return 2;      // Midfield
    return 3;                        // Attack
  } else {
    if (ballX > 100.0) return 0;     // Goalie
    if (ballX > 72.0) return 1;      // Defense
    if (ballX > 46.0) return 2;      // Midfield
    return 3;                        // Attack
  }
}

/**
 * Clamps and updates rod translation and rotation according to speed bounds.
 */
export function clampRodState(slot, rodIndex, currentRod, input) {
  const cfg = ROD_CONFIGS[slot][rodIndex];
  if (!cfg) return { ...currentRod };

  let targetY = currentRod.y;
  let targetAngle = currentRod.angle;

  // Handle lateral translation input
  if (typeof input.targetY === 'number') {
    targetY = Math.max(cfg.minY, Math.min(cfg.maxY, input.targetY));
  } else if (typeof input.dy === 'number') {
    targetY = Math.max(cfg.minY, Math.min(cfg.maxY, currentRod.y + input.dy * MAX_ROD_TRANSLATION_SPEED));
  }

  // Handle rotation / kick input
  if (typeof input.targetAngle === 'number') {
    targetAngle = Math.max(-MAX_ROD_ANGLE, Math.min(MAX_ROD_ANGLE, input.targetAngle));
  } else if (input.kick) {
    // Kick direction: slot 0 kicks +X (positive angle), slot 1 kicks -X (negative angle)
    const kickSign = (slot === 0 || slot === '0') ? 1.0 : -1.0;
    targetAngle = kickSign * (Math.PI * 0.4);
  } else if (typeof input.dAngle === 'number') {
    targetAngle = Math.max(-MAX_ROD_ANGLE, Math.min(MAX_ROD_ANGLE, currentRod.angle + input.dAngle * MAX_ANGULAR_SPEED));
  } else {
    // Return gently to resting vertical (angle 0)
    targetAngle = currentRod.angle * 0.85;
  }

  // Enforce translation speed limit
  const dy = targetY - currentRod.y;
  const clampedDy = Math.max(-MAX_ROD_TRANSLATION_SPEED, Math.min(MAX_ROD_TRANSLATION_SPEED, dy));
  const nextY = currentRod.y + clampedDy;

  // Enforce angular speed limit (no spinning)
  const dAngle = targetAngle - currentRod.angle;
  const clampedDAngle = Math.max(-MAX_ANGULAR_SPEED, Math.min(MAX_ANGULAR_SPEED, dAngle));
  const nextAngle = Math.max(-MAX_ROD_ANGLE, Math.min(MAX_ROD_ANGLE, currentRod.angle + clampedDAngle));

  return {
    y: nextY,
    angle: nextAngle,
    vy: clampedDy,
    omega: clampedDAngle,
  };
}

/**
 * Steps the authoritative Foosball simulation by one tick (1/60s).
 *
 * @param {Object} state Mutable or immutable foosball state
 * @param {Object} inputs Map of inputs keyed by slot: { '0': { ... }, '1': { ... } }
 * @returns {{ state: Object, events: Array }}
 */
export function stepFoosball(state, inputs = {}) {
  const next = {
    ...state,
    ball: { ...state.ball },
    rods: {
      '0': state.rods['0'].map(r => ({ ...r })),
      '1': state.rods['1'].map(r => ({ ...r })),
    },
    activeRod: { ...state.activeRod },
    controlMode: { ...state.controlMode },
    score: { ...state.score },
    seriesScore: { ...state.seriesScore },
    gamesHistory: [...state.gamesHistory],
    tick: state.tick + 1,
  };

  const events = [];

  // 1. Handle match end or delays
  if (next.state === 'ended') {
    return { state: next, events };
  }

  if (next.state === 'game_break') {
    next.gameBreakDelay -= 1;
    if (next.gameBreakDelay <= 0) {
      next.score = { '0': 0, '1': 0 };
      next.state = 'serving';
      next.serveDelay = SERVE_DELAY_TICKS;
      next.ball.x = CENTER_X;
      next.ball.y = CENTER_Y;
      const server = (next.currentGame % 2 === 1) ? 0 : 1;
      next.ball.vx = (server === 0 ? -3.0 : 3.0);
      next.ball.vy = 0.5;
    }
    return { state: next, events };
  }

  if (next.state === 'goal') {
    next.goalDelay -= 1;
    if (next.goalDelay <= 0) {
      if (next.score['0'] >= WINNING_POINTS || next.score['1'] >= WINNING_POINTS) {
        const gameWinner = next.score['0'] >= WINNING_POINTS ? 0 : 1;
        next.seriesScore[String(gameWinner)] += 1;
        next.gamesHistory.push({
          game: next.currentGame,
          score: { ...next.score },
          winner: gameWinner,
        });

        events.push({
          type: 'game_won',
          game: next.currentGame,
          winner: gameWinner,
          seriesScore: { ...next.seriesScore },
        });

        if (next.seriesScore[String(gameWinner)] >= next.winsNeeded) {
          next.state = 'ended';
          next.winner = gameWinner;
          events.push({
            type: 'match_won',
            winner: gameWinner,
            seriesScore: { ...next.seriesScore },
          });
          return { state: next, events };
        } else {
          next.state = 'game_break';
          next.gameBreakDelay = GAME_BREAK_TICKS;
          next.currentGame += 1;
          return { state: next, events };
        }
      }

      // Reset for next serve
      next.state = 'serving';
      next.serveDelay = SERVE_DELAY_TICKS;
      next.ball.x = CENTER_X;
      next.ball.y = CENTER_Y;
      // Serve to conceding player
      const concedeSlot = next.lastScorerSlot === 0 ? 1 : 0;
      next.ball.vx = concedeSlot === 0 ? -3.0 : 3.0;
      next.ball.vy = (Math.random() - 0.5) * 1.5;
    }
    return { state: next, events };
  }

  if (next.state === 'serving') {
    next.serveDelay -= 1;
    if (next.serveDelay <= 0) {
      next.state = 'rally';
      events.push({ type: 'serve', ball: { ...next.ball } });
    }
    // During serving delay, ball stays centered
  }

  // 2. Process rod inputs
  for (const slotKey of ['0', '1']) {
    const slot = Number(slotKey);
    const inp = inputs[slotKey] || {};

    if (inp.controlMode) {
      next.controlMode[slotKey] = inp.controlMode;
    }

    // Determine active rod
    if (next.controlMode[slotKey] === 'casual') {
      next.activeRod[slotKey] = getRecommendedRod(slot, next.ball.x);
    } else if (typeof inp.selectRod === 'number' && inp.selectRod >= 0 && inp.selectRod <= 3) {
      next.activeRod[slotKey] = inp.selectRod;
    }

    const curActive = next.activeRod[slotKey];

    // Update each rod
    for (let r = 0; r < 4; r++) {
      const rodInput = (r === curActive) ? inp : { targetY: next.rods[slotKey][r].y };
      next.rods[slotKey][r] = clampRodState(slot, r, next.rods[slotKey][r], rodInput);
    }
  }

  // 3. Step ball physics with continuous sub-stepping
  if (next.state === 'rally') {
    const SUBSTEPS = 4;
    const dt = 1.0 / SUBSTEPS;

    for (let step = 0; step < SUBSTEPS; step++) {
      // Advance position
      next.ball.x += next.ball.vx * dt;
      next.ball.y += next.ball.vy * dt;

      // Friction
      next.ball.vx *= Math.pow(BALL_FRICTION, dt);
      next.ball.vy *= Math.pow(BALL_FRICTION, dt);

      // Clamp speed
      const curSpeed = Math.hypot(next.ball.vx, next.ball.vy);
      if (curSpeed > MAX_BALL_SPEED) {
        const scale = MAX_BALL_SPEED / curSpeed;
        next.ball.vx *= scale;
        next.ball.vy *= scale;
      }

      // Check Side Rails (Y bounds: 0 to TABLE_WIDTH)
      if (next.ball.y - next.ball.radius <= 0) {
        next.ball.y = next.ball.radius;
        next.ball.vy = Math.abs(next.ball.vy) * RESTITUTION_RAIL;
        events.push({ type: 'bounce_rail', speed: curSpeed });
      } else if (next.ball.y + next.ball.radius >= TABLE_WIDTH) {
        next.ball.y = TABLE_WIDTH - next.ball.radius;
        next.ball.vy = -Math.abs(next.ball.vy) * RESTITUTION_RAIL;
        events.push({ type: 'bounce_rail', speed: curSpeed });
      }

      // Corner Ramps (45 degree ramps prevent dead balls in corners)
      const CORNER_SIZE = 8.0;
      // Top-Left corner: x < CORNER_SIZE, y < CORNER_SIZE, x + y < CORNER_SIZE
      if (next.ball.x + next.ball.y < CORNER_SIZE + next.ball.radius) {
        const pen = (CORNER_SIZE + next.ball.radius) - (next.ball.x + next.ball.y);
        next.ball.x += pen * 0.5;
        next.ball.y += pen * 0.5;
        const normX = 0.7071;
        const normY = 0.7071;
        const dot = next.ball.vx * normX + next.ball.vy * normY;
        if (dot < 0) {
          next.ball.vx -= 2 * dot * normX * RESTITUTION_RAIL;
          next.ball.vy -= 2 * dot * normY * RESTITUTION_RAIL;
        }
      }
      // Bottom-Left corner: x < CORNER_SIZE, y > TABLE_WIDTH - CORNER_SIZE
      if (next.ball.x + (TABLE_WIDTH - next.ball.y) < CORNER_SIZE + next.ball.radius) {
        const pen = (CORNER_SIZE + next.ball.radius) - (next.ball.x + (TABLE_WIDTH - next.ball.y));
        next.ball.x += pen * 0.5;
        next.ball.y -= pen * 0.5;
        const normX = 0.7071;
        const normY = -0.7071;
        const dot = next.ball.vx * normX + next.ball.vy * normY;
        if (dot < 0) {
          next.ball.vx -= 2 * dot * normX * RESTITUTION_RAIL;
          next.ball.vy -= 2 * dot * normY * RESTITUTION_RAIL;
        }
      }
      // Top-Right corner: (TABLE_LENGTH - x) + y < CORNER_SIZE + radius
      if ((TABLE_LENGTH - next.ball.x) + next.ball.y < CORNER_SIZE + next.ball.radius) {
        const pen = (CORNER_SIZE + next.ball.radius) - ((TABLE_LENGTH - next.ball.x) + next.ball.y);
        next.ball.x -= pen * 0.5;
        next.ball.y += pen * 0.5;
        const normX = -0.7071;
        const normY = 0.7071;
        const dot = next.ball.vx * normX + next.ball.vy * normY;
        if (dot < 0) {
          next.ball.vx -= 2 * dot * normX * RESTITUTION_RAIL;
          next.ball.vy -= 2 * dot * normY * RESTITUTION_RAIL;
        }
      }
      // Bottom-Right corner: (TABLE_LENGTH - x) + (TABLE_WIDTH - y) < CORNER_SIZE + radius
      if ((TABLE_LENGTH - next.ball.x) + (TABLE_WIDTH - next.ball.y) < CORNER_SIZE + next.ball.radius) {
        const pen = (CORNER_SIZE + next.ball.radius) - ((TABLE_LENGTH - next.ball.x) + (TABLE_WIDTH - next.ball.y));
        next.ball.x -= pen * 0.5;
        next.ball.y -= pen * 0.5;
        const normX = -0.7071;
        const normY = -0.7071;
        const dot = next.ball.vx * normX + next.ball.vy * normY;
        if (dot < 0) {
          next.ball.vx -= 2 * dot * normX * RESTITUTION_RAIL;
          next.ball.vy -= 2 * dot * normY * RESTITUTION_RAIL;
        }
      }

      // Check Goals vs End Rails
      // Left End (X = 0): Goal for slot 1 if within [GOAL_TOP, GOAL_BOTTOM]
      if (next.ball.x - next.ball.radius <= 0) {
        if (next.ball.y >= GOAL_TOP && next.ball.y <= GOAL_BOTTOM) {
          // Goal scored by Slot 1!
          next.score['1'] += 1;
          next.lastGoalBy = 1;
          next.lastScorerSlot = 1;
          next.state = 'goal';
          next.goalDelay = GOAL_DELAY_TICKS;
          events.push({
            type: 'goal',
            scorer: 1,
            score: { ...next.score },
          });
          break; // Stop substeps
        } else {
          // Bounce off left end rail
          next.ball.x = next.ball.radius;
          next.ball.vx = Math.abs(next.ball.vx) * RESTITUTION_RAIL;
          events.push({ type: 'bounce_rail', speed: curSpeed });
        }
      }

      // Right End (X = TABLE_LENGTH): Goal for slot 0 if within [GOAL_TOP, GOAL_BOTTOM]
      if (next.ball.x + next.ball.radius >= TABLE_LENGTH) {
        if (next.ball.y >= GOAL_TOP && next.ball.y <= GOAL_BOTTOM) {
          // Goal scored by Slot 0!
          next.score['0'] += 1;
          next.lastGoalBy = 0;
          next.lastScorerSlot = 0;
          next.state = 'goal';
          next.goalDelay = GOAL_DELAY_TICKS;
          events.push({
            type: 'goal',
            scorer: 0,
            score: { ...next.score },
          });
          break; // Stop substeps
        } else {
          // Bounce off right end rail
          next.ball.x = TABLE_LENGTH - next.ball.radius;
          next.ball.vx = -Math.abs(next.ball.vx) * RESTITUTION_RAIL;
          events.push({ type: 'bounce_rail', speed: curSpeed });
        }
      }

      // Check Ball vs Player Figures collision
      const FIG_HALF_WIDTH = 1.6;  // Along Y
      const FIG_HALF_DEPTH = 1.2;  // Along X
      const LEG_LENGTH = 3.5;

      for (const slotKey of ['0', '1']) {
        const slot = Number(slotKey);
        const rodList = ROD_CONFIGS[slotKey];

        for (let r = 0; r < 4; r++) {
          const cfg = rodList[r];
          const rod = next.rods[slotKey][r];
          // Longitudinal position of foot: x_rod + sin(angle) * LEG_LENGTH
          const footX = cfg.x + Math.sin(rod.angle) * LEG_LENGTH;
          // Figure velocity along X from rotation
          const footVx = rod.omega * 60.0 * Math.cos(rod.angle) * LEG_LENGTH;

          // Check each figure on this rod
          for (const offset of cfg.offsets) {
            const figY = rod.y + offset;

            const dx = next.ball.x - footX;
            const dy = next.ball.y - figY;

            if (Math.abs(dx) <= next.ball.radius + FIG_HALF_DEPTH &&
                Math.abs(dy) <= next.ball.radius + FIG_HALF_WIDTH) {
              // Collision detected!
              const attackSign = (slot === 0) ? 1.0 : -1.0;
              // If rod is kicking or has forward rotation speed
              const isKicking = (footVx * attackSign > 0.5);

              if (isKicking) {
                // Strong forward strike impulse
                next.ball.vx = attackSign * Math.max(6.0, Math.min(MAX_BALL_SPEED, Math.abs(footVx) * 1.5 + 4.0));
                next.ball.vy += rod.vy * 0.8 + (Math.random() - 0.5) * 1.0;
                events.push({
                  type: 'strike',
                  slot,
                  rod: r,
                  speed: Math.hypot(next.ball.vx, next.ball.vy),
                });
              } else {
                // Passive deflection / block off figure
                if (Math.abs(dx) > Math.abs(dy)) {
                  next.ball.vx = (dx > 0 ? 1 : -1) * Math.max(3.0, Math.abs(next.ball.vx) * 0.9);
                } else {
                  next.ball.vy = (dy > 0 ? 1 : -1) * Math.max(3.0, Math.abs(next.ball.vy) * 0.9);
                }
                events.push({
                  type: 'deflect',
                  slot,
                  rod: r,
                  speed: Math.hypot(next.ball.vx, next.ball.vy),
                });
              }

              // Push ball outside figure to prevent sticking
              const pushDirX = dx >= 0 ? 1 : -1;
              next.ball.x = footX + pushDirX * (next.ball.radius + FIG_HALF_DEPTH + 0.1);
            }
          }
        }
      }
    }
  }

  return { state: next, events };
}
