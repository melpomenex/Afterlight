/**
 * Adaptive render policy (fix-kart-royale-render-sharpness).
 *
 * Unit coverage for the pure policy module (games/kart-royale/src/core/
 * renderPolicy.js — plain JS, imported directly) plus the source contracts
 * that keep the change inside the architecture: one shared renderer, no host
 * frame loop, the hosted policy seam actually wired, AA never disabled on
 * desktop, and the hosted session reset semantics.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  DEVICE_LADDERS,
  DEGRADE_STAGES,
  MAX_DEGRADE_STAGE,
  PRESSURE_WINDOW_FRAMES,
  EMERGENCY_ARM_FRAMES,
  CONTENTION_GAP_MS,
  resolveRenderPolicy,
  fullLadder,
  lowestRungIndex,
  normalRungLimit,
  isEmergencyRung,
  nextDescentAction,
  nextRecoveryAction,
  isHostPageContention,
  computeEffectivePixelRatio,
} from '../shared/kart-royale/renderPolicy.js';

const ROOT = new URL('..', import.meta.url);

function read(rel) {
  return readFileSync(new URL(rel, ROOT), 'utf8');
}

// ---------------------------------------------------------------------------
//  Ladder tables and the hosted clamp
// ---------------------------------------------------------------------------

test('device classes carry the committed ladders and floors', () => {
  assert.deepEqual(DEVICE_LADDERS.desktop.normalLadder, [1, 0.9, 0.85]);
  assert.deepEqual(DEVICE_LADDERS.desktop.emergencyLadder, [0.8, 0.72]);
  assert.equal(DEVICE_LADDERS.desktop.cssFloor, 0.85);
  // Mobile keeps the shipped policy: same rungs, 1.0x CSS floor.
  assert.deepEqual(DEVICE_LADDERS.handheld.normalLadder, [1, 0.85, 0.72, 0.6, 0.5]);
  assert.equal(DEVICE_LADDERS.handheld.cssFloor, 1.0);
  assert.deepEqual(DEVICE_LADDERS.handheld.emergencyLadder, []);
  assert.equal(DEVICE_LADDERS.tablet.cssFloor, 0.78);
  assert.equal(DEVICE_LADDERS.software.cssFloor, 0.6);
});

test('hosted policy may tighten floors and remove emergency rungs, never loosen', () => {
  const base = { touchPrimary: false, handheld: false, software: false };
  // Tighten: a 0.9 floor removes the 0.85 rung from the normal ladder.
  const tighter = resolveRenderPolicy(base, { normalScaleFloor: 0.9, emergencyScaleFloor: 0 });
  assert.deepEqual(tighter.ladder, [1, 0.9]);
  assert.deepEqual(tighter.emergencyLadder, []);
  // Loosen attempts are no-ops: a floor BELOW the device default must not add
  // rungs or deepen the emergency ladder.
  const looser = resolveRenderPolicy(base, { normalScaleFloor: 0.5, emergencyScaleFloor: 0.4 });
  assert.deepEqual(looser.ladder, DEVICE_LADDERS.desktop.normalLadder);
  assert.deepEqual(looser.emergencyLadder, DEVICE_LADDERS.desktop.emergencyLadder);
  // Blur strength clamps into 0..1; DoF policy passes through.
  assert.equal(resolveRenderPolicy(base, { motionBlurStrength: 0.5 }).motionBlurStrength, 0.5);
  assert.equal(resolveRenderPolicy(base, { motionBlurStrength: 7 }).motionBlurStrength, 1);
  assert.equal(resolveRenderPolicy(base, { depthOfField: 'off' }).depthOfField, 'off');
  assert.equal(resolveRenderPolicy(base, {}).depthOfField, 'authored');
});

// ---------------------------------------------------------------------------
//  Ladder maths (floors are ×CSS buffer comparisons)
// ---------------------------------------------------------------------------

test('desktop floor: no NORMAL descent below 0.85 at ratio 1', () => {
  const policy = resolveRenderPolicy({ touchPrimary: false, handheld: false, software: false }, {});
  const ladder = fullLadder(policy);
  // Normal region honours the 0.85 xCSS floor: three rungs, deepest 0.85.
  assert.equal(normalRungLimit(policy, 1.0), 2);
  assert.equal(ladder[2], 0.85);
  // The emergency region exists beyond the normal floor and is tagged; it is
  // reachable only through the emergency window, not the normal one.
  assert.equal(ladder.length, 5);
  assert.equal(lowestRungIndex(policy, 1.0), 4);
  assert.equal(isEmergencyRung(policy, 2), false);
  assert.equal(isEmergencyRung(policy, 3), true);
});

test('handheld keeps its >=1.0x CSS drawing-buffer floor', () => {
  const policy = resolveRenderPolicy({ touchPrimary: true, handheld: true, software: false }, {});
  // A 390x844-class panel renders at ~1.51x CSS before the ladder.
  const deepest = lowestRungIndex(policy, 1.51);
  assert.equal(fullLadder(policy)[deepest] * 1.51 >= 1.0 - 1e-6, true);
  assert.equal(deepest, 2); // the shipped 0.72 rung at 1.087x CSS
});

test('ladder always keeps at least one usable rung below preferred', () => {
  const policy = resolveRenderPolicy({ touchPrimary: true, handheld: true, software: false }, {});
  // Pathological base 1.0 on a 1.0x CSS floor would filter every rung; the
  // availability guarantee keeps the ladder operative (old MIN_LADDER_RUNGS).
  assert.equal(lowestRungIndex(policy, 1.0) >= 1, true);
});

// ---------------------------------------------------------------------------
//  Descent / recovery decisions
// ---------------------------------------------------------------------------

const desktopPolicy = () => resolveRenderPolicy({ touchPrimary: false, handheld: false, software: false }, {});

test('effect stages degrade before any render-scale rung', () => {
  const state = (over) => ({
    degradeStage: 0, rung: 0, policy: desktopPolicy(), baseCssRatio: 1.0,
    pressureFrames: PRESSURE_WINDOW_FRAMES, emergencyFrames: 0, ...over,
  });
  const a = nextDescentAction(state({}));
  assert.deepEqual(a, { kind: 'stage', stage: 1 });
  // Below the sustained window: nothing moves.
  assert.equal(nextDescentAction(state({ pressureFrames: PRESSURE_WINDOW_FRAMES - 1 })), null);
  // Each stage follows the previous one — still no rung motion.
  assert.deepEqual(
    nextDescentAction(state({ degradeStage: MAX_DEGRADE_STAGE - 1 })),
    { kind: 'stage', stage: MAX_DEGRADE_STAGE },
  );
  // Stages exhausted -> the normal ladder, one rung at a time.
  assert.deepEqual(
    nextDescentAction(state({ degradeStage: MAX_DEGRADE_STAGE })),
    { kind: 'rung', rung: 1 },
  );
});

test('emergency rungs require the full emergency window after the normal floor', () => {
  const state = (over) => ({
    degradeStage: MAX_DEGRADE_STAGE, rung: 2, policy: desktopPolicy(), baseCssRatio: 1.0,
    pressureFrames: PRESSURE_WINDOW_FRAMES, emergencyFrames: 0, ...over,
  });
  assert.equal(nextDescentAction(state({ emergencyFrames: EMERGENCY_ARM_FRAMES - 1 })), null);
  assert.deepEqual(
    nextDescentAction(state({ emergencyFrames: EMERGENCY_ARM_FRAMES })),
    { kind: 'emergency', rung: 3 },
  );
});

test('recovery is LIFO: render scale recovers before effect stages return', () => {
  const policy = desktopPolicy();
  assert.deepEqual(
    nextRecoveryAction({ degradeStage: 2, rung: 1, policy }),
    { kind: 'rung', rung: 0 },
  );
  assert.deepEqual(
    nextRecoveryAction({ degradeStage: 2, rung: 0, policy }),
    { kind: 'stage', stage: 1 },
  );
  assert.deepEqual(
    nextRecoveryAction({ degradeStage: 1, rung: 0, policy }),
    { kind: 'stage', stage: 0 },
  );
  assert.equal(nextRecoveryAction({ degradeStage: 0, rung: 0, policy }), null);
});

test('host-page contention is attributable from the EMA gap', () => {
  assert.equal(isHostPageContention(24, 10), true);
  assert.equal(isHostPageContention(17.5, 12), false);
  assert.ok(CONTENTION_GAP_MS > 0);
});

// ---------------------------------------------------------------------------
//  Effective pixel ratio (the one resolution arithmetic)
// ---------------------------------------------------------------------------

test('1080p DPR1 renders native at rung 1 and shrinks only by dynamicScale', () => {
  const base = { cssW: 1920, cssH: 1080, dpr: 1, maxPixelRatioCap: 1.03, renderScale: 1 };
  assert.equal(computeEffectivePixelRatio({ ...base, dynamicScale: 1 }), 1.0);
  assert.equal(computeEffectivePixelRatio({ ...base, dynamicScale: 0.85 }), 0.85);
});

test('DPR2 window keeps its above-CSS ratio until the ladder crosses it', () => {
  const base = { cssW: 1512, cssH: 982, dpr: 2, maxPixelRatioCap: 1.2714, renderScale: 1 };
  assert.equal(computeEffectivePixelRatio({ ...base, dynamicScale: 1 }) > 1.0, true);
  // 0.72 rung: ratio falls below 1.0 — a genuine upscale, which is exactly
  // what the desktop floor exists to prevent during ordinary play.
  assert.equal(computeEffectivePixelRatio({ ...base, dynamicScale: 0.72 }) < 1.0, true);
});

test('the 4.0 Mpx backstop binds on 4K DPR1 and multiplies dynamicScale through', () => {
  const base = { cssW: 3840, cssH: 2160, dpr: 1, maxPixelRatioCap: 1.0, renderScale: 1 };
  const full = computeEffectivePixelRatio({ ...base, dynamicScale: 1 });
  assert.ok(Math.abs(full - Math.sqrt(4.0e6 / (3840 * 2160))) < 1e-6);
  const dropped = computeEffectivePixelRatio({ ...base, dynamicScale: 0.85 });
  assert.ok(Math.abs(dropped - full * 0.85) < 1e-6);
});

// ---------------------------------------------------------------------------
//  Source contracts — the change stays inside the architecture
// ---------------------------------------------------------------------------

test('the hosted params seam is actually wired (was declared, never forwarded)', () => {
  const hostIndex = read('games/kart-royale/src/host/index.ts');
  assert.match(hostIndex, /settingsOverrides: options\.params/);
});

test('no second renderer, canvas or RAF loop in the host boundary', () => {
  const hostIndex = read('games/kart-royale/src/host/index.ts');
  assert.doesNotMatch(hostIndex, /new THREE\.WebGLRenderer/);
  assert.doesNotMatch(hostIndex, /requestAnimationFrame/);
  assert.doesNotMatch(hostIndex, /createElement\('canvas'\)/);
});

test('the policy module reads no page state — no URL, DOM or window access', () => {
  // Strip comments first: the header DOC talks about the rule; the CODE must
  // be the thing that obeys it.
  const src = read('shared/kart-royale/renderPolicy.js')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
  assert.doesNotMatch(src, /\blocation\b/);
  assert.doesNotMatch(src, /\bwindow\b/);
  assert.doesNotMatch(src, /\bdocument\b/);
  assert.doesNotMatch(src, /\bnavigator\b/);
});

test('Afterlight passes the desktop hosted policy and exposes render stats', () => {
  const controller = read('src/activities/kart-royale/controller.js');
  assert.match(controller, /normalScaleFloor: 0\.85/);
  assert.match(controller, /emergencyScaleFloor: 0\.72/);
  assert.match(controller, /getRenderStats/);
});

test('anti-aliasing is never fully disabled: SMAA is unconditional, MSAA stage-independent', () => {
  const postfx = read('games/kart-royale/src/render/PostFX.ts');
  // The SMAA pass is added outside any degrade-stage condition.
  assert.match(postfx, /const smaa = new SMAAEffect\(/);
  // No stage removes speed lines or the grade: STREAK_BOOST stays authored.
  assert.match(postfx, /STREAK_BOOST = 0\.46/);
  const renderer = read('games/kart-royale/src/render/Renderer.ts');
  // Composer multisampling keeps its SSAO-conflict guard; degradeStage must
  // not appear in msaaSamples().
  const msaaBlock = renderer.match(/private msaaSamples\(\): number \{[\s\S]*?\n  \}/);
  assert.ok(msaaBlock, 'msaaSamples block found');
  assert.doesNotMatch(msaaBlock[0], /degradeStage/);
});

/** Extracts a top-level `function NAME() {...}` body from source by index. */
function functionBody(src, name) {
  const start = src.indexOf(`function ${name}()`);
  if (start < 0) return null;
  const end = src.indexOf('\n  }', start);
  return end < 0 ? null : src.slice(start, end);
}

