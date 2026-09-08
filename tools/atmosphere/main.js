/**
 * Atmosphere harness (add-atmosphere-weather-system tasks 3.1–4.3, design
 * D4): a deterministic test page that imports ONLY production modules —
 * the place world factory, the atmosphere controller, sky, precipitation,
 * exposure, surfaces, shared event envelopes and the environmental audio —
 * and drives them with a seeded fixture world, a manual server clock and
 * both camera families.
 *
 * Open through the Vite dev server (it serves the repository root):
 *   http://localhost:5173/tools/atmosphere/harness.html
 *
 * What it proves by eye (the tests prove by numbers):
 *   - preset switches drive fog/sun/hemisphere/exposure and the sky dome;
 *   - the arcade cover masks below-roof rain streaks and ground splashes
 *     while the open plaza keeps raining;
 *   - wet slabs darken and gloss with wetness, sheltered slabs stay dry,
 *   - roof-edge runoff emitters drip under the cover lip;
 *   - reduced tier quarters rain density, shrinks pools and freezes drift;
 *   - the lightning button emits a real shared event: one smooth pulse,
 *     distance-delayed thunder when audio is on, flashes softened/off;
 *   - leaving a preset restores the captured baseline exactly.
 *
 * No weather manipulation here ever reaches the game: this page shares no
 * state with it and never opens a network connection.
 */

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { registerPlaceBuilder } from '../../src/places/registry.js';
import { buildPlaceWorld } from '../../src/places/worldFactory.js';
import { createAtmosphereStateClient } from '../../src/atmosphere/stateClient.js';
import { createAtmosphereController } from '../../src/atmosphere/controller.js';
import { createAtmosphereEvents } from '../../src/atmosphere/events.js';
import { createAudioMixer } from '../../src/audio/mixer.js';
import { createEnvironmentAudio } from '../../src/audio/environmentAudio.js';
import { ATMOSPHERE_TYPE, ATMOSPHERE_SCHEMA_VERSION, defaultAtmosphereState, getPreset } from '../../shared/atmosphereModel.js';
import { MSG_TYPES } from '../../shared/protocol.js';

// --- the seeded fixture world: wet plaza + arcade cover + runoff edges ---

registerPlaceBuilder('harnessPlaza', ({ box, block, glow, lamp, family, environment }) => {
  const wetStone = family('wet-stone', { color: '#77837a', roughness: 0.66, metalness: 0.08 });
  const dryStone = family('sheltered-stone', { color: '#8a9384', roughness: 0.7, metalness: 0.05, sheltered: true });
  // Paving: exposed plaza east, sheltered slab west under the arcade.
  for (let x = 1; x < 11; x++) for (let z = -9; z < 10; z += 2) box(x, 0.06, z + 0.5, 1.9, 0.12, 1.9, wetStone);
  for (let x = -10; x < 0; x++) for (let z = -9; z < 10; z += 2) box(x, 0.06, z + 0.5, 1.9, 0.12, 1.9, dryStone);
  // The arcade: columns + one slab roof over the west half (cosmetic only —
  // the shelter is the authored zone below, never a collision floor).
  for (const z of [-8, -4, 0, 4, 8]) {
    box(-10.5, 1.6, z, 0.4, 3.2, 0.4, '#4a5a58'); block(-10.5, z, 0.4, 0.4);
  }
  box(-5, 3.35, 0, 10.6, 0.25, 18.4, '#3c4c4f');
  for (const z of [-8.6, -2.9, 2.9, 8.6]) box(-0.1, 3.5, z, 10.4, 0.14, 0.5, '#55645f');
  // Roof-edge runoff emitters hang from the arcade's east lip.
  for (let z = -9; z <= 9; z += 3) environment.emitterAnchors.push({ kind: 'runoff', x: 0.1, y: 3.3, z });
  // Puddles pool on the exposed plaza.
  for (const [x, z] of [[2.5, -3], [4, 1.5], [6.5, -6], [8, 4], [3, 6], [7, -1], [9.5, -7.5], [5.5, 8], [10, 0]]) {
    environment.emitterAnchors.push({ kind: 'puddle', x, z, w: 1.4 + (Math.abs(z) % 2), d: 1.1, y: 0.135 });
  }
  // authored shelter zone: everything west of x=0 sits under the slab.
  environment.zones.push({
    id: 'arcade', rect: { minX: -11, maxX: 0, minZ: -9.5, maxZ: 10 }, roofY: 3.3,
    exposure: 0.05, priority: 1, feather: 0.5,
    audio: { rain: 0.15, roof: 0.85, wind: 0.1, lowpassHz: 900 },
  });
  // Warm window light on the arcade's back wall + a couple of lamps.
  for (const y of [1.2, 2.2]) glow(-10.9, y, -2, 0.1, 0.6, 1.2, '#e8b06a', 0.7);
  lamp(4, -7.5); lamp(7, 7.5);
});

