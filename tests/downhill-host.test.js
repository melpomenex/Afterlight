import test from 'node:test';
import assert from 'node:assert/strict';

import { createDownhillMayhemHost } from '../games/downhill-mayhem/src/host/index.js';
import { generateCourseDocument } from '../games/downhill-mayhem/src/game/course.js';

// integrate-multiplayer-downhill-mayhem-arcade 5.1/5.8 / 12.3. The hosted
// runtime must never own a renderer, RAF loop or the injected renderer/audio.
// These tests run headless in Node with a stubbed renderer.

const COURSE = generateCourseDocument({ mountain: 'classic' });

function makeStubRenderer() {
  const stub = { renderCalls: 0, methodCalls: [] };
  const target = {
    render() { stub.renderCalls++; },
    domElement: {},
    setSize() { stub.methodCalls.push('setSize'); },
    setPixelRatio() { stub.methodCalls.push('setPixelRatio'); },
    dispose() { stub.methodCalls.push('dispose'); },
  };
  const setTraps = [];
  const renderer = new Proxy(target, {
    set(t, prop, value) { setTraps.push(String(prop)); t[prop] = value; return true; },
    get(t, prop) { return t[prop]; },
  });
  return { renderer, stub, setTraps };
}

async function makeHost(extra = {}) {
  const { renderer, stub, setTraps } = makeStubRenderer();
  const host = await createDownhillMayhemHost({
    renderer,
    viewport: () => ({ width: 800, height: 400 }),
    hudHost: null,
    courseDocument: COURSE,
    authority: 'local',
    ...extra,
  });
  return { host, renderer, stub, setTraps };
}

test('createDownhillMayhemHost creates neither a renderer nor a RAF loop', async () => {
  let rafCalls = 0;
  const originalRaf = globalThis.requestAnimationFrame;
  globalThis.requestAnimationFrame = () => { rafCalls++; return 0; };
  try {
    const { host, setTraps, stub } = await makeHost();
    assert.equal(rafCalls, 0, 'no requestAnimationFrame was scheduled');
    assert.deepEqual(setTraps, [], 'nothing was assigned onto the injected renderer');
    assert.equal(stub.methodCalls.length, 0, 'no renderer management methods were called');
    host.dispose();
  } finally {
    if (originalRaf) globalThis.requestAnimationFrame = originalRaf; else delete globalThis.requestAnimationFrame;
  }
});

test('update advances the simulation without a RAF loop', async () => {
  const { host } = await makeHost();
  host.enter();
  host.startRace();
  const t0 = host.runtime.time;
  const tick0 = host.runtime.tick;
  for (let i = 0; i < 400; i++) host.update(1 / 60, true);
  assert.ok(host.runtime.time > t0, 'clock advanced');
  assert.ok(host.runtime.tick > tick0, 'fixed-step systems advanced');
  host.dispose();
});

test('present renders through the injected renderer', async () => {
  const { host, stub } = await makeHost();
  host.enter();
  host.update(1 / 60, true);
  const before = stub.renderCalls;
  host.present();
  assert.equal(stub.renderCalls, before + 1, 'present() called renderer.render once');
  host.dispose();
});

test('resize updates the camera aspect and projection', async () => {
  const { host } = await makeHost();
  host.resize(800, 400);
  assert.equal(host.camera.aspect, 2);
  const proj = host.camera.projectionMatrix.elements.slice();
  host.resize(640, 480);
  assert.equal(host.camera.aspect, 640 / 480);
  host.resize(300, 600);
  assert.equal(host.camera.aspect, 0.5);
  assert.notDeepEqual(host.camera.projectionMatrix.elements.slice(), proj, 'projection matrix was refreshed');
  host.dispose();
});

test('dispose is idempotent and leaves the injected renderer untouched', async () => {
  const { host, stub, setTraps } = await makeHost();
  host.enter();
  host.update(1 / 60, true);
  host.present();
  host.dispose();
  host.dispose();
  host.dispose();
  assert.deepEqual(setTraps, [], 'renderer properties were never assigned');
  assert.equal(stub.methodCalls.includes('dispose'), false, 'renderer.dispose was never called');
  assert.equal(stub.renderCalls >= 1, true);
});

test('an external AudioContext is never closed', async () => {
  let closeCalls = 0;
  const fakeCtx = {
    state: 'running', sampleRate: 48000, currentTime: 0, destination: {},
    createGain() { return { gain: { value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, disconnect() {} }; },
    createDynamicsCompressor() { return { threshold: { value: 0 }, knee: { value: 0 }, ratio: { value: 0 }, attack: { value: 0 }, release: { value: 0 }, connect() {}, disconnect() {} }; },
    createBuffer() { return { getChannelData() { return new Float32Array(8); } }; },
    createBufferSource() { return { buffer: null, loop: false, connect() {}, start() {}, stop() {} }; },
    createBiquadFilter() { return { type: '', frequency: { value: 0 }, connect() {} }; },
    createOscillator() { return { type: '', frequency: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, start() {}, stop() {} }; },
    resume() { return Promise.resolve(); },
    close() { closeCalls++; },
  };
  const { host } = await makeHost({ audio: { context: fakeCtx, destination: {} } });
  host.enter();
  host.startRace();
  for (let i = 0; i < 30; i++) host.update(1 / 60, true);
  host.dispose();
  assert.equal(closeCalls, 0, 'the host-owned AudioContext must never be closed');
});

test('host reports the frozen session state shape', async () => {
  const { host } = await makeHost();
  host.enter();
  const s = host.session.state();
  assert.equal(typeof s.phase, 'string');
  assert.equal(typeof s.raceTime, 'number');
  assert.equal(typeof s.tick, 'number');
  assert.equal(typeof host.session.acceptSnapshot, 'function');
  assert.equal(typeof host.session.acceptEvent, 'function');
  assert.equal(typeof host.session.acceptResult, 'function');
  assert.equal(typeof host.input.handleKeyDown, 'function');
  assert.equal(typeof host.prepare, 'function');
  assert.equal(typeof host.present, 'function');
  assert.equal(typeof host.resize, 'function');
  assert.equal(typeof host.dispose, 'function');
  host.dispose();
});
