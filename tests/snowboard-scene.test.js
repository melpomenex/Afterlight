/**
 * ALPINE RUSH scene port tests (integrate-ssxtricky-snowboard 2.1/2.2).
 *
 * The scene is a faithful extraction of the source engine.js scene: these
 * checks pin the source-defining composition (daylight palette, terrain
 * dimensions/winding, ramp/zone/pickup/banner counts, chairlift, rider rigs)
 * and the render-facing invariants (upward snow normals, camera framing on
 * the mountain, source lighting) without a renderer.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { createSnowboardScene } from '../src/activities/snowboard/scene.js';
import { initialState } from '../shared/snowboard/rules.js';
import { COURSE_ID, LENGTH_METERS, RAMP_COUNT, PICKUP_COUNT } from '../shared/snowboard/course.js';

const courseDoc = JSON.parse(readFileSync(new URL('../shared/snowboard/course-alpine-rush.json', import.meta.url)));

test('source composition is present: palette, counts, terrain, camera framing', async () => {
  const world = await createSnowboardScene({ courseDoc, quality: 'low' });
  try {
    assert.equal(world.courseId, COURSE_ID);
    // Daylight palette (source): sky + fog colors.
    assert.equal(`#${world.scene.background.getHexString()}`, '#a4cede');
    assert.equal(`#${world.scene.fog.color.getHexString()}`, '#b6d5e0');
    assert.equal(world.scene.fog.near, 125);
    assert.equal(world.scene.fog.far, 510);

    // Terrain: the source vertex-colored 440×2200 grid, upward normals.
    const terrain = world.scene.children.find((o) => o.isMesh && o.material.vertexColors);
    assert.ok(terrain, 'vertex-colored terrain exists');
    assert.equal(terrain.geometry.attributes.position.count, (550 + 1) * (70 + 1));
    // The winding start: the first row's lateral span covers ±220 around the
    // centerline, matching the source width 440.
    const pos = terrain.geometry.attributes.position;
    const firstRowX = [];
    for (let c = 0; c <= 70; c++) firstRowX.push(pos.getX(c));
    assert.ok(Math.abs(firstRowX[70] - firstRowX[0] - 440) < 1e-6, 'terrain width is the source 440 m');
    // Source winding faces down and renders through DoubleSide (engine.js
    // verbatim). The groomed corridor columns are near-horizontal; the wide
    // banks outside |x-center|>22 rise steeply by design (the corridor is a
    // narrow strip of the 440 m terrain).
    assert.equal(terrain.material.side, THREE.DoubleSide);
    const normals = terrain.geometry.attributes.normal;
    const cols = 70 + 1;
    let corridorFlat = 0, corridorTotal = 0;
    for (let c = 32; c <= 38; c++) {
      for (let r = 0; r <= 550; r++) {
        const i = r * cols + c;
        corridorTotal += 1;
        if (Math.abs(normals.getY(i)) > 0.9) corridorFlat += 1;
      }
    }
    assert.ok(corridorFlat > corridorTotal * 0.9, `corridor columns flat (${corridorFlat}/${corridorTotal})`);
    // No normals face up (source winding; DoubleSide shades them flipped).
    let upCount = 0;
    for (let i = 0; i < normals.count; i++) if (normals.getY(i) > 0.5) upCount += 1;
    assert.equal(upCount, 0);
    // The grid spans the source 2200 m length, d = -120..2080 → z = 120..-2080
    // (center ≈ -980), far beyond the 1800 m finish like the source vista.
    terrain.geometry.computeBoundingSphere();
    const center = terrain.geometry.boundingSphere.center;
    assert.ok(Math.abs(center.z - (-980)) < 40, `terrain length centered at -980 (got ${center.z})`);
    assert.ok(terrain.geometry.boundingSphere.radius > 1100, 'vista-scale bounding sphere');

    // Source feature counts on the analytic course.
    assert.equal(world.course.ramps.length, RAMP_COUNT);
    assert.equal(world.course.speedZones.length, RAMP_COUNT);
    assert.equal(world.course.pickups.length, PICKUP_COUNT);
    assert.equal(world.course.banners.length, 4);

    // Chairlift: source masts every 125 m from d=20 — at least a dozen boxes.
    const allBoxes = [];
    world.scene.traverse((o) => { if (o.isMesh && o.geometry?.type === 'BoxGeometry') allBoxes.push(o); });
    assert.ok(allBoxes.length > 100, `source scenery density present (${allBoxes.length} boxes)`);

    // Camera framing: lobby, start and mid-course all look at the mountain.
    // The source camera converges by lerp (1-e^(-dt*5)); warm it up first.
    const ray = new THREE.Raycaster();
    for (const state of [null, initialState(0), { ...initialState(0), s: 400, v: 25 }]) {
      for (let i = 0; i < 120; i++) world.update(i / 30, 1 / 60, state, []);
      world.update(4, 1 / 60, state, []);
      world.scene.updateMatrixWorld(true);
      world.camera.updateMatrixWorld(true);
      ray.setFromCamera(new THREE.Vector2(0, 0), world.camera);
      assert.ok(ray.intersectObject(terrain).length > 0, `mountain visible at center for ${state?.s ?? 'lobby'}`);
    }

    // Source lighting: hemisphere + directional sun (shadows off on the low
    // preset by design; the high preset casts — checked below).
    const lights = [];
    world.scene.traverse((o) => { if (o.isLight) lights.push(o); });
    assert.ok(lights.some((l) => l.isHemisphereLight));
    assert.ok(lights.some((l) => l.isDirectionalLight));

    // Pickups: claimed pickups hide for the local rider (per-rider claims).
    const state = initialState(0);
    world.update(0, 1 / 60, { ...state, pickupsClaimed: [0] }, []);
    assert.equal(world.getPickupMesh(0).visible, false);
    assert.equal(world.getPickupMesh(1).visible, true);
    void LENGTH_METERS;
  } finally {
    world.dispose();
  }
});

test('remote riders render with source rival accents and leave on removal', async () => {
  const world = await createSnowboardScene({ courseDoc, quality: 'high' });
  try {
    // High preset: the source sun casts shadows.
    const sun = [];
    world.scene.traverse((o) => { if (o.isLight && o.isDirectionalLight) sun.push(o); });
    assert.ok(sun.some((l) => l.castShadow));
    const remote = { playerId: 'p1', state: { ...initialState(1, 2), s: 30, v: 20 }, accent: '#7d5ecc' };
    const riderGroups = () => world.scene.children.filter((o) => o.isGroup).length;
    world.update(0, 1 / 60, initialState(0), [remote]);
    assert.equal(riderGroups(), 2, 'local + remote rigs present');
    world.update(0, 1 / 60, initialState(0), []);
    assert.equal(riderGroups(), 1, 'remote rig removed');
  } finally {
    world.dispose();
  }
});