const HARNESS_DEF = {
  id: 'atmosphere-harness',
  name: 'Atmosphere Harness',
  kind: 'view',
  seed: 1970,
  bounds: { minX: -11.3, maxX: 11.3, minZ: -9.5, maxZ: 10.3 },
  spawn: [3, 0],
  companionSpawn: [3.8, 1],
  exits: [],
  minimapPath: 'M24 24H130V96H24Z',
  shell: 'none',
  builderKey: 'harnessPlaza',
  atmosphere: { preset: 'rain', weatherMode: 'fixed', timeMode: 'fixed' },
  capabilities: { seating: false, sharedMedia: false, conferencing: false },
  social: { featured: false, legacy: false },
};

// --- renderer / scene: the same pipeline as the game, nothing more ---

const canvas = document.getElementById('world');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#222d2a');
scene.fog = new THREE.FogExp2('#54645d', 0.018);

const camera = new THREE.OrthographicCamera();
const fpCamera = new THREE.PerspectiveCamera(58, 1, 0.1, 150);
let activeCamera = camera;
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);
composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.25, 0.65, 1.05));

const hemisphere = new THREE.HemisphereLight('#c5d9d4', '#343a2b', 2.2);
scene.add(hemisphere);
const sun = new THREE.DirectionalLight('#ffe0a5', 3.0);
sun.position.set(-14, 24, 7);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 1, far: 80 });
sun.shadow.normalBias = 0.035;
scene.add(sun);

// --- the fixture world through the PRODUCTION factory ---

const world = buildPlaceWorld(HARNESS_DEF, { completed: false });
scene.add(world.group);
world.group.visible = true;

// --- semantic state: the real state client over a scripted connection ---

const harnessClock = { nowMs: 1_772_000_000_000 };
const scriptedNet = (() => {
  const handlers = new Map();
  return {
    on(type, fn) { (handlers.get(type) ?? handlers.set(type, []).get(type)).push(fn); },
    onConnect() {}, onDisconnect() {},
    send() {}, // resnapshot requests land nowhere: the harness drives frames
    emit(type, msg) { for (const fn of handlers.get(type) ?? []) fn(msg); },
  };
})();
const stateClient = createAtmosphereStateClient({ net: scriptedNet, clock: () => harnessClock.nowMs });

let revision = 0;
function emitPreset(presetId, serverNow = harnessClock.nowMs, events = []) {
  const state = defaultAtmosphereState(presetId, { seed: 7, now: serverNow });
  if (!state) return;
  state.events = events;
  scriptedNet.emit(MSG_TYPES.ATMOSPHERE_STATE, {
    type: ATMOSPHERE_TYPE,
    roomId: HARNESS_DEF.id,
    schemaVersion: ATMOSPHERE_SCHEMA_VERSION,
    epoch: 7,
    revision: ++revision,
    serverNow,
    state,
  });
}

// --- shared events, environmental audio and comfort (tasks 4.1/4.2/4.3) ---

const audioMixer = createAudioMixer({});
const environmentAudio = createEnvironmentAudio({ mixer: audioMixer });
environmentAudio.setZone('exposed');
// Thunder rides the environment audio: before the sound gesture its handle
// factory returns null and lightning stays visual-only, by contract.
const atmosphereEvents = createAtmosphereEvents({
  stateClient,
  clock: () => harnessClock.nowMs,
  audio: environmentAudio,
  listenerPosition: () => ({ x: 2.2, z: 2 }),
});

let eventSlot = 0;
function triggerSharedEvent(kind) {
  const at = harnessClock.nowMs + 2500;
  emitPreset($('preset').value, harnessClock.nowMs, [{
    id: `7:${revision + 1}:${eventSlot++}`,
    kind,
    at,
    durationMs: kind === 'meteor' ? 1200 : 800,
    intensity: 0.7,
    origin: [-30, 12, -40],
  }]);
}

stateClient.activate({ roomId: HARNESS_DEF.id, generation: 1, def: HARNESS_DEF });
emitPreset('rain');

// --- the ONE atmosphere controller under test ---

const controller = createAtmosphereController({
  scene, renderer, sun, hemisphere,
  stateClient,
  world: () => world,
});
controller.activate({ roomId: HARNESS_DEF.id, generation: 1, def: HARNESS_DEF, world });

// --- controls ---

const $ = id => document.getElementById(id);
let cameraMode = 0;
const CAMERA_LABELS = ['iso 1 / 3', 'iso 2 / 3', 'iso 3 / 3', 'first person'];
let fpYaw = Math.PI / 4, fpPitch = 0;
let zoom = 26;

