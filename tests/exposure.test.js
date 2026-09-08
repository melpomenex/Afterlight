import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MAX_EXPOSURE_ZONES,
  normalizeZone,
  normalizeZones,
  classifyExposure,
  coverRoofAt,
  coverUniforms,
  signedInsideDistance,
} from '../src/atmosphere/exposure.js';

const arcade = {
  id: 'arcade',
  rect: { minX: -6, maxX: -2, minZ: -4, maxZ: 4 },
  roofY: 3.4,
  exposure: 0.1,
  priority: 1,
  feather: 0.5,
};

const alcove = {
  id: 'alcove',
  rect: { minX: -5, maxX: -3, minZ: -2, maxZ: 0 },
  roofY: 2.2,
  exposure: 0,
  priority: 2, // higher priority than the arcade
  feather: 0.5,
};

test('zones normalize with defaults and deterministic ordering', () => {
  const normalized = normalizeZones([
    { id: 'zebra', rect: { minX: 0, maxX: 1, minZ: 0, maxZ: 1 }, exposure: 0.4, priority: 0 },
    { id: 'alpha', rect: { minX: 0, maxX: 1, minZ: 0, maxZ: 1 }, exposure: 0.4, priority: 0 },
    { id: 'high', rect: { minX: 0, maxX: 1, minZ: 0, maxZ: 1 }, exposure: 0.2, priority: 5 },
    { rect: { minX: 9, maxX: 0, minZ: 0, maxZ: 1 } }, // inverted rect: dropped
    null,
  ]);
  assert.deepEqual(normalized.map(z => z.id), ['high', 'alpha', 'zebra'],
    'priority desc, then exposure asc, then lexical id');
  assert.equal(normalized[1].feather, 0.5, 'default feather');
  assert.equal(normalized[1].roofY, 3, 'default roof height');
});

test('the zone cap holds: only the first MAX_EXPOSURE_ZONES valid zones survive', () => {
  const many = Array.from({ length: MAX_EXPOSURE_ZONES + 10 }, (_, i) => ({
    id: `z${String(i).padStart(2, '0')}`,
    rect: { minX: i, maxX: i + 1, minZ: 0, maxZ: 1 },
    exposure: 0.5,
    priority: MAX_EXPOSURE_ZONES + 10 - i, // descending priority: a stable subset
  }));
  const normalized = normalizeZones(many);
  assert.equal(normalized.length, MAX_EXPOSURE_ZONES, 'cap enforced');
  assert.equal(normalized[0].id, 'z00', 'deterministic subset (priority order, not array luck)');
});

test('exposure is 1 outside every zone and the authored value deep inside', () => {
  const zones = normalizeZones([arcade]);
  assert.equal(classifyExposure(zones, 0, 0).exposure, 1, 'open sky far from cover');
  assert.equal(classifyExposure(zones, 0, 0).zoneId, null);
  const inside = classifyExposure(zones, -4, 0);
  assert.equal(inside.exposure, arcade.exposure, 'full weight deep inside');
  assert.equal(inside.zoneId, 'arcade');
});

test('the feather band is symmetric, smooth, and exactly half-weight on the boundary', () => {
  const zones = normalizeZones([arcade]);
  const out = {};
  // Boundary point: signed distance 0 → weight 0.5 → halfway mix.
  const atBoundary = classifyExposure(zones, -2, 0, out);
  assert.ok(Math.abs(atBoundary.exposure - (1 + arcade.exposure) / 2) < 1e-9,
    'boundary mixes exactly halfway');
  // Monotonic fall across the inner band; flat past the feather.
  const deep = classifyExposure(zones, -2.6, 0).exposure;
  const nearEdge = classifyExposure(zones, -2.2, 0).exposure;
  assert.ok(deep === arcade.exposure, 'past the feather the zone owns the point');
  assert.ok(nearEdge < atBoundary.exposure && nearEdge > arcade.exposure, 'smooth inner approach');
  // Outside the outer half-band the point is fully exposed.
  assert.equal(classifyExposure(zones, -1.4, 0).exposure, 1, 'past the outer band: open sky');
  assert.equal(classifyExposure(zones, -1.5, 0).exposure, 1, 'exactly feather distance outside: still open');
  assert.ok(classifyExposure(zones, -1.6, 0).exposure < 1, 'inside the outer band the mix begins');
});

test('signed distance is exact at corners (euclidean outside, min-axis inside)', () => {
  const rect = { minX: 0, maxX: 2, minZ: 0, maxZ: 2 };
  assert.equal(signedInsideDistance(rect, 1, 1), 1, 'center: one unit from every wall');
  assert.equal(signedInsideDistance(rect, 0.2, 1), 0.2, 'inside: nearest wall governs');
  assert.equal(signedInsideDistance(rect, -3, -4), -5, 'outside corner: euclidean distance');
  assert.equal(signedInsideDistance(rect, -3, 1), -3, 'outside beside a wall');
});

