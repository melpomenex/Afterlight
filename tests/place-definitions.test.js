import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PLACE_DEFINITIONS,
  LEGACY_DISTRICT_IDS,
  PLACE_VIEW_FIXTURE,
  LEGACY_URBAN_BOUNDS,
  getPlaceDefinition,
  validatePlaceDefinition,
  validatePlaceDefinitions,
} from '../shared/placeDefinitions.js';
import { registerPlaceBuilder, requirePlaceBuilder, hasPlaceBuilder } from '../src/places/registry.js';
import { buildDistrict, districts, readExploration } from '../src/districts.js';
import { WORLD_BOUNDS, getBoundsForRoom, registerPlaceBounds, isWalkable, clampClickTarget, projectToMinimap } from '../src/world/bounds.js';

const validBase = {
  id: 'probe-place',
  name: 'Probe Place',
  kind: 'environment',
  seed: 5,
  bounds: { minX: -4, maxX: 4, minZ: -3, maxZ: 3 },
  spawn: [-2, 0],
  companionSpawn: [-1.2, 1],
  exits: [{ id: 'east', kind: 'district', position: [3.5, 0], target: 'court' }],
  minimapPath: 'M24 24H130V96H24Z',
  shell: 'none',
  builderKey: 'probeBuilder',
  atmosphere: { preset: null, weatherMode: 'fixed', timeMode: 'fixed' },
  capabilities: { seating: false, sharedMedia: false, conferencing: false },
  social: { featured: false, legacy: false },
  objective: null,
  note: null,
};

// The fixture builder is intentionally tiny: one prop, no urban shell, no
// gates — the schema must not force a district-sized level.
registerPlaceBuilder('tinyView', ({ box, block }) => {
  box(0, 0.3, 0, 2, 0.6, 1.4, '#5d6658');
  block(0, 0, 2, 1.4);
});
registerPlaceBounds(PLACE_VIEW_FIXTURE);

test('legacy identity survives the manifest migration intact', () => {
  assert.equal(districts, PLACE_DEFINITIONS, 'src/districts.js re-exports the shared manifest');
  assert.deepEqual(districts.slice(0, 17).map(d => d.id), [...LEGACY_DISTRICT_IDS], 'order and ids are frozen');
  assert.equal(LEGACY_DISTRICT_IDS.length, 17);
  assert.ok(Object.isFrozen(PLACE_DEFINITIONS) && Object.isFrozen(PLACE_DEFINITIONS[0]));
  assert.ok(Object.isFrozen(getPlaceDefinition('court').exits) && Object.isFrozen(getPlaceDefinition('court').bounds));
  // Seeds are the explicit historical values: old array index × 37, zero for court.
  for (const [index, def] of PLACE_DEFINITIONS.entries()) {
    assert.equal(def.seed, index * 37, `${def.id} keeps its exact procedural seed`);
  }
  assert.equal(getPlaceDefinition('theater').seed, 592);
});

test('migrated definitions retain their original display fields and framework contract', () => {
  const court = getPlaceDefinition('court');
  assert.deepEqual(court, {
    id: 'court', name: 'The Rain Court', district: 'LOWER DISTRICT / 04', subtitle: 'STAY FOR THE RAIN', color: '#283f51', sun: '#b8cbd8', description: 'Rain on blue stone. A warm arcade and a seat out of the weather.',
    kind: 'environment', seed: 0, bounds: { minX: -11.3, maxX: 11.3, minZ: -9.5, maxZ: 10.3 }, spawn: [-9, 0], companionSpawn: [-8.2, 1],
    shell: 'none', builderKey: 'court', minimapPath: 'M34 40H119V49H34Z M80 53H90V60H80Z M29 58H124 M77 58V88',
    atmosphere: { preset: 'rain-night', weatherMode: 'fixed', timeMode: 'fixed' },
    capabilities: { seating: true, sharedMedia: false, conferencing: false },
    social: { featured: true, legacy: true },
    exits: [
      { id: 'west', kind: 'district', position: [-10.7, 0], target: 'theater' },
      { id: 'east', kind: 'district', position: [10.7, 0], target: 'canal' },
      { id: 'market', kind: 'market', position: [0, 8.8], target: 'market' },
    ],
  });
  const theater = getPlaceDefinition('theater');
  assert.equal(theater.kind, 'venue');
  assert.deepEqual(theater.capabilities, { seating: true, sharedMedia: true, conferencing: false });
  assert.deepEqual(theater.landmark, [0, 7.6]);
  assert.equal(theater.noteTitle, 'The Orpheum’s house rules');
  assert.deepEqual(theater.bounds, { ...LEGACY_URBAN_BOUNDS });
  for (const def of PLACE_DEFINITIONS) {
    for (const field of ['name', 'district', 'subtitle', 'color', 'sun', 'description', 'minimapPath', 'shell', 'builderKey']) {
      assert.equal(typeof def[field], 'string', `${def.id} retains ${field}`);
    }
    assert.deepEqual(def.spawn, [-9, 0], `${def.id} keeps its legacy spawn`);
    assert.deepEqual(def.companionSpawn, [-8.2, 1], `${def.id} keeps its legacy companion spawn`);
    assert.equal(validatePlaceDefinition(def).length, 0, `${def.id} passes validation`);
  }
  assert.deepEqual(validatePlaceDefinitions(PLACE_DEFINITIONS), [], 'the whole manifest validates');
});

