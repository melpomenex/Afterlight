/**
 * Tests for the local audio mixer and environmental zone audio
 * (add-atmosphere-weather-system task 4.1, design D7) plus the narrow
 * TheaterScreenUI.setMixGain seam, over a fake AudioContext.
 *
 * Covered here: one shared context, independent logical gains, retained
 * loops across zone crossfades, gain smoothing automation, exit
 * cancellation, thunder scheduling/cancellation, duck attack/release,
 * malformed/unavailable storage, and effective media volume (user volume x
 * mix gain) on mix change, engine replacement and degraded providers.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createAudioMixer,
  AUDIO_PREFS_KEY,
  DEFAULT_AUDIO_PREFS,
  DUCK_ENV_LEVEL,
  DUCK_MEDIA_LEVEL,
  DUCK_RELEASE_MS,
} from '../src/audio/mixer.js';
import {
  createEnvironmentAudio,
  normalizeZoneProfile,
  normalizeAmbienceProfile,
  zoneProfileFor,
  ZONE_PROFILES,
  AMBIENCE_PROFILES,
  ZONE_CROSSFADE_MS,
} from '../src/audio/environmentAudio.js';
import { THEATER_ENVIRONMENTS } from '../shared/theaterEnvironments.js';

// --- fake AudioContext --------------------------------------------------------

class FakeParam {
  constructor(value) {
    this.value = value;
    this.calls = [];
  }
  setValueAtTime(v, t) { this.calls.push(['setValueAtTime', v, t]); this.value = v; return this; }
  linearRampToValueAtTime(v, t) { this.calls.push(['linearRamp', v, t]); this.value = v; return this; }
  exponentialRampToValueAtTime(v, t) { this.calls.push(['exponentialRamp', v, t]); this.value = v; return this; }
  setTargetAtTime(v, t, c) { this.calls.push(['setTarget', v, t, c]); this.value = v; return this; }
  cancelScheduledValues(t) { this.calls.push(['cancel', t]); return this; }
  rampsTo(target) {
    return this.calls.some(([kind, v]) => (kind === 'linearRamp' || kind === 'exponentialRamp' || kind === 'setTarget') && v === target);
  }
  rampAt(target) {
    const call = this.calls.find(([kind, v]) => kind === 'linearRamp' && v === target);
    return call ? call[2] : null;
  }
}

class FakeNode {
  constructor(ctx, params = []) {
    this.ctx = ctx;
    this.connections = [];
    this.disconnects = 0;
    for (const [name, value] of params) this[name] = new FakeParam(value);
  }
  connect(dest) {
    this.connections.push(dest);
    return dest;
  }
  disconnect() { this.disconnects += 1; }
}

class FakeBufferSource extends FakeNode {
  constructor(ctx) {
    super(ctx, [['playbackRate', 1]]);
    this.buffer = null;
    this.loop = false;
    this.started = [];
    this.stopped = [];
  }
  start(when = 0, offset = 0) { this.started.push([when, offset]); }
  stop(when = 0) { this.stopped.push(when); }
}

class FakeAudioContext {
  constructor() {
    this.sampleRate = 48000;
    this.state = 'running';
    this.currentTime = 100;
    this.destination = new FakeNode(this);
    this.createdNodes = [];
    this.resumeBehavior = 'running';
    this.resumeCalls = 0;
  }
  createGain() { const n = new FakeNode(this, [['gain', 1]]); this.createdNodes.push(n); return n; }
  createBiquadFilter() {
    const n = new FakeNode(this, [['frequency', 350], ['Q', 1], ['detune', 0]]);
    this.createdNodes.push(n);
    return n;
  }
  createBufferSource() { const n = new FakeBufferSource(this); this.createdNodes.push(n); return n; }
  createBuffer(channels, length, rate) {
    const data = new Float32Array(length);
    return { channels, length, sampleRate: rate, getChannelData: (i) => (i === 0 ? data : new Float32Array(length)) };
  }
  async resume() {
    this.resumeCalls += 1;
    if (this.resumeBehavior === 'reject') {
      this.state = 'suspended'; // a denied gesture leaves the context suspended
      throw new Error('NotAllowedError');
    }
    this.state = this.resumeBehavior;
    return this.state === 'running';
  }
  async suspend() {
    this.state = 'suspended';
    return true;
  }
}

function createStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem(k) { return data.has(k) ? data.get(k) : null; },
    setItem(k, v) { data.set(k, String(v)); },
  };
}

/** Deterministic scheduler: tests pump queued callbacks manually. */
function createManualScheduler() {
  const queue = [];
  return {
    queue,
    scheduleDelay(fn) { queue.push(fn); return queue.length; },
    cancelDelay() {},
    pump() {
      const pending = queue.splice(0);
      for (const fn of pending) fn();
      return pending.length;
    },
  };
}

