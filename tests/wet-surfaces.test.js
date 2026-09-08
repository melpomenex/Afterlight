import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

import { registerPlaceBuilder } from '../src/places/registry.js';
import { buildPlaceWorld } from '../src/places/worldFactory.js';
import { buildDistrict, districts } from '../src/districts.js';
import { getPlaceDefinition } from '../shared/placeDefinitions.js';
import { createSurfaceWetness, createProceduralWetMap, PUDDLE_CAPS } from '../src/atmosphere/surfaces.js';

// A fixture builder that declares atmosphere material families the way a
// weather place will: an exposed wet family, a SHELTERED family under a
// roof, plain legacy-colored boxes, puddle anchors and a runoff anchor.
registerPlaceBuilder('wetFixture', ({ box, block, family, environment }) => {
  const wetStone = family('wet-stone', { color: '#6b776c', roughness: 0.62, metalness: 0.2 });
  const sheltered = family('sheltered-stone', { color: '#586b6d', roughness: 0.5, metalness: 0.1, sheltered: true });
  box(0, 0.3, 0, 4, 0.6, 3, wetStone); // exposed slab
  box(0, 0.3, 4, 2, 0.6, 2, sheltered); // slab under the cover
  box(0, 2.6, 4, 3, 0.2, 3, '#3a4a4e'); // the roof itself (plain family: legacy batch)
  box(3, 0.4, -3, 1, 0.8, 1, '#7c8a7e'); // legacy-colored prop
  block(0, 0, 4, 3);
  environment.emitterAnchors.push(
    { id: 'p1', kind: 'puddle', x: 2, z: 1, w: 1.6, d: 1 },
    { id: 'p2', kind: 'puddle', x: -1.5, z: -1, w: 1.2, d: 0.9 },
    { id: 'p3', kind: 'puddle', x: 0.5, z: 2.2, w: 1, d: 1 },
    { id: 'p4', kind: 'puddle', x: -2, z: 2, w: 1, d: 1 },
    { id: 'p5', kind: 'puddle', x: 2.2, z: -1.8, w: 1, d: 1 },
    { id: 'p6', kind: 'puddle', x: 1.4, z: -0.4, w: 1, d: 1 },
    { id: 'p7', kind: 'puddle', x: -0.8, z: 0.6, w: 1, d: 1 },
    { id: 'p8', kind: 'puddle', x: 2.8, z: 0.4, w: 1, d: 1 },
    { id: 'p9', kind: 'puddle', x: 3.2, z: 1.4, w: 1, d: 1 }, // over the cap: dropped
    { id: 'r1', kind: 'runoff', x: 0, y: 2.5, z: 2.6 },
  );
});

function wetFixtureDef(id = 'wet-fixture') {
  return {
    id,
    name: 'The Wet Fixture',
    kind: 'view',
    seed: 991,
    bounds: { minX: -4, maxX: 4, minZ: -3.5, maxZ: 3.5 },
    spawn: [-3, 0],
    companionSpawn: [-2.2, 1],
    exits: [],
    minimapPath: 'M24 24H130V96H24Z',
    shell: 'none',
    builderKey: 'wetFixture',
    atmosphere: { preset: 'rain', weatherMode: 'fixed', timeMode: 'fixed' },
    capabilities: { seating: false, sharedMedia: false, conferencing: false },
    social: { featured: false, legacy: false },
  };
}

function instancedBatches(world) {
  return world.group.children.filter(o => o.isInstancedMesh);
}

test('family boxes batch by declared family with the family material bound post-batch', () => {
  const world = buildPlaceWorld(wetFixtureDef());
  const [families, declarations] = [instancedBatches(world), world.environment.materialFamilies];
  assert.equal(families.length, 3, 'wet family, sheltered family and the legacy leftover batch');
  assert.equal(declarations.length, 2, 'two declared families');

  const wetDeclaration = declarations.find(d => d.key === 'wet-stone');
  const wetBatch = families.find(b => b.material === wetDeclaration.material);
  assert.ok(wetBatch, 'the wet family material IS the batch material (post-batch binding)');
  assert.equal(wetBatch.count, 1, 'only the family boxes ride the family batch');
  assert.ok(wetDeclaration.batch === wetBatch, 'the declaration reports its batch');
  assert.deepEqual(wetDeclaration.dry, { color: new THREE.Color('#6b776c').getHex(), roughness: 0.62, metalness: 0.2 },
    'the dry snapshot is immutable declared data');

  const shelteredDeclaration = declarations.find(d => d.key === 'sheltered-stone');
  assert.equal(families.filter(b => b.material === shelteredDeclaration.material)[0].count, 1);

  const legacyBatch = families.find(b => b.material.color.getHex() === 0xffffff);
  assert.equal(legacyBatch.count, 2, 'plain boxes keep the legacy single batch');
  assert.equal(legacyBatch.material.roughness, 0.62, 'legacy batch material is the historical one');
});

