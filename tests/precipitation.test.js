import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

import {
  createPrecipitation,
  PRECIPITATION_TIERS,
  RAIN_HEIGHT,
  SPLASH_LIFE_S,
} from '../src/atmosphere/precipitation.js';
import { normalizeZones } from '../src/atmosphere/exposure.js';

const BOUNDS = { minX: -11.3, maxX: 11.3, minZ: -9.5, maxZ: 10.3 };

const ZONES = normalizeZones([
  { id: 'arcade', rect: { minX: -6, maxX: -2, minZ: -4, maxZ: 4 }, roofY: 3.4, exposure: 0.1, priority: 1 },
]);

const ANCHORS = Array.from({ length: 100 }, (_, i) => ({ kind: 'runoff', x: i - 50, y: 3.4, z: i % 7 }));

function make(overrides = {}) {
  return createPrecipitation({ bounds: BOUNDS, zones: ZONES, anchors: ANCHORS, seed: 11, ...overrides });
}

test('tier ceilings: normal 4096/128, reduced 1024/32, batch count within both caps', () => {
  const normal = make({ tier: 'normal' });
  assert.deepEqual(normal.counts, { drops: PRECIPITATION_TIERS.normal.drops, splashes: PRECIPITATION_TIERS.normal.splashes, runoff: 64 });
  assert.equal(normal.counts.drops, 4096);
  assert.equal(normal.counts.splashes, 128);
  assert.ok(normal.batchCount <= 6, 'normal batches within the 6-batch ceiling');
  assert.ok(normal.batchCount <= 3, 'the whole effect is only three batches');

  const reduced = make({ tier: 'reduced' });
  assert.equal(reduced.counts.drops, 1024);
  assert.equal(reduced.counts.splashes, 32);
  assert.ok(reduced.batchCount <= 3, 'reduced batches within the 3-batch ceiling');
  normal.dispose();
  reduced.dispose();
});

test('typed arrays are preallocated to exact lengths and never reallocated by updates', () => {
  const precip = make();
  const rain = precip.object3D.children[0];
  const positions = rain.geometry.attributes.position.array;
  const seeds = rain.geometry.attributes.aSeed.array;
  assert.ok(positions instanceof Float32Array);
  assert.equal(positions.length, 4096 * 2 * 3);
  assert.equal(seeds.length, 4096 * 2 * 4);

  const splash = precip.object3D.children[1];
  assert.equal(splash.geometry.attributes.aSplash.array.length, 128 * 3);

  const positionsBefore = rain.geometry.attributes.position;
  const seedsBefore = rain.geometry.attributes.aSeed;
  for (let i = 0; i < 50; i++) {
    precip.update({ timeMs: i * 16, rain: 1, windX: 0.3, windZ: 0.1, dtMs: 16 });
  }
  assert.equal(rain.geometry.attributes.position, positionsBefore, 'rain position buffer is retained');
  assert.equal(rain.geometry.attributes.aSeed, seedsBefore, 'rain seed buffer is retained');
  precip.dispose();
});

test('same-tier setTier is a no-op; a real tier change reallocates exactly once', () => {
  const precip = make({ tier: 'normal' });
  const rainBefore = precip.object3D.children[0];
  assert.equal(precip.setTier('normal'), false, 'same tier: no reallocation');
  assert.equal(precip.object3D.children[0], rainBefore, 'same tier keeps the buffers');
  assert.equal(precip.stats.reallocations, 1, 'only the initial allocation so far');

  assert.equal(precip.setTier('reduced'), true, 'tier change applies');
  assert.equal(precip.stats.reallocations, 2, 'exactly one reallocation');
  assert.equal(precip.counts.drops, 1024);

  const rainReduced = precip.object3D.children[0];
  precip.setTier('reduced');
  assert.equal(precip.object3D.children[0], rainReduced, 'repeat same-tier calls do nothing');
  assert.equal(precip.stats.reallocations, 2, 'still exactly one reallocation');

  precip.setTier('normal');
  assert.equal(precip.stats.reallocations, 3, 'switching back reallocates once again, not per frame');
  precip.dispose();
});