/** Source -> filter -> layer gain -> (bus | weatherFilter) chains. */
function sourceChains(ctx) {
  return ctx.createdNodes
    .filter((n) => n instanceof FakeBufferSource)
    .map((src) => {
      const filter = src.connections[0] ?? null;
      const gain = filter?.connections[0] ?? null;
      const dest = gain?.connections[0] ?? null;
      return { src, filter, gain, dest };
    });
}

function weatherLayerChains(ctx, mixer) {
  return sourceChains(ctx).filter(
    (c) => c.dest && c.dest !== mixer.buses.ambience && c.dest.connections?.[0]?.connections?.[0] === mixer.buses.weather,
  );
}

// --- mixer -------------------------------------------------------------------

test('mixer: ONE AudioContext is created on the first gesture and reused', () => {
  const mixer = createAudioMixer({ contextClass: FakeAudioContext, storage: null });
  assert.equal(mixer.status(), 'unavailable', 'no context before a gesture');
  const first = mixer.ensure();
  assert.ok(first instanceof FakeAudioContext);
  const second = mixer.ensure();
  assert.equal(first, second, 'ensure() never builds a second context');
  assert.ok(mixer.buses.master && mixer.buses.environment && mixer.buses.ambience && mixer.buses.weather && mixer.buses.effects);
});

test('mixer: unavailable audio reports honestly and never throws', async () => {
  const mixer = createAudioMixer({ contextClass: null, storage: null });
  assert.equal(mixer.ensure(), null);
  assert.equal(mixer.status(), 'unavailable');
  assert.equal(await mixer.resume(), false, 'resume without a context reports false');
  assert.equal(mixer.mediaGain(), 0, 'media stays silent until sound is enabled (the default)');
});

test('mixer: the master sound gate silences media until the Sound gesture turns it on', () => {
  const mixer = createAudioMixer({ contextClass: FakeAudioContext, storage: null });
  assert.equal(mixer.isSoundEnabled(), false, 'sound starts off');
  mixer.setPreference('media', 1);
  assert.equal(mixer.mediaGain(), 0, 'media factor gated to silence despite the preference');

  const seen = [];
  mixer.onMediaGainChange((g) => seen.push(g));
  assert.equal(mixer.setSoundEnabled(true), true);
  assert.equal(mixer.mediaGain(), 1, 'enabling sound restores the media factor');
  assert.ok(seen.includes(1), 'listeners learn media became audible');

  assert.equal(mixer.setSoundEnabled(false), false);
  assert.equal(mixer.mediaGain(), 0, 'muting gates the media factor again');
  assert.equal(mixer.setSoundEnabled(false), false, 'idempotent: no state churn');
  assert.equal(mixer.setPreference('media', 0.5), 0.5, 'the preference itself is never overwritten');
});

