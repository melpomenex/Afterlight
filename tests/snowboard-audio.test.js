/**
 * Summit Run race audio tests (add-multiplayer-snowboard-arcade 8.2).
 * Uses a stub AudioContext to prove: bounded voices, mute respect, loop
 * lifecycle, and that dispose stops everything and closes only a fallback
 * context — never an injected host context.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { createRaceAudio } from '../src/activities/snowboard/audio.js';

function makeStubContext() {
  const stats = { created: 0, closed: 0, stopped: 0 };
  const makeNode = () => {
    const node = {
      gain: { value: 0, setTargetAtTime: () => {}, setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
      frequency: { value: 0, setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
      type: null,
      buffer: null,
      loop: false,
      stopped: false,
      connected: [],
      connect(target) {
        node.connected.push(target);
        return target;
      },
      disconnect() {},
      start() {},
      stop() {
        node.stopped = true;
        stats.stopped += 1;
      },
      onended: null,
    };
    return node;
  };

  const ctx = {
    sampleRate: 8000,
    currentTime: 0,
    state: 'running',
    destination: { name: 'destination' },
    createGain: () => makeNode(),
    createBufferSource: () => makeNode(),
    createOscillator: () => makeNode(),
    createBiquadFilter: () => makeNode(),
    createBuffer: (channels, length) => ({ getChannelData: () => new Float32Array(length) }),
    close() {
      stats.closed += 1;
    },
    __stats: stats,
  };
  return { ctx, stats };
}

test('race audio: loops scale with the rider state and never exceed the voice cap', () => {
  const { ctx } = makeStubContext();
  const audio = createRaceAudio({ getContext: () => ctx });

  audio.update({ v: 40, airborne: false, steer: 0.8 });
  assert.equal(audio.loopCount, 2, 'wind + slide loops at speed (carve is a source one-shot)');

  audio.update({ v: 0, airborne: false, steer: 0 });
  assert.equal(audio.loopCount, 0, 'all loops stop at a standstill');

  // One-shots under a suspended context are no-ops and never throw.
  ctx.state = 'suspended';
  audio.event('landing');
  audio.event('countdown');
  audio.dispose();
  assert.equal(ctx.__stats.closed, 1, 'fallback context is closed on dispose');
});

test('race audio: muted blocks everything; dispose stops and closes exactly once', () => {
  const { ctx } = makeStubContext();
  const audio = createRaceAudio({ getContext: () => ctx });

  audio.update({ v: 40, airborne: false, steer: 0.5 });
  audio.setMuted(true);
  assert.equal(audio.loopCount, 0, 'mute stops loops');
  audio.event('finish');
  audio.dispose();
  audio.dispose();

  assert.equal(ctx.__stats.closed, 1, 'dispose is idempotent');
  assert.ok(ctx.__stats.stopped >= 1, 'loop sources were stopped');
});

test('race audio: an injected host context is never closed on dispose', () => {
  const { ctx, stats } = makeStubContext();
  const audio = createRaceAudio({ mixer: { context: ctx, buses: { effects: { name: 'effects-bus' } } } });

  audio.update({ v: 30, airborne: false, steer: 0 });
  audio.dispose();
  assert.equal(stats.closed, 0, 'host context outlives the race');
  assert.ok(ctx.__stats === stats);
});

test('race audio: without any context every entry point is a no-op', () => {
  const audio = createRaceAudio({ getContext: () => null });
  audio.update({ v: 40, airborne: false, steer: 1 });
  audio.event('go');
  audio.setMuted(true);
  audio.dispose();
  assert.equal(audio.loopCount, 0);
  assert.equal(audio.voiceCount, 0);
});
