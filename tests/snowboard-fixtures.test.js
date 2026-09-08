import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'snowboard');
const readJson = (...parts) => JSON.parse(readFileSync(path.join(FIXTURES, ...parts), 'utf8'));

const contract = readJson('contract.json');
const courseFormat = readJson('course-format.json');
const roleNormalization = readJson('role-normalization.json');

function lifecycleScenarios() {
  const scenarios = [];
  for (const file of readdirSync(path.join(FIXTURES, 'lifecycle')).sort()) {
    if (!file.endsWith('.json')) continue;
    scenarios.push(...readJson('lifecycle', file).scenarios);
  }
  return scenarios;
}

function wireFixtures() {
  const fixtures = {};
  for (const file of readdirSync(path.join(FIXTURES, 'wire')).sort()) {
    if (!file.endsWith('.json')) continue;
    fixtures[file.replace(/\.json$/, '')] = readJson('wire', file);
  }
  return fixtures;
}

test('contract freeze: identity and phases', () => {
  assert.equal(contract.identity.activityType, 'snowboard-race');
  assert.equal(contract.identity.activityId, 'summit-run');
  assert.equal(contract.identity.courseId, 'summit-night');
  assert.equal(contract.identity.rulesVersion, 1);
  assert.equal(contract.identity.protocolVersion, 1);
  assert.equal(contract.identity.wireRoomId, 'theater');
  assert.deepEqual(contract.capacities ?? contract.identity.capacities, { minPlayers: 2, maxPlayers: 8, spectators: 32, queue: 16 });
  assert.deepEqual(contract.phases.server, ['lobby', 'countdown', 'racing', 'results', 'aborted']);
  // Local-only phases must never be server phases.
  for (const local of contract.phases.local) {
    assert.ok(!contract.phases.server.includes(local), `local phase ${local} leaked into server phases`);
  }
});

test('contract freeze: D4 timing constants', () => {
  assert.equal(contract.timing.countdownSeconds, 3);
  assert.equal(contract.timing.readyExpirySeconds, 60);
  assert.equal(contract.timing.disconnectGraceSeconds, 30);
  assert.equal(contract.timing.finishGraceSeconds, 30);
  assert.equal(contract.timing.raceDeadlineSeconds, 180);
  assert.equal(contract.timing.resultsRetentionSeconds, 120);
  assert.equal(contract.timing.nonReadyInactivitySeconds, 120);
  assert.equal(contract.timing.queueOfferWindowSeconds, 30);
});

test('contract freeze: D5 simulation constants', () => {
  assert.equal(contract.simulation.tickHz, 30);
  assert.equal(contract.simulation.maxCatchUpSteps, 4);
  assert.equal(contract.simulation.speedMax, 45);
  assert.equal(contract.simulation.startSpeed, 8);
  assert.equal(contract.simulation.gravity, 20);
  assert.equal(contract.simulation.corridorHalfWidth, 24);
  assert.equal(contract.simulation.groomedHalfWidth, 18);
  assert.equal(contract.simulation.maxColliders, 64);
  assert.equal(contract.course.lengthMeters, 1800);
  assert.equal(contract.course.checkpointCount, 8);
  assert.deepEqual(contract.course.checkpointPlanesMeters, [200, 400, 600, 800, 1000, 1200, 1400, 1600]);
  assert.equal(contract.course.finishMeters, 1800);
});

test('contract freeze: D7 rates, errors and events', () => {
  assert.equal(contract.rates.inputTargetHz, 30);
  assert.equal(contract.rates.snapshotHz, 20);
  assert.equal(contract.rates.maxCommandBytes, 2048);
  assert.equal(contract.rates.maxSnapshotBytes, 32768);
  assert.equal(contract.rates.transportQueueCap, 64);
  assert.equal(contract.rates.interpolationBufferMs, 100);
  for (const code of contract.errors.reused) assert.ok(!contract.errors.snowboardScoped.includes(code));
  assert.deepEqual(contract.events.sort(), ['checkpoint', 'countdown', 'queue_offer', 'race_aborted', 'rider_dnf', 'rider_finished'].sort());
  assert.deepEqual(contract.results, {
    kind: 'snowboard_race',
    recordingStatus: 'session_only',
    completeReasons: ['complete', 'deadline'],
    tieWindowMs: 1,
  });
});

