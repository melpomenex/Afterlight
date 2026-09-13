import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseViewId,
  getViewWorldSupport,
  validateViewPolicies,
} from '../src/worlds/registry.js';
import { PLACE_DEFINITIONS, ACTIVITY_TYPES } from '../shared/placeDefinitions.js';

test('parseViewId parses namespaced view identifiers', () => {
  assert.deepEqual(parseViewId('place:theater'), { kind: 'place', id: 'theater' });
  assert.deepEqual(parseViewId('activity:kart-royale'), { kind: 'activity', id: 'kart-royale' });
  assert.deepEqual(parseViewId('something-else'), { kind: 'unknown', id: 'something-else' });
});

test('validateViewPolicies reports no problems across all places and activities', () => {
  const problems = validateViewPolicies();
  assert.deepEqual(problems, []);
});

test('place view policies match Design D3', () => {
  // Theater is full
  const theater = getViewWorldSupport('place:theater');
  assert.equal(theater.mode, 'full');
  assert.equal(theater.host, 'self');
  assert.ok(theater.slots.includes('sky'));
  assert.ok(theater.slots.includes('distant-scenery'));
  assert.ok(theater.slots.includes('decoration'));
  assert.ok(theater.slots.includes('lighting'));
  assert.ok(theater.slots.includes('fog'));
  assert.ok(theater.slots.includes('particles'));
  assert.ok(theater.slots.includes('audio'));

  // Market is ambient self
  const market = getViewWorldSupport('place:market');
  assert.equal(market.mode, 'ambient');
  assert.equal(market.host, 'self');

  // All other places in PLACE_DEFINITIONS are ambient self
  for (const placeId of Object.keys(PLACE_DEFINITIONS)) {
    if (placeId === 'theater') continue;
    const support = getViewWorldSupport(`place:${placeId}`);
    assert.equal(support.mode, 'ambient', `${placeId} must have ambient mode`);
    assert.equal(support.host, 'self', `${placeId} must have self host`);
  }

  // Verify test fixture tiny-view is not in PLACE_DEFINITIONS
  assert.equal('tiny-view' in PLACE_DEFINITIONS, false);
});

test('activity view policies match Design D3', () => {
  // Hosted racers
  const kart = getViewWorldSupport('activity:kart-royale');
  assert.equal(kart.mode, 'partial');
  assert.equal(kart.host, 'self');
  assert.ok(kart.slots.includes('sky'));
  assert.ok(kart.slots.includes('lighting'));
  assert.ok(kart.slots.includes('fog'));
  assert.ok(kart.slots.includes('distant-scenery'));
  assert.ok(kart.slots.includes('audio'));

  const summit = getViewWorldSupport('activity:snowboard-race');
  assert.equal(summit.mode, 'partial');
  assert.equal(summit.host, 'self');

  const downhill = getViewWorldSupport('activity:downhill-mayhem');
  assert.equal(downhill.mode, 'ambient');
  assert.equal(downhill.host, 'self');

  // Orpheum table / in-place games
  for (const type of ['pool', 'billiards', 'air-hockey', 'foosball', 'darts', 'piano', 'photo-booth']) {
    const support = getViewWorldSupport(`activity:${type}`);
    assert.equal(support.mode, 'full', `${type} must have full mode`);
    assert.equal(support.host, 'parent', `${type} must have parent host`);
  }

  // Retro cabinet games
  for (const type of ['pong', 'rain-runner', 'signal-lost', 'sporefall']) {
    const support = getViewWorldSupport(`activity:${type}`);
    assert.equal(support.mode, 'none', `${type} must have none mode`);
    assert.equal(support.host, 'parent', `${type} must have parent host`);
  }

  // In-place activities
  for (const type of ['gutter-boats', 'rc-boats', 'chess', 'checkers', 'drones', 'paper-airplanes', 'tile-puzzle', 'curling', 'fishing']) {
    const support = getViewWorldSupport(`activity:${type}`);
    assert.equal(support.mode, 'ambient', `${type} must have ambient mode`);
    assert.equal(support.host, 'parent', `${type} must have parent host`);
  }

  // Unknown activity fallback
  const unknown = getViewWorldSupport('activity:unknown-type');
  assert.equal(unknown.mode, 'none');
  assert.equal(unknown.host, 'parent');
});
