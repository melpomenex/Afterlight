import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  THROTTLE_BUDGETS,
  createVisibilityThrottler,
  createCabinetMesh,
  createScreenPipeline,
  createCabinetAudio,
  drawAttractBanner,
} from '../src/activities/cabinetRenderer.js';

test('createCabinetMesh builds complete 3D hierarchy, camera, and disposes cleanly', () => {
  for (const style of ['joystick', 'spinner', 'wheel']) {
    const cabinet = createCabinetMesh({
      width: 1.3,
      height: 2.1,
      depth: 0.95,
      controlStyle: style,
      marqueeTitle: 'TEST',
      bodyColor: '#1e2228',
      trimColor: '#b89358',
    });

    assert.ok(cabinet.group instanceof THREE.Group);
    assert.ok(cabinet.bodyMesh instanceof THREE.Mesh);
    assert.ok(cabinet.screenMesh instanceof THREE.Mesh);
    assert.ok(cabinet.marqueeLight instanceof THREE.PointLight);
    assert.ok(cabinet.activityCamera instanceof THREE.PerspectiveCamera);

    // Camera is positioned at ergonomic eye level facing the screen
    assert.ok(cabinet.activityCamera.position.z > 0, 'camera is positioned in front of cabinet');
    assert.ok(cabinet.activityCamera.position.y > 1.0, 'camera is at player eye level');

    // Clean disposal
    cabinet.dispose();
  }
});

test('createVisibilityThrottler enforces tiering, distance culling, and frame intervals', () => {
  let playerPos = { x: 0, z: 0 };
  const throttler = createVisibilityThrottler({
    getPosition: () => [0, 0, 0],
    getPlayer: () => ({ position: playerPos }),
    maxDistance: 20,
  });

  // 1. Focused tier
  assert.equal(throttler.getTier(true, true), 'focused');
  assert.equal(throttler.shouldRender(true, true, 100), true);
  assert.equal(throttler.shouldRender(true, true, 101), true, 'focused renders at presentation rate');

  // 2. Spectator tier (nearby <= 6m)
  playerPos = { x: 3, z: 0 };
  assert.equal(throttler.getTier(false, true), 'spectator');
  throttler.reset();
  assert.equal(throttler.shouldRender(false, true, 1000), true);
  assert.equal(throttler.shouldRender(false, true, 1020), false, '20ms later is throttled (< 50ms)');
  assert.equal(throttler.shouldRender(false, true, 1055), true, '55ms later renders (>= 50ms)');

  // 3. Attract tier (between 6m and 20m)
  playerPos = { x: 10, z: 0 };
  assert.equal(throttler.getTier(false, true), 'attract');
  throttler.reset();
  assert.equal(throttler.shouldRender(false, true, 2000), true);
  assert.equal(throttler.shouldRender(false, true, 2050), false, '50ms later is throttled (< 100ms)');
  assert.equal(throttler.shouldRender(false, true, 2105), true, '105ms later renders (>= 100ms)');

  // 4. Distance culling (> 20m)
  playerPos = { x: 25, z: 0 };
  assert.equal(throttler.getTier(false, true), 'culled');
  assert.equal(throttler.shouldRender(false, true, 3000), false);

  // 5. Hidden place culling (placeVisible === false)
  playerPos = { x: 2, z: 0 };
  assert.equal(throttler.getTier(false, false), 'culled');
  assert.equal(throttler.shouldRender(false, false, 4000), false);
  assert.equal(throttler.shouldRender(true, false, 4000), false, 'hidden place culls even if focused');
});

test('createScreenPipeline manages texture budgets and focused resizing', () => {
  const pipeline = createScreenPipeline({
    defaultWidth: 512,
    defaultHeight: 384,
    focusedWidth: 1024,
    focusedHeight: 768,
  });

  assert.ok(pipeline.texture);
  if (pipeline.canvas) {
    assert.equal(pipeline.canvas.width, 512);
    assert.equal(pipeline.canvas.height, 384);

    pipeline.setFocused(true);
    assert.equal(pipeline.canvas.width, 1024);
    assert.equal(pipeline.canvas.height, 768);

    pipeline.setFocused(false);
    assert.equal(pipeline.canvas.width, 512);
    assert.equal(pipeline.canvas.height, 384);
  }

  pipeline.dispose();
});

test('createCabinetAudio enforces distance falloff, voice capping, and mute', () => {
  const createdOscs = [];
  const createdGains = [];
  let currentTime = 0;

  const mockAudioContext = {
    state: 'running',
    get currentTime() { return currentTime; },
    createOscillator() {
      const osc = {
        type: 'square',
        stopped: false,
        frequency: { setValueAtTime: (f) => { osc.freq = f; } },
        connect: (target) => { osc.target = target; },
        start: () => { osc.started = true; },
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
      const gain = {
        gain: {
          val: 0,
          setValueAtTime: (v) => { gain.val = v; },
          exponentialRampToValueAtTime: () => {},
        },
        connect: () => {},
      };
      createdGains.push(gain);
      return gain;
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

  // 1. Play tone nearby
  audio.playTone(440, 'square', 0.1, 0.2);
  assert.equal(createdOscs.length, 1);
  assert.equal(createdOscs[0].freq, 440);
  assert.ok(createdGains[0].val > 0.15, 'full volume when right at cabinet');

  // 2. Play tone further away (attenuated)
  playerPos = { x: 6, z: 0 };
  audio.playTone(880, 'sine', 0.1, 0.2);
  assert.equal(createdOscs.length, 2);
  assert.ok(createdGains[1].val < 0.12, 'attenuated volume at 6m distance');

  // 3. Play tone beyond cutoff (> 12m)
  playerPos = { x: 15, z: 0 };
  audio.playTone(1200, 'square', 0.1, 0.2);
  assert.equal(createdOscs.length, 2, 'no oscillator created beyond cutoff distance');

  // 4. Voice cap enforcement (max 3 voices)
  playerPos = { x: 0, z: 0 };
  audio.playTone(500);
  audio.playTone(600);
  assert.equal(createdOscs.filter(o => !o.stopped).length, 3, 'at most 3 active voices');
  // Playing a 4th voice should stop the oldest voice
  audio.playTone(700);
  assert.ok(createdOscs[0].stopped, 'oldest voice stopped when voice limit exceeded');

  // 5. Mute
  audio.setMuted(true);
  audio.playTone(900);
  assert.equal(createdOscs.length, 5, 'no new voice played when muted');

  // 6. Cleanup
  audio.dispose();
});

test('drawAttractBanner renders clear demo label and scanlines', () => {
  const operations = [];
  const mockCtx = {
    save: () => operations.push('save'),
    restore: () => operations.push('restore'),
    fillRect: (x, y, w, h) => operations.push(`fillRect:${x},${y},${w},${h}`),
    fillText: (text, x, y) => operations.push(`fillText:${text}`),
    set fillStyle(v) {},
    set font(v) {},
    set textAlign(v) {},
    set textBaseline(v) {},
    set shadowColor(v) {},
    set shadowBlur(v) {},
  };

  drawAttractBanner(mockCtx, 512, 512, {
    title: 'RAIN RUNNER',
    subtitle: 'RACE THROUGH THE CITY',
    bannerText: 'DEMO',
    time: 1.0,
  });

  assert.ok(operations.includes('save'));
  assert.ok(operations.includes('restore'));
  assert.ok(operations.some(op => op.includes('DEMO')), 'renders explicit demo banner');
  assert.ok(operations.some(op => op.includes('RAIN RUNNER')), 'renders title');
});