test('overlap resolves deterministically: priority, then lower exposure, then id', () => {
  const zones = normalizeZones([arcade, alcove]);
  // The alcove overlaps the arcade's deep interior; higher priority wins.
  const deep = classifyExposure(zones, -4, -1);
  assert.equal(deep.zoneId, 'alcove', 'higher priority zone applies consistently');
  assert.equal(deep.exposure, alcove.exposure);
  // Same point, same weights, reversed declaration order — same winner.
  const flipped = normalizeZones([alcove, arcade]);
  assert.equal(classifyExposure(flipped, -4, -1).zoneId, 'alcove', 'declaration order never matters');

  const tieA = { id: 'aaa', rect: { minX: 0, maxX: 4, minZ: 0, maxZ: 4 }, exposure: 0.4, priority: 1 };
  const tieB = { id: 'bbb', rect: { minX: 0, maxX: 4, minZ: 0, maxZ: 4 }, exposure: 0.4, priority: 1 };
  assert.equal(classifyExposure(normalizeZones([tieB, tieA]), 2, 2).zoneId, 'aaa', 'full tie: lexical id');

  const shieldA = { id: 'aaa', rect: { minX: 0, maxX: 4, minZ: 0, maxZ: 4 }, exposure: 0.6, priority: 1 };
  const shieldB = { id: 'bbb', rect: { minX: 0, maxX: 4, minZ: 0, maxZ: 4 }, exposure: 0.2, priority: 1 };
  const winner = classifyExposure(normalizeZones([shieldA, shieldB]), 2, 2);
  assert.equal(winner.zoneId, 'bbb', 'equal priority: the more sheltering zone wins');
  assert.equal(winner.exposure, 0.2);
});

test('partial canopy: a half-exposed zone feathers toward it from both sides', () => {
  const canopy = { id: 'canopy', rect: { minX: 2, maxX: 8, minZ: 2, maxZ: 8 }, roofY: 5, exposure: 0.5, priority: 1, feather: 1 };
  const zones = normalizeZones([canopy]);
  const inside = classifyExposure(zones, 5, 5).exposure;
  const edge = classifyExposure(zones, 2, 5).exposure;
  const outside = classifyExposure(zones, 0.5, 5).exposure;
  assert.equal(inside, 0.5);
  assert.ok(Math.abs(edge - 0.75) < 1e-9, 'boundary sits halfway between 1 and 0.5');
  assert.equal(outside, 1);
});

test('cover queries: below-roof points inside a rect are clipped, everything else is not', () => {
  const zones = normalizeZones([arcade, alcove]);
  assert.equal(coverRoofAt(zones, -4, 1, -1), alcove.roofY, 'below the alcove roof inside its rect (nested: alcove wins)');
  assert.equal(coverRoofAt(zones, -4, 3, -1), arcade.roofY, 'above the alcove roof but under the arcade: arcade still covers');
  assert.equal(coverRoofAt(zones, -4, 4, -1), null, 'above every roof: rain passes overhead');
  assert.equal(coverRoofAt(zones, -4, 1, 3), arcade.roofY, 'arcade cover where the alcove does not reach');
  assert.equal(coverRoofAt(zones, 0, 1, 0), null, 'open ground is never masked');
  assert.equal(coverRoofAt(zones, -2, 1, 4.01), null, 'closed boundary: outside the max edge is open');
  assert.equal(coverRoofAt(zones, -6, 1, 4), arcade.roofY, 'closed boundary: ON the min edge is covered');
});

test('cover uniforms fill fixed-size slots in winner-first order and report the count', () => {
  const zones = normalizeZones([arcade, alcove]);
  const covers = new Float32Array(MAX_EXPOSURE_ZONES * 4);
  const roofY = new Float32Array(MAX_EXPOSURE_ZONES);
  const count = coverUniforms(zones, covers, roofY);
  assert.equal(count, 2);
  assert.deepEqual([...covers.slice(0, 8)], [-5, -2, -3, 0, -6, -4, -2, 4], 'alcove (higher priority) takes slot 0');
  assert.ok(Math.abs(roofY[0] - 2.2) < 1e-5, 'alcove roof height (Float32 slots)');
  assert.ok(Math.abs(roofY[1] - 3.4) < 1e-5, 'arcade roof height (Float32 slots)');
  assert.deepEqual([...covers.slice(8)], new Array(MAX_EXPOSURE_ZONES * 4 - 8).fill(0), 'inactive slots zeroed');
  assert.deepEqual([...roofY.slice(2)], new Array(MAX_EXPOSURE_ZONES - 2).fill(0));
});

test('malformed zones are rejected individually without poisoning the list', () => {
  assert.equal(normalizeZone(null), null);
  assert.equal(normalizeZone({ id: 'x' }), null, 'missing rect');
  assert.equal(normalizeZone({ rect: { minX: 'a', maxX: 1, minZ: 0, maxZ: 1 } }), null, 'non-finite corner');
  const weird = normalizeZone({ rect: { minX: 0, maxX: 1, minZ: 0, maxZ: 1 }, exposure: 7, feather: -2, priority: 'x' });
  assert.equal(weird.exposure, 1, 'exposure clamps into [0, 1]');
  assert.equal(weird.feather, 0.5, 'non-positive feather falls back to the default');
  assert.equal(weird.priority, 0, 'non-numeric priority defaults');
});
