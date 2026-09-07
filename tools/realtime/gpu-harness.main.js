// gpu-harness.main.js — driver for tools/realtime/gpu-harness.html
// (openspec change add-realtime-gpu-rendering, tasks 3.2 + 4.2).
//
// Two arms, one deterministic world, one delta-pack stream:
//
//   CONTROL ARM      THREE.WebGLRenderer + CPUThreeBackend
//                    (src/realtime/gpu/backend.js): SoA state + bound
//                    InstancedMesh; per-frame sample(null, scratch, {dt})
//                    runs today's exponential lerp (rate = min(1, dt*12)) and
//                    writes instance matrices. Plain materials,
//                    NoToneMapping, no EffectComposer, no bloom, no shadow
//                    maps — the live game's ACES+bloom post chain is
//                    deliberately NOT reproduced (fixed notice in the HTML).
//   ACCELERATED ARM  three/webgpu WebGPURenderer drawing instanced proxies
//                    fed from createWebGPUThreeBackend
//                    (src/realtime/gpu/webgpuBackend.js) through the seam's
//                    sample() read path. Constructed ONLY when
//                    renderer_webgpu_fastpath resolves true
//                    (shouldConstructWebGpu in backend.js; effective URL
//                    param ?rt_webgpu_fastpath=1 per src/realtime/flags.js).
//                    Default off everywhere.
//
// A synthetic worker pipeline steps the mirrored fixtures world at the 10 Hz
// server cadence, coalesces changed entities into ONE delta pack per tick
// (createPack shape), and hands the SAME pack to every active backend, so
// both arms observe identical state. Frame-time capture is per arm and only
// samples in an exclusive view mode (one arm rendering), because two
// renderers sharing one rAF confound each other's frame cost.
//
// Device-loss drill: calls reportDeviceLost() on the accelerated backend
// (also fired automatically on checksum/validation/async loss), then rebuilds
// that pane on CPUThreeBackend seeded from snapshot() — the design's failure
// model, exercised in-page. Cross-module field drift in the snapshot is
// absorbed in gpu-arm-adapter.js.
//
// COMPAT: window.__gpuHarness (polled by tools/realtime/capture-gpu-harness.mjs)
// keeps { booted, error, flagOn, gpuKind, frames:{count,…} } and ?capture=1
// auto-runs a capture window.

import * as THREE from 'three';
import { WebGPURenderer } from 'three/webgpu';
import { resolveFlags } from '/src/realtime/flags.js';
import { CPUThreeBackend, KILN_ID, shouldConstructWebGpu } from '/src/realtime/gpu/backend.js';
import { createPack } from '/src/realtime/worker/core.js';
import { createAcceleratedBackend, adaptSnapshotForCpu } from './gpu-arm-adapter.js';
import { makeWorld, stepWorld, tickSeedFor, WORLD_BOUNDS, FIXTURE_SOURCE, rng as fixturesRng } from './gpu-harness.fixtures.js';

// --- constants ---------------------------------------------------------------

const POPULATIONS = [100, 1000, 10000];
const WORLD_SEED = 42;
const TICK_MS = 100;          // server snapshot cadence (contract §2: 10 Hz tick)
const TICK_FRACTION = 0.1;    // 10% of entities change per tick
const WARMUP_FRAMES = 30;     // excluded from capture (renderer/shader warm-in)
const RING_CAPACITY = 1800;   // ~30 s of 60 Hz samples per arm
const MAX_PIXEL_RATIO = 1.5;
const MAX_VEGETATION = 20000;
const CAPTURE_SECONDS = 4;    // per-arm exclusive capture window

const POST_CHAIN_NOTICE =
  'Bloom/ACES are NOT reproduced in this harness (either arm): control = WebGLRenderer ' +
  'NoToneMapping, no EffectComposer/bloom, no shadows; accelerated = WebGPURenderer ' +
  'NoToneMapping. Screenshots from this page document the rendering-path delta, not ' +
  'parity with the live game (design.md: the TSL post chain is a separate gated change).';

// --- dom + log ---------------------------------------------------------------

const $ = (id) => document.getElementById(id);
const els = {
  banner: $('flag-banner'), selPop: $('sel-population'), selView: $('sel-view'),
  chkOrbit: $('chk-orbit'), btnRebuild: $('btn-rebuild'), btnTick: $('btn-tickpause'),
  btnDrill: $('btn-drill'), btnReport: $('btn-report'),
  lblControl: $('lbl-control'), lblGpu: $('lbl-gpu'),
  wrapControl: $('cvs-control-wrap'), wrapGpu: $('cvs-gpu-wrap'),
  stControl: $('st-control'), stGpu: $('st-gpu'), boot: $('st-boot'), log: $('log'),
};

function log(msg, cls = '') {
  const line = document.createElement('div');
  if (cls) line.className = cls;
  line.textContent = '[' + new Date().toISOString().slice(11, 19) + '] ' + msg;
  els.log.appendChild(line);
  els.log.scrollTop = els.log.scrollHeight;
}

window.addEventListener('error', (e) => {
  log('window error: ' + e.message, 'bad');
  if (window.__gpuHarness) window.__gpuHarness.error = String(e.message || e.error);
});
window.addEventListener('unhandledrejection', (e) => {
  log('unhandled rejection: ' + (e.reason?.message || e.reason), 'bad');
  if (window.__gpuHarness) window.__gpuHarness.error = 'rejection: ' + (e.reason?.message || e.reason);
});

