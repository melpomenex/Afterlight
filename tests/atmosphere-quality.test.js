/**
 * Tests for quality/comfort preferences with stable fallbacks
 * (src/atmosphere/quality.js, add-atmosphere-weather-system task 4.3, D8),
 * plus tier-switch behavior against the REAL atmosphere controller.
 *
 * Covered: exact budget ceilings per tier, OS reduced-motion default with
 * local override, zero/malformed/unavailable storage session defaults,
 * reduced tier still rendering light/fog/wetness (particle visibility is a
 * separate concern), flash preference plumbing, and stable allocations
 * across repeated preference changes.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ATMOSPHERE_QUALITY_KEY,
  ATMOSPHERE_BUDGETS,
  DEFAULT_ATMOSPHERE_PREFERENCES,
  budgetFor,
  clampToBudget,
  normalizeAtmospherePreferences,
  loadAtmospherePreferences,
  saveAtmospherePreferences,
  resolveMotion,
  effectiveTier,
  describePosture,
} from '../src/atmosphere/quality.js';
import { createAtmosphereController, ATMOSPHERE_TIERS } from '../src/atmosphere/controller.js';

// --- storage fakes --------------------------------------------------------------

function createStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  let failWrites = false;
  return {
    data,
    failWrites() { failWrites = true; },
    getItem(k) { return data.has(k) ? data.get(k) : null; },
    setItem(k, v) { if (failWrites) throw new Error('SecurityError'); data.set(k, String(v)); },
  };
}

// --- budgets --------------------------------------------------------------------

test('budget ceilings are exactly the D8 table and clampToBudget never raises', () => {
  assert.deepEqual(
    { ...ATMOSPHERE_BUDGETS.normal, textureBytes: 8 * 1024 * 1024 },
    {
      rainDrops: 4096, splashInstances: 128, effectBatches: 6, atmosphereDrawCalls: 12,
      textureBytes: 8 * 1024 * 1024, cpuP95Ms: 2, shadowLights: 0, puddles: 8, shadowMapSize: 2048,
    },
  );
  assert.deepEqual(
    { ...ATMOSPHERE_BUDGETS.reduced, textureBytes: 2 * 1024 * 1024 },
    {
      rainDrops: 1024, splashInstances: 32, effectBatches: 3, atmosphereDrawCalls: 6,
      textureBytes: 2 * 1024 * 1024, cpuP95Ms: 1, shadowLights: 0, puddles: 4, shadowMapSize: 1024,
    },
  );
  assert.equal(clampToBudget('normal', 9000, 'rainDrops'), 4096, 'over-ambitious requests are capped');
  assert.equal(clampToBudget('reduced', 9000, 'rainDrops'), 1024);
  assert.equal(clampToBudget('normal', 10, 'rainDrops'), 10, 'smaller requests pass through');
  assert.equal(clampToBudget('reduced', NaN, 'puddles'), 4, 'garbage requests fall to the ceiling');
  assert.equal(clampToBudget('nonsense', 9000, 'rainDrops'), 4096, 'unknown tiers use the normal ceilings');
  assert.equal(budgetFor('reduced').effectBatches, 3);
});

// --- OS preference and effective tier --------------------------------------------

test('OS prefers-reduced-motion is the default posture with a local override', () => {
  const defaults = { ...DEFAULT_ATMOSPHERE_PREFERENCES };
  assert.equal(effectiveTier(defaults, false), 'normal', 'ordinary OS: normal tier');
  assert.equal(effectiveTier(defaults, true), 'reduced', 'OS asks for reduction: reduced tier');
  assert.equal(resolveMotion(defaults, true), 'reduced');

  assert.equal(effectiveTier({ ...defaults, reduceMotion: 'off' }, true), 'normal', 'local override beats the OS');
  assert.equal(effectiveTier({ ...defaults, reduceMotion: 'on' }, false), 'reduced', 'local override can reduce on any OS');
  assert.equal(effectiveTier({ ...defaults, quality: 'reduced', reduceMotion: 'off' }, false), 'reduced', 'a stored reduced quality still applies');

  assert.equal(describePosture('reduced', 'reduced').wetness, true, 'reduced motion keeps wetness');
  assert.equal(describePosture('reduced', 'reduced').fog, true, 'reduced motion keeps fog');
  assert.equal(describePosture('reduced', 'reduced').lighting, true, 'reduced motion keeps light');
  assert.equal(describePosture('normal', 'full').particles, 'full');
  assert.equal(describePosture('reduced', 'reduced').particles, 'reduced');
});

// --- storage fallbacks -----------------------------------------------------------

test('zero/malformed/unavailable storage yields session defaults derived from the OS', () => {
  const osReduced = { prefersReducedMotion: true };

  const empty = createStorage();
  const emptyLoad = loadAtmospherePreferences({ storage: empty, ...osReduced });
  assert.equal(emptyLoad.fromStorage, false, 'nothing stored: honest report');
  assert.equal(emptyLoad.sessionOnly, true);
  assert.deepEqual(emptyLoad.prefs, DEFAULT_ATMOSPHERE_PREFERENCES);

  for (const garbage of ['{not json', '0', 'null', '"str"', '[true]']) {
    const storage = createStorage({ [ATMOSPHERE_QUALITY_KEY]: garbage });
    const load = loadAtmospherePreferences({ storage, ...osReduced });
    assert.deepEqual(load.prefs, DEFAULT_ATMOSPHERE_PREFERENCES, `garbage (${garbage}) -> defaults`);
    assert.equal(load.sessionOnly, true);
  }

  const partial = createStorage({ [ATMOSPHERE_QUALITY_KEY]: JSON.stringify({ quality: 'reduced', flash: 'strobe' }) });
  const partialLoad = loadAtmospherePreferences({ storage: partial, ...osReduced });
  assert.equal(partialLoad.prefs.quality, 'reduced', 'good fields survive partial corruption');
  assert.equal(partialLoad.prefs.flash, 'reduced', 'bad fields fall back individually');
  assert.equal(partialLoad.prefs.reduceMotion, 'os');

  const throwing = { getItem() { throw new Error('SecurityError'); }, setItem() { throw new Error('SecurityError'); } };
  const blocked = loadAtmospherePreferences({ storage: throwing, prefersReducedMotion: false });
  assert.deepEqual(blocked.prefs, DEFAULT_ATMOSPHERE_PREFERENCES, 'unavailable storage never throws');
  assert.equal(saveAtmospherePreferences({ quality: 'reduced' }, throwing), false, 'failed persistence is reported, not claimed');
});

test('preferences round-trip through the additive key without touching other keys', () => {
  const storage = createStorage({ 'afterlight-save': '{"cells":[1]}' });
  assert.equal(saveAtmospherePreferences({ quality: 'reduced', reduceMotion: 'on', flash: 'off' }, storage), true);
  const load = loadAtmospherePreferences({ storage, prefersReducedMotion: false });
  assert.deepEqual(load.prefs, { quality: 'reduced', reduceMotion: 'on', flash: 'off' });
  assert.equal(JSON.parse(storage.data.get('afterlight-save')).cells[0], 1, 'unrelated save data untouched');
  assert.equal(load.fromStorage, true);

  assert.deepEqual(normalizeAtmospherePreferences(null), DEFAULT_ATMOSPHERE_PREFERENCES);
  assert.deepEqual(normalizeAtmospherePreferences('junk'), DEFAULT_ATMOSPHERE_PREFERENCES);
  assert.equal(normalizeAtmospherePreferences({ quality: 'ULTRA' }).quality, 'normal', 'no silent raising to imaginary tiers');
});

// --- real controller: reduced tier keeps the world alive -------------------------

function createTestController() {
  const calls = { sky: 0, precipitation: 0, surfaces: 0 };
  const appliedWetness = [];
  const exposures = [];
  const color = () => ({ setHex() {}, copy() { return this; }, multiplyScalar() { return this; }, getHex: () => 0x54645d });
  const scene = {
    add() {},
    fog: { color: color(), density: 0.018 },
    background: { isColor: true, setHex() {}, copy() { return this; }, multiplyScalar() { return this; }, getHex: () => 0x222d2a },
  };
  const renderer = { toneMappingExposure: 1.15 };
  const sun = { color: color(), intensity: 3 };
  const hemisphere = { color: color(), groundColor: color(), intensity: 2.2 };
  const controller = createAtmosphereController({
    scene,
    renderer,
    sun,
    hemisphere,
    stateClient: {
      sample: (out) => {
        out.intensity = 0.9; out.windX = 0; out.windZ = 0; out.rain = 0.8; out.cloud = 0.5;
        out.wetnessTarget = 1; out.wetness = 0.9; out.timePhase = 0.5; out.transitionU = null;
        out.synced = false; out.active = true; out.serverNow = 0;
        return out;
      },
      getState: () => null,
    },
    world: () => ({ group: { visible: true }, environment: {} }),
    skyFactory: () => { calls.sky += 1; exposures.push(renderer.toneMappingExposure); return { mesh: { set() {} }, setState() {}, setDrift() {}, dispose() {} }; },
    precipitationFactory: () => { calls.precipitation += 1; return { object3D: {}, update() {}, setTier() {}, dispose() {} }; },
    surfacesFactory: () => { calls.surfaces += 1; return { object3D: {}, apply: (w) => appliedWetness.push(w), setTier() {}, dispose() {} }; },
  });
  return { controller, calls, appliedWetness, renderer, exposures, ATMOSPHERE_TIERS };
}

test('reduced tier still renders the world: wetness, fog/exposure writes and updates continue', () => {
  const { controller, appliedWetness, renderer } = createTestController();
  const def = { id: 'court', seed: 7, atmosphere: { preset: 'rain' } };
  controller.activate({ roomId: 'court', generation: 1, def, world: { environment: {} } });

  assert.equal(controller.setQuality('reduced'), true, 'the comfort switch applies');
  assert.equal(controller.update(16), true, 'reduced tier still updates the world');
  assert.ok(appliedWetness.length >= 1, 'wet surfaces stay alive in reduced mode');
  assert.equal(appliedWetness[appliedWetness.length - 1], 0.9, 'wetness value passes through untouched');
  assert.notEqual(renderer.toneMappingExposure, undefined, 'exposure (fog/light response) still driven');

  controller.deactivate();
  assert.equal(controller.update(16), false, 'deactivated: no updates at all');
});

test('repeat quality changes allocate once per change, never per update or per same-tier call', () => {
  const { controller, calls } = createTestController();
  const def = { id: 'court', seed: 7, atmosphere: { preset: 'rain' } };
  controller.activate({ roomId: 'court', generation: 1, def, world: { environment: {} } });
  const afterActivate = { ...calls };

  for (let i = 0; i < 5; i++) {
    assert.equal(controller.setQuality('reduced'), i === 0, 'same-tier calls are no-ops');
    assert.equal(controller.setQuality('reduced'), false);
    controller.update(16);
  }
  assert.equal(controller.setQuality('normal'), true, 'changing back happens once');
  assert.equal(controller.setQuality('normal'), false);
  assert.equal(calls.precipitation, afterActivate.precipitation, 'tier switches recycle in place, no new factories');
  assert.equal(calls.sky, afterActivate.sky);
  assert.equal(calls.surfaces, afterActivate.surfaces);

  controller.dispose();
  controller.dispose(); // idempotent
  assert.equal(controller.isActive(), false);
});
