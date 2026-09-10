/**
 * Kart preparation rollout policy (fix-kart-royale-instant-entry 5.5/8.6).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readKartPrepRollout, setKartPrepRollout } from '../src/activities/kartRoyaleRollout.js';

test('readKartPrepRollout honors query override and storage', () => {
  const storage = new Map();
  assert.equal(readKartPrepRollout({
    getSearch: () => '?kartPrep=0',
    getStorage: () => ({ getItem: (k) => storage.get(k) ?? null }),
    hasGraphicsTransactions: true,
  }), false);

  setKartPrepRollout(true, {
    getStorage: () => ({
      setItem: (k, v) => storage.set(k, v),
      getItem: (k) => storage.get(k) ?? null,
    }),
  });
  assert.equal(readKartPrepRollout({
    getSearch: () => '',
    getStorage: () => ({ getItem: (k) => storage.get(k) ?? null }),
    hasGraphicsTransactions: false,
  }), true);
});

test('readKartPrepRollout defaults to graphics-transaction availability', () => {
  assert.equal(readKartPrepRollout({ hasGraphicsTransactions: true }), true);
  assert.equal(readKartPrepRollout({ hasGraphicsTransactions: false }), false);
});
