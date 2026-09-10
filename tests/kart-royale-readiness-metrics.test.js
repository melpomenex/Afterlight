/**
 * READY hit-rate metrics (fix-kart-royale-instant-entry 5.5/8.4).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  recordArrivalSample,
  summarizeReadinessMetrics,
  clearReadinessMetrics,
} from '../src/activities/kartReadinessMetrics.js';

test('summarizeReadinessMetrics reports hit rate by mode and prep window', () => {
  clearReadinessMetrics();
  recordArrivalSample({ ready: true, mode: 'walk', prepSeconds: 1, distance: 6 });
  recordArrivalSample({ ready: false, mode: 'walk', prepSeconds: 12, distance: 7 });
  recordArrivalSample({ ready: true, mode: 'run', prepSeconds: 4, distance: 4 });

  const summary = summarizeReadinessMetrics();
  assert.equal(summary.total, 3);
  assert.equal(summary.readyHits, 2);
  assert.ok(summary.hitRate > 0.6);
  assert.equal(summary.byMode.walk.total, 2);
  assert.equal(summary.byMode.run.ready, 1);
  assert.equal(summary.byWindow['5s'].ready, 2);
});