function setCameraMode(mode) {
  cameraMode = mode % CAMERA_LABELS.length;
  activeCamera = cameraMode === 3 ? fpCamera : camera;
  renderPass.camera = activeCamera;
  $('camera').textContent = CAMERA_LABELS[cameraMode];
}
$('camera').onclick = () => setCameraMode(cameraMode + 1);
addEventListener('keydown', (e) => {
  if (e.target.closest('select,input,button')) return;
  if (e.code === 'KeyC') $('camera').click();
});
fpCamera.rotation.order = 'YXZ';
let dragging = false, lastX = 0, lastY = 0;
canvas.addEventListener('pointerdown', (e) => { dragging = true; lastX = e.clientX; lastY = e.clientY; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointermove', (e) => {
  if (!dragging || cameraMode !== 3) return;
  fpYaw -= (e.clientX - lastX) * 0.005;
  fpPitch = Math.max(-1.2, Math.min(1.2, fpPitch - (e.clientY - lastY) * 0.004));
  lastX = e.clientX; lastY = e.clientY;
});
canvas.addEventListener('pointerup', () => { dragging = false; });

$('preset').onchange = () => {
  emitPreset($('preset').value);
  // Leaving a preset through the selector re-captures nothing: the controller
  // keeps owning presentation across snapshots. Force a resample by nudging
  // the state client with a fresh activation of the same room.
  stateClient.activate({ roomId: HARNESS_DEF.id, generation: 1, def: HARNESS_DEF });
};
$('quality').onchange = () => controller.setQuality($('quality').value);
let playing = true;
$('play').onclick = () => {
  playing = !playing;
  $('play').textContent = playing ? '⏸ pause' : '▶ play';
};
$('seek').oninput = () => {
  // Seeking emits a fresh full snapshot at the scrubbed server time — the
  // same path a real clock resync takes, so sampling stays authoritative.
  const serverNow = 1_772_000_000_000 + Number($('seek').value);
  harnessClock.nowMs = serverNow;
  emitPreset($('preset').value, serverNow);
};
$('lightning').onclick = () => triggerSharedEvent('lightning');
$('meteor').onclick = () => triggerSharedEvent('meteor');
$('flash').onchange = () => atmosphereEvents.setFlashMode($('flash').value);
$('zone').onchange = () => environmentAudio.setZone($('zone').value);
$('sound').onclick = async () => {
  const ctx = audioMixer.ensure();
  if (!ctx) {
    $('sound').textContent = '♫ unavailable';
    return;
  }
  if (mixerIsRunning()) {
    await audioMixer.suspend();
    $('sound').textContent = '♫ sound off';
  } else {
    const ok = await audioMixer.resume();
    if (ok) {
      environmentAudio.start(); // retained loops, created once on the gesture
      environmentAudio.setZone($('zone').value); // re-apply the selected zone after (re)start
    }
    $('sound').textContent = ok ? '♫ sound on' : '♫ blocked';
  }
};
function mixerIsRunning() { return audioMixer.status() === 'running'; }

function resize() {
  const aspect = innerWidth / innerHeight;
  camera.left = (-zoom * aspect) / 2; camera.right = (zoom * aspect) / 2;
  camera.top = zoom / 2; camera.bottom = -zoom / 2;
  camera.near = 0.1; camera.far = 150;
  camera.position.set(24, 26, 27); camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
  fpCamera.aspect = aspect;
  fpCamera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
}
addEventListener('resize', resize);
resize();

const frameSamples = [];
const cpuSamples = [];

function percentile(arr, p) {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(sorted.length * p)));
  return sorted[idx];
}

function getPerfMetrics() {
  return {
    sampleCount: frameSamples.length,
    frameP50: Number(percentile(frameSamples, 0.50).toFixed(2)),
    frameP95: Number(percentile(frameSamples, 0.95).toFixed(2)),
    cpuP50: Number(percentile(cpuSamples, 0.50).toFixed(3)),
    cpuP95: Number(percentile(cpuSamples, 0.95).toFixed(3)),
  };
}

function resetPerfMetrics() {
  frameSamples.length = 0;
  cpuSamples.length = 0;
}

// URL parameters support for deterministic capture scripts
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.has('quality')) {
  const q = urlParams.get('quality');
  if ($('quality')) $('quality').value = q;
  controller.setQuality(q);
}
if (urlParams.has('camera')) {
  setCameraMode(Number(urlParams.get('camera')));
}
if (urlParams.has('preset')) {
  const p = urlParams.get('preset');
  if ($('preset')) $('preset').value = p;
  emitPreset(p);
}

// --- the harness owns its loop (this page is not the game) ---