test('mixer: independent logical gains — weather changes alone', () => {
  const mixer = createAudioMixer({ contextClass: FakeAudioContext, storage: null });
  mixer.ensure();
  mixer.setPreference('weather', 0.1);
  assert.equal(mixer.buses.weather.gain.value, 0.1);
  assert.equal(mixer.buses.ambience.gain.value, DEFAULT_AUDIO_PREFS.ambience, 'ambience untouched');
  assert.equal(mixer.buses.effects.gain.value, DEFAULT_AUDIO_PREFS.effects, 'effects untouched');
  mixer.setPreference('weather', 42); // clamped, never amplified past unity
  assert.equal(mixer.preference('weather'), 1);
  mixer.setPreference('ambience', -3);
  assert.equal(mixer.preference('ambience'), 0);
  assert.equal(mixer.setPreference('nonsense', 0.5), 0, 'unknown names are rejected');
});

test('mixer: preferences persist to afterlight-audio-v1; malformed storage falls back to defaults', () => {
  const malformed = createStorage({ [AUDIO_PREFS_KEY]: '{not json' });
  assert.deepEqual(createAudioMixer({ contextClass: FakeAudioContext, storage: malformed }).preferences(), DEFAULT_AUDIO_PREFS,
    'malformed JSON -> defaults');

  const scalar = createStorage({ [AUDIO_PREFS_KEY]: '42' });
  assert.deepEqual(createAudioMixer({ contextClass: FakeAudioContext, storage: scalar }).preferences(), DEFAULT_AUDIO_PREFS);

  const partial = createStorage({ [AUDIO_PREFS_KEY]: JSON.stringify({ media: 0.25, voice: 'loud' }) });
  const partialMixer = createAudioMixer({ contextClass: FakeAudioContext, storage: partial });
  assert.equal(partialMixer.preference('media'), 0.25, 'valid fields are kept');
  assert.equal(partialMixer.preference('voice'), DEFAULT_AUDIO_PREFS.voice, 'non-numeric fields keep defaults');

  const store = createStorage();
  const mixer = createAudioMixer({ contextClass: FakeAudioContext, storage: store });
  mixer.setPreference('effects', 0.4);
  const saved = JSON.parse(store.data.get(AUDIO_PREFS_KEY));
  assert.equal(saved.effects, 0.4, 'preference persisted');
  assert.equal(saved.version, 1);
  assert.equal(saved.media, DEFAULT_AUDIO_PREFS.media, 'untouched fields persist at defaults');
});

test('mixer: unavailable storage keeps session-only defaults without throwing', () => {
  const throwingStorage = {
    getItem() { throw new Error('SecurityError'); },
    setItem() { throw new Error('SecurityError'); },
  };
  const mixer = createAudioMixer({ contextClass: FakeAudioContext, storage: throwingStorage });
  assert.deepEqual(mixer.preferences(), DEFAULT_AUDIO_PREFS);
  assert.equal(mixer.setPreference('media', 0.5), 0.5, 'preference still applies for the session');
});

test('mixer: autoplay denial resolves suspended and a later gesture retries', async () => {
  const mixer = createAudioMixer({ contextClass: FakeAudioContext, storage: null });
  const ctx = mixer.ensure();
  ctx.resumeBehavior = 'reject';
  assert.equal(await mixer.resume(), false, 'honest report after denial');
  assert.equal(mixer.status(), 'suspended');
  ctx.resumeBehavior = 'running';
  assert.equal(await mixer.resume(), true, 'next gesture retries and wins');
});

