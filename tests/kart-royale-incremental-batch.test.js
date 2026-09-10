/**
 * Resumable world-build batches (fix-kart-royale-instant-entry 5.3).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ROOT = new URL('../games/kart-royale/src/', import.meta.url);

function read(rel) {
  return readFileSync(new URL(rel, ROOT), 'utf8');
}

test('track geometry is split into named resumable batches', () => {
  const src = read('world/TrackGeometry.ts');
  assert.match(src, /export function createTrackGeometryBatch/);
  assert.match(src, /id: 'track:road'/);
  assert.match(src, /id: 'track:bridge'/);
});

test('world systems expose initBatches for incremental preparation', () => {
  for (const file of [
    'world/Track.ts',
    'world/Scenery.ts',
    'game/Race.ts',
    'render/Materials.ts',
  ]) {
    const src = read(file);
    assert.match(src, /initBatches\(ctx/, `${file} must expose initBatches`);
  }
});

test('hosted runtime exposes prepareWorldSlice for background warming', () => {
  const runtime = read('host/runtime.ts');
  const host = read('host/index.ts');
  assert.match(runtime, /prepareWorldSlice/);
  assert.match(runtime, /IncrementalBatchRunner/);
  assert.match(host, /prepareWorldSlice/);
  assert.match(host, /isWorldPrepared/);
});
