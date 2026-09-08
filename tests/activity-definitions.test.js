import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PLACE_DEFINITIONS,
  LEGACY_DISTRICT_IDS,
  getPlaceDefinition,
  validatePlaceDefinition,
  validatePlaceDefinitions,
  validateActivityDefinition,
  placeHasCapability,
  getPlaceActivities,
  ACTIVITY_TYPES,
  MAX_ACTIVITIES_PER_PLACE,
  PONG_ACTIVITY_DEFINITION,
  RAIN_RUNNER_ACTIVITY_DEFINITION,
  SIGNAL_LOST_ACTIVITY_DEFINITION,
  SPOREFALL_ACTIVITY_DEFINITION,
  ORPHEUM_ACTIVITIES,
} from '../shared/placeDefinitions.js';

const validBounds = { minX: -10, maxX: 10, minZ: -10, maxZ: 10 };

const validActivity = {
  id: 'pong-table',
  type: 'pong',
  rulesVersion: 1,
  transform: { position: [0, 0, 0], rotationY: 0 },
  footprint: { width: 2, depth: 1.5 },
  interactionRadius: 2.5,
  participantAnchors: [
    { slot: 0, position: [-1.5, 0, 0], facing: Math.PI / 2 },
    { slot: 1, position: [1.5, 0, 0], facing: -Math.PI / 2 },
  ],
  capacities: { players: 2, spectators: 32, queue: 16 },
  environmentPolicy: 'none',
  spectatorPolicy: 'world',
  rendererKey: 'pongCabinet',
  controllerKey: 'pong',
};

test('place definitions remain valid; theater declares 4 arcade cabinets while others default to none', () => {
  for (const def of PLACE_DEFINITIONS) {
    assert.equal(validatePlaceDefinition(def).length, 0, `${def.id} passes validation`);
    if (def.id === 'theater') {
      assert.equal(placeHasCapability(def, 'activities'), true, `${def.id} has activities capability`);
      const acts = getPlaceActivities(def.id);
      assert.equal(acts.length, 4);
      assert.equal(acts[0].id, 'orpheum-pong');
      assert.equal(acts[0].type, 'pong');
      assert.equal(acts[1].id, 'orpheum-rain-runner');
      assert.equal(acts[1].type, 'rain-runner');
      assert.equal(acts[2].id, 'orpheum-signal-lost');
      assert.equal(acts[2].type, 'signal-lost');
      assert.equal(acts[3].id, 'orpheum-sporefall');
      assert.equal(acts[3].type, 'sporefall');
    } else {
      assert.equal(placeHasCapability(def, 'activities'), false, `${def.id} has no activities capability`);
      assert.deepEqual(getPlaceActivities(def.id), [], `${def.id} has empty activities`);
    }
  }
});

test('placeHasCapability handles explicit and defaulted capabilities', () => {
  assert.equal(placeHasCapability(null, 'activities'), false);
  assert.equal(placeHasCapability({ capabilities: { activities: true } }, 'activities'), true);
  assert.equal(placeHasCapability({ capabilities: { activities: false } }, 'activities'), false);
  assert.equal(placeHasCapability({ activities: [validActivity] }, 'activities'), true);
  assert.equal(placeHasCapability({ activities: [] }, 'activities'), false);
  assert.equal(placeHasCapability({ capabilities: { seating: true } }, 'seating'), true);
});

test('valid activity definition passes validation', () => {
  const problems = validateActivityDefinition(validActivity, { placeBounds: validBounds });
  assert.deepEqual(problems, []);
});

test('all ORPHEUM_ACTIVITIES pass validation in theater bounds', () => {
  const theater = PLACE_DEFINITIONS.find(d => d.id === 'theater');
  assert.ok(theater, 'theater place definition exists');
  for (const act of ORPHEUM_ACTIVITIES) {
    const problems = validateActivityDefinition(act, { placeBounds: theater.bounds });
    assert.deepEqual(problems, [], `activity ${act.id} passes validation`);
  }
});

test('validateActivityDefinition rejects invalid type and rulesVersion', () => {
  const badType = { ...validActivity, type: 'pinball' };
  const typeProblems = validateActivityDefinition(badType, { placeBounds: validBounds });
  assert.ok(typeProblems.some(p => p.includes('unknown activity type: "pinball"')));

  const badRules = { ...validActivity, rulesVersion: 0 };
  const rulesProblems = validateActivityDefinition(badRules, { placeBounds: validBounds });
  assert.ok(rulesProblems.some(p => p.includes('rulesVersion must be an integer >= 1')));
});

test('validateActivityDefinition rejects out-of-bounds transform and anchors', () => {
  const outOfBoundsTransform = {
    ...validActivity,
    transform: { position: [25, 0, 0] },
  };
  const tProblems = validateActivityDefinition(outOfBoundsTransform, { placeBounds: validBounds });
  assert.ok(tProblems.some(p => p.includes('transform.position [25, 0] is outside place bounds')));

  const outOfBoundsAnchor = {
    ...validActivity,
    participantAnchors: [
      { slot: 0, position: [-1.5, 0, 0] },
      { slot: 1, position: [0, 0, 50] },
    ],
  };
  const aProblems = validateActivityDefinition(outOfBoundsAnchor, { placeBounds: validBounds });
  assert.ok(aProblems.some(p => p.includes('anchor for slot "1" position [0, 50] is outside place bounds')));
});

