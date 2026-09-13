/**
 * Kart Royale entry-loading state tests (add-kart-royale-loading-indicator).
 *
 * The pure session must:
 *   - start at the first phase, advance forward-only, and ignore unknown or
 *     regressing phases (the card must never move backwards mid-attempt);
 *   - enforce the show delay, so a retained-host re-entry that presents
 *     almost instantly never becomes visible;
 *   - render bounded snapshots with done/current/pending phase marks and an
 *     m:ss elapsed label — never a completion percentage;
 *   - resolve the cabinet screen precedence: a visible local boot wins over
 *     the occupancy display.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  KART_LOADING_PHASES,
  KART_LOADING_SHOW_DELAY_MS,
  createKartLoadingSession,
  formatKartElapsed,
  resolveKartScreenPaint,
} from '../src/activities/kartRoyaleLoadingState.js';

test('phases are ordered and labelled for players', () => {
  assert.deepEqual(KART_LOADING_PHASES, ['modules', 'host', 'graphics', 'grid']);
  for (const phase of KART_LOADING_PHASES) {
    const label = createKartLoadingSession().snapshot(0).phases.find((p) => p.key === phase).label;
    assert.ok(label.endsWith('…'), `label for ${phase} is ongoing copy`);
    assert.ok(!/pmrem|import|webpack|chunk|bake/i.test(label), `no jargon in "${label}"`);
  }
});

test('session starts at the first phase and advances forward-only', () => {
  const session = createKartLoadingSession();
  session.begin(0);
  assert.equal(session.phase, 'modules');

  // Equal phase is a no-op; a skipped-forward phase is legal (retained host
  // may jump straight to presentation without intermediate reports).
  assert.equal(session.setPhase('modules'), false);
  assert.equal(session.setPhase('graphics'), true);
  assert.equal(session.phase, 'graphics');

  // No backwards movement within one attempt.
  assert.equal(session.setPhase('host'), false);
  assert.equal(session.setPhase('modules'), false);
  assert.equal(session.phase, 'graphics');

  // Unknown phases never land.
  assert.equal(session.setPhase('galaxy-brain'), false);
  assert.equal(session.phase, 'graphics');

  assert.equal(session.setPhase('grid'), true);
  assert.equal(session.setPhase('grid'), false, 'equal phase is not an advance');
});

test('phases are ignored before begin and after finish', () => {
  const session = createKartLoadingSession();
  assert.equal(session.setPhase('host'), false, 'not begun');
  assert.equal(session.active, false);

  session.begin(0);
  session.finish();
  assert.equal(session.active, false);
  assert.equal(session.setPhase('host'), false, 'finished');
  assert.equal(session.phase, 'modules', 'phase unchanged after finish');
});

test('the show delay hides fast retained-host re-entry entirely', () => {
  const session = createKartLoadingSession();
  session.begin(1000);
  assert.equal(session.snapshot(1000).visible, false);
  assert.equal(session.snapshot(1000 + KART_LOADING_SHOW_DELAY_MS - 1).visible, false);
  assert.equal(session.snapshot(1000 + KART_LOADING_SHOW_DELAY_MS).visible, true);

  // A session that finishes under the delay never reported visible.
  const fast = createKartLoadingSession();
  fast.begin(0);
  fast.setPhase('grid');
  fast.finish();
  assert.equal(fast.snapshot(10_000).visible, false);
  assert.equal(fast.snapshot(10_000).active, false);
});

test('snapshots mark done/current/pending phases and elapsed time without percentages', () => {
  const session = createKartLoadingSession();
  session.begin(0);
  session.setPhase('graphics');

  const snap = session.snapshot(65_000);
  assert.equal(snap.visible, true);
  assert.equal(snap.phase, 'graphics');
  assert.deepEqual(
    snap.phases.map((p) => p.state),
    ['done', 'done', 'current', 'pending'],
  );
  assert.equal(snap.elapsedLabel, '1:05');
  assert.ok(!('percent' in snap) && !('progress' in snap), 'no fabricated completion field');
  assert.ok(!snap.phaseLabel.includes('%'), 'no percentage in copy');
});

test('finish clears visibility and elapsed stops growing', () => {
  const session = createKartLoadingSession();
  session.begin(0);
  assert.equal(session.snapshot(600).visible, true);
  session.finish();
  const after = session.snapshot(7000);
  assert.equal(after.visible, false);
  assert.equal(after.elapsedMs, 0);
});

test('begin while active keeps the original attempt', () => {
  const session = createKartLoadingSession();
  session.begin(0);
  session.setPhase('host');
  session.begin(9999);
  assert.equal(session.phase, 'host');
  assert.equal(session.snapshot(1000).elapsedMs, 1000, 'start time not reset');
});

test('formatKartElapsed renders compact m:ss', () => {
  assert.equal(formatKartElapsed(0), '0:00');
  assert.equal(formatKartElapsed(7000), '0:07');
  assert.equal(formatKartElapsed(83_000), '1:23');
  assert.equal(formatKartElapsed(-5), '0:00');
});

test('resolveKartScreenPaint: a visible boot wins over the occupancy display', () => {
  // The seated player is admitted instantly, so occupancy reads "occupied"
  // while the game is still loading — booting must win.
  assert.equal(resolveKartScreenPaint({ loadingVisible: true, displayStatus: 'occupied' }), 'booting');
  assert.equal(resolveKartScreenPaint({ loadingVisible: true, displayStatus: 'idle' }), 'booting');
  assert.equal(resolveKartScreenPaint({ loadingVisible: false, displayStatus: 'occupied' }), 'occupied');
  assert.equal(resolveKartScreenPaint({ loadingVisible: false, displayStatus: 'idle' }), 'idle');
});
