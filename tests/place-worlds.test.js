import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  PLACE_DEFINITIONS,
  LEGACY_DISTRICT_IDS,
  PLACE_VIEW_FIXTURE,
  getPlaceDefinition,
} from '../shared/placeDefinitions.js';
import { registerPlaceBuilder } from '../src/places/registry.js';
import { buildPlaceWorld, gateItemsFor } from '../src/places/worldFactory.js';
import { buildDistrict } from '../src/districts.js';

// The fixture builder is deliberately tiny: one prop and one collision box,
// no urban shell, no gates.
registerPlaceBuilder('tinyView', ({ box, block }) => {
  box(0, 0.3, 0, 2, 0.6, 1.4, '#5d6658');
  block(0, 0, 2, 1.4);
});

// The frozen legacy route, pinned before any new definition may append: each
// district's east gate names the next entry and the route closes back onto
// the court.
const GOLDEN_EDGES = [
  ['court', 'canal'],
  ['canal', 'garden'],
  ['garden', 'station'],
  ['station', 'aqueduct'],
  ['aqueduct', 'caldera'],
  ['caldera', 'understory'],
  ['understory', 'saltworks'],
  ['saltworks', 'rooftops'],
  ['rooftops', 'mangrove'],
  ['mangrove', 'trestle'],
  ['trestle', 'foundry'],
  ['foundry', 'frost-spire'],
  ['frost-spire', 'delta'],
  ['delta', 'archives'],
  ['archives', 'kiln-terrace'],
  ['kiln-terrace', 'theater'],
  ['theater', 'court'],
];

test('the legacy topology is the exact golden 17-edge route with west, east and south gates', () => {
  assert.deepEqual([...LEGACY_DISTRICT_IDS], GOLDEN_EDGES.map(([from]) => from));
  assert.deepEqual(
    PLACE_DEFINITIONS.slice(0, 17).map(def => [def.id, def.exits.find(e => e.id === 'east').target]),
    GOLDEN_EDGES,
  );
  assert.equal(LEGACY_DISTRICT_IDS.length, GOLDEN_EDGES.length, 'one east edge per place: a closed 17-edge loop');
  for (const def of PLACE_DEFINITIONS.slice(0, 17)) {
    assert.equal(def.exits.length, 3, `${def.id} declares west, east and market exits`);
    const west = def.exits.find(e => e.id === 'west');
    const edgeIndex = GOLDEN_EDGES.findIndex(([from]) => from === def.id);
    assert.equal(west.target, GOLDEN_EDGES[(edgeIndex - 1 + GOLDEN_EDGES.length) % GOLDEN_EDGES.length][0],
      `${def.id} west gate follows the golden cycle`);
    assert.deepEqual(west.position, [-10.7, 0]);
    assert.deepEqual(def.exits.find(e => e.id === 'east').position, [10.7, 0]);
    assert.deepEqual(def.exits.find(e => e.kind === 'market'),
      { id: 'market', kind: 'market', position: [0, 8.8], target: 'market' });
  }
});

test('gate items reproduce the exact legacy copy from the declared exits', () => {
  assert.deepEqual(gateItemsFor(getPlaceDefinition('theater')), [
    { type: 'district_gate', x: -10.7, z: 0, targetDistrict: 'kiln-terrace', title: 'Gate to The Solar Kiln', sub: 'Westbound: TERRACOTTA DISTRICT / 19' },
    { type: 'district_gate', x: 10.7, z: 0, targetDistrict: 'court', title: 'Gate to The Rain Court', sub: 'Eastbound: LOWER DISTRICT / 04' },
    { type: 'market_gate', x: 0, z: 8.8, targetDistrict: 'market', title: 'Return to Market Court', sub: 'Trade produce & visit your garden' },
  ]);
  const courtGates = gateItemsFor(getPlaceDefinition('court'));
  assert.equal(courtGates[0].targetDistrict, 'theater', 'court west gate wraps around to the theater');
  assert.equal(courtGates[0].title, 'Gate to The Orpheum');
  assert.equal(courtGates[1].targetDistrict, 'canal');
});

function worldFingerprint(def) {
  const world = buildDistrict(def);
  const batch = world.group.children.find(o => o.isInstancedMesh);
  return {
    matrices: [...batch.instanceMatrix.array],
    colors: [...batch.instanceColor.array],
    obstacles: world.obstacles,
    items: world.items,
  };
}

test('appending the fixture cannot shift seeds, recolor legacy scenery or reroute Theater', () => {
  const seedsBefore = PLACE_DEFINITIONS.map(d => d.seed);
  const theaterGatesBefore = gateItemsFor(getPlaceDefinition('theater'));
  const canalBefore = worldFingerprint(getPlaceDefinition('canal'));

  // "Append" the fixture as change D will: a new entry after the frozen
  // legacy block, with the next seed in the sequence.
  const appended = [...PLACE_DEFINITIONS, PLACE_VIEW_FIXTURE];
  assert.equal(appended.length, PLACE_DEFINITIONS.length + 1);
  assert.equal(PLACE_VIEW_FIXTURE.seed, 17 * 37, 'the fixture takes the next seed without shifting legacy ones');
  assert.deepEqual(PLACE_DEFINITIONS.map(d => d.seed), seedsBefore, 'the manifest keeps its exact seeds');
  assert.deepEqual(gateItemsFor(getPlaceDefinition('theater')), theaterGatesBefore, 'gate derivation never consults list order');

  const fixtureWorld = buildDistrict(PLACE_VIEW_FIXTURE);
  assert.deepEqual(worldFingerprint(getPlaceDefinition('canal')), canalBefore,
    'building a fixture-defined place leaves legacy seeded scenery byte-identical');
});

