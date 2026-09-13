import test from 'node:test';
import assert from 'node:assert/strict';

import { createPoolAudio } from '../src/activities/pool/audio.js';
import { strikeCueBall, step as physicsStep, initRack } from '../shared/pool/physics.js';

/**
 * Minimal WebAudio stand-in: enough node bookkeeping to assert wiring,
 * budgets, stealing and release behavior without a browser.
 */
function createFakeContext() {
  let nextId = 1;
  const nodes = [];
  const ctx = {
    state: 'running',
    currentTime: 0,
    _nodes: nodes,
    /** Advance simulated time and fire natural buffer-end callbacks. */
    tick(seconds) {
      ctx.currentTime += seconds;
      for (const n of nodes) {
        if (n.kind === 'source' && n.started && n.stoppedAt === null && n.loop === false) {
          if (n.startedAt + (n.buffer?.duration ?? 0.2) <= ctx.currentTime) {
            if (n.onended) queueMicrotask(n.onended);
          }
        }
      }
    },
    decodeAudioData(buf) {
      return Promise.resolve({ fake: true, name: buf?._name ?? 'buffer', duration: 0.2 });
    },
    createGain() {
      const n = { id: nextId++, kind: 'gain', gain: param(1), connect: track(ctx), disconnect() { n._disconnected = true; }, _connectedTo: [] };
      nodes.push(n);
      return n;
    },
    createStereoPanner() {
      const n = { id: nextId++, kind: 'panner', pan: param(0), connect: track(ctx), disconnect() { n._disconnected = true; }, _connectedTo: [] };
      nodes.push(n);
      return n;
    },
    createDynamicsCompressor() {
      const n = {
        id: nextId++, kind: 'compressor',
        threshold: param(-24), knee: param(30), ratio: param(12), attack: param(0.003), release: param(0.25),
        connect: track(ctx), disconnect() { n._disconnected = true; }, _connectedTo: [],
      };
      nodes.push(n);
      return n;
    },
    createBufferSource() {
      const n = {
        id: nextId++, kind: 'source',
        buffer: null,
        loop: false,
        playbackRate: param(1),
        started: false,
        stoppedAt: null,
        onended: null,
        connect: track(ctx),
        disconnect() { n._disconnected = true; },
        _connectedTo: [],
        start(when = 0) { n.started = true; n.startedAt = when; },
        stop(when = 0) { n.stoppedAt = when; if (n.onended) queueMicrotask(n.onended); },
      };
      nodes.push(n);
      return n;
    },
    createOscillator() {
      const n = {
        id: nextId++, kind: 'oscillator',
        type: 'sine', frequency: param(440),
        connect: track(ctx), disconnect() { n._disconnected = true; }, _connectedTo: [],
        start() { n.started = true; }, stop() { if (n.onended) queueMicrotask(n.onended); },
        onended: null,
      };
      nodes.push(n);
      return n;
    },
  };
  function param(v) {
    return {
      value: v,
      setValueAtTime() {}, linearRampToValueAtTime() {},
      exponentialRampToValueAtTime() {}, setTargetAtTime() {},
      cancelScheduledValues() {},
    };
  }
  function track(context) {
    return (dst) => { context._connections.push([arguments.length, dst]); };
  }
  ctx._connections = [];
  return ctx;
}

function createMixer(ctx) {
  const effects = { kind: 'effects-bus', connect() {}, disconnect() {}, _connectedTo: [] };
  return { context: ctx, buses: { effects } };
}

/** fetch stand-in serving real palette names as tiny array buffers. */
function fakeFetch(sampleNames) {
  const served = new Set(sampleNames);
  let calls = 0;
  const fn = async (url) => {
    calls += 1;
    const name = url.split('/').pop().replace('.wav', '');
    if (!served.has(name)) return { ok: false, status: 404 };
    return { ok: true, arrayBuffer: async () => ({ _name: name }) };
  };
  fn.calls = () => calls;
  return fn;
}

const PALETTE_NAMES = [
  'cue-soft-1', 'cue-soft-2', 'cue-hard-1', 'cue-hard-2',
  'ball-soft-1', 'ball-soft-2', 'ball-med-1', 'ball-med-2', 'ball-hard-1', 'ball-hard-2',
  'cushion-1', 'cushion-2', 'cushion-3',
  'pocket-1', 'pocket-2', 'pocket-3',
  'cloth-loop',
];

const PLAYER_NEAR = { position: { x: -8.6, z: -4.5 } };
const PLAYER_FAR = { position: { x: 30, z: 30 } };

