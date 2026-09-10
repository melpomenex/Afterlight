import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isPerfEnabled,
  setPerfEnabled,
  startAttempt,
  endAttempt,
  startSpan,
  endSpan,
  recordMark,
  getRecords,
  clearRecords,
  exportJson,
} from '../src/activities/kartPerf.js';

test('kartPerf respects opt-in enablement and stores bounded records', () => {
  clearRecords();
  setPerfEnabled(false);
  assert.equal(isPerfEnabled(), false);
  assert.equal(startAttempt({ attemptId: 'test-disabled' }), null);

  setPerfEnabled(true);
  assert.equal(isPerfEnabled(), true);

  const attempt = startAttempt({ generation: 1, attemptId: 'att-1', route: 'cold' });
  assert.ok(attempt);
  assert.equal(attempt.attemptId, 'att-1');
  assert.equal(attempt.generation, 1);
  assert.equal(attempt.route, 'cold');
  assert.equal(attempt.status, 'pending');

  startSpan('interaction');
  recordMark('custom-mark', { sample: 123 });
  endSpan('interaction', { extra: true });

  assert.ok(attempt.spans.interaction);
  assert.ok(typeof attempt.spans.interaction.durationMs === 'number');
  assert.equal(attempt.spans.interaction.meta.extra, true);

  endAttempt('success');
  assert.equal(attempt.status, 'success');
  assert.ok(typeof attempt.totalDurationMs === 'number');

  const records = getRecords();
  assert.equal(records.length, 1);
  assert.equal(records[0].attemptId, 'att-1');

  // Verify ring buffer capping at 20
  for (let i = 2; i <= 25; i++) {
    startAttempt({ generation: 1, attemptId: `att-${i}` });
    endAttempt('success');
  }
  const capped = getRecords();
  assert.equal(capped.length, 20);
  assert.equal(capped[0].attemptId, 'att-6');
  assert.equal(capped[capped.length - 1].attemptId, 'att-25');

  const jsonStr = exportJson();
  const parsed = JSON.parse(jsonStr);
  assert.equal(parsed.length, 20);

  clearRecords();
  assert.equal(getRecords().length, 0);
});