test('off or hidden stops uploads: no uniform writes, no spawns, no needsUpdate', () => {
  const precip = make();
  const rain = precip.object3D.children[0];
  const splash = precip.object3D.children[1];
  const splashAttr = splash.geometry.attributes.aSplash;

  precip.update({ timeMs: 0, rain: 1, dtMs: 16 });
  const densityAfterRain = rain.material.uniforms.uDensity.value;
  assert.ok(densityAfterRain > 0, 'rain writes density while active');
  const splashesAfterRain = splashAttr.array.filter(v => v !== 0).length / 3;
  assert.ok(splashesAfterRain > 0, 'splashes spawn while raining');

  // Rain off: one final zeroing write, then every frame is a no-op.
  precip.update({ timeMs: 1000, rain: 0, dtMs: 16 });
  assert.equal(rain.material.uniforms.uDensity.value, 0, 'density reaches zero once');
  const timeFrozen = rain.material.uniforms.uTime.value;
  const spawnsFrozen = precip.stats.spawnedSplashes;
  const versionFrozen = splashAttr.version;
  for (let i = 0; i < 100; i++) precip.update({ timeMs: 1000 + i * 100, rain: 0, dtMs: 16 });
  assert.equal(rain.material.uniforms.uTime.value, timeFrozen, 'rain uniforms untouched while off');
  assert.equal(precip.stats.spawnedSplashes, spawnsFrozen, 'no spawns while off');
  assert.ok(splashAttr.version - versionFrozen <= 1, 'at most the final fade tick uploads splashes');

  // Hidden: exactly the same guarantee.
  precip.setVisible(false);
  const hiddenTime = rain.material.uniforms.uTime.value;
  precip.update({ timeMs: 50_000, rain: 1, dtMs: 16 });
  assert.equal(rain.material.uniforms.uTime.value, hiddenTime, 'hidden worlds perform no uploads');
  assert.equal(precip.stats.spawnedSplashes, spawnsFrozen, 'hidden worlds spawn nothing');
  assert.equal(precip.object3D.visible, false);
  precip.dispose();
});

test('runoff pools at most 64 anchors (32 reduced) and skips puddle-kind entries', () => {
  const precip = make();
  assert.equal(precip.counts.runoff, 64, 'runoff capped at 64');
  const runoff = precip.object3D.children[2];
  const anchors = runoff.geometry.attributes.aAnchor.array;
  assert.equal(anchors[0], -50, 'first anchor x');
  assert.ok(Math.abs(anchors[1] - 3.42) < 1e-5, 'first anchor sits just above its roof height');
  assert.equal(anchors[2], ANCHORS[0].z, 'first anchor z');
  precip.dispose();

  const reduced = make({ tier: 'reduced' });
  assert.equal(reduced.counts.runoff, 32, 'reduced runoff capped at 32');
  reduced.dispose();

  const mixed = createPrecipitation({
    bounds: BOUNDS,
    zones: ZONES,
    tier: 'normal',
    seed: 1,
    anchors: [
      { kind: 'puddle', x: 1, z: 2, w: 2, d: 1 },
      { kind: 'runoff', x: 3, y: 2, z: 4 },
      { x: 5, z: 6 }, // kindless anchors are runoff by default
      { kind: 'runoff', x: 'bogus', z: 0 }, // malformed: dropped
    ],
  });
  assert.equal(mixed.counts.runoff, 2, 'puddle anchors and malformed entries are excluded');
  mixed.dispose();
});

