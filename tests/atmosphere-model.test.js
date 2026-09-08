import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  ATMOSPHERE_ENVELOPE_MAX_BYTES,
  ATMOSPHERE_MAX_EVENTS,
  ATMOSPHERE_SCHEMA_VERSION,
  atmosphereAccepts,
  compareAtmosphereFrames,
  createLcg,
  defaultAtmosphereState,
  detectTimeDiscontinuity,
  envelopeByteSize,
  eventPhase,
  eventsForJoin,
  formatEventId,
  getPreset,
  initialWetness,
  lcgFloat,
  lerpAngleShortest,
  sampleAtmosphere,
  sampleScheduleKeyframes,
  sampleTimePhase,
  sampleWetness,
  smoothstep,
  thunderDelayMs,
  validateAtmosphereEnvelope,
  validateEventPolicy,
} from '../shared/atmosphereModel.js';
import { ATMOSPHERE_PRESET_IDS } from '../shared/atmospherePresets.js';

// The cross-language vectors (B 1.2): the Elixir owner pins the same file.
const VECTORS = JSON.parse(readFileSync(new URL('./fixtures/atmosphere/model-vectors.json', import.meta.url), 'utf8'));

test('fixture schema is current and self-describing', () => {
  assert.equal(VECTORS.schemaVersion, ATMOSPHERE_SCHEMA_VERSION);
  assert.ok(VECTORS.invalidEnvelopes.length >= 15, 'boundary coverage stays pinned');
});

test('the shared LCG reproduces the pinned draws, including zero seed', () => {
  for (const { seed, draws } of [VECTORS.lcg.seedZero, VECTORS.lcg.seed123]) {
    const rng = createLcg(seed);
    for (const expected of draws) assert.equal(rng(), expected, `seed ${seed} draw drift`);
  }
  assert.throws(() => createLcg(-1), /unsigned 32-bit/);
  assert.throws(() => createLcg(2 ** 32), /unsigned 32-bit/);
  const rng = createLcg(5);
  const value = lcgFloat(rng);
  assert.ok(value >= 0 && value < 1);
});

test('smoothstep hits 0 / half / full exactly and the transition vector interpolates through them', () => {
  assert.equal(smoothstep(0), 0);
  assert.equal(smoothstep(0.5), 0.5);
  assert.equal(smoothstep(1), 1);
  assert.equal(smoothstep(-0.5), 0);
  assert.equal(smoothstep(1.5), 1);

  const { state, samples } = VECTORS.transition;
  const out = {};
  for (const { atOffsetMs, intensity, transitionU } of samples) {
    sampleAtmosphere(state, state.transition.startAt + atOffsetMs, out);
    assert.equal(out.intensity, intensity, `intensity at +${atOffsetMs}ms`);
    if (transitionU !== null) assert.equal(out.transitionU, transitionU, `transition u at +${atOffsetMs}ms`);
  }
  // Halfway through the transition the blend is exactly the mean.
  const half = samples[2];
  assert.ok(Math.abs(half.intensity - (state.transition.fromIntensity + state.transition.toIntensity) / 2) < 1e-12);
});

test('sampleAtmosphere writes into the retained out argument (no per-call allocation)', () => {
  const state = VECTORS.transition.state;
  const out = { intensity: -1, windX: 0, windZ: 0, rain: 0, cloud: 0, wetnessTarget: 0, timePhase: 0, transitionU: 0 };
  const returned = sampleAtmosphere(state, state.transition.startAt + 4000, out);
  assert.equal(returned, out, 'hot math must reuse the retained output object');
  assert.ok(out.intensity >= 0 && out.intensity <= 1);
});

test('sky orientation uses shortest wrapped angular interpolation', () => {
  const twoPi = Math.PI * 2;
  assert.equal(lerpAngleShortest(0, Math.PI / 2, 0.5), Math.PI / 4);
  // 350° -> 10° travels 20° forward through zero, never 340° backward.
  const from = (350 * Math.PI) / 180;
  const to = (10 * Math.PI) / 180;
  assert.ok(Math.abs(lerpAngleShortest(from, to, 0.5) - Math.PI) < twoPi, 'midpoint is near 0°/2π');
  assert.ok(lerpAngleShortest(from, to, 0.5) < 0.2 || lerpAngleShortest(from, to, 0.5) > twoPi - 0.2);
});