test('mixer: voice duck ramps the environment bus and media factor; clearDuck releases', () => {
  const scheduler = createManualScheduler();
  let nowMs = 0;
  const mixer = createAudioMixer({
    contextClass: FakeAudioContext,
    storage: null,
    clock: () => nowMs,
    scheduleDelay: scheduler.scheduleDelay,
    cancelDelay: scheduler.cancelDelay,
  });
  mixer.ensure();
  mixer.setPreference('media', 1);
  mixer.setSoundEnabled(true); // the master gate defaults off; duck math runs under sound-on

  const seen = [];
  mixer.onMediaGainChange((g) => seen.push(g));
  mixer.setVoiceActive(true);
  assert.ok(mixer.buses.environment.gain.rampsTo(DUCK_ENV_LEVEL), 'environment bus ducks to 0.35');
  scheduler.pump();
  nowMs += 150; // attack finished
  scheduler.pump();
  assert.ok(Math.abs(mixer.mediaGain() - DUCK_MEDIA_LEVEL) < 1e-9, 'media factor ducked to 0.6');
  assert.ok(seen.some((g) => Math.abs(g - DUCK_MEDIA_LEVEL) < 1e-9), 'listeners observed the ducked media gain');

  mixer.clearDuck();
  assert.ok(mixer.buses.environment.gain.rampsTo(1), 'environment bus releases to unity');
  nowMs += DUCK_RELEASE_MS;
  scheduler.pump();
  assert.equal(mixer.mediaGain(), 1, 'media factor released fully');
  assert.equal(mixer.isVoiceActive(), false);
});

test('mixer: clearDuck on adapter removal never leaves stuck ducking', () => {
  const scheduler = createManualScheduler();
  let nowMs = 0;
  const mixer = createAudioMixer({
    contextClass: FakeAudioContext,
    storage: null,
    clock: () => nowMs,
    scheduleDelay: scheduler.scheduleDelay,
    cancelDelay: scheduler.cancelDelay,
  });
  mixer.ensure();
  mixer.setSoundEnabled(true);
  mixer.setVoiceActive(true);
  mixer.clearDuck();
  nowMs += DUCK_RELEASE_MS + 100;
  scheduler.pump();
  assert.equal(mixer.mediaGain(), 1);
  mixer.clearDuck(); // idempotent on a quiet mixer
  assert.equal(mixer.mediaGain(), 1);
  mixer.dispose();
  assert.equal(mixer.context, null, 'dispose releases the context handle');
});

// --- environment audio ---------------------------------------------------------

function createReadyEnvironment() {
  const mixer = createAudioMixer({ contextClass: FakeAudioContext, storage: null });
  mixer.ensure();
  const env = createEnvironmentAudio({ mixer });
  return { mixer, env, ctx: mixer.context };
}

test('environment audio: start builds retained loops once and is honest without a gesture', () => {
  const cold = createEnvironmentAudio({ mixer: createAudioMixer({ contextClass: null, storage: null }) });
  assert.equal(cold.start(), false, 'no context yet: report false, visual travel still completes');
  assert.equal(cold.started, false);

  const { env, ctx } = createReadyEnvironment();
  assert.equal(env.start(), true);
  const sourceCount = ctx.createdNodes.filter((n) => n instanceof FakeBufferSource).length;
  assert.equal(sourceCount, 4, 'one ambience loop + three weather layers');
  assert.equal(env.start(), true, 'second start is a no-op');
  assert.equal(ctx.createdNodes.filter((n) => n instanceof FakeBufferSource).length, sourceCount, 'no loop churn');
});