test('validation reports duplicate ids, bad bounds and unsafe spawns with the offending id', () => {
  const doubled = [validBase, { ...validBase, builderKey: 'other' }];
  assert.deepEqual(validatePlaceDefinitions(doubled), [
    { id: 'probe-place', problems: ['duplicate id'] },
    { id: 'probe-place', problems: ['duplicate id'] },
  ]);

  const nonFinite = { ...validBase, id: 'broken-bounds', bounds: { minX: NaN, maxX: 11.3, minZ: -9.5, maxZ: 10.3 } };
  const inverted = { ...validBase, id: 'inverted', bounds: { minX: 5, maxX: -5, minZ: -9.5, maxZ: 10.3 } };
  for (const def of [nonFinite, inverted]) {
    const report = validatePlaceDefinitions([def]);
    assert.equal(report.length, 1);
    assert.equal(report[0].id, def.id);
    assert.ok(report[0].problems.length > 0);
  }

  const outside = { ...validBase, id: 'outside-spawn', spawn: [50, 0] };
  const onEdge = { ...validBase, id: 'edge-spawn', companionSpawn: [4, 3] };
  for (const def of [outside, onEdge]) {
    assert.ok(validatePlaceDefinitions([def]).some(r => r.id === def.id), `${def.id} spawn is reported`);
  }
});

test('optional restoration tuples must be complete or absent', () => {
  const headless = { ...validBase, id: 'headless-objective', objective: 'Restore the thing' };
  assert.deepEqual(
    validatePlaceDefinitions([headless]),
    [{ id: 'headless-objective', problems: ['objective tuple is incomplete: action, done, message and landmark are required alongside objective'] }],
  );
  const orphanParts = { ...validBase, id: 'orphan-parts', action: 'Do it', done: 'Did it' };
  assert.ok(
    validatePlaceDefinitions([orphanParts])[0].problems.some(p => p.includes('objective-free')),
    'restoration fields without an objective are rejected',
  );
  const headlessNote = { ...validBase, id: 'headless-note', note: [1, 1] };
  assert.ok(validatePlaceDefinitions([headlessNote])[0].problems.some(p => p.includes('note tuple is incomplete')));
  const orphanNote = { ...validBase, id: 'orphan-note', noteTitle: 'A title' };
  assert.ok(validatePlaceDefinitions([orphanNote])[0].problems.some(p => p.includes('noteTitle/noteBody')));
  // A fully objective-free social place validates cleanly.
  assert.deepEqual(validatePlaceDefinitions([{ ...validBase, id: 'free-place' }]), []);
});

test('unknown modes, capabilities and missing minimap or builder key are rejected', () => {
  const badWeather = { ...validBase, atmosphere: { preset: null, weatherMode: 'stochastic', timeMode: 'fixed' } };
  assert.ok(validatePlaceDefinitions([badWeather])[0].problems.some(p => p.includes('weatherMode')));
  const badCapability = { ...validBase, capabilities: { seating: false, sharedMedia: false, conferencing: false, virtuality: true } };
  assert.ok(validatePlaceDefinitions([badCapability])[0].problems.some(p => p.includes('unknown capability: virtuality')));
  const missingBooleans = { ...validBase, capabilities: { seating: true } };
  assert.ok(validatePlaceDefinitions([missingBooleans])[0].problems.some(p => p.includes('capability sharedMedia')));
  const noMinimap = { ...validBase, minimapPath: '' };
  assert.ok(validatePlaceDefinitions([noMinimap])[0].problems.some(p => p.includes('minimapPath')));
  const noBuilder = { ...validBase, builderKey: '' };
  assert.ok(validatePlaceDefinitions([noBuilder])[0].problems.some(p => p.includes('builderKey')));
  const badTarget = { ...validBase, exits: [{ id: 'east', kind: 'district', position: [3.5, 0], target: 'nowhere' }] };
  assert.ok(validatePlaceDefinitions([badTarget])[0].problems.some(p => p.includes('not a known place')));
  assert.deepEqual(validatePlaceDefinitions([{ ...validBase, builderKey: 'tinyView' }]).length, 0,
    'a valid registry key passes list validation');
});

