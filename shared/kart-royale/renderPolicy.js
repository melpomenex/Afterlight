/**
 * ============================================================================
 *  renderPolicy — the pure adaptive image-quality policy (fix-kart-royale-
 *  render-sharpness).
 * ============================================================================
 *  Everything here is a pure function over plain data: no Three.js, no DOM, no
 *  timers. `host/runtime.ts` feeds it samples and applies its decisions; the
 *  Afterlight Node test suite imports this file DIRECTLY (root tsconfig has
 *  `allowJs`, and the file deliberately stays plain JavaScript for exactly
 *  that reason — the same pattern as `shared/pool/rules.js`).
 *
 *  The policy this module encodes:
 *
 *    - Effect degradation precedes spatial-resolution reduction. Sustained
 *      GPU pressure spends the measured-cheapest effect tiers first and only
 *      then walks the render-scale ladder (D3).
 *    - Device-class ladders with a desktop floor at 0.85 and an emergency
 *      ladder below it that is only reachable after every cheaper stage is
 *      spent (D4).
 *    - Descent requires a sustained-pressure window, never an isolated long
 *      frame; every descent is payoff-checked and reverted if it bought
 *      nothing (D5).
 *    - Recovery is LIFO (the most recent degradation reverts first, so render
 *      scale climbs back before effect stages return) and is suppressed while
 *      the frame-time signal says the host page, not the game, is slow (D5).
 *    - A hosted render policy can only TIGHTEN what device classification
 *      allows (D8).
 *    - The boot-time pixel caps (PIXEL_BUDGET_MPX ceiling, the 4.0 Mpx
 *      drawing-buffer backstop) are honoured as the PREFERRED scale: when they
 *      bind, the ladder compares its floors against the capped ratio in ×CSS
 *      units instead of pretending it starts at 1.0 (D4, finding 15).
 * ============================================================================
 */

/** Clamps mirroring RenderPipeline's own arithmetic. Kept identical on purpose. */
function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

// ---------------------------------------------------------------------------
//  Device-class ladder tables (design D4)
// ---------------------------------------------------------------------------
// `normalLadder`   rungs reachable under ordinary sustained pressure.
// `emergencyLadder` rungs BELOW the normal floor; each needs emergency arming
//                  (every degrade stage spent AND pressure still sustained).
// `cssFloor`       the ×CSS drawing-buffer floor for the normal ladder. A rung
//                  whose buffer would fall below `cssFloor × CSS` is removed —
//                  the same rule the old `lowestRung()` applied with its
//                  CSS_FLOOR constants.
//
// `handheld` and `software` keep the SHIPPED ladders and floors exactly: this
// change must not spend mobile stability to buy desktop sharpness.

const EPS = 1e-6;

export const DEVICE_LADDERS = {
  desktop: {
    normalLadder: [1, 0.9, 0.85],
    emergencyLadder: [0.8, 0.72],
    cssFloor: 0.85,
  },
  tablet: {
    normalLadder: [1, 0.9, 0.85, 0.78],
    emergencyLadder: [0.72],
    cssFloor: 0.78,
  },
  handheld: {
    normalLadder: [1, 0.85, 0.72, 0.6, 0.5],
    emergencyLadder: [],
    cssFloor: 1.0,
  },
  software: {
    normalLadder: [1, 0.85, 0.72, 0.6, 0.5],
    emergencyLadder: [],
    cssFloor: 0.6,
  },
};

/**
 * Classifies a `profileDevice()`-shaped record into one of the ladder keys.
 * The device classification itself lives in `core/Settings.ts` (touch-primary,
 * handheld, memory/cores, software rasteriser); this only maps it to a table.
 */
export function deviceClassOf(profile) {
  if (!profile) return 'desktop';
  if (profile.software) return 'software';
  if (profile.handheld) return 'handheld';
  if (profile.touchPrimary) return 'tablet';
  return 'desktop';
}