test('validateActivityDefinition rejects nonfinite coordinates and footprints', () => {
  const nanPos = {
    ...validActivity,
    transform: { position: [NaN, 0] },
  };
  assert.ok(validateActivityDefinition(nanPos, { placeBounds: validBounds }).some(p => p.includes('transform.position')));

  const badFootprint = {
    ...validActivity,
    footprint: { width: -1, depth: 2 },
  };
  assert.ok(validateActivityDefinition(badFootprint, { placeBounds: validBounds }).some(p => p.includes('footprint.width')));

  const badRadius = {
    ...validActivity,
    interactionRadius: 0,
  };
  assert.ok(validateActivityDefinition(badRadius, { placeBounds: validBounds }).some(p => p.includes('interactionRadius')));
});

test('validateActivityDefinition rejects invalid capacities', () => {
  const overSpectators = {
    ...validActivity,
    capacities: { players: 2, spectators: 100, queue: 16 },
  };
  assert.ok(validateActivityDefinition(overSpectators, { placeBounds: validBounds }).some(p => p.includes('capacities.spectators')));

  const zeroPlayers = {
    ...validActivity,
    capacities: { players: 0, spectators: 10, queue: 5 },
  };
  assert.ok(validateActivityDefinition(zeroPlayers, { placeBounds: validBounds }).some(p => p.includes('capacities.players')));

  const overQueue = {
    ...validActivity,
    capacities: { players: 2, spectators: 10, queue: 20 },
  };
  assert.ok(validateActivityDefinition(overQueue, { placeBounds: validBounds }).some(p => p.includes('capacities.queue')));
});

test('validatePlaceDefinition names place and activity on error', () => {
  const placeWithBadActivity = {
    id: 'test-place',
    name: 'Test Place',
    kind: 'venue',
    seed: 12,
    bounds: validBounds,
    spawn: [0, 0],
    companionSpawn: [1, 1],
    shell: 'none',
    builderKey: 'court',
    minimapPath: 'M0 0H10V10H0Z',
    atmosphere: { preset: null, weatherMode: 'fixed', timeMode: 'fixed' },
    capabilities: { seating: false, sharedMedia: false, conferencing: false },
    social: { featured: false, legacy: false },
    activities: [
      {
        ...validActivity,
        id: 'bad-pong',
        participantAnchors: [{ slot: 'p1', position: [100, 0] }],
      },
    ],
  };

  const report = validatePlaceDefinitions([placeWithBadActivity]);
  assert.equal(report.length, 1);
  assert.equal(report[0].id, 'test-place');
  assert.ok(report[0].problems.some(p => p.includes('activity "bad-pong": anchor for slot "p1" position [100, 0] is outside place bounds')));
});

test('validatePlaceDefinition rejects duplicate activity ids within a place', () => {
  const placeWithDupeActivities = {
    id: 'dupe-place',
    name: 'Dupe Place',
    kind: 'venue',
    seed: 12,
    bounds: validBounds,
    spawn: [0, 0],
    companionSpawn: [1, 1],
    shell: 'none',
    builderKey: 'court',
    minimapPath: 'M0 0H10V10H0Z',
    atmosphere: { preset: null, weatherMode: 'fixed', timeMode: 'fixed' },
    capabilities: { seating: false, sharedMedia: false, conferencing: false },
    social: { featured: false, legacy: false },
    activities: [
      { ...validActivity, id: 'shared-pong' },
      { ...validActivity, id: 'shared-pong' },
    ],
  };

  const report = validatePlaceDefinitions([placeWithDupeActivities]);
  assert.equal(report.length, 1);
  assert.ok(report[0].problems.some(p => p.includes('activity "shared-pong": duplicate activity id')));
});

test('validatePlaceDefinition enforces MAX_ACTIVITIES_PER_PLACE limit', () => {
  const activities = Array.from({ length: MAX_ACTIVITIES_PER_PLACE + 1 }, (_, i) => ({
    ...validActivity,
    id: `pong-${i}`,
  }));

  const overloadedPlace = {
    id: 'busy-place',
    name: 'Busy Place',
    kind: 'venue',
    seed: 12,
    bounds: validBounds,
    spawn: [0, 0],
    companionSpawn: [1, 1],
    shell: 'none',
    builderKey: 'court',
    minimapPath: 'M0 0H10V10H0Z',
    atmosphere: { preset: null, weatherMode: 'fixed', timeMode: 'fixed' },
    capabilities: { seating: false, sharedMedia: false, conferencing: false },
    social: { featured: false, legacy: false },
    activities,
  };

  const report = validatePlaceDefinitions([overloadedPlace]);
  assert.equal(report.length, 1);
  assert.ok(report[0].problems.some(p => p.includes('activities list exceeds maximum of 16')));
});
