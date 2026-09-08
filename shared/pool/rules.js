/**
 * Authoritative casual 8-ball rules reducer in JavaScript (Task 4.3; Specs social-billiards).
 * Matches server_elixir/lib/afterlight/activities/pool/rules.ex op-for-op.
 */

import {
  initRack,
  strikeCueBall,
  step as physicsStep,
  BALL_RADIUS,
  TABLE_LENGTH,
  TABLE_WIDTH,
  POCKETS,
} from './physics.js';

export const RULES_VERSION = 1;

/**
 * Initializes a fresh 8-ball game state.
 */
export function initGame(opts = {}) {
  const physicsState = initRack(opts);

  return {
    rules_version: RULES_VERSION,
    status: 'aiming', // "aiming" | "shooting" | "awaiting_ball_in_hand" | "game_over"
    turn: 0,          // 0 or 1
    table_open: true,
    groups: { '0': null, '1': null }, // "solids" | "stripes"
    called_pocket: null,
    ball_in_hand: false,
    winner: null,
    win_reason: null,  // "eight_ball" | "early_eight" | "wrong_pocket_eight" | "scratch_on_eight" | "resignation"
    foul: null,        // null | "scratch" | "miss" | "wrong_ball" | "no_rail" | "illegal_break"
    shot_count: 0,
    physics: physicsState,
    current_shot: null,
  };
}

/**
 * Resigns a player, granting immediate victory to opponent.
 */
export function resign(state, player) {
  if (state.status === 'game_over') return state;
  const opponent = 1 - player;
  return {
    ...state,
    status: 'game_over',
    winner: opponent,
    win_reason: 'resignation',
  };
}

/**
 * Declares called pocket for the 8-ball.
 */
export function callPocket(state, player, pocketId) {
  const validPocket = POCKETS.some((p) => p.id === pocketId);
  if (
    (state.status === 'aiming' || state.status === 'awaiting_ball_in_hand') &&
    state.turn === player &&
    validPocket
  ) {
    return { ok: true, state: { ...state, called_pocket: pocketId } };
  }
  return { ok: false, error: 'invalid_call' };
}

/**
 * Places the cue ball when player has ball-in-hand.
 */
export function placeCueBall(state, player, x, z) {
  if (state.status !== 'aiming' && state.status !== 'awaiting_ball_in_hand') {
    return { ok: false, error: 'invalid_state' };
  }
  if (state.turn !== player) {
    return { ok: false, error: 'not_your_turn' };
  }
  if (!state.ball_in_hand) {
    return { ok: false, error: 'no_ball_in_hand' };
  }

  const r = BALL_RADIUS;
  const halfL = TABLE_LENGTH / 2.0;
  const halfW = TABLE_WIDTH / 2.0;

  const inBounds =
    x >= -halfL + r + 0.01 &&
    x <= halfL - r - 0.01 &&
    z >= -halfW + r + 0.01 &&
    z <= halfW - r - 0.01;

  const inPocket = POCKETS.some((p) => {
    const dx = x - p.x;
    const dz = z - p.z;
    return Math.sqrt(dx * dx + dz * dz) <= p.radius + 0.02;
  });

  const balls = state.physics.balls;
  const dMin = BALL_RADIUS * 2.0;

  let overlapping = false;
  for (const [id, b] of Object.entries(balls)) {
    if (id !== '0' && b.state === 'in_play') {
      const dx = x - b.x;
      const dz = z - b.z;
      if (Math.sqrt(dx * dx + dz * dz) < dMin) {
        overlapping = true;
        break;
      }
    }
  }

  if (inBounds && !inPocket && !overlapping) {
    const updatedCue = {
      id: 0,
      x: Number(x),
      z: Number(z),
      vx: 0.0,
      vz: 0.0,
      wx: 0.0,
      wz: 0.0,
      wy: 0.0,
      state: 'in_play',
    };

    const updatedPhysics = {
      ...state.physics,
      balls: {
        ...balls,
        '0': updatedCue,
      },
      settled: true,
    };

    return {
      ok: true,
      state: {
        ...state,
        physics: updatedPhysics,
        ball_in_hand: false,
        status: 'aiming',
      },
    };
  }

  return { ok: false, error: 'invalid_position' };
}

/**
 * Executes a shot if legal for current player and settled state.
 */
export function shoot(state, player, angle, power, spinX = 0.0, spinY = 0.0) {
  if (state.status !== 'aiming') return { ok: false, error: 'not_aiming' };
  if (state.turn !== player) return { ok: false, error: 'not_your_turn' };
  if (state.ball_in_hand) return { ok: false, error: 'must_place_cue_ball' };
  if (!state.physics.settled) return { ok: false, error: 'balls_in_motion' };
  if (needsCalledPocket(state, player) && !state.called_pocket) {
    return { ok: false, error: 'pocket_call_required' };
  }

  const phys = strikeCueBall(state.physics, angle, power, spinX, spinY);

  const shotTracker = {
    shooter: player,
    called_pocket: state.called_pocket,
    first_hit: null,
    rails_post_contact: 0,
    pocketed_balls: [],
    cue_scratched: false,
    eight_pocketed: false,
    object_balls_hit_rails: new Set(),
  };

  return {
    ok: true,
    state: {
      ...state,
      physics: phys,
      status: 'shooting',
      foul: null,
      current_shot: shotTracker,
    },
  };
}

