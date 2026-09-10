/**
 * Downhill Mayhem entry-readiness metrics (17.2).
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  recordEntrySample,
  summarizeReadinessMetrics,
  clearReadinessMetrics,
} from '../src/activities/downhillReadinessMetrics.js';

test('readiness metrics summarize hit/retained/cancelled and prep windows', () => {
  clearReadinessMetrics();
  recordEntrySample({ ready: true, retained: true, prepSeconds: 0.1, distance: 9 });
  recordEntrySample({ ready: true, retained: false, prepSeconds: 0.4, distance: 3 });
  recordEntrySample({ ready: false, cancelled: true, prepSeconds: 1.5, distance: 2 });
  recordEntrySample({ ready: true, retained: true, prepSeconds: 4, distance: 1 });

  const summary = summarizeReadinessMetrics();
  assert.equal(summary.total, 4);
  assert.equal(summary.readyHits, 3);
  assert.equal(summary.retainedHits, 2);
  assert.equal(summary.cancelled, 1);
  assert.equal(summary.hitRate, 0.75);
  assert.equal(summary.retainedRate, 0.5);
  assert.equal(summary.byWindow['0.25s'].total, 1);
  assert.equal(summary.byWindow['0.5s'].total, 2);
  assert.equal(summary.byWindow['5s'].total, 4);

  // Anonymous samples: timing/flags only, never ids.
  for (const sample of summary.samples) {
    assert.deepEqual(
      Object.keys(sample).sort(),
      ['cancelled', 'distance', 'prepSeconds', 'ready', 'retained', 'ts'],
    );
  }
});

test('readiness metrics are bounded and clearable', () => {
  clearReadinessMetrics();
  for (let i = 0; i < 260; i++) recordEntrySample({ ready: i % 2 === 0 });
  assert.equal(summarizeReadinessMetrics().total, 200);
  clearReadinessMetrics();
  assert.equal(summarizeReadinessMetrics().total, 0);
});

test('readiness metrics are exposed on the debug global', () => {
  assert.equal(typeof globalThis.__downhillReadinessMetrics?.summarizeReadinessMetrics, 'function');
  assert.equal(typeof globalThis.__downhillReadinessMetrics?.recordEntrySample, 'function');
});
