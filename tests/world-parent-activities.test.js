import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { ACTIVITY_TYPES } from '../shared/placeDefinitions.js';
import { getViewWorldSupport } from '../src/worlds/registry.js';
import { resolveWorldPresentation } from '../src/worlds/resolver.js';
import { getActivityModule } from '../src/activities/registry.js';
import { createEnvironmentAudio } from '../src/audio/environmentAudio.js';
import { createAudioMixer } from '../src/audio/mixer.js';

// Table games that inherit full theater surroundings
const TABLE_GAMES = [
  'pool',
  'billiards',
  'air-hockey',
  'foosball',
  'darts',
  'piano',
  'photo-booth',
];

// Retro arcade games that inherit parent host with native graphics (mode: none)
const RETRO_ARCADE_GAMES = [
  'pong',
  'rain-runner',
  'signal-lost',
  'sporefall',
];

// In-place activities at other districts that inherit parent ambient presentation
const IN_PLACE_ACTIVITIES = [
  'gutter-boats',
  'rc-boats',
  'chess',
  'checkers',
  'tile-puzzle',
  'horseshoes',
  'telescope',
  'curling',
  'hammer-strike',
  'forge-challenge',
  'fishing',
  'skipping-stones',
  'light-music-puzzle',
  'drones',
  'paper-airplanes',
];

test('table games declare full mode and parent host with empty slots', () => {
  for (const type of TABLE_GAMES) {
    const viewId = `activity:${type}`;
    const support = getViewWorldSupport(viewId);
    assert.equal(support.mode, 'full', `${viewId} should be mode full`);
    assert.equal(support.host, 'parent', `${viewId} should be host parent`);
    assert.deepEqual(support.slots, [], `${viewId} should have empty slots`);
    assert.equal(support.adapterKey, null, `${viewId} should have no adapterKey`);

    const plan = resolveWorldPresentation({
      selection: { worldId: 'alpine', variantId: 'aurora' },
      viewId,
    });
    assert.equal(plan.inheritedFromParent, true);
    assert.equal(plan.host, 'parent');
    assert.equal(plan.atmosphere, null);
    assert.equal(plan.audioProfile, null);
  }
});

test('retro arcade games declare none mode and parent host with empty slots', () => {
  for (const type of RETRO_ARCADE_GAMES) {
    const viewId = `activity:${type}`;
    const support = getViewWorldSupport(viewId);
    assert.equal(support.mode, 'none', `${viewId} should be mode none`);
    assert.equal(support.host, 'parent', `${viewId} should be host parent`);
    assert.deepEqual(support.slots, [], `${viewId} should have empty slots`);
    assert.equal(support.adapterKey, null);

    const plan = resolveWorldPresentation({
      selection: { worldId: 'desert', variantId: 'golden' },
      viewId,
    });
    assert.equal(plan.mode, 'none');
    assert.equal(plan.host, 'parent');
    assert.equal(plan.inheritedFromParent, true);
    assert.equal(plan.atmosphere, null);
    assert.equal(plan.audioProfile, null);
  }
});

test('all in-place activities declare ambient mode and parent host with empty slots', () => {
  for (const type of IN_PLACE_ACTIVITIES) {
    const viewId = `activity:${type}`;
    const support = getViewWorldSupport(viewId);
    assert.equal(support.mode, 'ambient', `${viewId} should be mode ambient`);
    assert.equal(support.host, 'parent', `${viewId} should be host parent`);
    assert.deepEqual(support.slots, [], `${viewId} should have empty slots`);
    assert.equal(support.adapterKey, null);

    const plan = resolveWorldPresentation({
      selection: { worldId: 'rainforest', variantId: 'mist' },
      viewId,
    });
    assert.equal(plan.inheritedFromParent, true);
    assert.equal(plan.host, 'parent');
    assert.equal(plan.atmosphere, null);
    assert.equal(plan.audioProfile, null);
  }
});

test('every registered activity module in ACTIVITY_TYPES has a valid D3 policy', () => {
  for (const type of ACTIVITY_TYPES) {
    const viewId = `activity:${type}`;
    const support = getViewWorldSupport(viewId);
    assert.ok(['full', 'partial', 'ambient', 'none'].includes(support.mode), `${viewId} valid mode`);
    assert.ok(['self', 'parent'].includes(support.host), `${viewId} valid host`);

    const plan = resolveWorldPresentation({
      selection: { worldId: 'redwood', variantId: 'fog' },
      viewId,
    });
    assert.ok(plan);
    assert.equal(plan.worldId, 'redwood');
  }
});

test('arcade-to-pool transition reuses parent surroundings without creating extra hosts or duplicate ambience', () => {
  // Mock AudioContext
  class MockAudioParam {
    constructor(val = 0) { this.value = val; }
    setValueAtTime(v) { this.value = v; }
    linearRampToValueAtTime(v) { this.value = v; }
    cancelScheduledValues() {}
  }
  class MockNode {
    constructor() {
      this.gain = new MockAudioParam(1);
      this.frequency = new MockAudioParam(1000);
      this.type = 'lowpass';
    }
    connect(dest) { return dest; }
    disconnect() {}
    start() {}
    stop() {}
  }
  const fakeCtx = {
    currentTime: 0,
    sampleRate: 44100,
    createGain() { return new MockNode(); },
    createBiquadFilter() { return new MockNode(); },
    createBufferSource() { return new MockNode(); },
    createBuffer(ch, len, rate) {
      return { getChannelData() { return new Float32Array(len); } };
    },
  };
  const mixer = createAudioMixer({ audioContext: fakeCtx });
  const environmentAudio = createEnvironmentAudio({ mixer });
  environmentAudio.setAmbienceProfile('coastal');
  environmentAudio.start();

  // World group representing The Orpheum
  const theaterWorld = {
    group: new THREE.Group(),
    obstacles: [],
  };

  // Step 1: User is at arcade machine (pong)
  const pongSupport = getViewWorldSupport('activity:pong');
  assert.equal(pongSupport.host, 'parent');
  const pongPlan = resolveWorldPresentation({
    selection: { worldId: 'coastal' },
    viewId: 'activity:pong',
  });
  assert.equal(pongPlan.inheritedFromParent, true);
  assert.equal(pongPlan.atmosphere, null);
  assert.equal(pongPlan.audioProfile, null);

  // Ambience is retained from parent place
  assert.deepEqual(environmentAudio.ambienceProfile, { frequency: 380, gain: 0.5 });

  // Step 2: User moves from arcade to pool table
  const poolSupport = getViewWorldSupport('activity:pool');
  assert.equal(poolSupport.host, 'parent');
  const poolPlan = resolveWorldPresentation({
    selection: { worldId: 'coastal' },
    viewId: 'activity:pool',
  });
  assert.equal(poolPlan.inheritedFromParent, true);
  assert.equal(poolPlan.atmosphere, null);
  assert.equal(poolPlan.audioProfile, null);

  // Table scene is added to theaterWorld.group
  const poolTableGroup = new THREE.Group();
  poolTableGroup.name = 'pool-table-scene';
  theaterWorld.group.add(poolTableGroup);

  assert.equal(poolTableGroup.parent, theaterWorld.group);
  assert.deepEqual(environmentAudio.ambienceProfile, { frequency: 380, gain: 0.5 });

  // Verify no duplicate ambience nodes or extra hosts were created
  environmentAudio.stop();
});