/**
 * Steps game physics and resolves shot rules once settled.
 */
export function step(state, deltaSec = 0.016667) {
  if (state.status !== 'shooting') {
    return { state, events: [] };
  }

  const { state: nextPhys, events } = physicsStep(state.physics, deltaSec);
  const tracker = updateShotTracker(state.current_shot, events);

  if (nextPhys.settled) {
    const resolved = resolveShot({
      ...state,
      physics: nextPhys,
      current_shot: tracker,
    });
    return { state: resolved, events };
  }

  return {
    state: {
      ...state,
      physics: nextPhys,
      current_shot: tracker,
    },
    events,
  };
}

function updateShotTracker(tracker, events) {
  let firstHit = tracker.first_hit;
  let railsPostContact = tracker.rails_post_contact;
  let pocketedBalls = [...tracker.pocketed_balls];
  let cueScratched = tracker.cue_scratched;
  let eightPocketed = tracker.eight_pocketed;
  const objectRails = new Set(tracker.object_balls_hit_rails);

  for (const evt of events) {
    if (evt.type === 'ball_collision') {
      const isCueHit = evt.ballA === 0 || evt.ballB === 0;
      const objectId = evt.ballA === 0 ? evt.ballB : evt.ballA;
      if (isCueHit && firstHit === null) {
        firstHit = objectId;
      }
    } else if (evt.type === 'rail_collision') {
      const bid = evt.ballId;
      if (bid !== 0) objectRails.add(bid);
      if (firstHit !== null) {
        railsPostContact++;
      }
    } else if (evt.type === 'pocketed') {
      const bid = evt.ballId;
      pocketedBalls.push({ ballId: bid, pocketId: evt.pocketId });
      if (bid === 0) cueScratched = true;
      if (bid === 8) eightPocketed = true;
    }
  }

  return {
    ...tracker,
    first_hit: firstHit,
    rails_post_contact: railsPostContact,
    pocketed_balls: pocketedBalls,
    cue_scratched: cueScratched,
    eight_pocketed: eightPocketed,
    object_balls_hit_rails: objectRails,
  };
}

function resolveShot(state) {
  const tracker = state.current_shot;
  const shooter = tracker.shooter;
  const opponent = 1 - shooter;
  const isBreak = state.shot_count === 0;

  if (isBreak) {
    return resolveBreakShot(state, tracker, shooter, opponent);
  }
  return resolveRegularShot(state, tracker, shooter, opponent);
}

function resolveBreakShot(state, tracker, shooter, opponent) {
  const cueScratched = tracker.cue_scratched;
  const eightPocketed = tracker.eight_pocketed;
  const objectPockets = tracker.pocketed_balls.filter((p) => p.ballId !== 0 && p.ballId !== 8);
  const objectRailsCount = tracker.object_balls_hit_rails.size;

  let stateAfterSpot = state;
  if (eightPocketed) {
    stateAfterSpot = spotBall(state, 8);
  }

  const legalBreak = (objectPockets.length > 0 || objectRailsCount >= 4) && !cueScratched;

  if (cueScratched) {
    return {
      ...stateAfterSpot,
      status: 'awaiting_ball_in_hand',
      turn: opponent,
      ball_in_hand: true,
      foul: 'scratch',
      shot_count: 1,
      called_pocket: null,
      current_shot: null,
    };
  }

  if (!legalBreak) {
    return {
      ...stateAfterSpot,
      status: 'awaiting_ball_in_hand',
      turn: opponent,
      ball_in_hand: true,
      foul: 'illegal_break',
      shot_count: 1,
      called_pocket: null,
      current_shot: null,
    };
  }

  const retainsTurn = objectPockets.length > 0;
  const nextTurn = retainsTurn ? shooter : opponent;

  return {
    ...stateAfterSpot,
    status: 'aiming',
    turn: nextTurn,
    ball_in_hand: false,
    table_open: true,
    shot_count: 1,
    called_pocket: null,
    current_shot: null,
  };
}

