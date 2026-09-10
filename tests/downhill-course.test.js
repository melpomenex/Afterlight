import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  generateCourseDocument,
  loadCourse,
  validateCourse,
  MOUNTAINS,
  NSAMP,
  FINISH_S,
} from '../shared/downhill/course.js';
import { courseHash, canonicalCourseJson } from '../shared/downhill/courseHash.js';

// integrate-multiplayer-downhill-mayhem-arcade 4.1/4.2. The canonical course is
// a faithful port of the frozen source `games/downhill-mayhem/standalone.html`
// (bytes pinned in the change's baseline.md). This harness extracts the pure
// utils/config/track block from that file and compares the generated sampler
// and feature lists against it, so the port cannot silently drift.

const SOURCE = readFileSync(new URL('../games/downhill-mayhem/standalone.html', import.meta.url), 'utf8');

function sourceTrackHarness(seed) {
  const start = SOURCE.indexOf('// ------------------------------------------------------------ utils');
  const end = SOURCE.indexOf('// ------------------------------------------------------------ audio');
  assert.ok(start > 0 && end > start, 'source track block located');
  const block = SOURCE.slice(start, end);
  const factory = new Function(`${block}
    CUR_SEED = ${seed};
    buildTrack();
    return {
      groundHeight: (s, lat) => groundHeight(s, lat),
      sampleTrack: (s) => sampleTrack(s, {}),
      ramps: ramps.map((r) => ({ ...r })),
      drops: drops.map((d) => ({ ...d })),
    };`);
  return factory();
}

function maxAbsDiff(gridA, gridB) {
  let worst = 0;
  for (const [a, b] of gridA.map((v, i) => [v, gridB[i]])) worst = Math.max(worst, Math.abs(a - b));
  return worst;
}

for (const mountain of ['classic', 'timber', 'rock']) {
  test(`generated ${mountain} course matches the frozen source ground function`, () => {
    const source = sourceTrackHarness(MOUNTAINS[mountain].seed);
    const doc = generateCourseDocument({ mountain });
    const course = loadCourse(doc);

    const points = [];
    for (let s = -60; s <= FINISH_S + 40; s += 11) {
      for (const lat of [-30, -20, -12, -6, -2, 0, 2, 6, 12, 20, 30]) points.push([s, lat]);
    }
    const mine = points.map(([s, lat]) => course.heightAt(s, lat));
    const theirs = points.map(([s, lat]) => source.groundHeight(s, lat));
    const worst = maxAbsDiff(mine, theirs);
    assert.ok(worst < 0.001, `${mountain} heightAt parity worst diff ${worst} m (tolerance 1mm)`);

    // Feature lists agree in count and position (6-decimal quantization).
    assert.equal(doc.ramps.length, source.ramps.length, 'ramp count');
    for (let i = 0; i < doc.ramps.length; i++) {
      assert.ok(Math.abs(doc.ramps[i].s0 - source.ramps[i].s0) < 1e-5, `ramp ${i} s0`);
      assert.ok(Math.abs(doc.ramps[i].h - source.ramps[i].h) < 1e-5, `ramp ${i} height`);
    }
    assert.equal(doc.drops.length, source.drops.length, 'drop count');
    for (let i = 0; i < doc.drops.length; i++) {
      assert.ok(Math.abs(doc.drops[i].s0 - source.drops[i].s0) < 1e-5, `drop ${i} s0`);
      assert.ok(Math.abs(doc.drops[i].depth - source.drops[i].depth) < 1e-5, `drop ${i} depth`);
    }
  });
}

test('course generation is deterministic', () => {
  const a = JSON.stringify(generateCourseDocument({ mountain: 'classic' }));
  const b = JSON.stringify(generateCourseDocument({ mountain: 'classic' }));
  assert.equal(a, b, 'same seed produces identical bytes');
});

test('daily course is generated from an explicit seed', () => {
  const doc = generateCourseDocument({ mountain: 'daily', dailySeed: 20260910 });
  assert.equal(doc.id, 'daily');
  assert.equal(doc.seed, 20260910);
  const problems = validateCourse(doc);
  assert.deepEqual(problems, []);
  // Deterministic for the same day, different across days.
  assert.equal(
    JSON.stringify(generateCourseDocument({ mountain: 'daily', dailySeed: 20260910 })),
    JSON.stringify(doc),
  );
  assert.notEqual(
    JSON.stringify(generateCourseDocument({ mountain: 'daily', dailySeed: 20260911 })),
    JSON.stringify(doc),
  );
});

test('canonical documents validate and carry a stable structural shape', () => {
  for (const mountain of ['classic', 'timber', 'rock']) {
    const doc = generateCourseDocument({ mountain });
    assert.deepEqual(validateCourse(doc), [], `${mountain} validates`);
    assert.equal(doc.cgrade.length, NSAMP);
    assert.equal(doc.ccurv.length, NSAMP);
    for (const c of doc.colliders) {
      assert.ok(c.r > 0 && c.r < 3, 'collider radius is bounded');
      assert.ok(Number.isFinite(c.s) && Number.isFinite(c.lat), 'collider is finite');
    }
    // Collision obstacles stay inside the rideable corridor + margin.
    assert.ok(doc.colliders.every((c) => Math.abs(c.lat) < 27), 'colliders inside the corridor');
    // Hash is stable across regeneration.
    assert.equal(courseHash(doc), courseHash(generateCourseDocument({ mountain })));
  }
});

test('committed crafted documents match the generator', () => {
  for (const mountain of ['classic', 'timber', 'rock']) {
    const committed = JSON.parse(readFileSync(new URL(`../shared/downhill/courses/${mountain}.json`, import.meta.url), 'utf8'));
    const serverCopy = readFileSync(new URL(`../server_elixir/priv/downhill_courses/${mountain}.json`, import.meta.url), 'utf8');
    const webCopy = readFileSync(new URL(`../shared/downhill/courses/${mountain}.json`, import.meta.url), 'utf8');
    assert.equal(webCopy, serverCopy, `${mountain} web/server course copies are byte-identical`);
    const regenerated = generateCourseDocument({ mountain });
    // Committed docs carry `hash`; compare hash-free canonical form.
    const { hash: _a, ...committedRest } = committed;
    assert.equal(canonicalCourseJson(committedRest), canonicalCourseJson(regenerated), `${mountain} committed bytes regenerate`);
    assert.equal(committed.hash, courseHash(regenerated), `${mountain} committed hash matches`);
  }
});