test('course format: sample document is structurally consistent', () => {
  const sample = courseFormat.sample;
  const { sValues, uValues, height, surface } = sample.grid;
  assert.equal(sample.lengthMeters % sample.gridStepMeters, 0);
  assert.equal(sValues.length, height.length);
  assert.equal(sValues[sValues.length - 1], sample.lengthMeters);
  assert.equal(sValues[0], 0);
  assert.equal(uValues.length, height[0].length);
  assert.deepEqual(uValues, [...uValues].sort((a, b) => a - b));
  // symmetric lateral samples (guard against -0 vs 0)
  assert.deepEqual([...uValues].reverse().map(u => (u === 0 ? 0 : -u)), uValues.map(u => (u === 0 ? 0 : u)));
  for (const row of surface) assert.equal(row.length, uValues.length);
  for (const row of height) for (const h of row) assert.ok(Number.isFinite(h));
  assert.deepEqual(sample.gates.map(g => g.index), [1]);
  assert.ok(sample.finish.s > Math.max(...sample.gates.map(g => g.s)));
});

test('role normalization: wire roles map to server roles one-to-one', () => {
  const mappings = roleNormalization.roleNormalizationCases.filter(c => !c.server.startsWith('rejected'));
  assert.deepEqual(mappings.map(c => [c.wire, c.server]), [
    ['play', 'player'],
    ['watch', 'spectator'],
    ['queue', 'queue'],
  ]);
  assert.equal(roleNormalization.leaseAliases.canonical, 'lease');
  assert.deepEqual(roleNormalization.neutralControls.wireForm, { kind: 'neutral' });
});

test('lifecycle scenarios: unique ids and executable shape', () => {
  const scenarios = lifecycleScenarios();
  assert.ok(scenarios.length >= 15, `expected the D4 table coverage, got ${scenarios.length}`);
  const ids = new Set();
  for (const s of scenarios) {
    assert.ok(!ids.has(s.id), `duplicate scenario id ${s.id}`);
    ids.add(s.id);
    assert.equal(typeof s.id, 'string');
    assert.ok(s.initial, `${s.id}: missing initial`);
    assert.ok(s.expected, `${s.id}: missing expected`);
    assert.ok(Array.isArray(s.steps), `${s.id}: steps must be an array`);
    for (const step of s.steps) {
      const kinds = ['actor', 'clock', 'event'].filter(k => k in step);
      assert.ok(kinds.length >= 1, `${s.id}: step needs actor/clock/event`);
    }
  }
  // Coverage of the named D4 conditions the tasks call out.
  for (const required of [
    'lone-rider-waits', 'ready-expiry', 'two-of-eight-locks-countdown', 'countdown-cancel-unready',
    'late-join-offer', 'finish-grace', 'deadline-dnf', 'all-opponents-leave',
    'disconnect-freeze', 'reconnect-resume', 'grace-expiry-dnf', 'reload-resume-hint',
    'rematch-rotates-match', 'queue-promotion-fifo', 'results-retention', 'empty-session-reap', 'owner-loss-abort',
  ]) {
    assert.ok(ids.has(required), `missing required lifecycle scenario ${required}`);
  }
});

test('wire fixtures: every D7 command and audience is frozen', () => {
  const wires = wireFixtures();
  for (const name of ['join-play', 'join-watch-queue', 'join-accept-offer', 'leave-cancel', 'ready', 'input-loaded', 'input-ride', 'input-neutral', 'leave', 'resnapshot', 'snapshot-full', 'snapshot-summary', 'events', 'result', 'errors']) {
    assert.ok(wires[name], `missing wire fixture ${name}`);
  }
  // Mutation fence shape on every client command that requires it.
  const fenced = ['ready', 'input-loaded', 'input-ride', 'input-neutral', 'leave'];
  for (const name of fenced) {
    const p = wires[name].payload;
    for (const field of ['activityId', 'sessionId', 'matchId', 'lease']) {
      assert.ok(field in p, `${name}: payload missing fence field ${field}`);
    }
  }
  // Join carries no lease; queue acceptance carries the control lease.
  assert.ok(!('lease' in wires['join-play'].payload), 'join must not carry a lease');
  assert.equal(wires['join-accept-offer'].payload.action, 'accept_offer');
  // Summary audience excludes participation-only fields.
  const summary = wires['snapshot-summary'].payload;
  assert.equal(summary.audience, 'summary');
  assert.ok(!('state' in summary), 'summary must not carry rider sim state');
  assert.ok(!('lastAcceptedSeqs' in summary), 'summary must not carry diagnostic seqs');
  // Full snapshot keeps motion ordering independent of lifecycle revision.
  const full = wires['snapshot-full'].payload;
  assert.equal(full.audience, 'participants');
  assert.ok('snapshotSeq' in full && 'serverTick' in full && 'revision' in full);
  assert.ok(wires['snapshot-full'].privateAttachment.self.appliedSeq !== undefined);
  assert.ok(!('self' in full), 'private attachment must not be inside the shared payload');
  // Errors carry typed codes with no overlap drift.
  const errorNames = wires['errors'].cases.map(c => c.error);
  assert.deepEqual(errorNames.sort(), [...contract.errors.reused, ...contract.errors.snowboardScoped].sort());
});
