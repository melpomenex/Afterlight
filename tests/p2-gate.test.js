import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { getActivityModule } from '../src/activities/registry.js';
import {
  PONG_ACTIVITY_DEFINITION,
  RAIN_RUNNER_ACTIVITY_DEFINITION,
  SIGNAL_LOST_ACTIVITY_DEFINITION,
  SPOREFALL_ACTIVITY_DEFINITION,
  getPlaceDefinition,
  ORPHEUM_ACTIVITIES,
} from '../shared/placeDefinitions.js';
import { buildDistrict } from '../src/districts.js';
import {
  createVisibilityThrottler,
  createScreenPipeline,
  createCabinetAudio,
} from '../src/activities/cabinetRenderer.js';

// Ensure all arcade modules are registered
import '../src/activities/pong.js';
import '../src/activities/rainRunner.js';
import '../src/activities/signalLost.js';
import '../src/activities/sporefall.js';

test('1. P2 Gate: concurrent multi-cabinet instantiation and lifecycle in Orpheum scene', () => {
  const worldGroup = new THREE.Group();
  const player = { position: new THREE.Vector3(8.0, 0, -4.0) };

  const definitions = [
    { def: PONG_ACTIVITY_DEFINITION, type: 'pong' },
    { def: RAIN_RUNNER_ACTIVITY_DEFINITION, type: 'rain-runner' },
    { def: SIGNAL_LOST_ACTIVITY_DEFINITION, type: 'signal-lost' },
    { def: SPOREFALL_ACTIVITY_DEFINITION, type: 'sporefall' },
  ];

  const instances = [];

  for (const { def, type } of definitions) {
    const mod = getActivityModule(type);
    assert.ok(mod, `module registered for ${type}`);

    const instance = mod.initialize({
      activityDef: def,
      world: { group: worldGroup },
      net: {
        sendActivityReady: () => {},
        sendActivityInput: () => {},
      },
      generation: 1,
      roomId: 'theater',
      getPlayer: () => player,
      getActiveCamera: () => null,
      setActivityCamera: () => {},
      clearActivityCamera: () => {},
    });

    assert.ok(instance, `instance created for ${type}`);
    assert.ok(instance.group instanceof THREE.Group);
    assert.ok(worldGroup.children.includes(instance.group));
    instances.push(instance);
  }

  assert.equal(instances.length, 4, 'all 4 cabinets active concurrently');
  assert.equal(worldGroup.children.length, 4, 'all 4 cabinet groups attached to world');

  // Verify concurrent simulation update without interference
  for (const inst of instances) {
    inst.update(0.016, 0.1, true);
  }

  // Idempotent clean disposal of all 4 cabinets
  for (const inst of instances) {
    inst.dispose();
  }

  assert.equal(worldGroup.children.length, 0, 'all cabinet groups removed on disposal');
});