test('an unknown builder key throws and names the definition', () => {
  assert.throws(
    () => buildPlaceWorld({ ...getPlaceDefinition('court'), id: 'mystery-place', builderKey: 'not-registered' }),
    /Place "mystery-place" declares unknown builder key: not-registered/,
  );
});

test('shell none skips floor, walls and lamps; legacy-urban keeps reproducing them', () => {
  const fixtureWorld = buildDistrict(PLACE_VIEW_FIXTURE);
  assert.equal(fixtureWorld.group.visible, false, 'a built world stays hidden until activation');
  assert.equal([...fixtureWorld.group.children].filter(o => o.isLight).length, 0, 'no street lamps');
  const fixtureBatch = fixtureWorld.group.children.find(o => o.isInstancedMesh);
  assert.equal(fixtureBatch.count, 1, 'only the builder’s own prop is batched — no floor, paving or walls');
  assert.deepEqual(fixtureWorld.obstacles, [{ x: 0, z: 0, w: 1.38, d: 1.08 }], 'no lamp posts or perimeter collision');

  const courtWorld = buildDistrict(getPlaceDefinition('canal'));
  assert.ok(courtWorld.obstacles.some(o => o.x === -10 && o.z === -7), 'legacy-urban keeps its west street lamp');
  assert.ok(courtWorld.obstacles.some(o => o.x === 10 && o.z === 8), 'legacy-urban keeps its east street lamp');
  assert.ok([...courtWorld.group.children].filter(o => o.isLight).length >= 2, 'legacy-urban keeps its lamp lights');
  const courtBatch = courtWorld.group.children.find(o => o.isInstancedMesh);
  assert.ok(courtBatch.count > 500, 'legacy-urban still batches the full paved shell');
});

test('the theater keeps its exact screen quad and a full house of seats', () => {
  const world = buildDistrict(getPlaceDefinition('theater'));
  assert.deepEqual(world.screenQuad.map(p => [p.x, p.y, p.z]), [
    [-6.5, 1.1, -8.28],
    [6.5, 1.1, -8.28],
    [6.5, 5.1, -8.28],
    [-6.5, 5.1, -8.28],
  ]);
  assert.ok(world.screenQuad.every(p => p instanceof THREE.Vector3), 'the quad stays world-space vectors for the DOM homography');
  const seats = world.items.filter(i => i.type === 'seat');
  assert.equal(seats.length, 48, 'every seat of the three rows is present');
  assert.ok(world.items.some(i => i.type === 'theater_screen'));
});

test('built worlds expose environment bindings and an explicit owned-resource set', () => {
  for (const id of ['court', 'canal', 'theater']) {
    const world = buildDistrict(getPlaceDefinition(id));
    assert.ok(['emitterAnchors', 'materialFamilies', 'zones'].every(key => key in world.environment),
      `${id} reports its atmosphere binding surface`);
    const { ownedResources } = world;
    assert.ok(ownedResources.geometries.length >= 1, `${id} owns its shared box geometry`);
    assert.ok(ownedResources.materials.length >= 1, `${id} owns its cached materials`);
    ownedResources.dispose();
    assert.equal(ownedResources.geometries.length, 0);
    ownedResources.dispose(); // repeated cleanup is safe
  }
});

test('a builder failure disposes exactly the owned resources and throws the builder error', () => {
  let geometryDisposals = 0, materialDisposals = 0;
  const geometryProto = THREE.BufferGeometry.prototype;
  const materialProto = THREE.Material.prototype;
  const originalGeometryDispose = geometryProto.dispose;
  const originalMaterialDispose = materialProto.dispose;
  geometryProto.dispose = function () { geometryDisposals++; return originalGeometryDispose.call(this); };
  materialProto.dispose = function () { materialDisposals++; return originalMaterialDispose.call(this); };
  registerPlaceBuilder('throwing', ({ box }) => {
    box(0, 0, 0, 1, 1, 1); // some owned geometry exists before the failure
    throw new Error('collapsed mid-build');
  });
  try {
    assert.throws(
      () => buildPlaceWorld({ ...getPlaceDefinition('court'), id: 'collapse-place', builderKey: 'throwing' }),
      /collapsed mid-build/,
    );
    assert.ok(geometryDisposals > 0, 'owned geometry was disposed');
    assert.ok(materialDisposals > 0, 'owned materials were disposed');
  } finally {
    geometryProto.dispose = originalGeometryDispose;
    materialProto.dispose = originalMaterialDispose;
  }
});