// ---------------------------------------------------------------------------
//  Effect-degradation stages (design D3)
// ---------------------------------------------------------------------------
// Ordered by measured frame cost (PostFX/Sky in-repo audits), cheapest-visible-
// loss first. Stages are REVERSIBLE and each one is applied by a pipeline
// rebuild — acceptable only because stage moves are hysteretic (see the
// sustained-pressure window below), exactly like a manual quality change.
//
// NOT in this table, with reasons:
//   - shadow cascade maps: baked into shader literals at Sky.init — there is
//     no runtime channel, so the reachable shadow lever is the renderer flag
//     (stage 6), not a cascade resize.
//   - particle density: pools and caps are built once in Effects.init, so a
//     runtime change would not shrink live emissions. Dropped from the ladder.
//   - speed lines, vignette, grade, SMAA: the speed cues and the edge resolve
//     are never disabled. SMAA may step ULTRA → HIGH only alongside the
//     emergency rungs, and AA never reaches zero on a desktop tier.

export const DEGRADE_STAGES = Object.freeze({
  FULL: 0,
  BLUR_TAPS: 1,      // SMEAR_SAMPLES 11 -> 6 (halves smear bandwidth at speed)
  AO_SAMPLES: 2,     // aoSamples 16 -> 8 (High and Ultra both ship 16)
  DOF_OFF: 3,        // depth of field off (authored as garnish)
  BLOOM_LEVELS: 4,   // bloom mip chain 6 -> 4 (halves the veil reach)
  AO_OFF: 5,         // ambient occlusion off
  SHADOWS_OFF: 6,    // renderer shadow maps off
});

export const MAX_DEGRADE_STAGE = DEGRADE_STAGES.SHADOWS_OFF;

// ---------------------------------------------------------------------------
//  Pressure / hysteresis constants (design D5)
// ---------------------------------------------------------------------------

/** Racing frames with the pressure signal high required before a descent. */
export const PRESSURE_WINDOW_FRAMES = 60;
/** Racing frames after a descent before its payoff is evaluated (seconds, not the full cooldown). */
export const PAYOFF_EVAL_FRAMES = 45;
/** Minimum frame-time improvement a descent must buy to be kept (ms). */
export const DESCENT_PAYOFF_MS = 0.6;
/**
 * `frameEma − renderCostEma` beyond which the interval is attributed to the
 * host page rather than to the game: recovery probes are suppressed and a
 * descent waits, because degrading the game cannot buy back host-page time.
 */
export const CONTENTION_GAP_MS = 6.0;
/** Racing frames of sustained pressure needed to arm the emergency rungs. */
export const EMERGENCY_ARM_FRAMES = 120;

/**
 * Is the presented-frame signal currently attributed to the host page?
 * `frameEmaMs` is the interval between presented frames; `renderCostEmaMs` is
 * the game's own update+present cost. A large gap means somebody else on the
 * main thread is eating the frame.
 */
export function isHostPageContention(frameEmaMs, renderCostEmaMs) {
  return (frameEmaMs - renderCostEmaMs) > CONTENTION_GAP_MS;
}

// ---------------------------------------------------------------------------
//  Hosted render policy (design D8)
// ---------------------------------------------------------------------------
// Shape (all fields optional; absence = device default):
//   normalScaleFloor    deepest rung the NORMAL ladder may reach, ×CSS (e.g. 0.85)
//   emergencyScaleFloor deepest rung the EMERGENCY ladder may reach (e.g. 0.72);
//                       0 removes the emergency rungs entirely
//   motionBlurStrength  0..1 multiplier on the authored motion-blur smear
//   depthOfField        'authored' (default) or 'off'
//
// The clamp is one-directional: a policy may REMOVE rungs and lower the blur,
// never add them back or exceed what device classification allows.