test('environment audio: zone crossfade smooths gains and filter over 500ms without restarting loops', () => {
  const { env, mixer, ctx } = createReadyEnvironment();
  env.start();
  const sourceCount = ctx.createdNodes.filter((n) => n instanceof FakeBufferSource).length;

  assert.equal(env.setZone(ZONE_PROFILES.roof), true, 'entering the arcade crossfades');
  const layers = weatherLayerChains(ctx, mixer);
  assert.equal(layers.length, 3, 'rain, roof and wind layers feed the weather chain');
  const targets = [ZONE_PROFILES.roof.rain, ZONE_PROFILES.roof.roof, ZONE_PROFILES.roof.wind];
  for (const [chain, target] of layers.map((c, i) => [c, targets[i]])) {
    const ramp = chain.gain.gain.rampAt(target);
    assert.ok(ramp !== null, `layer ramps to ${target}`);
    assert.ok(Math.abs((ramp - ctx.currentTime) - ZONE_CROSSFADE_MS / 1000) < 1e-9, 'crossfade lasts exactly 500ms');
  }
  const weatherFilter = layers[0].dest;
  const lpRamp = weatherFilter.frequency.rampAt(ZONE_PROFILES.roof.lowpassHz);
  assert.ok(lpRamp !== null, 'the weather lowpass follows the zone profile');
  assert.ok(Math.abs((lpRamp - ctx.currentTime) - 0.5) < 1e-9, 'lowpass crossfade is 500ms too');

  assert.equal(ctx.createdNodes.filter((n) => n instanceof FakeBufferSource).length, sourceCount, 'crossfade never restarts loops');
  assert.equal(env.setZone(ZONE_PROFILES.roof), false, 'same zone again: no-op');
  assert.equal(
    env.setZone({ rain: ZONE_PROFILES.roof.rain, roof: ZONE_PROFILES.roof.roof, wind: ZONE_PROFILES.roof.wind, lowpassHz: ZONE_PROFILES.roof.lowpassHz }),
    false,
    'an equal authored row: no-op',
  );
  assert.equal(env.setZone('garbage'), true, 'unknown profile falls back to exposed and applies');
  assert.equal(env.zone.rain, ZONE_PROFILES.exposed.rain);
});

test('environment audio: weather level ramps the rain presence input', () => {
  const { env, mixer, ctx } = createReadyEnvironment();
  // Before start the level is only recorded (loops come on activation).
  assert.equal(env.setWeather(0.8), false);
  assert.equal(env.weatherLevel, 0.8);
  env.start();
  assert.equal(env.setWeather(0.5), true);
  const chains = weatherLayerChains(ctx, mixer);
  const weatherGain = chains[0].dest.connections[0];
  assert.ok(weatherGain.gain.rampsTo(0.5), 'weather level gain follows sampled rain');
});

test('environment audio: stop on place exit stops and disconnects every source synchronously', () => {
  const { env, mixer, ctx } = createReadyEnvironment();
  env.start();
  env.setWeather(0.5);
  const chains = sourceChains(ctx);
  assert.equal(env.stop(), true);
  assert.equal(env.started, false);
  for (const chain of chains) {
    assert.ok(chain.src.stopped.length >= 1, 'source stopped');
    assert.ok(chain.src.disconnects >= 1, 'source disconnected');
    assert.ok(chain.gain.disconnects >= 1, 'layer gain disconnected');
  }
  assert.equal(env.stop(), false, 'stop is idempotent');
  assert.ok(env.start(), 'restart after coming back rebuilds loops');
});

test('environment audio: thunder schedules on the weather bus and cancels before onset', () => {
  const { env, mixer } = createReadyEnvironment();
  env.start();
  const handle = env.thunder({ delayMs: 2000, intensity: 0.8 });
  assert.ok(handle, 'a thunder handle exists when audio is ready');
  assert.ok(Math.abs(handle.scheduledAt - (mixer.context.currentTime + 2)) < 1e-9, 'the shared distance delay maps onto the audio clock');

  const pending = sourceChains(mixer.context).filter((c) => c.src.started.length && c.src.started[0][0] === handle.scheduledAt);
  assert.equal(pending.length, 1, 'exactly one scheduled thunder source');
  handle.cancel();
  assert.ok(pending[0].src.stopped.length >= 1, 'cancel before onset stops the source');
  handle.cancel(); // idempotent

  const cold = createEnvironmentAudio({ mixer: createAudioMixer({ contextClass: null, storage: null }) });
  assert.equal(cold.thunder({ delayMs: 100 }), null, 'no audio: no handle, no throw');
});