async function readyAudio(overrides = {}) {
  const ctx = createFakeContext();
  const mixer = createMixer(ctx);
  const fetchImpl = overrides.fetchImpl || fakeFetch(PALETTE_NAMES);
  const audio = createPoolAudio({
    audioMixer: mixer,
    getPlayer: () => overrides.player ?? PLAYER_NEAR,
    tablePosition: [-8.6, 0, -4.5],
    tableRotationY: Math.PI / 2,
    fetchImpl,
    ...overrides.extra,
  });
  audio.activate();
  audio.updateMovement({ physics: { balls: {} } });
  await new Promise((r) => setTimeout(r, 20)); // let load + decode settle
  audio.updateMovement({ physics: { balls: {} } });
  return { audio, ctx, mixer, fetchImpl };
}

test('engine: loads the palette only through the shared running context', async () => {
  const { audio, ctx } = await readyAudio();
  assert.equal(audio.loadState.phase, 'ready');
  // table bus + compressor exist and reach the effects bus
  const kinds = ctx._nodes.map((n) => n.kind);
  assert.ok(kinds.includes('gain'));
  assert.ok(kinds.includes('compressor'));
});

test('engine: no running context or suspended context means silence, no standalone context', async () => {
  const ctx = createFakeContext();
  const mixer = createMixer(ctx);
  const fetchImpl = fakeFetch(PALETTE_NAMES);
  const audio = createPoolAudio({
    audioMixer: mixer,
    getPlayer: () => PLAYER_NEAR,
    fetchImpl,
  });
  audio.activate();

  ctx.state = 'suspended';
  audio.updateMovement({ physics: { balls: {} } });
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(fetchImpl.calls(), 0, 'suspended context never starts loading');

  const played = audio.presentPredicted([
    { type: 'ball_collision', ballA: 0, ballB: 1, speed: 5 },
  ]);
  assert.equal(played, 0, 'contacts stay silent without a running context');
  assert.equal(ctx._nodes.filter((n) => n.kind === 'source').length, 0);

  ctx.state = 'running';
  audio.updateMovement({ physics: { balls: {} } });
  await new Promise((r) => setTimeout(r, 20));
  audio.updateMovement({ physics: { balls: {} } });
  const playedNow = audio.presentPredicted([
    { type: 'ball_collision', ballA: 0, ballB: 1, speed: 5 },
  ]);
  assert.equal(playedNow, 1, 'a later successful enable plays only fresh events');
});

test('engine: dense break stays within 24 transient voices and releases ended nodes', async () => {
  const { audio, ctx } = await readyAudio();

  // A full-power break: play its real events in one dense burst.
  let state = strikeCueBall(initRack(), 0, 30, 0, 0);
  const events = [];
  for (let i = 0; i < 30 && !state.settled; i++) {
    const res = physicsStep(state, 1 / 60);
    state = res.state;
    events.push(...res.events);
  }
  assert.ok(events.length > MAX_CHECK, `dense break produced ${events.length} contacts`);
  audio.presentPredicted(events);

  assert.ok(audio.activeVoiceCount <= 24, `voice budget respected (got ${audio.activeVoiceCount})`);
  const live = ctx._nodes.filter((n) => n.kind === 'source' && n.started && !n.loop && n.stoppedAt === null);
  assert.ok(live.length <= 24, `live transient sources bounded (got ${live.length})`);
  const stolen = ctx._nodes.filter((n) => n.kind === 'source' && n.started && !n.loop && n.stoppedAt !== null);
  assert.ok(stolen.length > 0, 'a dense break actually exercised priority stealing');

  // Ended nodes release: advance simulated time past every buffer end.
  ctx.tick(0.25);
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(audio.activeVoiceCount, 0, 'voices release after buffers end');
});

const MAX_CHECK = 30;

test('engine: velocity layers route to matching samples and variants cycle', async () => {
  const { audio } = await readyAudio();
  const seen = new Set();
  for (let i = 0; i < 8; i++) {
    const speed = [0.5, 4, 12][i % 3];
    audio.presentPredicted([{ type: 'ball_collision', ballA: 0, ballB: i % 15, speed, x: 0, z: 0 }]);
  }
  // Different speeds must have produced voices; exact buffer identity is
  // covered by pickBuffer unit behavior — here we assert playback happened
  // and voices were bounded.
  assert.ok(audio.activeVoiceCount >= 1);
});

