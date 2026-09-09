import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ACTIVITY_SUMMARY_TTL_MS,
  sanitizeActivitySummaries,
  summariesFresh,
  tableLooksOccupied,
  formatActivityLine,
  describePlaceOccupancy,
} from '../src/ui/activityDiscovery.js';

test('summaries older than ten seconds are unknown, not zero', () => {
  assert.equal(ACTIVITY_SUMMARY_TTL_MS, 10_000);
  assert.equal(summariesFresh(0, 10_001), false);
  assert.equal(summariesFresh(0, 9_999), true);
  const stale = formatActivityLine([{ type: 'pool', playing: 0, watching: 0, queued: 0 }], { fresh: false });
  assert.equal(stale.unknown, true);
  assert.match(stale.text, /unknown/i);
  assert.equal(stale.occupied, false);
});

test('overlapping playing/watching/queued are not summed as one count', () => {
  const line = formatActivityLine([
    { id: 'pool-1', type: 'pool', playing: 2, watching: 3, queued: 1 },
  ], { fresh: true });
  assert.match(line.text, /2 playing/);
  assert.match(line.text, /3 watching/);
  assert.match(line.text, /1 queued/);
  assert.equal(line.text.includes('6'), false);
  assert.equal(line.occupied, true);
});

test('occupied tables do not look empty', () => {
  const summaries = sanitizeActivitySummaries([
    { id: 'pool-1', type: 'pool', playing: 2, watching: 0, queued: 0 },
  ]);
  assert.equal(tableLooksOccupied(summaries, { fresh: true }), true);
  const occ = describePlaceOccupancy(0, { occupiedTable: true, occupancyKnown: true });
  assert.equal(occ.empty, false);
  assert.match(occ.text, /occupied/i);
});

test('unknown occupancy stays a dash, never a fabricated empty table', () => {
  const occ = describePlaceOccupancy(null, { occupiedTable: false, occupancyKnown: false });
  assert.equal(occ.text, '—');
  assert.equal(occ.empty, false);
});

test('hostile activity rows stay literal text after sanitizing', () => {
  const rows = sanitizeActivitySummaries([
    { id: '<img>', type: 'pool', playing: 1, watching: 0, queued: 0 },
    null,
    { playing: 'nope' },
  ]);
  assert.equal(rows[0].id, '<img>');
  assert.equal(rows[0].playing, 1);
});
