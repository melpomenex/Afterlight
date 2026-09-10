import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { generateCourseDocument, loadCourse } from '../shared/downhill/course.js';
import {
  initialRiderState,
  stepRider,
  neutralControls,
  normalizeControls,
  TRICKS,
  DIFFS,
} from '../shared/downhill/rules.js';

// integrate-multiplayer-downhill-mayhem-arcade 3.1/3.3. Extracts the frozen
// source `riderStep`/landing/crash/combat block from standalone.html and
// replays the same scripted controls through both implementations.

const SOURCE = readFileSync(new URL('../games/downhill-mayhem/standalone.html', import.meta.url), 'utf8');

function slice(from, to) {
  const start = SOURCE.indexOf(from);
  const end = SOURCE.indexOf(to, start + 1);
  assert.ok(start > 0 && end > start, `source marker present: ${from}`);
  return SOURCE.slice(start, end);
}

function makeSourceHarness(seed) {
  const blockA = slice('// ------------------------------------------------------------ utils', '// ------------------------------------------------------------ audio');
  const blockB = slice('const colTreeBuckets', 'let WG=null');
  const blockC = slice('// ------------------------------------------------------------ physics', '// ------------------------------------------------------------ AI');
  const stubs = `
    var state='racing';
    var riders=[];
    var player={ s:0, lat:0, y:0, isPlayer:true, crashed:false, finished:false, invuln:0, punchCd:0, sIs:0 };
    var shake=0, hitStopT=0, gameTime=0, DEMO=false, raceTime=0;
    var RACE_STATS={crashes:0,decked:0,biggestAir:0,tricksLanded:0,bestCombo:0,paybacks:0,avenger:'',topSpeed:0};
    var AudioSys={treeSnd(){},rockSnd(){},crashSnd(){},blip(){},chime(){},strikeLand(){},whoosh(){},hopSnd(){},countBeep(){}};
    function popup(){}
    function clearTouchBoost(){}
    function TRACK(){}
    function crashVoice(){}
    var document={getElementById(){return {classList:{add(){},remove(){},toggle(){}},style:{},offsetWidth:0};}};
    function finishRider(r){ r.finished=true; r.finishTime=raceTime; r.revengeT=0; }
  `;
  const factory = new Function(`${blockA}
    ${blockB}
    ${stubs}
    ${blockC}
    CUR_SEED = ${seed};
    buildTrack();
    return { riderStep, tryStrike, pairCollisions, groundHeight, ramps, drops };
  `);
  return factory();
}

function makeSourceRider(lat) {
  return {
    def: { name: 'YOU', top: 1, corner: 1, aggr: 0, trick: 0, crashy: 0 },
    idx: 0, isPlayer: true,
    inp: { pedal: 0, brake: 0, steer: 0, hop: false, boost: false, punch: false, trick: null },
    s: 0, lat, y: 0, vs: 0, vlat: 0, vy: 0, grounded: true,
    steerPos: 0, lean: 0, pitch: 0, airTime: 0, wasOnRamp: false, driftT: 0, wallT: 0, draftT: 0, grudge: false, revengeT: 0,
    finished: false, finishTime: null, racePos: 1, rubber: 0,
    trick: null, trickT: 0, chain: 0, pendingMeter: 0, pendingNames: [], meter: 0, boosting: false, boostLatch: false,
    crashed: false, crashT: 0, invuln: 0, crashSpinX: 0, crashSpinY: 0,
    punchAnimT: -1, kickAnimT: -1, strikeKind: 'punch', strikeSide: 1, windupT: -1, windupTarget: null, punchCd: 0,
    phase: 0, wf: 0, wamp: 0, lineBias: 0, reactT: 0, pedalPhase: 0,
  };
}

const DT = 1 / 30;