// --- frame-time capture (per arm, exclusive view modes only) ------------------

class FrameClock {
  constructor() {
    this.buf = new Float64Array(RING_CAPACITY);
    this.n = 0; this.head = 0; this.total = 0;
    this.last = 0; this.warmup = WARMUP_FRAMES;
    this.secFrames = 0; this.secMark = 0; this.secFps = 0; this.secMs = 0;
  }
  // Call exactly once per rendered frame of the owning arm (after render).
  frame(now) {
    if (this.warmup > 0) { this.warmup--; this.last = now; return; }
    const dt = now - this.last;
    this.last = now;
    if (!(dt > 0) || dt > 1000) return; // clamp tab-switch / stall spikes
    this.buf[this.head] = dt;
    this.head = (this.head + 1) % this.buf.length;
    if (this.n < this.buf.length) this.n++;
    this.total++;
    this.secFrames++;
    if (!this.secMark) this.secMark = now;
    if (now - this.secMark >= 1000) {
      const span = now - this.secMark;
      this.secFps = (this.secFrames * 1000) / span;
      this.secMs = span / this.secFrames;
      this.secFrames = 0; this.secMark = now;
    }
  }
  reset() {
    this.n = 0; this.head = 0; this.total = 0; this.last = 0;
    this.warmup = WARMUP_FRAMES; this.secFrames = 0; this.secMark = 0; this.secFps = 0; this.secMs = 0;
  }
  stats() {
    const s = Array.from(this.buf.subarray(0, this.n)).sort((a, b) => a - b);
    const at = (p) => (s.length ? round3(s[Math.min(s.length - 1, Math.ceil(p * s.length) - 1)]) : null);
    const mean = s.length ? s.reduce((a, b) => a + b, 0) / s.length : null;
    const sum = s.reduce((a, b) => a + b, 0);
    return {
      samples: s.length,
      framesTotal: this.total,
      warmupFramesExcluded: WARMUP_FRAMES,
      bufferCapacity: RING_CAPACITY,
      meanMs: round3(mean),
      p50Ms: at(0.50),
      p95Ms: at(0.95),
      p99Ms: at(0.99),
      minMs: s.length ? round3(s[0]) : null,
      maxMs: s.length ? round3(s[s.length - 1]) : null,
      approxSecondsCoveredByBuffer: round3(sum / 1000),
      fpsLastSecond: round3(this.secFps),
      meanMsLastSecond: round3(this.secMs),
    };
  }
}

function round3(v) { return v == null ? null : Math.round(v * 1000) / 1000; }
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// --- scene helpers -------------------------------------------------------------

// One shared orthographic camera for both arms (cameras need not be scene
// children; both renderers accept it, and sharing guarantees the arms compare
// the same view).
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
camera.position.set(24, 26, 24);
camera.lookAt(0, 0.4, 0);

function makeWebGLRenderer(canvas) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: true });
  r.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO));
  // Honest control arm: the live game uses ACESFilmicToneMapping + a bloom
  // composer + PCFSoft shadows. NONE of that is reproduced here (see notice).
  r.toneMapping = THREE.NoToneMapping;
  r.shadowMap.enabled = false;
  return r;
}

// The instanced proxy both arms draw (the new CPU arm's own discipline:
// statics-style InstancedMesh driven by the backend's sample writes). The
// backend's _writeInstances needs this scratch matrix on userData.
function makeEntityMesh(n) {
  const geo = new THREE.BoxGeometry(0.4, 0.7, 0.4);
  const mat = new THREE.MeshStandardMaterial({ color: 0xb08a4a, roughness: 0.5, metalness: 0.2 });
  const mesh = new THREE.InstancedMesh(geo, mat, n);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.userData._scratchMatrix = new THREE.Matrix4(); // consumed by CPUThreeBackend._writeInstances
  mesh.count = 0;
  mesh.frustumCulled = false; // instances move every tick; bounds would go stale
  return mesh;
}

function buildEnvironment(scene, vegCount, seed) {
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD_BOUNDS.maxX - WORLD_BOUNDS.minX + 4, WORLD_BOUNDS.maxZ - WORLD_BOUNDS.minZ + 4),
    new THREE.MeshStandardMaterial({ color: 0x4a4f45, roughness: 0.95, metalness: 0.0 })
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  scene.add(new THREE.HemisphereLight(0xbfd0e0, 0x3a3630, 0.9));
  const sun = new THREE.DirectionalLight(0xd8d1b5, 1.6);
  sun.position.set(8, 14, 6);
  scene.add(sun);

  // Instanced vegetation — the same deterministic field in both scenes, so
  // the arms differ only in how DYNAMIC ENTITY state reaches the GPU.
  const geo = new THREE.ConeGeometry(0.16, 0.55, 5);
  const mat = new THREE.MeshStandardMaterial({ color: 0x4f7a4a, roughness: 0.9 });
  const veg = new THREE.InstancedMesh(geo, mat, vegCount);
  const rand = fixturesRng(seed);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < vegCount; i++) {
    dummy.position.set(
      WORLD_BOUNDS.minX + rand() * (WORLD_BOUNDS.maxX - WORLD_BOUNDS.minX),
      0.27,
      WORLD_BOUNDS.minZ + rand() * (WORLD_BOUNDS.maxZ - WORLD_BOUNDS.minZ)
    );
    const s = 0.6 + rand() * 0.9;
    dummy.scale.set(s, s, s);
    dummy.rotation.y = rand() * Math.PI * 2;
    dummy.updateMatrix();
    veg.setMatrixAt(i, dummy.matrix);
  }
  veg.instanceMatrix.needsUpdate = true;
  scene.add(veg);
  return scene;
}