test('buildDistrict reports invalid definitions and unknown builders by id before building', () => {
  const badBounds = { ...validBase, bounds: { minX: NaN, maxX: 4, minZ: -3, maxZ: 3 } };
  assert.throws(() => buildDistrict(badBounds), /Invalid place definition "probe-place"/);
  const unknownBuilder = { ...validBase, id: 'mystery-place', builderKey: 'no-such-builder' };
  assert.throws(() => buildDistrict(unknownBuilder), /Place "mystery-place" declares unknown builder key: no-such-builder/);
  assert.throws(() => requirePlaceBuilder({ id: 'ghost', builderKey: 'ghost-builder' }), /Place "ghost"/);
  assert.ok(!hasPlaceBuilder('no-such-builder'));
});

test('the tiny view fixture validates, registers and uses its own smaller bounds', () => {
  assert.deepEqual(validatePlaceDefinition(PLACE_VIEW_FIXTURE), [], 'the fixture itself is valid');
  assert.deepEqual(PLACE_VIEW_FIXTURE.exits, [], 'a view needs no travel gates');
  assert.equal(PLACE_VIEW_FIXTURE.objective, null, 'views stay objective-free');
  assert.equal(PLACE_VIEW_FIXTURE.shell, 'none');

  const bounds = getBoundsForRoom(PLACE_VIEW_FIXTURE.id);
  assert.deepEqual(
    { id: bounds.id, minX: bounds.minX, maxX: bounds.maxX, minZ: bounds.minZ, maxZ: bounds.maxZ },
    { id: 'tiny-view', minX: -3, maxX: 3, minZ: -2.5, maxZ: 2.5 },
  );
  assert.ok(!isWalkable(bounds, [], 3.5, 0), 'movement honors the smaller bounds');
  assert.ok(isWalkable(bounds, [], 2.9, 2));
  const clamped = clampClickTarget(bounds, 100, -100);
  assert.ok(clamped.x <= 3 - 0.35 && clamped.z >= -2.5 + 0.35, 'click targets clamp inside the view');
  const corner = projectToMinimap(bounds, 3, 2.5);
  assert.deepEqual(corner, { cx: 130, cy: 96 }, 'minimap projection spans the svg box');
});

test('registerPlaceBounds rejects definitions without usable bounds', () => {
  assert.throws(() => registerPlaceBounds({ id: 'no-bounds' }), /no-bounds/);
});

test('the objective-free fixture builds through the registry with no landmarks, notes or gates', () => {
  assert.ok(hasPlaceBuilder('tinyView'), 'the fixture builder resolves through the registry');
  const world = buildDistrict(PLACE_VIEW_FIXTURE);
  assert.deepEqual(world.items, [], 'no landmark, field note or gate items');
  assert.ok(world.obstacles.some(o => o.x === 0 && o.z === 0), 'the builder’s own collision is present');
  assert.ok(world.group.children.some(o => o.isInstancedMesh), 'the tiny static batch still runs');
  assert.equal(typeof world.update, 'function');
  world.update(1, false);
  world.group.traverse(object => assert.ok(object.position.toArray().every(Number.isFinite)));
});

test('old saves normalize without losing valid progress or accepting unregistered ids', () => {
  assert.deepEqual(readExploration(undefined), { current: 'court', visited: ['court'], completed: [] });
  assert.deepEqual(
    readExploration({ current: 'tiny-view', visited: ['tiny-view', 'canal', 'canal'], completed: ['theater', 'nope'] }),
    { current: 'court', visited: ['court', 'canal'], completed: ['theater'] },
    'unregistered ids are dropped, valid old progress survives',
  );
  assert.equal(readExploration({ current: 'kiln-terrace' }).current, 'kiln-terrace');
});

test('market and personal-garden bounds keep their explicit compatibility entries', () => {
  assert.equal(getBoundsForRoom('market'), WORLD_BOUNDS.market);
  assert.equal(getBoundsForRoom(undefined), WORLD_BOUNDS.market);
  assert.equal(getBoundsForRoom('garden'), WORLD_BOUNDS.garden, '?room=garden shorthand keeps garden bounds');
  assert.equal(getBoundsForRoom('garden:player-1'), WORLD_BOUNDS.garden);
  // Registered public places now come from the manifest with identical values.
  assert.deepEqual(getBoundsForRoom('court'), {
    id: 'court', minX: -11.3, maxX: 11.3, minZ: -9.5, maxZ: 10.3,
    spawn: [-9, 0], exitWest: [-10.7, 0], exitEast: [10.7, 0],
  });
  assert.deepEqual(getBoundsForRoom('some-unregistered-room'), {
    id: 'some-unregistered-room', minX: -11.3, maxX: 11.3, minZ: -9.5, maxZ: 10.3,
    spawn: [-9, 0], exitWest: [-10.7, 0], exitEast: [10.7, 0],
  });
});