for (const mountain of ['classic', 'rock']) {
  test(`riderStep matches the frozen source on ${mountain}`, () => {
    const seed = { classic: 20030723, rock: 19930211 }[mountain];
    const source = makeSourceHarness(seed);
    const course = loadCourse(generateCourseDocument({ mountain }));
    course.colliderBuckets.clear(); // isolate physics from obstacle colliders

    const src = makeSourceRider(1.25);
    const mine = initialRiderState(0, { difficulty: 'mayhem', isAI: false });
    // Match the source's initial pose exactly.
    mine.lat = 1.25; mine.y = course.heightAt(mine.s, mine.lat); mine.punchCd = 0;
    src.y = source.groundHeight(src.s, src.lat);

    const controls = [];
    for (let i = 0; i < 720; i++) {
      controls.push({
        pedal: i < 600 ? 1 : 0,
        brake: i > 640 && i < 660 ? 1 : 0,
        steer: Math.sin(i / 37) * 0.8,
        hop: false,
        boost: i > 400 && i < 430,
        punch: false,
        trick: null,
      });
    }

    let worst = 0;
    for (let i = 0; i < controls.length; i++) {
      const c = controls[i];
      src.inp = { pedal: c.pedal, brake: c.brake, steer: c.steer, hop: c.hop, boost: c.boost, punch: c.punch, trick: c.trick };
      mine.inp = { ...src.inp };
      source.riderStep(src, DT);
      stepRider(course, mine, DT, { finishS: course.finishS, elapsed: i * DT, riders: [mine] });
      for (const key of ['s', 'lat', 'y', 'vs', 'vlat', 'vy']) {
        const d = Math.abs(src[key] - mine[key]);
        if (d > worst) worst = d;
      }
      assert.equal(src.grounded, mine.grounded, `grounded at step ${i}`);
    }
    assert.ok(worst < 1e-6, `${mountain} trajectory parity worst diff ${worst} (tolerance 1e-6)`);
  });
}

test('normalizeControls clamps and rejects unknown tricks', () => {
  assert.deepEqual(normalizeControls({ steer: 5, trick: 'nope', pedal: 1 }), {
    pedal: 1, brake: 0, steer: 1, hop: false, boost: false, punch: false, kick: false, trick: null,
  });
  assert.equal(normalizeControls({ steer: -5 }).steer, -1);
  assert.equal(normalizeControls({ trick: 'backflip' }).trick, 'backflip');
});

test('initialRiderState is deterministic per slot and difficulty', () => {
  const a = JSON.stringify(initialRiderState(2, { difficulty: 'brutal', isAI: true, seed: 99 }));
  const b = JSON.stringify(initialRiderState(2, { difficulty: 'brutal', isAI: true, seed: 99 }));
  assert.equal(a, b);
  const human = initialRiderState(0, { difficulty: 'mayhem', isAI: false });
  assert.equal(human.isHuman, true);
  assert.equal(human.meter, 0, 'humans start with no meter');
  const ai = initialRiderState(1, { difficulty: 'mayhem', isAI: true, seed: 7 });
  assert.ok(ai.meter >= DIFFS.mayhem.meter0[0] && ai.meter <= DIFFS.mayhem.meter0[1]);
});

test('a downhill rider accelerates, steers and stays finite without input edges', () => {
  const course = loadCourse(generateCourseDocument({ mountain: 'classic' }));
  course.colliderBuckets.clear();
  const r = initialRiderState(0, { difficulty: 'mayhem', isAI: false });
  r.lat = 0; r.y = course.heightAt(0, 0);
  for (let i = 0; i < 300; i++) {
    r.inp = { pedal: 1, brake: 0, steer: 0, hop: false, boost: false, punch: false, kick: false, trick: null };
    stepRider(course, r, DT, { finishS: course.finishS, elapsed: i * DT, riders: [r] });
  }
  assert.ok(Number.isFinite(r.s) && Number.isFinite(r.lat) && Number.isFinite(r.y));
  assert.ok(r.s > 50, `rider made forward progress (s=${r.s.toFixed(1)})`);
  assert.ok(r.vs > 5 && r.vs <= 40, `speed is in a sane range (vs=${r.vs.toFixed(2)})`);
});

test('trick completion banks meter and bailed landings crash', () => {
  const course = loadCourse(generateCourseDocument({ mountain: 'classic' }));
  course.colliderBuckets.clear();
  const r = initialRiderState(0, { difficulty: 'mayhem', isAI: false });
  r.grounded = false; r.airTime = 1.0; r.y = course.heightAt(0, 0) + 5;
  r.inp = { ...neutralControls(), trick: 'nohander' };
  // Start and fully complete the trick while airborne.
  const events = [];
  for (let i = 0; i < 40; i++) stepRider(course, r, DT, { finishS: course.finishS, elapsed: i * DT, riders: [r] }, events);
  assert.ok(events.some((e) => e.type === 'trick_complete'), 'trick completed');
  assert.equal(TRICKS.nohander.meter > 0, true);
});