function freshCanvas(wrap) {
  wrap.textContent = '';
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-label', wrap.id === 'cvs-control-wrap'
    ? 'Control arm render (WebGL)'
    : 'Accelerated arm render');
  wrap.appendChild(canvas);
  return canvas;
}

function paneEmpty(wrap, msg) {
  wrap.textContent = '';
  const div = document.createElement('div');
  div.className = 'empty';
  div.textContent = msg;
  wrap.appendChild(div);
}

// --- state ---------------------------------------------------------------------

const state = {
  flags: null,
  flagOn: false,
  population: 100,
  viewMode: 'both',
  orbit: true,
  ticksPaused: false,
  ready: false,
  rebuilding: false,
  capturing: false,
  tickIndex: 0,
  lastRaf: 0,
  lastSample: 0,
  lastStat: 0,
  world: null,
  idToSlot: null,
  liveEntityIds: [],
  pack: null,
  control: null, // { renderer, canvas, scene, mesh, backend, scratch, probeScratch, clock, packs, badReceipts, lastReceipt }
  gpu: null,     // { status, reason, renderer, canvas, scene, mesh, backend, rows, liveSlots, clock, packs, badReceipts, lastReceipt, adapterInfo, fellBack }
};

// window.__gpuHarness — polled by tools/realtime/capture-gpu-harness.mjs
// (?capture=1 → the driver waits for frames.count or error, then screenshots).
window.__gpuHarness = {
  booted: false,
  error: null,
  flagOn: false,
  gpuKind: 'not-constructed',
  frames: null,
  report: null,
};

// --- world + pack pipeline (the synthetic worker) --------------------------------

function buildWorldAndPack(n) {
  state.world = makeWorld(n, WORLD_SEED);
  const w = state.world;
  state.idToSlot = new Map();
  for (let i = 0; i < w.n; i++) state.idToSlot.set(w.ids[i], i);
  state.liveEntityIds = Array.from(w.ids);
  state.pack = createPack(n);
  state.tickIndex = 0;
}

// Tick 0: a resync-shaped pack — every entity joins with spawn transforms AND
// appears as a dense row (what a session start / resync boundary sends). Both
// backends' joined-row handling reads exactly these fields.
function applyJoinPack() {
  const w = state.world, pack = state.pack;
  pack.joined = [];
  for (let i = 0; i < w.n; i++) {
    pack.joined.push({
      entityId: w.ids[i],
      guestId: w.guestIds[i],
      x: w.x[i], z: w.z[i], yaw: w.yaw[i],
      archetype: w.archetype[i], variant: 0, flags: w.flags[i],
    });
  }
  pack.left = [];
  pack.count = w.n;
  for (let i = 0; i < w.n; i++) {
    pack.ids[i] = w.ids[i]; pack.x[i] = w.x[i]; pack.z[i] = w.z[i];
    pack.yaw[i] = w.yaw[i]; pack.flags[i] = w.flags[i];
  }
  pack.packId = 0; pack.epoch = 0; pack.tick = 0; pack.frameSequence = 0;
  distributePack('join/resync');
}

// One 10 Hz tick: step the world, coalesce changed entities into THE pack,
// hand the same pack to every active backend (worker-pipeline shape).
function tick() {
  if (!state.ready || state.rebuilding || state.ticksPaused || !state.control) return;
  state.tickIndex++;
  const w = state.world, pack = state.pack;
  const changed = stepWorld(w, TICK_FRACTION, tickSeedFor(WORLD_SEED, state.tickIndex));
  pack.joined = [];
  pack.left = [];
  pack.count = changed.length;
  for (let i = 0; i < changed.length; i++) {
    const slot = state.idToSlot.get(changed[i]);
    pack.ids[i] = changed[i];
    pack.x[i] = w.x[slot];
    pack.z[i] = w.z[slot];
    pack.yaw[i] = w.yaw[slot];
    pack.flags[i] = w.flags[slot];
  }
  pack.packId = state.tickIndex;
  pack.epoch = 0;
  pack.tick = state.tickIndex;
  pack.frameSequence = state.tickIndex;
  distributePack('tick ' + state.tickIndex);
}

// Same pack object → every active backend. The CPU arm returns its receipt
// synchronously; the GPU arm returns a Promise<receipt> (checksum readback
// before acknowledge) and serializes internally. Failures are counted and
// logged, never swallowed.
function distributePack(label) {
  const pack = state.pack;
  const c = state.control;
  if (c) {
    try {
      c.lastReceipt = c.backend.applyDeltaPack(pack);
      if (c.lastReceipt?.applied === false) c.badReceipts++;
    } catch (e) {
      c.badReceipts++;
      log('control arm applyDeltaPack threw (' + label + '): ' + (e?.message || e), 'bad');
    }
    c.packs++;
  }
  const g = state.gpu;
  if (g && (g.status === 'active' || g.status === 'fellback') && g.backend) {
    if (g.status === 'fellback') {
      // CPU fallback backend: synchronous receipts, rejoins the stream.
      try {
        g.lastReceipt = g.backend.applyDeltaPack(pack);
        if (g.lastReceipt?.applied === false) g.badReceipts++;
      } catch (e) {
        g.badReceipts++;
        log('fallback backend applyDeltaPack threw (' + label + '): ' + (e?.message || e), 'bad');
      }
      g.packs++;
    } else {
      g.backend.applyDeltaPack(pack).then((receipt) => {
        g.lastReceipt = receipt;
        g.packs++;
        if (!receipt || receipt.ok !== true) {
          g.badReceipts++;
          log('accelerated arm applyDeltaPack failure (' + label + '): ' + JSON.stringify(receipt), 'bad');
          return;
        }
        refreshLiveSlots(g);
      }).catch((e) => {
        g.badReceipts++;
        log('accelerated arm applyDeltaPack rejected (' + label + '): ' + (e?.message || e), 'bad');
      });
    }
  }
}