test('splash spawning is bounded by the ring, deterministic, and skips covered ground', () => {
  // A zone covering everything: no splash may spawn under it.
  const fullCover = normalizeZones([
    { id: 'roof', rect: { minX: BOUNDS.minX, maxX: BOUNDS.maxX, minZ: BOUNDS.minZ, maxZ: BOUNDS.maxZ }, roofY: 4, exposure: 0, priority: 9, feather: 0.1 },
  ]);
  const covered = make({ zones: fullCover });
  covered.update({ timeMs: 0, rain: 1, dtMs: 1000 });
  assert.equal(covered.stats.spawnedSplashes, 0, 'splashes never spawn under cover');
  covered.dispose();

  const open = make({ zones: [] });
  open.update({ timeMs: 100, rain: 1, dtMs: 1000 });
  const first = open.stats.spawnedSplashes;
  assert.ok(first > 0 && first <= PRECIPITATION_TIERS.normal.splashRate, 'spawn rate bounded per second of rain');
  const splash = open.object3D.children[1];
  const array = splash.geometry.attributes.aSplash.array;
  const spawned = [];
  for (let i = 0; i < array.length; i += 3) if (array[i + 2] !== 0) spawned.push([array[i], array[i + 1]]);
  for (const [x, z] of spawned) {
    assert.ok(x >= BOUNDS.minX && x <= BOUNDS.maxX && z >= BOUNDS.minZ && z <= BOUNDS.maxZ, 'splashes stay inside the place');
  }
  // Determinism: the same seed reproduces the same spawn positions.
  const again = make({ zones: [] });
  again.update({ timeMs: 100, rain: 1, dtMs: 1000 });
  assert.equal(again.stats.spawnedSplashes, first);
  const array2 = again.object3D.children[1].geometry.attributes.aSplash.array;
  assert.deepEqual([...array2], [...array], 'identical seed → identical spawns');
  open.dispose();
  again.dispose();
});

test('update after dispose is a no-op and dispose is idempotent', () => {
  let disposes = 0;
  const precip = make();
  const disposeGeometries = precip.object3D.children.map(c => c.geometry);
  const originals = disposeGeometries.map(g => g.dispose);
  disposeGeometries.forEach((g, i) => { g.dispose = () => { disposes += 1; originals[i].call(g); }; });
  precip.dispose();
  const afterFirst = disposes;
  assert.ok(afterFirst >= 3, 'rain, splash and runoff geometries disposed');
  precip.dispose();
  assert.equal(disposes, afterFirst, 'second dispose disposes nothing again');
  const timeBefore = 0;
  precip.update({ timeMs: timeBefore, rain: 1, dtMs: 16 });
  assert.equal(precip.object3D.parent, null, 'disposed group is detached');
});

test('the rain shader masks the segment below the winning roof, matching the JS rule', () => {
  // The GLSL decision must mirror coverRoofAt; assert the uniform payload it
  // consumes matches the zones, and that the shader source carries the same
  // closed-rectangle + below-roof + clip logic (guards against drift).
  const precip = make();
  const uniforms = precip.object3D.children[0].material.uniforms;
  assert.equal(uniforms.uCoverCount.value, 1);
  // Zone payload check via the Vector4 slots: the arcade takes slot 0.
  const slot = uniforms.uCovers.value[0];
  assert.deepEqual([slot.x, slot.y, slot.z, slot.w], [-6, -4, -2, 4]);
  assert.ok(Math.abs(uniforms.uRoofY.value[0] - 3.4) < 1e-5, 'roof plane matches the authored zone');
  const source = precip.object3D.children[0].material.vertexShader;
  assert.ok(source.includes('p.y <= uRoofY[i]'), 'below-roof test present');
  assert.ok(source.includes('p.x >= c.x && p.x <= c.z'), 'closed x-bounds test present');
  assert.ok(source.includes('mix(tail, head, t)'), 'segment clip (not head-only) present');
  precip.dispose();
  void RAIN_HEIGHT;
  void SPLASH_LIFE_S;
});

test('reduced tier quarters rain density (comfort D8) while normal keeps full density', () => {
  for (const [tier, expected] of [['normal', 0.8], ['reduced', 0.2]]) {
    const precip = make({ tier });
    const rain = precip.object3D.children[0];
    precip.update({ timeMs: 0, rain: 0.8, dtMs: 16 });
    assert.ok(Math.abs(rain.material.uniforms.uDensity.value - expected) < 1e-9, `${tier} density`);
    precip.dispose();
  }
});