export function resolveRenderPolicy(profile, hostPolicy) {
  const cls = deviceClassOf(profile);
  const table = DEVICE_LADDERS[cls];
  const ladder = table.normalLadder.slice();
  const emergency = table.emergencyLadder.slice();

  const hp = hostPolicy || {};
  if (typeof hp.normalScaleFloor === 'number' && hp.normalScaleFloor > 0) {
    const floor = hp.normalScaleFloor;
    while (ladder.length > 1 && ladder[ladder.length - 1] < floor - EPS) ladder.pop();
  }
  if (typeof hp.emergencyScaleFloor === 'number') {
    // 0 (or anything below the deepest device emergency rung) is meaningful:
    // exactly 0 removes the emergency region entirely, a positive floor
    // truncates everything below it. A policy can never ADD emergency rungs.
    const floor = hp.emergencyScaleFloor;
    if (floor <= 0) {
      emergency.length = 0;
    } else {
      while (emergency.length > 0 && emergency[emergency.length - 1] < floor - EPS) emergency.pop();
    }
  }

  const strength = typeof hp.motionBlurStrength === 'number'
    ? clamp(hp.motionBlurStrength, 0, 1)
    : 1;

  return {
    deviceClass: cls,
    ladder,
    emergencyLadder: emergency,
    cssFloor: table.cssFloor,
    motionBlurStrength: strength,
    depthOfField: hp.depthOfField === 'off' ? 'off' : 'authored',
  };
}

// ---------------------------------------------------------------------------
//  Ladder maths
// ---------------------------------------------------------------------------

/**
 * The rung ladder as a single array: normal rungs first, then emergency rungs.
 * `policy.emergencyLadder.length` off the end is the emergency region.
 */
export function fullLadder(policy) {
  return policy.ladder.concat(policy.emergencyLadder);
}

/**
 * Deepest rung index in the NORMAL region at the current base ratio (the
 * ratio without dynamicScale — buffer-per-CSS-pixel before the ladder spends
 * anything).
 *
 * Mirrors the old `lowestRung()` rule: walk back from the deepest normal rung
 * while `base × rung < cssFloor`, then guarantee at least one usable rung
 * below preferred (the old MIN_LADDER_RUNGS availability guarantee, which is
 * what keeps the ladder operative on pathological display configurations).
 */
export function normalRungLimit(policy, baseCssRatio) {
  let i = policy.ladder.length - 1;
  while (i > 0 && baseCssRatio * policy.ladder[i] < policy.cssFloor - EPS) i--;
  const minUsable = Math.min(1, policy.ladder.length - 1);
  if (i < minUsable) i = minUsable;
  return Math.max(0, i);
}

/**
 * Deepest ALLOWED rung index overall at the current base ratio: the normal
 * region honouring `cssFloor`, plus the ENTIRE emergency region. Emergency
 * rungs are the device table's explicit floor choices — they are bounded by
 * the sustained emergency window in `nextDescentAction`, not by cssFloor,
 * which describes NORMAL play only.
 */
export function lowestRungIndex(policy, baseCssRatio) {
  return Math.min(
    normalRungLimit(policy, baseCssRatio) + policy.emergencyLadder.length,
    fullLadder(policy).length - 1,
  );
}

/** True when `rung` indexes into the emergency region of the ladder. */
export function isEmergencyRung(policy, rung) {
  return rung >= policy.ladder.length;
}

// ---------------------------------------------------------------------------
//  Effective pixel ratio (the single resolution arithmetic, shared with
//  RenderPipeline — design D2/D4, finding 15)
// ---------------------------------------------------------------------------

/**
 * The drawing-buffer ratio: `min(dpr, cap) × renderScale × dynamicScale`,
 * then the two hardware backstops (edge ceiling, 4.0 Mpx pixel budget). Both
 * backstops multiply `scale` through so the ladder keeps authority over the
 * buffer — exactly RenderPipeline's documented arithmetic, moved here so the
 * Node tests can pin it.
 *
 * `maxPixelRatioCap` is what `createSettings` already decided (tier
 * `maxPixelRatio` after the boot pixel-budget ceiling, floored at 1.0).
 */