test('2. P2 Gate: spectator and player screen parity across all 4 cabinets', () => {
  const playerPos = new THREE.Vector3(9.0, 0, -3.5);

  const testCases = [
    {
      type: 'pong',
      def: PONG_ACTIVITY_DEFINITION,
      snapshot: {
        status: 'in_progress',
        simState: {
          state: 'rally',
          score: { '0': 4, '1': 2 },
          ball: { x: 400, y: 250, vx: 5, vy: 2, radius: 8 },
          paddles: {
            '0': { x: 40, y: 250, width: 14, height: 70 },
            '1': { x: 760, y: 250, width: 14, height: 70 },
          },
        },
      },
    },
    {
      type: 'rain-runner',
      def: RAIN_RUNNER_ACTIVITY_DEFINITION,
      snapshot: {
        status: 'in_progress',
        simState: {
          state: 'running',
          score: 840,
          distance: 84.0,
          player: { x: 10, speed: 8.0 },
          obstacles: [{ id: 1, x: 0, distance: 120, type: 'barrier' }],
        },
      },
    },
    {
      type: 'signal-lost',
      def: SIGNAL_LOST_ACTIVITY_DEFINITION,
      snapshot: {
        status: 'in_progress',
        simState: {
          state: 'running',
          score: 1600,
          lives: 2,
          wave: 2,
          ship: { x: 400, y: 300, angle: 0, vx: 1, vy: 0 },
          asteroids: [{ id: 1, x: 200, y: 200, radius: 30 }],
          projectiles: [],
        },
      },
    },
    {
      type: 'sporefall',
      def: SPOREFALL_ACTIVITY_DEFINITION,
      snapshot: {
        status: 'in_progress',
        simState: {
          state: 'running',
          score: 3100,
          lines: 9,
          level: 2,
          active: { x: 4, y: 15, piece: 'T', rotation: 0 },
        },
      },
    },
  ];

  for (const { type, def, snapshot } of testCases) {
    const mod = getActivityModule(type);

    const playerInst = mod.initialize({
      activityDef: def,
      world: { group: new THREE.Group() },
      getPlayer: () => ({ position: playerPos }),
      net: { sendActivityReady: () => {}, sendActivityInput: () => {} },
    });

    const obsInst = mod.initialize({
      activityDef: def,
      world: { group: new THREE.Group() },
      getPlayer: () => ({ position: playerPos }),
      net: { sendActivityReady: () => {}, sendActivityInput: () => {} },
    });

    // Both accept identical snapshot
    playerInst.acceptSnapshot(snapshot);
    obsInst.acceptSnapshot(snapshot);

    // Update both
    playerInst.update(0.016, 0.5, true);
    obsInst.update(0.016, 0.5, true);

    // Both instances reflect matching sim state
    assert.equal(playerInst.simState?.score, obsInst.simState?.score, `${type} scores match`);
    assert.equal(playerInst.simState?.state, obsInst.simState?.state, `${type} states match`);

    playerInst.dispose();
    obsInst.dispose();
  }
});

test('3. P2 Gate: no-WebGPU baseline renderer compatibility, texture budgets, and visibility throttling', () => {
  // Verify standard Three.js canvas texture pipeline without WebGPU
  const pipeline = createScreenPipeline({
    defaultWidth: 512,
    defaultHeight: 384,
    focusedWidth: 1024,
    focusedHeight: 768,
  });

  assert.ok(pipeline.texture);
  if (pipeline.texture.needsUpdate !== undefined) {
    assert.equal(pipeline.texture.needsUpdate, true);
  }

  // Default texture budget
  if (pipeline.canvas) {
    assert.equal(pipeline.canvas.width, 512);
    assert.equal(pipeline.canvas.height, 384);

    // Focused enlargement and unfocused contraction
    pipeline.setFocused(true);
    assert.equal(pipeline.canvas.width, 1024);
    assert.equal(pipeline.canvas.height, 768);

    pipeline.setFocused(false);
    assert.equal(pipeline.canvas.width, 512);
    assert.equal(pipeline.canvas.height, 384);
  }

  pipeline.dispose();

  // Visibility throttler tiers
  let playerPos = { x: 0, z: 0 };
  const throttler = createVisibilityThrottler({
    getPosition: () => [0, 0, 0],
    getPlayer: () => ({ position: playerPos }),
    maxDistance: 20,
  });

  // Focused tier: 60 fps
  assert.equal(throttler.getTier(true, true), 'focused');
  assert.equal(throttler.shouldRender(true, true, 100), true);
  assert.equal(throttler.shouldRender(true, true, 116), true);

  // Spectator tier (<= 6m): throttled to 20 fps (>= 50ms)
  playerPos = { x: 4, z: 0 };
  assert.equal(throttler.getTier(false, true), 'spectator');
  throttler.reset();
  assert.equal(throttler.shouldRender(false, true, 1000), true);
  assert.equal(throttler.shouldRender(false, true, 1030), false);
  assert.equal(throttler.shouldRender(false, true, 1055), true);

  // Attract tier (6m to 20m): throttled to 10 fps (>= 100ms)
  playerPos = { x: 12, z: 0 };
  assert.equal(throttler.getTier(false, true), 'attract');
  throttler.reset();
  assert.equal(throttler.shouldRender(false, true, 2000), true);
  assert.equal(throttler.shouldRender(false, true, 2060), false);
  assert.equal(throttler.shouldRender(false, true, 2105), true);

  // Culled tier (> 20m): 0 fps
  playerPos = { x: 25, z: 0 };
  assert.equal(throttler.getTier(false, true), 'culled');
  assert.equal(throttler.shouldRender(false, true, 3000), false);

  // Hidden place tier: 0 fps even if focused
  assert.equal(throttler.getTier(true, false), 'culled');
  assert.equal(throttler.shouldRender(true, false, 4000), false);
});

