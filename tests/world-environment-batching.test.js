import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createTerrain, createTerrainSlicer, fbm } from '../src/environments/lib/terrain.js';
import { instanceVegetation, createInstanceSlicer } from '../src/environments/lib/vegetation.js';
import { WORLD_DEFINITIONS } from '../shared/worldDefinitions.js';

test('Task 6.6: createTerrainSlicer produces 100% bit-for-bit identical output to synchronous createTerrain', () => {
  const heightFn = (x, z) => fbm(x * 0.05, z * 0.05, 4, 0.5, 2.0, 42) * 5;
  const colorAtFn = ({ h, slope }) => (slope > 0.4 ? 0x888888 : 0x228833);

  const opts = {
    size: 40,
    segments: 16,
    height: heightFn,
    colorAt: colorAtFn,
    y: 0,
    roughness: 0.9,
    metalness: 0.1,
  };

  // 1. Synchronous single-pass terrain
  const directTerrain = createTerrain(opts);

  // 2. Resumable batched terrain in small slices
  const slicer = createTerrainSlicer({ ...opts, batchSize: 32 });
  assert.equal(slicer.isDone, false);

  let steps = 0;
  while (!slicer.isDone) {
    slicer.stepSlice();
    steps += 1;
    assert.ok(slicer.progress >= 0 && slicer.progress <= 1);
  }

  assert.ok(steps > 1, 'Slicer should have taken multiple slices');
  const batchedTerrain = slicer.getResult();

  // 3. Verify positions match bit-for-bit
  const directPos = directTerrain.geometry.attributes.position.array;
  const batchedPos = batchedTerrain.geometry.attributes.position.array;
  assert.equal(directPos.length, batchedPos.length);
  for (let i = 0; i < directPos.length; i++) {
    assert.equal(directPos[i], batchedPos[i], `Position mismatch at index ${i}`);
  }

  // 4. Verify vertex colors match bit-for-bit
  const directCol = directTerrain.geometry.attributes.color.array;
  const batchedCol = batchedTerrain.geometry.attributes.color.array;
  assert.equal(directCol.length, batchedCol.length);
  for (let i = 0; i < directCol.length; i++) {
    assert.equal(directCol[i], batchedCol[i], `Color mismatch at index ${i}`);
  }

  // 5. Verify normals match
  const directNorm = directTerrain.geometry.attributes.normal.array;
  const batchedNorm = batchedTerrain.geometry.attributes.normal.array;
  assert.equal(directNorm.length, batchedNorm.length);
  for (let i = 0; i < directNorm.length; i++) {
    assert.equal(directNorm[i], batchedNorm[i], `Normal mismatch at index ${i}`);
  }

  directTerrain.dispose();
  batchedTerrain.dispose();
});

test('Task 6.6: createInstanceSlicer produces 100% identical matrices to synchronous instanceVegetation', () => {
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const mat = new THREE.MeshBasicMaterial();

  const placements = [];
  for (let i = 0; i < 50; i++) {
    placements.push({
      x: i * 2,
      y: Math.sin(i),
      z: i * 3,
      rot: i * 0.1,
      scale: 1 + (i % 3) * 0.2,
    });
  }

  // Synchronous build
  const directMesh = instanceVegetation({
    geometry: geo,
    material: mat,
    placements,
    name: 'test-direct',
  });

  // Batched build in slices of 10
  const slicer = createInstanceSlicer({
    geometry: geo,
    material: mat,
    placements,
    name: 'test-batched',
    batchSize: 10,
  });

  let steps = 0;
  while (!slicer.isDone) {
    slicer.stepSlice();
    steps += 1;
  }
  assert.equal(steps, 5);

  const batchedMesh = slicer.getResult();

  // Compare instance matrix buffers
  const directMatrices = directMesh.instanceMatrix.array;
  const batchedMatrices = batchedMesh.instanceMatrix.array;
  assert.equal(directMatrices.length, batchedMatrices.length);
  for (let i = 0; i < directMatrices.length; i++) {
    assert.equal(directMatrices[i], batchedMatrices[i], `Matrix mismatch at ${i}`);
  }

  geo.dispose();
  mat.dispose();
});

test('Task 6.6: all eighteen baseline variants declare valid presets and features without missing variants', () => {
  let count = 0;
  for (const [worldId, world] of Object.entries(WORLD_DEFINITIONS)) {
    assert.ok(world.variants, `World ${worldId} must have variants`);
    const varKeys = Object.keys(world.variants);
    assert.equal(varKeys.length, 3, `World ${worldId} must have exactly 3 variants`);

    for (const [varId, variant] of Object.entries(world.variants)) {
      count += 1;
      assert.ok(variant.preset.startsWith(`env-${worldId}-`), `Preset name mismatch for ${worldId}:${varId}`);
      assert.ok(variant.features, `Variant ${varId} must have features`);
      assert.ok(variant.visuals, `Variant ${varId} must have visuals`);
    }
  }
  assert.equal(count, 18, 'Must cover all 18 baseline variants');
});
