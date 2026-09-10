/**
 * Kart Royale idle module prefetch (fix-kart-royale-instant-entry 5.1).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canScheduleKartRoyalePrefetch,
  scheduleKartRoyaleModulePrefetch,
} from '../src/activities/kartRoyalePrefetch.js';

test('canScheduleKartRoyalePrefetch honors theater, visibility and network constraints', () => {
  assert.equal(canScheduleKartRoyalePrefetch({ roomId: 'theater' }), true);
  assert.equal(canScheduleKartRoyalePrefetch({ roomId: 'garden' }), false);
  assert.equal(canScheduleKartRoyalePrefetch({ documentHidden: true }), false);
  assert.equal(canScheduleKartRoyalePrefetch({ saveData: true }), false);
  assert.equal(canScheduleKartRoyalePrefetch({ effectiveType: '2g' }), false);
  assert.equal(canScheduleKartRoyalePrefetch({ effectiveType: '4g' }), true);
});

test('scheduleKartRoyaleModulePrefetch runs once through idle after a frame', async () => {
  const calls = [];
  let hidden = false;
  const result = scheduleKartRoyaleModulePrefetch({
    preparation: {
      prefetch: () => {
        calls.push('prefetch');
        return Promise.resolve({ ok: true });
      },
    },
    roomId: 'theater',
    getDocument: () => ({ hidden }),
    getNetwork: () => ({ connection: { saveData: false, effectiveType: '4g' } }),
    requestFrame: (cb) => {
      calls.push('raf');
      cb();
      return 1;
    },
    requestIdle: (cb) => {
      calls.push('idle');
      cb();
      return 2;
    },
  });

  assert.equal(result.scheduled, true);
  assert.deepEqual(calls, ['raf', 'idle', 'prefetch']);
});

test('scheduleKartRoyaleModulePrefetch skips when constraints fail at schedule time', () => {
  let prefetchCalls = 0;
  const result = scheduleKartRoyaleModulePrefetch({
    preparation: {
      prefetch: () => {
        prefetchCalls += 1;
        return Promise.resolve({ ok: true });
      },
    },
    roomId: 'court',
    getDocument: () => ({ hidden: false }),
    getNetwork: () => ({ connection: { saveData: true } }),
    requestFrame: (cb) => {
      cb();
      return 1;
    },
    requestIdle: (cb) => {
      cb();
      return 2;
    },
  });

  assert.equal(result.scheduled, false);
  assert.equal(result.reason, 'constraints');
  assert.equal(prefetchCalls, 0);
});

test('scheduleKartRoyaleModulePrefetch re-checks visibility before idle callback', () => {
  let hidden = false;
  let prefetchCalls = 0;
  scheduleKartRoyaleModulePrefetch({
    preparation: {
      prefetch: () => {
        prefetchCalls += 1;
        return Promise.resolve({ ok: true });
      },
    },
    getDocument: () => ({ hidden }),
    getNetwork: () => ({ connection: {} }),
    requestFrame: (cb) => {
      hidden = true;
      cb();
      return 1;
    },
    requestIdle: (cb) => {
      cb();
      return 2;
    },
  });

  assert.equal(prefetchCalls, 0);
});