// Map the harness-tracked live entity ids to the GPU backend's dense slots
// (its sample() takes slot indices, not entity ids — asymmetry documented in
// the README).
function refreshLiveSlots(g) {
  if (!g.backend || typeof g.backend.slotOf !== 'function') return;
  const slots = [];
  for (const id of state.liveEntityIds) {
    const s = g.backend.slotOf(id);
    if (s >= 0) slots.push(s);
  }
  g.liveSlots = slots;
}

// --- arm construction --------------------------------------------------------------

async function rebuild(n) {
  if (state.rebuilding) return;
  state.rebuilding = true;
  state.ready = false;
  els.btnDrill.disabled = true;
  try {
    teardownArms();

    state.population = n;
    window.__gpuHarness.population = n;
    log('building world n=' + n + ' (seed ' + WORLD_SEED + ', source: ' + FIXTURE_SOURCE + ')');
    const t0 = performance.now();
    buildWorldAndPack(n);
    log('world + pack built in ' + (performance.now() - t0).toFixed(1) + ' ms');

    // --- control arm (always present) ---
    const cCanvas = freshCanvas(els.wrapControl);
    const cScene = buildEnvironment(new THREE.Scene(), Math.min(2 * n, MAX_VEGETATION), WORLD_SEED ^ 0xC0FFEE);
    const cMesh = makeEntityMesh(n);
    cScene.add(cMesh);
    const cRenderer = makeWebGLRenderer(cCanvas);
    const cBackend = new CPUThreeBackend({ excludedIds: new Set() });
    cBackend.ensureCapacity(n);
    cBackend.bindInstancedMesh(cMesh);
    state.control = {
      renderer: cRenderer, canvas: cCanvas, scene: cScene, mesh: cMesh,
      backend: cBackend,
      scratch: { xyzYaw: new Float32Array(0), ids: new Uint32Array(0), count: 0 },
      probeScratch: { xyzYaw: new Float32Array(12), ids: new Uint32Array(3), count: 0 },
      clock: new FrameClock(), packs: 0, badReceipts: 0, lastReceipt: null,
    };
    els.lblControl.textContent = 'CONTROL ARM — WebGLRenderer + CPUThreeBackend (population ' + n + ')';
    log('control arm ready (InstancedMesh bound; exponential lerp via sample({dt}); NoToneMapping, no bloom, no shadows)');

    // --- accelerated arm (flag-gated, tasks 3.2 + 4.2) ---
    state.gpu = {
      status: 'off', reason: 'flag off', renderer: null, canvas: null, scene: null,
      mesh: null, backend: null, rows: [], liveSlots: [],
      clock: new FrameClock(), packs: 0, badReceipts: 0, lastReceipt: null,
      adapterInfo: null, fellBack: null, unsubDeviceLost: null,
    };
    window.__gpuHarness.flagOn = state.flagOn;
    window.__gpuHarness.gpuKind = 'not-constructed';
    if (state.flagOn) {
      await setupAcceleratedArm(n);
    } else {
      paneEmpty(els.wrapGpu,
        'FASTPATH OFF\nrenderer_webgpu_fastpath resolves false (the default everywhere).\n' +
        'This arm is not constructed at all — no adapter request, no backend.\n' +
        'Enable for this page only: add ?rt_webgpu_fastpath=1 to the URL\n' +
        '(src/realtime/flags.js maps the flag to the rt_webgpu_fastpath param).');
      els.lblGpu.textContent = 'ACCELERATED ARM — disabled (fastpath off)';
      log('accelerated arm not constructed: renderer_webgpu_fastpath is off (default)', 'warn');
    }

    resize();
    applyJoinPack();
    state.ready = true;
    updateDrillButton();
    els.boot.textContent = 'running — population ' + n + ', tick ' + TICK_MS + ' ms, fraction ' + TICK_FRACTION +
      ', view: ' + state.viewMode + (state.gpu.status === 'active' ? ', accelerated arm ACTIVE' : '');
  } finally {
    state.rebuilding = false;
  }
}