test('hosted sessions reset the adaptive state; the reset covers every axis', () => {
  const runtime = read('games/kart-royale/src/host/runtime.ts');
  // beginSession (hosted) and the standalone context restore share one reset.
  const begin = functionBody(runtime, 'beginSession');
  assert.ok(begin, 'beginSession found');
  assert.match(begin, /resetAdaptiveState\(\)/);
  assert.match(runtime, /function resetAdaptiveState\(\)/);
  // The reset table covers the new axes, not only the old rung bookkeeping.
  const reset = functionBody(runtime, 'resetAdaptiveState');
  assert.ok(reset, 'resetAdaptiveState found');
  assert.match(reset, /degradeStage = 0/);
  assert.match(reset, /pressureFrames = 0/);
  assert.match(reset, /emergencyFrames = 0/);
  assert.match(reset, /payoffCountdown = 0/);
});

test('runtime descent acts through the policy with a sustained-pressure window', () => {
  const runtime = read('games/kart-royale/src/host/runtime.ts');
  assert.match(runtime, /nextDescentAction\(/);
  assert.match(runtime, /nextRecoveryAction\(/);
  assert.match(runtime, /isHostPageContention\(/);
  assert.match(runtime, /PRESSURE_WINDOW_FRAMES|pressureFrames/);
  // The old one-move-down-to-0.6 desktop behaviour is gone.
  assert.doesNotMatch(runtime, /SCALE_RUNGS = \[1, 0\.85, 0\.72, 0\.6, 0\.5\]/);
  assert.doesNotMatch(runtime, /CSS_FLOOR_DEFAULT = 0\.6/);
});

test('render diagnostics are published in both compositions', () => {
  const standalone = read('games/kart-royale/src/main.ts');
  assert.match(standalone, /__renderStats/);
  const types = read('games/kart-royale/src/host/types.ts');
  assert.match(types, /getRenderStats\(\): Record<string, unknown>/);
  const renderer = read('games/kart-royale/src/render/Renderer.ts');
  assert.match(renderer, /renderStats\(ctx: Ctx\)/);
});

test('motion blur strength is a policy value, not a hard-coded constant only', () => {
  const postfx = read('games/kart-royale/src/render/PostFX.ts');
  assert.match(postfx, /motionBlurStrength/);
  // The retuned authored smear sits inside the committed 40–60% band of the
  // previous 0.50 + 0.34·fast shutter.
  assert.match(postfx, /0\.35 \+ 0\.20 \* fast/);
});

test('degrade stages are part of the pipeline signature and the settings shape', () => {
  const renderer = read('games/kart-royale/src/render/Renderer.ts');
  assert.match(renderer, /\(s\.degradeStage \?\? 0\) & 15/);
  const types = read('games/kart-royale/src/types.ts');
  assert.match(types, /degradeStage\?: number/);
  assert.match(types, /interface HostRenderPolicy/);
});