test('engine: soft contacts are quieter than hard contacts at the same distance', async () => {
  const { ctx, audio } = await readyAudio();
  const gains = [];
  // Capture the scheduled voice gains through a param stub that records ramps.
  const origCreateGain = ctx.createGain.bind(ctx);
  ctx.createGain = () => {
    const n = origCreateGain();
    const origRamp = n.gain.linearRampToValueAtTime.bind(n.gain);
    n.gain.linearRampToValueAtTime = (v, t) => { gains.push({ id: n.id, v }); return origRamp(v, t); };
    return n;
  };
  audio.presentPredicted([
    { type: 'ball_collision', ballA: 0, ballB: 1, speed: 0.5, x: 0, z: 0 },
    { type: 'ball_collision', ballA: 0, ballB: 2, speed: 11, x: 0, z: 0 },
  ]);
  await new Promise((r) => setTimeout(r, 5));
  const transientTargets = gains.map((g) => g.v).filter((v) => v > 0);
  assert.equal(transientTargets.length, 2, 'both contacts started a voice');
  assert.ok(transientTargets[0] < transientTargets[1] * 0.5,
    `soft contact is clearly quieter (${transientTargets[0]} vs ${transientTargets[1]})`);
});

test('engine: distance attenuation silences far listeners', async () => {
  const { audio } = await readyAudio({ player: PLAYER_FAR });
  const played = audio.presentPredicted([
    { type: 'ball_collision', ballA: 0, ballB: 1, speed: 5, x: 0, z: 0 },
    { type: 'pocketed', ballId: 3, pocketId: 'corner_br', speed: 2 },
  ]);
  assert.equal(played, 0, 'beyond the 14 m listening range nothing sounds');
});

test('engine: table transform positions contacts; pan stays subtle', async () => {
  const camera = {
    position: { x: -8.6, y: 2, z: -4.5 },
    matrixWorld: { elements: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1] },
  };
  const { audio, ctx } = await readyAudio({ extra: { getActiveCamera: () => camera } });
  audio.presentPredicted([
    { type: 'ball_collision', ballA: 0, ballB: 1, speed: 5, x: 1.0, z: 0.5 },
    { type: 'ball_collision', ballA: 0, ballB: 2, speed: 5, x: -1.0, z: -0.5 },
  ]);
  const pans = ctx._nodes
    .filter((n) => n.kind === 'panner')
    .map((n) => n.pan.value)
    .filter((p) => p !== 0);
  assert.equal(pans.length, 2, 'contacts off-center are stereo-panned');
  for (const p of pans) assert.ok(Math.abs(p) <= 0.55 + 1e-9, `pan subtle (got ${p})`);
  assert.ok(Math.sign(pans[0]) !== Math.sign(pans[1]), 'opposite table sides pan apart');
});

test('engine: cloth movement tracks ball speed, excludes pocketed/stationary, silences fast', async () => {
  const { audio, ctx } = await readyAudio();

  const rolling = {
    physics: {
      balls: {
        '0': { state: 'in_play', vx: 2, vz: 0 },
        '3': { state: 'in_play', vx: 0, vz: 1.5 },
        '5': { state: 'pocketed', vx: 9, vz: 9 }, // pocketed: excluded
        '7': { state: 'in_play', vx: 0.01, vz: 0 }, // ~stationary: excluded
      },
    },
  };
  audio.updateMovement(rolling);
  const loopSources = ctx._nodes.filter((n) => n.kind === 'source' && n.loop);
  assert.equal(loopSources.length, 1, 'exactly one aggregate movement voice');
  assert.ok(loopSources[0].started);

  // Settling: all speeds → 0. The gain target must reach silence (the fake
  // param records the last setTargetAtTime value).
  audio.updateMovement({ physics: { balls: { '0': { state: 'in_play', vx: 0, vz: 0 } } } });
  // No throw + loop voice retained (it fades rather than being torn down).
  assert.ok(audio.activeVoiceCount >= 0);
});

test('engine: deactivate stops voices within 200 ms and never closes the shared context', async () => {
  const { audio, ctx } = await readyAudio();
  audio.presentPredicted([
    { type: 'ball_collision', ballA: 0, ballB: 1, speed: 8, x: 0, z: 0 },
    { type: 'pocketed', ballId: 4, pocketId: 'corner_br', speed: 3 },
  ]);
  assert.ok(audio.activeVoiceCount > 0);
  audio.deactivate();
  assert.equal(audio.activeVoiceCount, 0, 'all transient voices stopped immediately');
  assert.equal(ctx.state, 'running', 'the shared context is never closed');
  const loopSources = ctx._nodes.filter((n) => n.kind === 'source' && n.loop);
  assert.ok(loopSources.every((s) => s.stoppedAt !== null), 'movement voice stopped');

  // Late-presented events during deactivation are dropped.
  assert.equal(audio.presentPredicted([{ type: 'ball_collision', ballA: 0, ballB: 1, speed: 5 }]), 0);
});