async function setupAcceleratedArm(n) {
  const g = state.gpu;
  g.status = 'starting';
  // Adapter info for the report (the backend makes its own adapter request —
  // r0.180 three cannot accept an injected device, so the backend's entity
  // buffers and three's scene live on separate devices; see README).
  if ('gpu' in navigator) {
    try {
      const ad = await navigator.gpu.requestAdapter();
      g.adapterInfo = ad
        ? { ...(ad.info ? JSON.parse(JSON.stringify(ad.info)) : {}), features: [...(ad.features || [])] }
        : { note: 'requestAdapter() returned null' };
    } catch (e) {
      g.adapterInfo = { note: 'requestAdapter() threw: ' + (e?.message || e) };
    }
  } else {
    g.adapterInfo = { note: 'navigator.gpu is undefined' };
  }

  const created = await createAcceleratedBackend({
    population: n,
    onDeviceLost: (reason, dying) => handleDeviceLost(reason, dying),
    onUnavailable: (reason) => log('accelerated arm unavailable: ' + reason, 'warn'),
  });

  if (!created.ok) {
    g.status = 'failed';
    g.reason = created.reason;
    paneEmpty(els.wrapGpu, 'FASTPATH ON, but the accelerated arm could not start.\n' + created.reason);
    els.lblGpu.textContent = 'ACCELERATED ARM — unavailable';
    window.__gpuHarness.gpuKind = 'unavailable';
    log('accelerated arm unavailable: ' + created.reason, 'warn');
    return;
  }

  try {
    const scene = buildEnvironment(new THREE.Scene(), Math.min(2 * n, MAX_VEGETATION), WORLD_SEED ^ 0xC0FFEE);
    const mesh = makeEntityMesh(n);
    scene.add(mesh);
    const canvas = freshCanvas(els.wrapGpu);
    const renderer = new WebGPURenderer({ canvas, antialias: true });
    renderer.toneMapping = THREE.NoToneMapping; // explicit: no post chain in the harness
    await renderer.init(); // throws when WebGPU rendering is actually unusable
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO));
    g.renderer = renderer; g.canvas = canvas; g.scene = scene; g.mesh = mesh;
    g.backend = created.backend;
    g.status = 'active'; g.reason = null;
    window.__gpuHarness.gpuKind = 'webgpu';
    els.lblGpu.textContent = 'ACCELERATED ARM — WebGPURenderer + WebGPUThreeBackend (population ' + n + ')';
    log('accelerated arm active (capacity ' + created.backend.capacity + ', adapter: ' + JSON.stringify(g.adapterInfo) + ')');
    log('note: entity state lives on the backend\'s device; three\'s renderer has its own device (r0.180 has no ' +
        'device injection). The draw is fed through the seam\'s sample() read path — see README.');
  } catch (e) {
    g.status = 'failed';
    g.reason = 'WebGPURenderer init failed: ' + (e?.message || e);
    paneEmpty(els.wrapGpu, 'FASTPATH ON, but WebGPURenderer failed to initialize.\n' + g.reason);
    els.lblGpu.textContent = 'ACCELERATED ARM — failed to start';
    window.__gpuHarness.gpuKind = 'renderer-failed';
    log('accelerated arm renderer init failed: ' + (e?.stack || e), 'bad');
    try { created.backend.dispose(); } catch { /* already gone */ }
  }
}

function teardownArms() {
  if (state.control) {
    try { state.control.backend.dispose(); } catch { /* ignore */ }
    try { state.control.renderer.dispose(); } catch { /* ignore */ }
    state.control = null;
  }
  if (state.gpu) {
    try { state.gpu.unsubDeviceLost?.(); } catch { /* ignore */ }
    try { state.gpu.backend?.dispose?.(); } catch { /* ignore */ }
    try { state.gpu.renderer?.dispose?.(); } catch { /* ignore */ }
    state.gpu = null;
  }
}

// --- device-loss drill (design.md "Failure model", exercised in-page) ------------

function updateDrillButton() {
  els.btnDrill.disabled = !(state.gpu && state.gpu.status === 'active' &&
    typeof state.gpu.backend?.reportDeviceLost === 'function');
}

function handleDeviceLost(reason, dying) {
  const g = state.gpu;
  if (!g || g.fellBack) return; // dedupe (async loss, checksum loss, drill)
  log('device loss on accelerated arm: ' + String(reason), 'warn');

  let snap = null;
  try { snap = dying.snapshot(); } catch (e) { log('snapshot() of dying backend threw: ' + (e?.message || e), 'bad'); }
  const adapted = adaptSnapshotForCpu(snap); // fixes entityId/yaw↔id/y field drift
  try { dying.dispose(); } catch { /* ignore */ }
  try { g.renderer?.dispose?.(); } catch { /* ignore */ }

  // Rebuild the pane on the CPU path from the last acknowledged state — the
  // consumer integration pattern (backend.js header / design.md failure model).
  const scene = buildEnvironment(new THREE.Scene(), Math.min(2 * state.population, MAX_VEGETATION), WORLD_SEED ^ 0xC0FFEE);
  const mesh = makeEntityMesh(state.population);
  scene.add(mesh);
  const canvas = freshCanvas(els.wrapGpu);
  const renderer = makeWebGLRenderer(canvas);
  const backend = new CPUThreeBackend({ excludedIds: new Set() });
  backend.ensureCapacity(state.population);
  if (adapted) backend.restoreSnapshot(adapted);
  backend.bindInstancedMesh(mesh);

  g.renderer = renderer; g.canvas = canvas; g.scene = scene; g.mesh = mesh;
  g.backend = backend;
  g.rows = []; g.liveSlots = [];
  g.status = 'fellback';
  g.fellBack = {
    reason: String(reason),
    at: new Date().toISOString(),
    snapshotAck: snap
      ? { kind: snap.kind, packId: snap.packId, epoch: snap.epoch, tick: snap.tick,
          frameSequence: snap.frameSequence, entities: snap.entities?.length ?? 0 }
      : null,
  };
  window.__gpuHarness.gpuKind = 'fellback-to-cpu';
  els.lblGpu.textContent = 'ACCELERATED ARM — FELL BACK TO CPU PATH (' + String(reason) + ')';
  log('accelerated pane rebuilt on CPUThreeBackend from snapshot: ' + JSON.stringify(g.fellBack.snapshotAck) +
      ' — packs keep flowing to the fallback backend', 'ok');
  updateDrillButton();
}