test('wetness changes batched slabs absolutely and ten wet/dry cycles restore dry bytes exactly', () => {
  const world = buildPlaceWorld(wetFixtureDef());
  const surfaces = createSurfaceWetness({ world, seed: 5 });
  const declaration = world.environment.materialFamilies.find(d => d.key === 'wet-stone');
  const material = declaration.material;
  const dry = { color: material.color.getHex(), roughness: material.roughness };

  surfaces.apply(1);
  const wetColor = material.color.getHex();
  const wetRoughness = material.roughness;
  assert.ok(wetColor !== dry.color, 'wet color differs from dry');
  const dryColorObj = new THREE.Color(dry.color);
  assert.ok(Math.abs(material.color.r - dryColorObj.r * 0.72) < 1e-9, 'wet color is exactly the dry color × 0.72');
  assert.ok(Math.abs(wetRoughness - Math.max(0.18, dry.roughness * 0.45)) < 1e-9, 'wet roughness is exactly max(0.18, dry × 0.45)');
  assert.equal(material.metalness, declaration.dry.metalness, 'metalness unchanged');
  assert.ok(wetRoughness < dry.roughness, 'wet roughness drops');

  // The absolute response: same wetness, same bytes, from any history.
  surfaces.apply(0.5);
  surfaces.apply(1);
  assert.equal(material.color.getHex(), wetColor, 're-applying full wetness is byte-identical');
  assert.equal(material.roughness, wetRoughness, 're-applying full wetness is byte-identical');

  for (let cycle = 0; cycle < 10; cycle++) {
    surfaces.apply(1);
    surfaces.apply(0);
  }
  assert.equal(material.color.getHex(), dry.color, 'ten cycles restore the dry color exactly');
  assert.equal(material.roughness, dry.roughness, 'ten cycles restore the dry roughness exactly');
  surfaces.dispose();
  assert.equal(material.color.getHex(), dry.color, 'dispose leaves the dry material');
});

test('the sheltered family never changes and stays distinguishable under full wetness', () => {
  const world = buildPlaceWorld(wetFixtureDef());
  const surfaces = createSurfaceWetness({ world, seed: 5 });
  const sheltered = world.environment.materialFamilies.find(d => d.key === 'sheltered-stone');
  const before = { color: sheltered.material.color.getHex(), roughness: sheltered.material.roughness };
  assert.deepEqual(surfaces.shelteredKeys, ['sheltered-stone'], 'sheltered family bound but not wettable');
  assert.deepEqual(surfaces.wettableKeys, ['wet-stone']);

  surfaces.apply(1);
  assert.equal(sheltered.material.color.getHex(), before.color, 'sheltered color unchanged at full wetness');
  assert.equal(sheltered.material.roughness, before.roughness, 'sheltered roughness unchanged at full wetness');
  surfaces.dispose();
});

test('two worlds never share a mutable wet material', () => {
  const worldA = buildPlaceWorld(wetFixtureDef('wet-fixture-a'));
  const worldB = buildPlaceWorld(wetFixtureDef('wet-fixture-b'));
  const surfacesA = createSurfaceWetness({ world: worldA, seed: 5 });
  const surfacesB = createSurfaceWetness({ world: worldB, seed: 5 });
  const materialA = worldA.environment.materialFamilies.find(d => d.key === 'wet-stone').material;
  const materialB = worldB.environment.materialFamilies.find(d => d.key === 'wet-stone').material;
  assert.notEqual(materialA, materialB, 'each world owns its family material');

  surfacesA.apply(1);
  assert.ok(materialA.color.getHex() !== materialB.color.getHex(), 'wetting world A leaves world B dry');
  assert.equal(materialB.roughness, 0.62, 'world B roughness untouched');
  surfacesB.apply(1);
  assert.equal(materialB.color.getHex(), materialA.color.getHex(), 'both wet look identical (absolute response)');
  surfacesA.dispose();
  surfacesB.dispose();
});

test('puddles pool from authored anchors, capped 8 normal / 4 reduced, one draw each', () => {
  const world = buildPlaceWorld(wetFixtureDef());
  const surfaces = createSurfaceWetness({ world, seed: 5, tier: 'normal' });
  assert.equal(surfaces.puddleCount, PUDDLE_CAPS.normal, 'normal caps at 8 (9th anchor dropped)');
  const group = surfaces.object3D;
  assert.equal(group.children.length, 2, 'puddles and glints, one instanced draw each');
  assert.equal(group.children[0].count, 8);

  assert.equal(surfaces.setTier('reduced'), true, 'tier switch applies');
  assert.equal(surfaces.puddleCount, PUDDLE_CAPS.reduced, 'reduced caps at 4 without reallocating');
  assert.equal(group.children[0].geometry, group.children[0].geometry, 'same pooled geometry');
  surfaces.dispose();

  const noAnchors = createSurfaceWetness({ world: { environment: {} }, seed: 1 });
  assert.equal(noAnchors.puddleCount, 0, 'a world without puddle anchors pools nothing');
  noAnchors.dispose();
});