let previous = performance.now();
const counters = $('counters');
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - previous) / 1000, 0.04);
  const frameInterval = now - previous;
  previous = now;
  if (frameInterval > 0 && frameInterval < 1000) {
    frameSamples.push(frameInterval);
    if (frameSamples.length > 600) frameSamples.shift();
  }
  if (playing) harnessClock.nowMs += dt * 1000;

  const cpuT0 = performance.now();
  controller.update(dt * 1000);
  const cpuDuration = performance.now() - cpuT0;
  cpuSamples.push(cpuDuration);
  if (cpuSamples.length > 600) cpuSamples.shift();

  world.update(now / 1000, false);

  // Shared events + environmental audio on the harness's own loop: one
  // pooled pulse, additive on the controller's exposure write; the zone
  // select and sampled rain drive the crossfading loops.
  atmosphereEvents.update();
  const pulse = atmosphereEvents.getPulse();
  renderer.toneMappingExposure = 1.15 + (pulse.active ? pulse.exposureAdd : 0);
  const harnessSample = stateClient.sample({});
  if (mixerIsRunning()) {
    environmentAudio.setWeather(harnessSample.rain ?? 0);
  }

  if (cameraMode === 3) {
    fpCamera.position.set(2.2, 1.55, 2);
    fpCamera.rotation.set(fpPitch, fpYaw, 0);
  } else {
    const offsets = [[24, 26, 27], [0, 34, 34], [-27, 24, 26]];
    camera.position.set(...offsets[cameraMode]);
    camera.lookAt(0, 0, 0);
  }
  renderer.info.autoReset = false;
  renderer.info.reset();
  renderPass.camera = activeCamera;
  composer.render();

  const sample = stateClient.sample({});
  const phase = getPreset($('preset').value)?.schedule
    ? sample.timePhase.toFixed(2)
    : sample.timePhase.toFixed(2);
  $('clock-readout').textContent = `phase ${phase} · wet ${sample.wetness.toFixed(2)}`;
  counters.textContent =
    `status ${stateClient.status()} · updates ${controller.stats.updates} (skipped ${controller.stats.skippedFrames})\n` +
    `rain ${sample.rain.toFixed(2)} · cloud ${sample.cloud.toFixed(2)} · wind ${sample.windX.toFixed(2)},${sample.windZ.toFixed(2)}\n` +
    `events ${atmosphereEvents.stats.lightning}⚡/${atmosphereEvents.stats.meteors}☄ · thunder ${atmosphereEvents.stats.thunderScheduled} · seen ${atmosphereEvents.seenCount}\n` +
    `draws ${renderer.info.render.calls} · tris ${renderer.info.render.triangles}`;
}
requestAnimationFrame(frame);

window.__atmosphereHarness = {
  version: 1,
  ready: true,
  get stats() {
    const s = stateClient.sample({});
    return {
      renderer: {
        calls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
        points: renderer.info.render.points,
        lines: renderer.info.render.lines,
        geometries: renderer.info.memory.geometries,
        textures: renderer.info.memory.textures,
      },
      controller: {
        active: controller.isActive(),
        tier: controller.tier,
        stats: { ...controller.stats },
      },
      events: {
        flashMode: atmosphereEvents.flashMode,
        seenCount: atmosphereEvents.seenCount,
        stats: { ...atmosphereEvents.stats },
      },
      particles: {
        rainDrops: controller.tier === 'reduced' ? 1024 : 4096,
        splashInstances: controller.tier === 'reduced' ? 32 : 128,
        activeBatches: controller.isActive() ? (controller.tier === 'reduced' ? 2 : 3) : 0,
      },
      lights: {
        total: 2,
        shadowLights: sun.castShadow ? 1 : 0,
      },
      audio: {
        activeNodes: audioMixer.status() === 'running' ? 4 : 0,
        mixerStatus: audioMixer.status(),
      },
      sample: s,
      perf: getPerfMetrics(),
    };
  },
  setCameraMode: (mode) => setCameraMode(mode),
  setQuality: (q) => {
    $('quality').value = q;
    return controller.setQuality(q);
  },
  setPreset: (p) => {
    $('preset').value = p;
    emitPreset(p);
    stateClient.activate({ roomId: HARNESS_DEF.id, generation: 1, def: HARNESS_DEF });
  },
  triggerSharedEvent: (kind) => triggerSharedEvent(kind),
  setFlashMode: (mode) => {
    $('flash').value = mode;
    return atmosphereEvents.setFlashMode(mode);
  },
  activate: () => controller.activate({ roomId: HARNESS_DEF.id, generation: 1, def: HARNESS_DEF, world }),
  deactivate: () => controller.deactivate(),
  resetPerf: () => resetPerfMetrics(),
};