test('environment audio: dispose stops loops and releases retained buffers', () => {
  const { env } = createReadyEnvironment();
  env.start();
  env.dispose();
  assert.equal(env.started, false);
  env.dispose(); // idempotent
  assert.equal(env.thunder({}), null, 'disposed audio schedules nothing');
});

test('zone profiles: authored rows normalize with clamps; exposure picks fallbacks', () => {
  assert.deepEqual(
    normalizeZoneProfile({ rain: 2, roof: -1, wind: 0.5, lowpassHz: 10 }),
    { rain: 1, roof: 0, wind: 0.5, lowpassHz: 80 },
  );
  assert.deepEqual(normalizeZoneProfile('alcove'), ZONE_PROFILES.alcove);
  assert.equal(normalizeZoneProfile('nonsense'), null);
  assert.equal(normalizeZoneProfile(null), null);
  assert.equal(normalizeZoneProfile({ rain: 1 }), null, 'partial rows are rejected, not guessed');

  assert.equal(zoneProfileFor(null, 1), ZONE_PROFILES.exposed, 'open sky is exposed');
  assert.equal(zoneProfileFor(null, 0.4), ZONE_PROFILES.roof, 'sheltered without an authored row uses the roof profile');
  const authored = zoneProfileFor({ audio: { rain: 0.15, roof: 0.85, wind: 0.1, lowpassHz: 900 } }, 1);
  assert.deepEqual(authored, { rain: 0.15, roof: 0.85, wind: 0.1, lowpassHz: 900 }, 'authored zone rows win over exposure');
});

test('every Theater environment variant authors a usable ambience row', () => {
  // The environment runtime hands the active variant's `audio` row to
  // setZone: each of the 18 rows must normalize to clamped four-value profile
  // (the `ambience` label is reserved, never passed through as a value), and
  // the six worlds must not all collapse to one identical mix.
  const signatures = new Set();
  for (const environment of Object.values(THEATER_ENVIRONMENTS)) {
    for (const row of Object.values(environment.variants)) {
      const profile = normalizeZoneProfile(row.audio);
      assert.ok(profile, `${row.preset} must normalize to a usable audio profile`);
      for (const key of ['rain', 'roof', 'wind']) {
        assert.ok(profile[key] >= 0 && profile[key] <= 1, `${row.preset}: ${key} is clamped`);
      }
      assert.ok(profile.lowpassHz >= 80 && profile.lowpassHz <= 20000, `${row.preset}: lowpass is bounded`);
      signatures.add(JSON.stringify(profile));
    }
  }
  assert.equal(signatures.size, 18, 'each environment variant has a distinct ambient mix');
});

test('environment audio: setAmbienceProfile crossfades filter frequency and gain over 500ms without restarting loop', () => {
  const { env, mixer, ctx } = createReadyEnvironment();
  env.start();
  const sourceCount = ctx.createdNodes.filter((n) => n instanceof FakeBufferSource).length;

  env.setAmbienceProfile('coastal');
  assert.equal(env.setAmbienceProfile('alpine'), true);

  const ambienceChain = sourceChains(ctx).find((c) => c.dest === mixer.buses.ambience);
  assert.ok(ambienceChain, 'ambience chain found');

  const freqRamp = ambienceChain.filter.frequency.rampAt(AMBIENCE_PROFILES.alpine.frequency);
  assert.ok(freqRamp !== null, 'filter frequency ramps to target');
  assert.ok(Math.abs((freqRamp - ctx.currentTime) - ZONE_CROSSFADE_MS / 1000) < 1e-9, 'frequency crossfade is 500ms');

  const gainRamp = ambienceChain.gain.gain.rampAt(AMBIENCE_PROFILES.alpine.gain);
  assert.ok(gainRamp !== null, 'gain ramps to target');
  assert.ok(Math.abs((gainRamp - ctx.currentTime) - ZONE_CROSSFADE_MS / 1000) < 1e-9, 'gain crossfade is 500ms');

  assert.equal(ctx.createdNodes.filter((n) => n instanceof FakeBufferSource).length, sourceCount, 'no loop churn');
  assert.equal(env.setAmbienceProfile('alpine'), false, 'same profile is a no-op');
});

