/**
 * Pure floating media layout tests (add-floating-minigame-media, task 4.2).
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  FLOATING_LAYOUT,
  availableViewport,
  clampPosition,
  computeFloatingSize,
  cornerRect,
  overlapArea,
  resolveFloatingLayout,
} from '../src/ui/floatingMediaLayout.js';

const viewport = (width, height, extra = {}) => ({ width, height, ...extra });
const ASPECT = 16 / 9;

test('compact width tracks 22vw clamped to 280-400 on common desktop widths', () => {
  const cases = [
    { width: 1440, expect: 312 },
    { width: 1280, expect: 280 },
    { width: 930, expect: 280 },
    { width: 560, expect: 280 },
    { width: 390, expect: 280 },
  ];
  for (const c of cases) {
    const size = computeFloatingSize({ viewport: viewport(c.width, 900), aspect: ASPECT });
    assert.equal(size.width, c.expect, `width ${c.width}`);
    assert.ok(Math.abs(size.height - Math.round(size.width / ASPECT)) <= 1, `height follows the aspect at ${c.width}`);
    assert.ok(size.width <= FLOATING_LAYOUT.MAX_WIDTH);
  }
  const wide = computeFloatingSize({ viewport: viewport(2560, 1440), aspect: ASPECT });
  assert.equal(wide.width, 400, 'never wider than the 400px desktop cap');
});

test('narrow and short viewports stay inside the available rect', () => {
  const narrow = computeFloatingSize({ viewport: viewport(320, 640), aspect: ASPECT });
  assert.ok(narrow.width <= 320 - FLOATING_LAYOUT.MARGIN * 2, 'fits the width minus margins');
  // Virtual keyboard: height collapses.
  const short = computeFloatingSize({ viewport: viewport(390, 180), aspect: ASPECT });
  assert.ok(short.height <= 180 - FLOATING_LAYOUT.MARGIN * 2, `height ${short.height} fits the keyboard viewport`);
  assert.ok(short.width <= 390 - FLOATING_LAYOUT.MARGIN * 2);
});

test('safe-area insets and visualViewport offsets are respected', () => {
  const avail = availableViewport(
    viewport(390, 844, { offsetLeft: 0, offsetTop: 44, safeArea: { top: 47, bottom: 34, left: 0, right: 0 } }),
  );
  assert.equal(avail.y, 44 + 12 + 47);
  assert.equal(avail.height, 844 - 24 - 47 - 34);
  // An explicit safeArea option wins over a nested one.
  const explicit = availableViewport(viewport(390, 844), { safeArea: { top: 10, bottom: 10 } });
  assert.equal(explicit.y, 12 + 10);
  const size = computeFloatingSize({ viewport: viewport(390, 200, { safeArea: { bottom: 80 } }) });
  assert.ok(size.height <= 200 - 24 - 80, 'the keyboard inset shrinks the usable height');
});

test('enlarged mode stays within 80% of the available width and height', () => {
  const size = computeFloatingSize({ viewport: viewport(1440, 900), aspect: ASPECT, expanded: true });
  const avail = availableViewport(viewport(1440, 900));
  assert.ok(size.width <= avail.width * 0.8 + 1);
  assert.ok(size.height <= avail.height * 0.8 + 1);
  const tall = computeFloatingSize({ viewport: viewport(800, 300), aspect: 9 / 16, expanded: true });
  const tallAvail = availableViewport(viewport(800, 300));
  assert.ok(tall.height <= tallAvail.height * 0.8 + 1);
  assert.ok(tall.width <= tallAvail.width * 0.8 + 1);
});

test('provider minimums are honored with letterboxing, or reported unfittable', () => {
  const desktop = computeFloatingSize({ viewport: viewport(1440, 900), aspect: ASPECT, provider: 'twitch' });
  assert.ok(desktop.width >= 400 && desktop.height >= 300, `twitch minimum met: ${desktop.width}x${desktop.height}`);
  assert.ok(Math.abs(desktop.width / desktop.height - ASPECT) < 0.02, 'aspect preserved while scaling up');

  const narrow = resolveFloatingLayout({ viewport: viewport(390, 844), aspect: ASPECT, provider: 'twitch' });
  assert.equal(narrow.mode, 'chip');
  assert.equal(narrow.reason, 'provider_min_size');
  assert.equal(narrow.fits, false, 'the provider frame is never scaled below its minimum');
});

test('corner candidates prefer bottom-right, then sweep clockwise', () => {
  const base = { viewport: viewport(1440, 900), aspect: ASPECT };
  assert.equal(resolveFloatingLayout(base).corner, 'bottom-right');
  const size = resolveFloatingLayout(base).size;
  const blockBottomRight = [{ x: 1200, y: 500, width: 240, height: 400 }];
  assert.equal(resolveFloatingLayout({ ...base, reservations: blockBottomRight }).corner, 'bottom-left');
  const blockBottom = [
    ...blockBottomRight,
    { x: 0, y: 500, width: 400, height: 400 },
  ];
  assert.equal(resolveFloatingLayout({ ...base, reservations: blockBottom }).corner, 'top-right');
  const blockThree = [
    ...blockBottom,
    { x: 1200, y: 0, width: 240, height: 400 },
  ];
  assert.equal(resolveFloatingLayout({ ...base, reservations: blockThree }).corner, 'top-left');
  assert.ok(size.width > 0);
});

test('reservations are bounded (at most eight considered) and invalid rects dropped', () => {
  const base = { viewport: viewport(1440, 900), aspect: ASPECT };
  const junk = [{ x: 'nope' }, null, { x: 1, y: 1 }];
  const many = Array.from({ length: 20 }, (_, i) => ({ x: i * 70, y: 0, width: 60, height: 60 }));
  const withJunk = resolveFloatingLayout({ ...base, reservations: [...junk, ...many] });
  assert.ok(withJunk.position, 'invalid rects are ignored');
  const eight = many.slice(0, 8);
  const bounded = resolveFloatingLayout({ ...base, reservations: many });
  const explicit = resolveFloatingLayout({ ...base, reservations: eight });
  assert.deepEqual(bounded.position, explicit.position, 'only the first eight reservations matter');
});

test('manual position survives ordinary updates and clamps into bounds', () => {
  const base = { viewport: viewport(1440, 900), aspect: ASPECT };
  const moved = resolveFloatingLayout({ ...base, manualPosition: { x: 300, y: 200 } });
  assert.equal(moved.corner, 'manual');
  assert.deepEqual(moved.position, { x: 300, y: 200 });
  const offscreen = resolveFloatingLayout({ ...base, manualPosition: { x: 99999, y: 99999 } });
  assert.ok(offscreen.position.x + offscreen.size.width <= 1440);
  assert.ok(offscreen.position.y + offscreen.size.height <= 900);
  const forced = resolveFloatingLayout({ ...base, manualPosition: { x: 300, y: 200 }, forceReclamp: true });
  assert.notEqual(forced.corner, 'manual', 'resize/critical controls may reclaim the corner');
});

test('all corners blocked: reduced size first, then the restore chip', () => {
  const base = { viewport: viewport(1440, 900), aspect: ASPECT };
  const normal = resolveFloatingLayout(base);
  const big = normal.size;
  const avail = availableViewport(viewport(1440, 900));
  // Reservations sit inside each normal-size corner but clear the smaller
  // reduced rectangle anchored at the same corner (an inboard HUD panel).
  const inboard = (corner) => {
    const rect = cornerRect(corner, avail, big);
    // The corner farther from the viewport edge.
    const x = corner.endsWith('left') ? rect.x + rect.width - 60 : rect.x;
    const y = corner.startsWith('top') ? rect.y + rect.height - 60 : rect.y;
    return { x, y, width: 60, height: 60 };
  };
  const blocked = ['bottom-right', 'bottom-left', 'top-right', 'top-left'].map(inboard);
  const reduced = resolveFloatingLayout({ ...base, reservations: blocked });
  assert.equal(reduced.mode, 'reduced');
  assert.ok(reduced.size.width <= FLOATING_LAYOUT.REDUCED_WIDTH);
  assert.equal(reduced.overlap, 0);

  const all = [
    { x: 0, y: 0, width: 1440, height: 900 },
  ];
  const chip = resolveFloatingLayout({ ...base, reservations: all });
  assert.equal(chip.mode, 'chip');
  assert.equal(chip.reason, 'reserved_space');
  assert.equal(chip.fits, true, 'playback continues; only the compact player is withheld');
  assert.ok(chip.position, 'the least-overlap corner is reported for a manual make-room action');
});

test('helpers: clamp, corner geometry and overlap area are exact', () => {
  const avail = { x: 12, y: 12, width: 400, height: 300 };
  const size = { width: 100, height: 50 };
  assert.deepEqual(clampPosition({ x: 0, y: 0 }, size, avail), { x: 12, y: 12 });
  assert.deepEqual(clampPosition({ x: 500, y: 500 }, size, avail), { x: 312, y: 262 });
  assert.deepEqual(cornerRect('top-left', avail, size), { width: 100, height: 50, x: 12, y: 12 });
  assert.deepEqual(cornerRect('bottom-right', avail, size), { width: 100, height: 50, x: 312, y: 262 });
  assert.equal(overlapArea({ x: 0, y: 0, width: 10, height: 10 }, { x: 5, y: 5, width: 10, height: 10 }), 25);
  assert.equal(overlapArea({ x: 0, y: 0, width: 10, height: 10 }, { x: 20, y: 20, width: 10, height: 10 }), 0);
});

test('missing or zero viewport degrades to the chip instead of throwing', () => {
  for (const vp of [null, {}, { width: 0, height: 0 }]) {
    const result = resolveFloatingLayout({ viewport: vp });
    assert.equal(result.mode, 'chip');
    assert.equal(result.fits, false);
  }
});