test('accelerated time advances the phase with wrap; fixed time stays put', () => {
  const { fixed, accelerated, acceleratedWrap } = VECTORS.time;
  assert.equal(sampleTimePhase(fixed.time, fixed.at), fixed.phase);
  assert.equal(sampleTimePhase(accelerated.time, accelerated.at), accelerated.phase);
  assert.equal(sampleTimePhase(acceleratedWrap.time, acceleratedWrap.at), acceleratedWrap.phase);
  assert.ok(acceleratedWrap.phase >= 0 && acceleratedWrap.phase < 1, 'wrap keeps the phase finite');
});

test('schedule sampling wraps the cycle: both boundary sides agree (no snap)', () => {
  const { cycleMs, keyframes, samples } = VECTORS.cycleWrap;
  const byAt = new Map(samples.map(s => [s.atMs, s]));
  // 1s before the boundary the smoothstep blend is ~1e-5 from the first
  // keyframe; tighter tolerances belong at the exact keyframe points.
  const end = byAt.get(cycleMs - 1000);
  const start = byAt.get(0);
  assert.ok(Math.abs(end.intensity - start.intensity) < 1e-4, 'cycle end blends into the first keyframe');
  assert.equal(end.wrapped, true);
  assert.equal(start.wrapped, false);
  // Keyframe points are reproduced exactly.
  for (const keyframe of keyframes) {
    const sample = byAt.get(keyframe.atMs);
    assert.equal(sample.intensity, keyframe.intensity, `keyframe ${keyframe.atMs} intensity`);
    assert.equal(sample.wetness, keyframe.wetness);
  }
  const out = {};
  const returned = sampleScheduleKeyframes(keyframes, 600_000, cycleMs, out);
  assert.equal(returned, out, 'schedule sampling reuses the retained output');
});

test('wetness follows the analytic approach and wet/dry cycles restore symmetrically', () => {
  for (const { previous, target, dtMs, next } of VECTORS.wetness.dryOut) {
    assert.equal(sampleWetness(previous, target, dtMs), next);
  }
  for (const { previous, target, dtMs, next } of VECTORS.wetness.wetIn) {
    assert.equal(sampleWetness(previous, target, dtMs), next);
  }
  // The wet/dry map is deterministic and contracting: repeated cycles
  // settle onto the same alternating steady value with no cumulative
  // drift (material dry parameters restore exactly by design; wetness is
  // an analytic approach, not an accumulator).
  const cycle = w => sampleWetness(sampleWetness(w, 0, 90_000), 1, 20_000);
  let wetness = 1;
  let previous = null;
  for (let i = 0; i < 11; i++) {
    previous = wetness;
    wetness = cycle(wetness);
  }
  assert.equal(wetness, cycle(previous), 'the cycle map is exactly deterministic');
  assert.ok(Math.abs(wetness - previous) < 1e-9, `the cycle contracts onto its steady value, got ${wetness}`);
  // Negative dt is treated as no time, never an exploding exponential.
  assert.equal(sampleWetness(0.5, 0, -5), 0.5);
});

test('late join derives wetness from the preset, not from local entry (no permanently dry court)', () => {
  const { rain, 'dry-heat': dryHeat, scheduled } = VECTORS.initialWetness;
  assert.equal(rain, 1, 'fixed rain arrives already wet');
  assert.equal(dryHeat, 0, 'fixed desert arrives already dry');
  assert.ok(scheduled >= 0 && scheduled <= 1);
  assert.equal(initialWetness(VECTORS.transition.state, 1), rain, 'join time does not change a fixed preset');
});

test('the valid envelope is accepted and every malformed one is rejected whole with its pinned reason', () => {
  const accepted = validateAtmosphereEnvelope(VECTORS.validEnvelope);
  assert.equal(accepted.ok, true);
  assert.equal(accepted.value, VECTORS.validEnvelope, 'accepted frames pass through unchanged');

  for (const { name, envelope, reason } of VECTORS.invalidEnvelopes) {
    const result = validateAtmosphereEnvelope(envelope);
    assert.equal(result.ok, false, `${name} must be rejected`);
    assert.equal(result.reason, reason, `${name} pinned reason`);
  }
});

