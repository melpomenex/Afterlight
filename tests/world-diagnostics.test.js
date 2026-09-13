import test from 'node:test';
import assert from 'node:assert/strict';

import {
  startAttempt,
  endAttempt,
  recordWorldContext,
  getRecords,
  clearRecords,
  setPerfEnabled,
} from '../src/activities/kartPerf.js';
import { resolveWorldPresentation } from '../src/worlds/resolver.js';
import { estimateWorldAssetBytes } from '../src/worlds/assets.js';
import { WORLD_IDS } from '../shared/worldDefinitions.js';

test('kartPerf records capture world selection, host, revision, fallback, assets, and byte estimates', () => {
  setPerfEnabled(true);
  clearRecords();

  const originalState = globalThis.__afterlightWorldState;
  globalThis.__afterlightWorldState = {
    snapshot: () => ({
      worldId: 'desert',
      variantId: 'sandstorm',
      revision: 4,
    }),
  };

  try {
    startAttempt({
      generation: 1,
      attemptId: 101,
      route: 'prefetched',
    });

    recordWorldContext({
      actualHost: 'kart',
      fallback: false,
      assets: ['kit:desert-mesas', 'kit:desert-palms'],
    });

    endAttempt('success');

    const records = getRecords();
    assert.equal(records.length, 1);
    const rec = records[0];
    assert.ok(rec.world, 'record has world diagnostics');
    assert.equal(rec.world.selection.worldId, 'desert');
    assert.equal(rec.world.actualHost, 'kart');
    assert.equal(rec.world.appliedRevision, 4);
    assert.equal(rec.world.fallback, false);
    assert.deepEqual(rec.world.assets, ['kit:desert-mesas', 'kit:desert-palms']);
    assert.ok(typeof rec.world.byteEstimates.cpu === 'number');
    assert.ok(typeof rec.world.byteEstimates.gpu === 'number');
    assert.ok(rec.world.byteEstimates.cpu > 0);
    assert.ok(rec.world.byteEstimates.gpu > 0);
  } finally {
    clearRecords();
    setPerfEnabled(false);
    globalThis.__afterlightWorldState = originalState;
  }
});

test('failure traces and errors in kartPerf records sanitize identity tokens and sensitive credentials', () => {
  setPerfEnabled(true);
  clearRecords();

  try {
    startAttempt({ generation: 2, attemptId: 102 });

    const sensitiveError = new Error(
      'Auth failure: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.token1234567890abcdef and token=secret_session_key_999988887777',
    );
    endAttempt('failed', sensitiveError);

    const records = getRecords();
    assert.equal(records.length, 1);
    const rec = records[0];
    assert.equal(rec.status, 'failed');
    assert.ok(rec.error, 'error message recorded');
    assert.ok(!rec.error.includes('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'), 'JWT was redacted');
    assert.ok(!rec.error.includes('secret_session_key_999988887777'), 'session key was redacted');
    assert.ok(rec.error.includes('[REDACTED]'), 'redacted placeholder present');
  } finally {
    clearRecords();
    setPerfEnabled(false);
  }
});

test('forced World/View combinations produce labeled estimates and contain no identity tokens', () => {
  const views = [
    'place:theater',
    'place:rain-court',
    'place:canal',
    'activity:kart-royale',
    'activity:snowboard-race',
    'activity:downhill-mayhem',
    'activity:pool',
    'activity:pong',
  ];

  for (const worldId of WORLD_IDS) {
    for (const viewId of views) {
      const plan = resolveWorldPresentation({
        selection: { worldId },
        viewId,
      });

      assert.ok(plan, `plan resolved for ${worldId} on ${viewId}`);
      assert.ok(plan.selection, 'has selection');
      assert.equal(plan.selection.worldId, worldId);
      assert.ok(typeof plan.mode === 'string');
      assert.ok(typeof plan.host === 'string');

      const bytes = estimateWorldAssetBytes(plan.assetIds || []);
      assert.ok(typeof bytes.cpu === 'number');
      assert.ok(typeof bytes.gpu === 'number');
      assert.ok(typeof bytes.total === 'number');
      assert.equal(bytes.total, bytes.cpu + bytes.gpu);

      // Verify serialized plan contains no identity tokens
      const json = JSON.stringify(plan);
      assert.ok(!json.includes('token:'));
      assert.ok(!json.includes('bearer'));
      assert.ok(!json.includes('password'));
    }
  }
});