function resolveRegularShot(state, tracker, shooter, opponent) {
  const cueScratched = tracker.cue_scratched;
  const eightPocketed = tracker.eight_pocketed;
  const firstHit = tracker.first_hit;
  const railsPostContact = tracker.rails_post_contact;
  const pocketedBalls = tracker.pocketed_balls;
  const objectPockets = pocketedBalls.filter((p) => p.ballId !== 0);

  const shooterGroup = state.groups[String(shooter)];
  const clearedGroup = shooterGroup ? isGroupCleared(state.physics.balls, shooterGroup) : false;

  let foulReason = null;
  if (cueScratched) {
    foulReason = 'scratch';
  } else if (firstHit === null) {
    foulReason = 'miss';
  } else if (state.table_open && firstHit === 8) {
    foulReason = 'wrong_ball';
  } else if (!state.table_open && !clearedGroup && ballGroup(firstHit) !== shooterGroup) {
    foulReason = 'wrong_ball';
  } else if (!state.table_open && clearedGroup && firstHit !== 8) {
    foulReason = 'wrong_ball';
  } else if (railsPostContact === 0 && objectPockets.length === 0) {
    foulReason = 'no_rail';
  }

  // 8-ball resolutions
  if (eightPocketed && (cueScratched || foulReason === 'scratch')) {
    return {
      ...state,
      status: 'game_over',
      winner: opponent,
      win_reason: 'scratch_on_eight',
      foul: 'scratch',
      current_shot: null,
    };
  }

  if (eightPocketed && !clearedGroup) {
    return {
      ...state,
      status: 'game_over',
      winner: opponent,
      win_reason: 'early_eight',
      current_shot: null,
    };
  }

  if (eightPocketed && foulReason !== null) {
    return {
      ...state,
      status: 'game_over',
      winner: opponent,
      win_reason: 'early_eight',
      foul: foulReason,
      current_shot: null,
    };
  }

  if (eightPocketed && clearedGroup) {
    const eightEntry = pocketedBalls.find((p) => p.ballId === 8);
    const called = tracker.called_pocket;

    if (eightEntry.pocketId === called) {
      return {
        ...state,
        status: 'game_over',
        winner: shooter,
        win_reason: 'eight_ball',
        current_shot: null,
      };
    } else {
      return {
        ...state,
        status: 'game_over',
        winner: opponent,
        win_reason: 'wrong_pocket_eight',
        current_shot: null,
      };
    }
  }

  if (foulReason !== null) {
    return {
      ...state,
      status: 'awaiting_ball_in_hand',
      turn: opponent,
      ball_in_hand: true,
      foul: foulReason,
      called_pocket: null,
      shot_count: state.shot_count + 1,
      current_shot: null,
    };
  }

  // Legal shot
  let tableOpen = state.table_open;
  let updatedGroups = { ...state.groups };

  if (state.table_open && objectPockets.length > 0) {
    const firstPocketed = objectPockets[0];
    const firstBid = firstPocketed.ballId;

    if (firstBid >= 1 && firstBid <= 7) {
      tableOpen = false;
      updatedGroups = {
        [String(shooter)]: 'solids',
        [String(opponent)]: 'stripes',
      };
    } else if (firstBid >= 9 && firstBid <= 15) {
      tableOpen = false;
      updatedGroups = {
        [String(shooter)]: 'stripes',
        [String(opponent)]: 'solids',
      };
    }
  }

  const activeShooterGroup = updatedGroups[String(shooter)];
  const retainsTurn = tableOpen
    ? objectPockets.length > 0
    : objectPockets.some((p) => ballGroup(p.ballId) === activeShooterGroup);

  const nextTurn = retainsTurn ? shooter : opponent;

  return {
    ...state,
    status: 'aiming',
    turn: nextTurn,
    ball_in_hand: false,
    table_open: tableOpen,
    groups: updatedGroups,
    called_pocket: null,
    shot_count: state.shot_count + 1,
    current_shot: null,
  };
}

function spotBall(state, ballId) {
  const balls = state.physics.balls;
  const strId = String(ballId);
  const ball = balls[strId];

  if (!ball) return state;

  const spotted = {
    ...ball,
    x: 0.56,
    z: 0.0,
    vx: 0.0,
    vz: 0.0,
    wx: 0.0,
    wz: 0.0,
    wy: 0.0,
    state: 'in_play',
  };

  return {
    ...state,
    physics: {
      ...state.physics,
      balls: {
        ...balls,
        [strId]: spotted,
      },
    },
  };
}

export function ballGroup(bid) {
  if (bid >= 1 && bid <= 7) return 'solids';
  if (bid === 8) return 'eight';
  if (bid >= 9 && bid <= 15) return 'stripes';
  return 'cue';
}

export function isGroupCleared(balls, group) {
  const minId = group === 'solids' ? 1 : 9;
  const maxId = group === 'solids' ? 7 : 15;

  for (let id = minId; id <= maxId; id++) {
    const b = balls[String(id)];
    if (b && b.state !== 'pocketed') {
      return false;
    }
  }
  return true;
}

export function needsCalledPocket(state, player) {
  if (state.table_open) return false;
  const group = state.groups[String(player)];
  if (!group) return false;
  return isGroupCleared(state.physics.balls, group);
}