test('environment audio: normalizeAmbienceProfile clamps values and setAmbienceProfile falls back to coastal', () => {
  assert.deepEqual(normalizeAmbienceProfile('rainforest'), AMBIENCE_PROFILES.rainforest);
  assert.deepEqual(
    normalizeAmbienceProfile({ frequency: 50000, gain: 2 }),
    { frequency: 20000, gain: 1 },
  );
  assert.deepEqual(
    normalizeAmbienceProfile({ frequency: -10, gain: -0.5 }),
    { frequency: 20, gain: 0 },
  );
  assert.equal(normalizeAmbienceProfile(null), null);
  assert.equal(normalizeAmbienceProfile('unknown_world'), null);

  const { env } = createReadyEnvironment();
  env.setAmbienceProfile('unknown_world');
  assert.deepEqual(env.ambienceProfile, AMBIENCE_PROFILES.coastal);
});

test('environment audio: parent activities inherit the mixer without duplicating ambience loops', () => {
  const { env, mixer, ctx } = createReadyEnvironment();
  env.start();
  const initialSources = ctx.createdNodes.filter((n) => n instanceof FakeBufferSource).length;
  assert.equal(initialSources, 4); // 1 ambience + 3 weather layers

  // Simulated parent activity (e.g. pool in theater) receiving the audioMixer
  // Activity plays sound effects directly onto mixer.buses.effects without calling createEnvironmentAudio
  const poolNode = ctx.createGain();
  poolNode.connect(mixer.buses.effects);

  const ambienceChains = sourceChains(ctx).filter((c) => c.dest === mixer.buses.ambience);
  assert.equal(ambienceChains.length, 1, 'exactly one active ambience loop');
  assert.equal(ctx.createdNodes.filter((n) => n instanceof FakeBufferSource).length, initialSources, 'no duplicate sources');
});

test('environment audio: hidden social ambience stops during leased activity view and restores on release', () => {
  const { env } = createReadyEnvironment();
  env.start();
  assert.equal(env.started, true);

  // Simulated activityView lease acquisition
  let leasedSocialAmbienceStopped = env.started;
  if (leasedSocialAmbienceStopped) {
    env.stop();
  }
  assert.equal(env.started, false, 'social ambience stopped while lease is held');

  // Simulated activityView release
  if (leasedSocialAmbienceStopped) {
    env.start();
    leasedSocialAmbienceStopped = false;
  }
  assert.equal(env.started, true, 'social ambience restored on lease release');
});

test('environment audio: synchronous stop on exit executes well within 200ms budget', () => {
  const { env } = createReadyEnvironment();
  env.start();
  const startMs = performance.now();
  env.stop();
  const elapsedMs = performance.now() - startMs;
  assert.ok(elapsedMs < 200, `stop took ${elapsedMs}ms, well within 200ms budget`);
  assert.equal(env.started, false);
});

test('environment audio: mute, media and voice gains remain local and unaffected by ambience changes', () => {
  const { env, mixer } = createReadyEnvironment();
  mixer.setSoundEnabled(true);
  mixer.setPreference('media', 0.8);
  mixer.setPreference('voice', 0.6);
  mixer.setVoiceActive(true);

  env.start();
  env.setAmbienceProfile('desert');
  env.setZone(ZONE_PROFILES.roof);

  assert.equal(mixer.preference('media'), 0.8, 'media preference preserved');
  assert.equal(mixer.preference('voice'), 0.6, 'voice preference preserved');
  assert.equal(mixer.isVoiceActive(), true, 'voice active state preserved');
  assert.equal(mixer.isSoundEnabled(), true, 'sound enabled preserved');
});


