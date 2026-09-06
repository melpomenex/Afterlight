// Pure jump & bunny-hop math. No Three.js or network imports: the vertical
// arc, hop timing, momentum, and chain-reset rules live here so they stay
// unit-testable (tests/jump.test.js) and reusable by remote-avatar rendering.

// Vertical arc: ~0.5 s airtime, ~0.69 u apex — clearly visible at isometric
// zoom, below anything that could read as platforming.
export const JUMP_TAKEOFF_SPEED = 5.5;
export const JUMP_GRAVITY = 22;
// CS-style reward for clean chains: every hop adds speed up to a hard cap,
// and steering mid-air never bleeds momentum.
export const HOP_GAIN = 0.35;
export const HOP_CAP_RATIO = 1.5; // × run speed

export function createJumpState() {
  return {
    airborne: false,
    y: 0,
    vy: 0,
    hopSpeed: 0, // preserved horizontal speed; 0 = no live momentum
    chain: 0, // consecutive clean hops in the current chain
  };
}

// Snap back to grounded with no chain. Used by sit/travel/pause/blur paths —
// the same hygiene points that already clear held keys.
export function resetJump(state) {
  state.airborne = false;
  state.y = 0;
  state.vy = 0;
  state.hopSpeed = 0;
  state.chain = 0;
  return state;
}

// Advance one frame. input: { jumpPressed, jumpHeld, moving, speed, cap } —
// jumpPressed is the non-repeat Space keydown, jumpHeld is Space being held,
// speed is the commanded walk/run speed, cap the chain speed ceiling.
// Landing with Space held relaunches on the same frame: chains never touch
// ground. Landing without it (or standing still) clears the momentum.
export function stepJump(state, input, dt) {
  const { jumpPressed, jumpHeld, moving, speed, cap } = input;
  if (!state.airborne) {
    // Momentum exists only in flight; a grounded character never carries one.
    if (!moving) {
      state.hopSpeed = 0;
      state.chain = 0;
    }
    if (jumpPressed) {
      state.airborne = true;
      state.vy = JUMP_TAKEOFF_SPEED;
      state.chain = 1;
      state.hopSpeed = moving ? speed : 0;
    }
  } else {
    state.vy -= JUMP_GRAVITY * dt;
    state.y += state.vy * dt;
    if (state.y <= 0) {
      state.y = 0;
      if (jumpHeld) {
        // Bunny hop: preserve momentum and pay out the gain, capped.
        state.chain += 1;
        state.hopSpeed = Math.min(state.hopSpeed + HOP_GAIN, cap);
        state.vy = JUMP_TAKEOFF_SPEED;
      } else {
        resetJump(state);
      }
    }
  }
  return state;
}

// Horizontal speed for this frame: airborne momentum overrides the commanded
// speed (steering is free); an in-place jump steers at the commanded speed.
export function moveSpeedFor(state, baseSpeed) {
  return state.airborne && state.hopSpeed > 0 ? state.hopSpeed : baseSpeed;
}
