import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createLcg, lcgFloat } from '../shared/atmosphereModel.js';
import { getTheaterVariant } from '../shared/theaterEnvironments.js';
import { createEnvironmentKit } from '../src/environments/lib/kit.js';
import { buildRedwood } from '../src/environments/redwood.js';
import { createRedwoodTrunkGeometry, createSwordFernGeometry } from '../src/environments/lib/redwoodGeometry.js';

function seeded() {
  const draw = createLcg(237);
  return () => lcgFloat(draw);
}
function assertFiniteGeometry(geometry) {
  for (const [name, attribute] of Object.entries(geometry.attributes)) {
    assert.ok(attribute.array.every(Number.isFinite), `${name} must be finite`);
  }
}
function forest(tier = 'high') {
  const group = new THREE.Group();
  const row = getTheaterVariant('redwood', 'firefly');
  const kit = createEnvironmentKit({ group, tier, seed: 237, features: row.features });
  const result = buildRedwood({ kit, row, tier, variantId: 'firefly' });
  return { group, kit, result };
}

test('redwood geometry is deterministic, finite and within vegetation triangle budgets', () => {
  for (const [make, budget] of [[createRedwoodTrunkGeometry, 6000], [createSwordFernGeometry, 1000]]) {
    const a = make({ rng: seeded() }), b = make({ rng: seeded() });
    assert.deepEqual(a.attributes.position.array, b.attributes.position.array);
    assert.deepEqual(a.attributes.color.array, b.attributes.color.array);
    assertFiniteGeometry(a);
    assert.ok(a.index.count / 3 <= budget);
    a.computeBoundingBox();
    assert.ok(a.boundingBox.min.y >= 0, 'vegetation rises above its ground origin');
    a.dispose(); b.dispose();
  }
});

test('redwood tiers build finite geometry and preserve the theater shell clearance', () => {
  const counts = [];
  const point = new THREE.Vector3(), matrix = new THREE.Matrix4();
  for (const tier of ['low', 'high']) {
    const { group, result } = forest(tier);
    try {
      counts.push(result.counts);
      group.traverse((object) => {
        if (object.geometry) assertFiniteGeometry(object.geometry);
        if (!object.isInstancedMesh || !/^redwood-(trunks-|roots$)/.test(object.name)) return;
        const positions = object.geometry.attributes.position;
        for (let instance = 0; instance < object.count; instance++) {
          object.getMatrixAt(instance, matrix);
          for (let v = 0; v < positions.count; v++) {
            point.fromBufferAttribute(positions, v).applyMatrix4(matrix);
            assert.ok(point.x < -13 || point.x > 13 || point.z < -14 || point.z > 12.5,
              `${tier} ${object.name} instance ${instance} enters the theater shell at ${point.toArray()}`);
          }
        }
      });
    } finally { result.dispose(); }
  }
  assert.ok(counts[1].trunks <= 17);
  for (const key of ['trunks', 'ferns', 'grass', 'rocks', 'moss', 'fireflies']) {
    assert.ok(counts[1][key] >= counts[0][key], `${key} must not decrease at high quality`);
  }
});

function visibility(group) {
  return ['redwood-fireflies', 'redwood-leaf-fall', 'redwood-sunshafts', 'redwood-haze-shafts', 'redwood-birds'].map((name) => {
    const object = group.getObjectByName(name);
    assert.ok(object, name);
    return { name, visible: object.visible, opacity: object.material?.uniforms?.uOpacity?.value };
  });
}

test('redwood variant transitions restore original features without stale fireflies or leaf fall', () => {
  const { group, result } = forest('low');
  try {
    const initial = visibility(group);
    for (const variantId of ['fog', 'sunshafts', 'firefly']) {
      result.setVariant({ ...getTheaterVariant('redwood', variantId), variantId });
      const fireflies = group.getObjectByName('redwood-fireflies');
      assert.equal(fireflies.material.uniforms.uOpacity.value, variantId === 'firefly' ? 0.9 : 0);
    }
    assert.deepEqual(visibility(group), initial);
  } finally { result.dispose(); }
});

test('redwood disposal releases owned mesh geometries and material textures', () => {
  const { group, kit, result } = forest('low');
  const owned = new Set();
  group.traverse((object) => {
    if (object.geometry) owned.add(object.geometry);
    for (const material of [object.material].flat().filter(Boolean)) {
      owned.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) owned.add(value);
      for (const uniform of Object.values(material.uniforms ?? {})) if (uniform.value?.isTexture) owned.add(uniform.value);
    }
  });
  const disposed = new Set();
  for (const resource of owned) resource.addEventListener('dispose', () => disposed.add(resource));
  result.dispose();
  assert.equal(kit.trackedCount, 0);
  for (const resource of owned) assert.ok(disposed.has(resource), `${resource.type ?? resource.constructor.name} must be disposed`);
});