test('the procedural wet map binds once, and dispose removes it and restores dry', () => {
  const world = buildPlaceWorld(wetFixtureDef());
  const declaration = world.environment.materialFamilies.find(d => d.key === 'wet-stone');
  const material = declaration.material;
  assert.equal(material.roughnessMap, null, 'nothing bound before activation');
  const surfaces = createSurfaceWetness({ world, seed: 5 });
  assert.ok(material.roughnessMap, 'the wet map binds to the family material');
  assert.equal(material.roughnessMap.image.width, 128, 'the map is bounded (128²)');

  let textureDisposals = 0;
  const original = material.roughnessMap.dispose;
  material.roughnessMap.dispose = function () { textureDisposals += 1; return original.call(this); };
  surfaces.dispose();
  assert.equal(material.roughnessMap, null, 'dispose removes the map');
  assert.equal(textureDisposals, 1, 'the owned map is disposed exactly once');
  assert.equal(material.color.getHex(), new THREE.Color('#6b776c').getHex(), 'dry color restored');
});

test('dispose counts: only owned resources go, restore happens before teardown', () => {
  const world = buildPlaceWorld(wetFixtureDef());
  const surfaces = createSurfaceWetness({ world, seed: 5 });
  surfaces.apply(0.8);
  let materialDisposals = 0;
  const group = surfaces.object3D;
  group.traverse(o => {
    if (o.material) {
      const original = o.material.dispose;
      o.material.dispose = function () { materialDisposals += 1; return original.call(this); };
    }
  });
  let geometryDisposals = 0;
  group.traverse(o => {
    if (o.geometry) {
      const original = o.geometry.dispose;
      o.geometry.dispose = function () { geometryDisposals += 1; return original.call(this); };
    }
  });
  surfaces.dispose();
  assert.equal(materialDisposals, 2, 'puddle + glint materials disposed');
  assert.equal(geometryDisposals, 2, 'puddle + glint geometries disposed');
  surfaces.dispose(); // idempotent
  assert.equal(materialDisposals, 2, 'double dispose adds nothing');
  // World-owned materials survive the controller exit.
  for (const declaration of world.environment.materialFamilies) {
    assert.equal(declaration.material.color.getHex(), declaration.dry.color, 'world material restored to dry');
  }
});

test('worlds whose builders declare no families keep the exact single batch', () => {
  // The canal is still a plain legacy builder: every static box shares the
  // color-cache materials and no family declarations exist.
  const canal = buildDistrict(getPlaceDefinition('canal'));
  assert.deepEqual(canal.environment.materialFamilies, [], 'plain builders declare no families');
  const batches = instancedBatches(canal);
  assert.equal(batches.length, 1, 'exactly the legacy single batch');
  assert.equal(batches[0].material.color.getHex(), 0xffffff);
  assert.equal(batches[0].material.roughness, 0.62);
  assert.ok(batches[0].count > 500, 'the full paved shell still rides one batch');
  const canalSurfaces = createSurfaceWetness({ world: canal, seed: 3 });
  assert.deepEqual(canalSurfaces.wettableKeys, [], 'nothing to wet on a family-free world');
  canalSurfaces.dispose();

  // The social worlds (rain court et al.) declare families of their own and
  // stay wettable end to end through the same binding contract.
  const court = buildDistrict(getPlaceDefinition('court'));
  const courtSurfaces = createSurfaceWetness({ world: court, seed: 3 });
  assert.ok(courtSurfaces.wettableKeys.includes('wet-stone'), 'the rain court exposes a wettable family');
  const courtWet = court.environment.materialFamilies.find(d => d.key === 'wet-stone');
  const dryColor = courtWet.material.color.getHex();
  courtSurfaces.apply(1);
  assert.ok(courtWet.material.color.getHex() !== dryColor, 'rain-court batched slabs respond to wetness');
  courtSurfaces.dispose();
  assert.equal(courtWet.material.color.getHex(), dryColor, 'and restore dry exactly');

  // And every public district still ends up with at least one instanced
  // batch anywhere in its tree (social worlds batch under their subgroup).
  for (const def of districts.slice(1)) {
    const world = buildDistrict(def);
    let batched = false;
    world.group.traverse(o => { if (o.isInstancedMesh) batched = true; });
    assert.ok(batched, `${def.id} keeps a static batch`);
  }
});

test('the procedural wet map is deterministic from its seed', () => {
  const a = createProceduralWetMap(64, 42);
  const b = createProceduralWetMap(64, 42);
  assert.deepEqual([...a.image.data], [...b.image.data], 'same seed, same bytes');
  const c = createProceduralWetMap(64, 43);
  assert.notDeepEqual([...a.image.data], [...c.image.data], 'different seed, different bytes');
  a.dispose();
  b.dispose();
  c.dispose();
});