// --- render loop -------------------------------------------------------------------

function updateCamera(now) {
  if (state.orbit) {
    const a = now * 0.00006;
    camera.position.set(Math.sin(a) * 40, 26, Math.cos(a) * 40);
    camera.lookAt(0, 0.4, 0);
  } else {
    camera.position.set(Math.sin(0.7) * 40, 26, Math.cos(0.7) * 40);
    camera.lookAt(0, 0.4, 0);
  }
}

const gpuMatrix = new THREE.Matrix4();

// Feed the accelerated pane's InstancedMesh from the GPU backend's ring via
// the seam's sample() (slot indices in, setPlayer-shaped rows out). The ring
// is evaluated at the backend's shared clock — the same math its on-device
// vertex stage would run.
function writeGpuInstances(g) {
  const slots = g.liveSlots;
  const mesh = g.mesh;
  if (!mesh) return;
  if (!slots.length) { mesh.count = 0; return; }
  const rows = g.rows;
  rows.length = slots.length;
  g.backend.sample(slots, rows);
  let count = 0;
  for (let i = 0; i < slots.length; i++) {
    const row = rows[i];
    if (!row) continue;
    gpuMatrix.makeRotationY(row.rotY);
    gpuMatrix.setPosition(row.x, 0.35, row.z);
    mesh.setMatrixAt(i, gpuMatrix);
    count++;
  }
  mesh.count = slots.length;
  mesh.instanceMatrix.needsUpdate = true;
  void count;
}

// Parity probe: sample the first few entities through BOTH backends and log
// the rows. Runs before the control arm's full sample so the probe's
// 3-row instanced matrix writes are immediately overwritten by the full pass.
function parityProbe() {
  const c = state.control, g = state.gpu;
  if (!c || !g || !(g.status === 'active' || g.status === 'fellback')) return;
  const ids = state.liveEntityIds.slice(0, 3);
  if (!ids.length) return;
  let cRow = null, gRow = null;
  try {
    c.backend.sample(ids, c.probeScratch, {});
    const cs = c.probeScratch; // CPU arm returns flat SoA columns
    if (cs.count > 0) cRow = { x: cs.xyzYaw[0], z: cs.xyzYaw[2], rotY: cs.xyzYaw[3] };
  } catch { /* probe is best-effort */ }
  try {
    if (g.status === 'active') {
      const slots = ids.map((id) => g.backend.slotOf(id));
      const out = [null, null, null];
      g.backend.sample(slots, out); // GPU arm returns setPlayer-shaped rows
      gRow = out[0];
    } else {
      const out = [null, null, null];
      g.backend.sample(ids, out, {});
      const gs = out;
      if (gs.count > 0) gRow = { x: gs.xyzYaw[0], z: gs.xyzYaw[2], rotY: gs.xyzYaw[3] };
    }
  } catch { /* probe is best-effort */ }
  if (cRow || gRow) {
    log('sample parity: control=' + fmtRow(cRow) + ' accelerated=' + fmtRow(gRow));
  }
}

function fmtRow(r) {
  if (!r) return 'null';
  return '{x:' + round3(r.x) + ', z:' + round3(r.z) + ', rotY:' + round3(r.rotY ?? r.yaw) + '}';
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = state.lastRaf ? Math.min(0.1, (now - state.lastRaf) / 1000) : 0.016;
  state.lastRaf = now;
  updateCamera(now);

  const c = state.control, g = state.gpu;
  const exclusive = state.viewMode !== 'both';
  const showControl = c && state.viewMode !== 'accel';
  const showGpu = g && state.viewMode !== 'control' && (g.status === 'active' || g.status === 'fellback');

  if (showControl) {
    // Parity probe first (its 3-row instanced write is clobbered right after
    // by the full sample below).
    if (now - state.lastSample > 1000) {
      state.lastSample = now;
      parityProbe();
    }
    c.backend.sample(null, c.scratch, { dt }); // exponential lerp + matrix writes
    if (c.mesh) c.mesh.count = c.backend.live; // _writeInstances does not touch draw count
    c.renderer.render(c.scene, camera);
    if (exclusive) c.clock.frame(now); // capture only when this arm renders alone
  }
  if (showGpu) {
    if (g.status === 'active') {
      writeGpuInstances(g);
    } else {
      g.backend.sample(null, g.fallbackScratch ?? (g.fallbackScratch = { xyzYaw: new Float32Array(0), ids: new Uint32Array(0), count: 0 }), { dt });
    }
    g.renderer.render(g.scene, camera);
    if (exclusive) g.clock.frame(now);
  }

  if (now - state.lastStat > 250) {
    state.lastStat = now;
    els.stControl.textContent = statLine(c, exclusive && state.viewMode === 'control');
    els.stGpu.textContent = gpuStatLine(g, exclusive && state.viewMode === 'accel');
  }
}