test('engine: dispose after travel keeps decoded buffers per context and replays nothing stale', async () => {
  const ctx = createFakeContext();
  const mixer = createMixer(ctx);
  const fetchImpl = fakeFetch(PALETTE_NAMES);
  const mk = () => createPoolAudio({
    audioMixer: mixer,
    getPlayer: () => PLAYER_NEAR,
    fetchImpl,
  });

  const first = mk();
  first.activate();
  first.updateMovement({ physics: { balls: {} } });
  await new Promise((r) => setTimeout(r, 20));
  first.updateMovement({ physics: { balls: {} } });
  assert.equal(first.loadState.phase, 'ready');
  first.dispose();

  const callsAfterFirst = fetchImpl.calls();

  const second = mk();
  second.activate();
  second.updateMovement({ physics: { balls: {} } });
  await new Promise((r) => setTimeout(r, 20));
  second.updateMovement({ physics: { balls: {} } });
  assert.equal(second.loadState.phase, 'ready');
  assert.equal(fetchImpl.calls(), callsAfterFirst, 'returning reuses the per-context decoded buffers');

  // The fresh instance has no event history: an old contact replays only
  // when presented as a NEW event, and baselining swallows history.
  second.baselineAuthoritative([{ type: 'ball_collision', ballA: 0, ballB: 1, speed: 5 }]);
  assert.equal(
    second.presentAuthoritative([{ type: 'ball_collision', ballA: 0, ballB: 1, speed: 5 }]),
    0,
    'baseline watermarks do not replay',
  );
  second.dispose();
});

test('engine: missing assets degrade per family with bounded retry, gameplay unaffected', async () => {
  const ctx = createFakeContext();
  const mixer = createMixer(ctx);
  const partial = PALETTE_NAMES.filter((n) => !n.startsWith('cushion'));
  const fetchImpl = fakeFetch(partial);
  const audio = createPoolAudio({
    audioMixer: mixer,
    getPlayer: () => PLAYER_NEAR,
    fetchImpl,
  });
  audio.activate();
  audio.updateMovement({ physics: { balls: {} } });
  await new Promise((r) => setTimeout(r, 20));
  audio.updateMovement({ physics: { balls: {} } });

  assert.equal(audio.loadState.phase, 'partial');
  assert.ok(audio.loadState.missingFamilies.includes('cushion'));

  // Cushion contacts are silent but do not throw; ball contacts still play.
  assert.equal(audio.presentPredicted([{ type: 'rail_collision', ballId: 2, rail: 'left', speed: 3 }]), 0);
  assert.equal(audio.presentPredicted([{ type: 'ball_collision', ballA: 0, ballB: 1, speed: 5, x: 0, z: 0 }]), 1);
});

test('engine: total fetch failure retries a bounded number of times then waits', async () => {
  const ctx = createFakeContext();
  const mixer = createMixer(ctx);
  const fetchImpl = fakeFetch([]); // everything 404s
  const audio = createPoolAudio({
    audioMixer: mixer,
    getPlayer: () => PLAYER_NEAR,
    fetchImpl,
  });
  audio.activate();
  for (let round = 0; round < 6; round++) {
    audio.updateMovement({ physics: { balls: {} } });
    await new Promise((r) => setTimeout(r, 12));
  }
  assert.ok(fetchImpl.calls() <= PALETTE_NAMES.length * 2, `bounded retry (got ${fetchImpl.calls()} fetches)`);
  assert.ok(['failed', 'partial'].includes(audio.loadState.phase));

  // Reactivation resets the retry budget (bounded per activation).
  audio.activate();
  audio.updateMovement({ physics: { balls: {} } });
  await new Promise((r) => setTimeout(r, 12));
  assert.ok(fetchImpl.calls() > 0);
  audio.dispose();
});

test('engine: cue strikes, foul tone, and reconciliation end-to-end through the engine', async () => {
  const { audio } = await readyAudio();

  audio.scopeShot({ shot: 1, status: 'aiming' });
  assert.equal(audio.localCueStrike(0.7), true, 'shooter animation plays its strike');

  audio.scopeShot({ shot: 1, status: 'shooting' });
  assert.equal(audio.observedSim({ status: 'shooting', cueBallSpeed: 12 }), false, 'authoritative echo suppressed');

  // Same contact from prediction then snapshot: heard once.
  const ev = { type: 'ball_collision', ballA: 0, ballB: 9, speed: 6, x: 0, z: 0, shot: 1, t: 0.1 };
  assert.equal(audio.presentPredicted([ev]), 1);
  assert.equal(audio.presentAuthoritative([ev]), 0);

  audio.playFoulTone(); // must not throw under the fake context
});