export function computeEffectivePixelRatio(input) {
  const {
    cssW, cssH, dpr, maxPixelRatioCap, renderScale, dynamicScale,
    software = false, maxTextureSize = 4096, maxRenderbufferSize = 4096,
  } = input;
  const cap = software ? 1 : Math.max(0.5, maxPixelRatioCap);
  const scale = clamp(renderScale, 0.25, 2) * dynamicScale;
  const d = clamp(dpr || 1, 0.5, 4);
  const ratio = Math.min(d, cap) * scale;

  // Never ask for a buffer the driver cannot make (edge ceiling).
  const limit = Math.min(maxTextureSize, maxRenderbufferSize);
  const longest = Math.max(cssW, cssH, 1);
  if (longest * ratio > limit) return Math.max(0.25, (limit / longest) * scale);

  // A ceiling on total pixels, not only on the ratio (4.0 Mpx backstop).
  const budget = 4.0e6;
  const pixels = cssW * cssH * ratio * ratio;
  if (pixels > budget) return Math.max(0.25, Math.sqrt(budget / (cssW * cssH)) * scale);
  return ratio;
}

// ---------------------------------------------------------------------------
//  Descent / recovery decisions (design D3/D5)
// ---------------------------------------------------------------------------
// The runtime owns the counters (EMAs, cooldown frames, clean frames); these
// functions turn a state snapshot into the next action. `state`:
//
//   degradeStage      current effect stage (0..MAX_DEGRADE_STAGE)
//   rung              current index into fullLadder(policy)
//   policy            resolved policy
//   baseCssRatio      buffer-per-CSS-pixel excluding dynamicScale
//   pressureFrames    racing frames the signal has been continuously high
//   emergencyFrames   racing frames of pressure since the normal ladder bottomed out
//   lastAction        'stage' | 'rung' | 'emergency' | null (what the last descent applied)

/**
 * One adaptive-ladder action.
 *
 * @typedef {Object} PolicyAction
 * @property {'stage'|'rung'|'emergency'} kind what axis to degrade/recover
 * @property {number} [stage] new degrade stage (kind 'stage')
 * @property {number} [rung] new rung index into fullLadder(policy) (kinds 'rung'/'emergency')
 */

/**
 * Next degradation action under sustained pressure, or null.
 *
 * Order: every effect stage first (cheapest visible loss first), then the
 * normal ladder, then — only after the stage ladder is exhausted AND the
 * normal ladder is at its floor AND pressure has stayed for the emergency
 * window — the emergency rungs.
 *
 * @param {Object} state
 * @returns {PolicyAction|null}
 */
export function nextDescentAction(state) {
  const { degradeStage, rung, policy, baseCssRatio, pressureFrames, emergencyFrames } = state;

  if (degradeStage < MAX_DEGRADE_STAGE) {
    if (pressureFrames >= PRESSURE_WINDOW_FRAMES) {
      return { kind: 'stage', stage: degradeStage + 1 };
    }
    return null;
  }

  const normalLimit = normalRungLimit(policy, baseCssRatio);
  if (rung < normalLimit) {
    if (pressureFrames >= PRESSURE_WINDOW_FRAMES) {
      return { kind: 'rung', rung: rung + 1 };
    }
    return null;
  }

  const ladder = fullLadder(policy);
  const emergencyLimit = lowestRungIndex(policy, baseCssRatio);
  if (rung < emergencyLimit && emergencyFrames >= EMERGENCY_ARM_FRAMES) {
    return { kind: 'emergency', rung: rung + 1 };
  }
  void ladder;
  return null;
}

/**
 * Next recovery action (probe upward), or null. LIFO: render scale recovers
 * before effect stages return, because spatial resolution is the most
 * destructive cut and must be the first thing given back. Emergency rungs
 * recover like normal rungs (still one probe per window).
 *
 * @param {Object} state
 * @returns {PolicyAction|null}
 */
export function nextRecoveryAction(state) {
  const { degradeStage, rung } = state;
  if (rung > 0) return { kind: isEmergencyRung(state.policy, rung - 1) ? 'emergency' : 'rung', rung: rung - 1 };
  if (degradeStage > 0) return { kind: 'stage', stage: degradeStage - 1 };
  return null;
}

/** Human-readable label for logs and diagnostics. */
export function describeRung(policy, rung) {
  const ladder = fullLadder(policy);
  const value = ladder[Math.min(rung, ladder.length - 1)];
  return isEmergencyRung(policy, rung) ? `${value} (emergency)` : String(value);
}