function statLine(arm, capturing) {
  if (!arm) return '-';
  const s = arm.clock.stats();
  return 'population ' + state.population +
    ' · fps(1s) ' + (s.fpsLastSecond ?? '–') +
    ' · mean ' + (s.meanMs ?? '–') + ' ms · p95 ' + (s.p95Ms ?? '–') + ' ms' +
    ' · frames ' + s.framesTotal + ' · packs ' + arm.packs +
    (arm.badReceipts ? ' · BAD RECEIPTS ' + arm.badReceipts : '') +
    ' · ' + (capturing ? 'CAPTURING' : 'capture paused (side-by-side view)');
}

function gpuStatLine(g, capturing) {
  if (!g) return '-';
  if (g.status === 'off') return 'not constructed (flag off)';
  if (g.status === 'failed') return 'unavailable: ' + g.reason;
  if (g.status === 'starting') return 'starting…';
  const s = g.clock.stats();
  const base = 'population ' + state.population +
    ' · fps(1s) ' + (s.fpsLastSecond ?? '–') +
    ' · mean ' + (s.meanMs ?? '–') + ' ms · p95 ' + (s.p95Ms ?? '–') + ' ms' +
    ' · frames ' + s.framesTotal + ' · packs ' + g.packs +
    (g.badReceipts ? ' · BAD RECEIPTS ' + g.badReceipts : '') +
    ' · ' + (capturing ? 'CAPTURING' : 'capture paused (side-by-side view)');
  if (g.status === 'fellback') return 'CPU FALLBACK ACTIVE (' + g.fellBack.reason + ')\n' + base;
  return base + ' · slots ' + g.liveSlots.length;
}

// --- capture + report ------------------------------------------------------------

// Capture each arm exclusively, in turn. window.__gpuHarness.frames is
// written after each leg so capture-gpu-harness.mjs can pick up partial
// results on its polling budget.
async function runCapture(seconds = CAPTURE_SECONDS) {
  if (state.capturing || !state.ready) return null;
  state.capturing = true;
  try {
    const g = state.gpu;
    const wantAccel = g && g.status === 'active';
    const results = {};
    const prevView = state.viewMode;

    els.selView.value = 'control'; state.viewMode = 'control'; applyViewMode();
    state.control.clock.reset();
    await wait(seconds * 1000);
    results.control = state.control.clock.stats();
    window.__gpuHarness.frames = {
      count: results.control.samples, seconds, control: results.control, accelerated: null,
      at: new Date().toISOString(), captureRule: 'exclusive view modes only',
    };

    if (wantAccel) {
      els.selView.value = 'accel'; state.viewMode = 'accel'; applyViewMode();
      g.clock.reset();
      await wait(seconds * 1000);
      results.accelerated = g.clock.stats();
      window.__gpuHarness.frames = {
        count: results.control.samples + results.accelerated.samples, seconds,
        control: results.control, accelerated: results.accelerated,
        at: new Date().toISOString(), captureRule: 'exclusive view modes only',
      };
    }

    els.selView.value = prevView; state.viewMode = prevView; applyViewMode();
    log('capture complete: control ' + JSON.stringify(results.control) +
      (results.accelerated ? ' · accelerated ' + JSON.stringify(results.accelerated) : ''), 'ok');
    return window.__gpuHarness.frames;
  } finally {
    state.capturing = false;
  }
}

function buildReport() {
  const c = state.control, g = state.gpu;
  const armReport = (arm, extra = {}) => ({
    capture: arm ? { ...arm.clock.stats(), ...timingNote() } : null,
    packsApplied: arm?.packs ?? 0,
    badReceipts: arm?.badReceipts ?? 0,
    lastReceipt: arm?.lastReceipt ?? null,
    ...extra,
  });
  return {
    harness: 'afterlight-gpu-harness-v1',
    date: new Date().toISOString(),
    userAgent: navigator.userAgent,
    flags: {
      ...state.flags,
      source: 'src/realtime/flags.js resolveFlags()',
      gate: 'shouldConstructWebGpu() (src/realtime/gpu/backend.js)',
      enablingParam: 'rt_webgpu_fastpath=1',
      localStorageKey: 'afterlight-rt-flags',
      default: false,
    },
    postChainNotice: POST_CHAIN_NOTICE,
    world: {
      population: state.population,
      seed: WORLD_SEED,
      tickMs: TICK_MS,
      tickFraction: TICK_FRACTION,
      ticksApplied: state.tickIndex,
      bounds: WORLD_BOUNDS,
      fixtureSource: FIXTURE_SOURCE,
    },
    acceleratedArm: {
      flagOn: state.flagOn,
      status: g?.status ?? 'off',
      reason: g?.reason ?? null,
      adapterInfo: g?.adapterInfo ?? null,
      fellBack: g?.fellBack ?? null,
      deviceSplitNote: 'entity buffers live on the backend\'s device; the WebGPURenderer has its own device (r0.180 has no device injection) — the draw is fed via the seam\'s sample() read path',
    },
    arms: {
      control: armReport(c, {
        name: 'control',
        renderer: 'THREE.WebGLRenderer (NoToneMapping, no EffectComposer/bloom, no shadow maps)',
        backend: 'CPUThreeBackend (src/realtime/gpu/backend.js), exponential lerp sample({dt})',
      }),
      accelerated: armReport(g, {
        name: 'accelerated',
        renderer: 'three/webgpu WebGPURenderer (NoToneMapping)',
        backend: 'WebGPUThreeBackend (src/realtime/gpu/webgpuBackend.js) via tools/realtime/gpu-arm-adapter.js',
      }),
    },
  };
}