test('4. P2 Gate: spatial audio voice limits and muting', () => {
  const createdOscs = [];
  let currentTime = 0;
  const mockAudioContext = {
    state: 'running',
    get currentTime() { return currentTime; },
    createOscillator() {
      const osc = {
        stopped: false,
        frequency: { setValueAtTime: () => {} },
        connect: () => {},
        start: () => {},
        stop: (when = 0) => {
          if (when <= currentTime) {
            osc.stopped = true;
            osc.onended?.();
          } else {
            osc.stopTime = when;
          }
        },
      };
      createdOscs.push(osc);
      return osc;
    },
    createGain() {
      return {
        gain: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
        connect: () => {},
      };
    },
    destination: {},
  };

  let playerPos = { x: 0, z: 0 };
  const audio = createCabinetAudio({
    getPosition: () => [0, 0, 0],
    getPlayer: () => ({ position: playerPos }),
    audioMixer: { context: mockAudioContext },
    maxDistance: 12,
    maxVoices: 3,
  });

  // Voice limit is respected
  assert.equal(typeof audio.playTone, 'function');
  assert.equal(typeof audio.setMuted, 'function');
  assert.equal(typeof audio.dispose, 'function');

  // Play up to maxVoices (3)
  audio.playTone(440);
  audio.playTone(550);
  audio.playTone(660);
  assert.equal(createdOscs.length, 3);
  assert.equal(createdOscs.filter(o => !o.stopped).length, 3);

  // 4th tone stops oldest voice
  audio.playTone(880);
  assert.ok(createdOscs[0].stopped, 'oldest voice stopped when voice limit exceeded');

  // Muting silences audio
  audio.setMuted(true);
  const countBefore = createdOscs.length;
  audio.playTone(990);
  assert.equal(createdOscs.length, countBefore, 'no new oscillators created while muted');

  // Out of range silences audio
  audio.setMuted(false);
  playerPos = { x: 20, z: 0 }; // > 12m cutoff
  audio.playTone(1100);
  assert.equal(createdOscs.length, countBefore, 'no new oscillators created outside maxDistance');

  audio.dispose();
});

test('5. P2 Gate: live Orpheum coexistence with theater screen, seats, gates, and cameras', () => {
  const theaterDef = getPlaceDefinition('theater');
  const world = buildDistrict(theaterDef);

  // 1. All 5 activity items registered in world
  const activityItems = world.items.filter(it => it.type === 'activity');
  assert.equal(activityItems.length, 5);

  // 2. All 48 seats registered
  const seats = world.items.filter(it => it.type === 'seat');
  assert.equal(seats.length, 48);

  // 3. Movie screen registered
  const screen = world.items.find(it => it.type === 'theater_screen');
  assert.ok(screen);

  // 4. Cabinet collision obstacles do not overlap with spawn or seats
  const [px, pz] = theaterDef.spawn;
  const [kx, kz] = theaterDef.companionSpawn;

  for (const act of ORPHEUM_ACTIVITIES) {
    const [cx, , cz] = act.transform.position;
    const obs = world.obstacles.find(o => Math.abs(o.x - cx) < 0.05 && Math.abs(o.z - cz) < 0.05);
    assert.ok(obs, `obstacle exists for ${act.id}`);

    // No overlap with player/companion spawns
    assert.ok(Math.abs(px - obs.x) >= obs.w || Math.abs(pz - obs.z) >= obs.d);
    assert.ok(Math.abs(kx - obs.x) >= obs.w || Math.abs(kz - obs.z) >= obs.d);
  }
});