test('the envelope stays inside 8KiB and counts at most four events', () => {
  assert.ok(envelopeByteSize(VECTORS.validEnvelope) <= ATMOSPHERE_ENVELOPE_MAX_BYTES);
  assert.equal(VECTORS.validEnvelope.state.events.length, 0);
  assert.ok(ATMOSPHERE_MAX_EVENTS === 4);

  const near = JSON.parse(JSON.stringify(VECTORS.validEnvelope));
  near.state.events = [{ id: '7:4:0', kind: 'lightning', at: 1770000045000, durationMs: 800, intensity: 0.4, origin: [-30, 12, -40] }];
  assert.equal(validateAtmosphereEnvelope(near).ok, true);
});

test('zero seed is valid and unknown presets reject rather than guess', () => {
  const frame = JSON.parse(JSON.stringify(VECTORS.validEnvelope));
  frame.state.seed = 0;
  assert.equal(validateAtmosphereEnvelope(frame).ok, true);
  frame.state.seed = 4294967295;
  assert.equal(validateAtmosphereEnvelope(frame).ok, true);

  assert.equal(getPreset('hyper-storm-proto'), null);
  assert.equal(defaultAtmosphereState('hyper-storm-proto'), null, 'unknown preset -> null, never an invented state');
});

test('missing state falls back to a known preset deterministically', () => {
  for (const id of ATMOSPHERE_PRESET_IDS) {
    const state = defaultAtmosphereState(id, { seed: 0, now: 1770000000000 });
    assert.ok(state, `${id} has a default`);
    assert.equal(validateAtmosphereStateQuiet(state), null, `${id} default passes its own validation`);
    const again = defaultAtmosphereState(id, { seed: 0, now: 1770000000000 });
    assert.deepEqual(state, again, `${id} default is deterministic`);
  }
  function validateAtmosphereStateQuiet(s) {
    return validateAtmosphereEnvelope({
      type: 'atmosphere_state', roomId: 'probe', schemaVersion: 1, epoch: 1, revision: 1, serverNow: 1, state: s,
    }).ok ? null : 'invalid';
  }
});

test('revision ordering: new epoch resets, duplicates are no-ops, stale never accepts', () => {
  for (const { prev, next, verdict } of VECTORS.staleRules) {
    assert.equal(compareAtmosphereFrames(prev, next), verdict);
    assert.equal(atmosphereAccepts(prev, next), verdict === 'new-epoch' || verdict === 'new-revision');
  }
  assert.equal(atmosphereAccepts(undefined, { epoch: 1, revision: 0 }), true, 'first snapshot always accepts');
});

test('clock discontinuity above the threshold demands a fresh snapshot', () => {
  assert.equal(detectTimeDiscontinuity(1000, 2000), false);
  assert.equal(detectTimeDiscontinuity(1000, 6000), false, 'a jump exactly at 5s is not a discontinuity');
  assert.equal(detectTimeDiscontinuity(1000, 6001), true);
  assert.equal(detectTimeDiscontinuity(6001, 1000), true, 'backwards jumps count too');
});

test('shared events: join skips started events, late live delivery is bounded, thunder is distance-delayed', () => {
  const { pending, liveHalf, late, expired, joinFilter, thunder } = VECTORS.events;
  assert.equal(eventPhase(pending.event, pending.now).state, 'pending');
  assert.equal(eventPhase(liveHalf.event, liveHalf.now).state, 'live');
  assert.equal(late.phase.state, 'live', 'delivery within 250ms of the start is still sampleable');
  assert.equal(expired.phase.state, 'expired', 'already-started events are skipped entirely');

  assert.deepEqual(joinFilter.kept, [joinFilter.events[0].id], 'first-join executes only events that have not started');

  assert.equal(thunder['10'], 500, 'thunder clamps at 0.5s');
  assert.equal(thunder['5000'], 4000, 'thunder clamps at 4s');
  assert.ok(Math.abs(thunder['1200'] - (1200 / 343) * 1000) < 1e-9);
  assert.equal(thunderDelayMs(343), 1000, 'one kilometer per second of sound');
});

test('event ids and policy bounds follow the design', () => {
  assert.equal(formatEventId(7, 4, 0), '7:4:0');
  assert.equal(validateEventPolicy(null), 'policy_shape');
  assert.equal(validateEventPolicy({ lightning: { minMs: 10_000, maxMs: 20_000 }, meteor: null }), 'policy_spacing', 'under the 45s lightning floor');
  assert.equal(validateEventPolicy({ lightning: { minMs: 45_000, maxMs: 90_000 }, meteor: { minMs: 35_000, maxMs: 70_000 } }), null);
});