function timingNote() {
  return {
    captureMode: 'exclusive view mode only (control only / accelerated only)',
    samplingNote: 'samples are recorded only while the owning arm renders alone; side-by-side rendering confounds frame cost',
  };
}

function downloadReport() {
  const report = buildReport();
  window.__gpuHarness.report = report;
  const json = JSON.stringify(report, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'gpu-harness-report-' + new Date().toISOString().replace(/[:.]/g, '-') + '.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  log('report downloaded (' + json.length + ' bytes)', 'ok');
}

// --- ui wiring ------------------------------------------------------------------------

function applyViewMode() {
  const mode = state.viewMode;
  document.getElementById('pane-control').style.display = mode === 'accel' ? 'none' : '';
  document.getElementById('pane-gpu').style.display = mode === 'control' ? 'none' : '';
  resize();
}

function resize() {
  const c = state.control, g = state.gpu;
  const canvas = c?.canvas ?? g?.canvas;
  if (!canvas) return;
  const w = canvas.clientWidth || 640;
  const h = canvas.clientHeight || 480;
  const aspect = w / h;
  const s = 14;
  camera.left = -s * aspect; camera.right = s * aspect; camera.top = s; camera.bottom = -s;
  camera.updateProjectionMatrix();
  for (const arm of [c, g]) {
    if (arm?.renderer && arm.canvas) {
      try {
        arm.renderer.setSize(arm.canvas.clientWidth || w, arm.canvas.clientHeight || h, false);
      } catch { /* renderer may be mid-teardown */ }
    }
  }
}

function renderBanner() {
  const f = state.flags;
  if (!state.flagOn) {
    els.banner.innerHTML = '<span class="warn">FASTPATH OFF</span> — <code>renderer_webgpu_fastpath</code> resolves ' +
      '<strong>false</strong> (default off everywhere; gate: <code>shouldConstructWebGpu()</code> in ' +
      'src/realtime/gpu/backend.js). The accelerated arm is never constructed; the page runs control-only. ' +
      'Enable for this page only with <code>?rt_webgpu_fastpath=1</code> (src/realtime/flags.js maps the flag to ' +
      'the <code>rt_webgpu_fastpath</code> URL param) or localStorage ' +
      '<code>{"renderer_webgpu_fastpath":true}</code> under key <code>afterlight-rt-flags</code>. Resolved flags: ' +
      '<code>' + JSON.stringify(f) + '</code>';
  } else {
    els.banner.innerHTML = '<span class="ok">FASTPATH ON</span> — <code>renderer_webgpu_fastpath</code> resolves ' +
      '<strong>true</strong>; the accelerated arm will construct if the WebGPU device is available ' +
      '(createWebGPUThreeBackend resolves null otherwise — boring unavailability, never a crash). ' +
      'Resolved flags: <code>' + JSON.stringify(f) + '</code>';
  }
}

function wire() {
  els.btnRebuild.addEventListener('click', () => rebuild(Number(els.selPop.value)));
  els.selPop.addEventListener('change', () => rebuild(Number(els.selPop.value)));
  els.selView.addEventListener('change', () => { state.viewMode = els.selView.value; applyViewMode(); });
  els.chkOrbit.addEventListener('change', () => { state.orbit = els.chkOrbit.checked; });
  els.btnTick.addEventListener('click', () => {
    state.ticksPaused = !state.ticksPaused;
    els.btnTick.textContent = state.ticksPaused ? 'resume ticks' : 'pause ticks';
    log(state.ticksPaused ? 'ticks paused (world frozen; rendering continues)' : 'ticks resumed');
  });
  els.btnDrill.addEventListener('click', () => {
    const g = state.gpu;
    if (!g || g.status !== 'active' || typeof g.backend?.reportDeviceLost !== 'function') return;
    log('drill: reportDeviceLost("harness device-loss drill (manual)") on the accelerated backend', 'warn');
    g.backend.reportDeviceLost('harness device-loss drill (manual)');
  });
  els.btnReport.addEventListener('click', downloadReport);
  window.addEventListener('resize', resize);
}

// --- boot -------------------------------------------------------------------------------

async function boot() {
  state.flags = resolveFlags();
  // Flag gate (task 4.2): the seam's own authority — default off everywhere.
  state.flagOn = shouldConstructWebGpu(state.flags);
  window.__gpuHarness.flagOn = state.flagOn;
  window.__gpuHarness.booted = true;
  renderBanner();
  log('flags resolved from src/realtime/flags.js: ' + JSON.stringify(state.flags));
  wire();

  const qs = new URLSearchParams(location.search);
  const requested = Number(qs.get('population'));
  if (POPULATIONS.includes(requested)) els.selPop.value = String(requested);

  applyViewMode();
  requestAnimationFrame(frame);
  setInterval(tick, TICK_MS);
  await rebuild(Number(els.selPop.value));

  if (qs.get('capture') === '1') {
    // capture-gpu-harness.mjs contract: run a capture window automatically.
    await wait(1000); // let the join pack settle and warmup frames pass
    await runCapture(CAPTURE_SECONDS);
  }
}

boot().catch((e) => {
  els.boot.textContent = 'BOOT FAILED';
  window.__gpuHarness.error = String(e?.message || e);
  log('boot failed: ' + (e?.stack || e), 'bad');
});
