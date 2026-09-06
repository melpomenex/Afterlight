/**
 * Pure-function tests for the theater screen UI module
 * (src/ui/theaterScreen.js). DOM and media engines are NOT exercised here —
 * only the exported math/sanitizing helpers and Node import safety.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

let mod = null;
let stubNet = null;
let ui = null;

function applyH(h, x, y) {
  const w = h[6] * x + h[7] * y + h[8];
  return { x: (h[0] * x + h[1] * y + h[2]) / w, y: (h[3] * x + h[4] * y + h[5]) / w };
}

function mapQuad(h, quad) {
  return quad.map((p) => applyH(h, p.x, p.y));
}

function assertPointsClose(actual, expected, eps = 1e-6, label = '') {
  for (let i = 0; i < expected.length; i++) {
    assert.ok(
      Math.abs(actual[i].x - expected[i].x) <= eps && Math.abs(actual[i].y - expected[i].y) <= eps,
      `${label}: point ${i} mapped to (${actual[i].x}, ${actual[i].y}), expected (${expected[i].x}, ${expected[i].y})`,
    );
  }
}

test('theater screen module imports safely under Node with no DOM', async () => {
  mod = await import('../src/ui/theaterScreen.js');
  assert.equal(typeof mod.TheaterScreenUI, 'function');
  assert.equal(typeof mod.computeHomography, 'function');
  assert.equal(typeof mod.homographyToMatrix3d, 'function');
  assert.equal(typeof mod.sanitizeSavedLists, 'function');

  // Instantiating headlessly must also be safe: no DOM is built, but the
  // THEATER_STATE self-registration on the net client still happens and the
  // whole public interface can be exercised without throwing.
  stubNet = {
    handlers: new Map(),
    sent: [],
    on(type, fn) {
      if (!this.handlers.has(type)) this.handlers.set(type, []);
      this.handlers.get(type).push(fn);
    },
    send(type, payload) {
      this.sent.push({ type, payload });
    },
  };
  ui = new mod.TheaterScreenUI(stubNet);
  assert.equal(ui.roomActive, false);
  assert.equal(ui.overlayState, 'idle');

  ui.setRoomActive(true);
  assert.equal(ui.roomActive, true);
  ui.updateScreenQuad(null);
  ui.updateScreenQuad([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }]);
  ui.applyState({ now: null, queue: [] }, Date.now());
  ui.applyState({
    now: {
      id: 'itm_x', kind: 'file', url: 'http://example.com/a.mp4', title: 'A',
      playing: true, positionSec: 0, updatedAt: Date.now(), by: 'Someone', queuedBy: 'Someone',
    },
    queue: [],
  }, Date.now());
  ui.openControls();
  ui.openGuide();
  ui.setRoomActive(false);

  // THEATER_STATE self-registration happened on the net client
  assert.ok(stubNet.handlers.has('theater_state'));
  const [handler] = stubNet.handlers.get('theater_state');
  handler({ theater: { now: null, queue: [] }, serverNow: Date.now() }); // must not throw
});

test('computeHomography: identity quad maps corners exactly', () => {
  const UNIT = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }];
  const h = mod.computeHomography(UNIT, UNIT);
  const expected = [1, 0, 0, 0, 1, 0, 0, 0, 1];
  for (let i = 0; i < 9; i++) {
    assert.ok(Math.abs(h[i] - expected[i]) < 1e-9, `h[${i}] = ${h[i]}, expected ${expected[i]}`);
  }
  assertPointsClose(mapQuad(h, UNIT), UNIT, 1e-6, 'identity');
});

test('computeHomography: affine rect->rect (scale + offset)', () => {
  const UNIT = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }];
  const RECT = [{ x: 25, y: 40 }, { x: 425, y: 40 }, { x: 425, y: 340 }, { x: 25, y: 340 }];
  const h = mod.computeHomography(UNIT, RECT);
  // expected affine matrix: scale (400, 300), translate (25, 40)
  const expected = [400, 0, 25, 0, 300, 40, 0, 0, 1];
  for (let i = 0; i < 9; i++) {
    assert.ok(Math.abs(h[i] - expected[i]) < 1e-6, `h[${i}] = ${h[i]}, expected ${expected[i]}`);
  }
  assertPointsClose(mapQuad(h, UNIT), RECT, 1e-6, 'affine');
  // interior points map affinely too
  const mid = applyH(h, 0.5, 0.5);
  assert.ok(Math.abs(mid.x - 225) < 1e-6 && Math.abs(mid.y - 190) < 1e-6, 'affine center');
});

test('computeHomography: perspective (trapezoid) maps the 4 corners exactly', () => {
  const UNIT = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }];
  const TRAP = [{ x: 20, y: 100 }, { x: 180, y: 100 }, { x: 150, y: 20 }, { x: 50, y: 20 }];
  const h = mod.computeHomography(UNIT, TRAP);
  assertPointsClose(mapQuad(h, UNIT), TRAP, 1e-6, 'perspective');
  // genuinely projective: h31/h32 nonzero
  assert.ok(Math.abs(h[6]) > 1e-9 || Math.abs(h[7]) > 1e-9, 'expected perspective terms');
  // center point stays finite and inside the trapezoid bounding box
  const center = applyH(h, 0.5, 0.5);
  assert.ok(Number.isFinite(center.x) && Number.isFinite(center.y));
  assert.ok(center.x >= 20 && center.x <= 180 && center.y >= 20 && center.y <= 100);
});

test('computeHomography: degenerate input falls back to identity', () => {
  const IDENTITY = [1, 0, 0, 0, 1, 0, 0, 0, 1];
  assert.deepEqual(mod.computeHomography(null, null), IDENTITY);
  assert.deepEqual(mod.computeHomography([{ x: 0, y: 0 }], [{ x: 0, y: 0 }]), IDENTITY);
  // collinear destination -> singular
  const UNIT = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }];
  const LINE = [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 3 }];
  assert.deepEqual(mod.computeHomography(UNIT, LINE), IDENTITY);
});

test('homographyToMatrix3d: shape is a parseable 16-number matrix3d', () => {
  const TRAP = [{ x: 20, y: 100 }, { x: 180, y: 100 }, { x: 150, y: 20 }, { x: 50, y: 20 }];
  const UNIT = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }];
  const h = mod.computeHomography(UNIT, TRAP);
  const str = mod.homographyToMatrix3d(h);
  assert.match(str, /^matrix3d\([-\d.e,\s]+\)$/i);
  const nums = str.slice('matrix3d('.length, -1).split(',').map(Number);
  assert.equal(nums.length, 16);
  assert.ok(nums.every((n) => Number.isFinite(n)));

  // Apply in CSS matrix3d (column-major) order: x' = m0 x + m4 y + m12,
  // y' = m1 x + m5 y + m13, w = m3 x + m7 y + m15 — must agree with h.
  const applyCss = (x, y) => {
    const w = nums[3] * x + nums[7] * y + nums[15];
    return { x: (nums[0] * x + nums[4] * y + nums[12]) / w, y: (nums[1] * x + nums[5] * y + nums[13]) / w };
  };
  assertPointsClose(UNIT.map((p) => applyCss(p.x, p.y)), TRAP, 1e-9, 'matrix3d');

  // Sanity: identity homography renders as (a close cousin of) the identity
  const idStr = mod.homographyToMatrix3d([1, 0, 0, 0, 1, 0, 0, 0, 1]);
  assert.match(idStr, /^matrix3d\(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1\)$/);
});

test('sanitizeSavedLists: corrupt shapes become safe defaults', () => {
  assert.deepEqual(mod.sanitizeSavedLists(null), []);
  assert.deepEqual(mod.sanitizeSavedLists(undefined), []);
  assert.deepEqual(mod.sanitizeSavedLists('garbage'), []);
  assert.deepEqual(mod.sanitizeSavedLists(42), []);
  assert.deepEqual(mod.sanitizeSavedLists({ channels: [] }), []);

  const raw = [
    { name: 'News', channels: [
      { url: 'http://a.example/x.m3u8', name: 'A', group: 'News', logo: 'http://a.example/l.png' },
      { url: 'ftp://bad/x.m3u8', name: 'Not http' },
      { name: 'No url' },
      'junk',
      null,
    ] },
    { channels: [] }, // nothing playable -> dropped
    null,
    'junk',
    { id: 'keep', name: 'Extras', savedAt: 12345, channels: [{ url: 'https://b.example/y.m3u8' }] },
  ];
  const out = mod.sanitizeSavedLists(raw, 999);
  assert.equal(out.length, 2);
  assert.equal(out[0].name, 'News');
  assert.equal(out[0].channels.length, 1);
  assert.equal(out[0].channels[0].url, 'http://a.example/x.m3u8');
  assert.equal(out[0].channels[0].name, 'A');
  assert.equal(out[0].channels[0].group, 'News');
  assert.equal(out[0].channels[0].logo, 'http://a.example/l.png');
  assert.equal(out[1].id, 'keep');
  assert.equal(out[1].savedAt, 12345);
  // channel without a name gets a positional fallback
  assert.equal(out[1].channels[0].name, 'Channel 1');
});

test('sanitizeSavedLists: caps lists and channels, coerces bad metadata', () => {
  // 15 lists -> 12 kept
  const manyLists = Array.from({ length: 15 }, (_, i) => ({
    id: `l${i}`,
    channels: [{ url: `http://x/${i}.m3u8` }],
  }));
  assert.equal(mod.sanitizeSavedLists(manyLists).length, 12);

  // 5100 channels -> capped at 5000
  const bigList = [{
    id: 'big',
    channels: Array.from({ length: 5100 }, (_, i) => ({ url: `http://x/${i}` })),
  }];
  const [sanitized] = mod.sanitizeSavedLists(bigList);
  assert.equal(sanitized.channels.length, 5000);

  // missing id / name / savedAt fall back safely
  const [anon] = mod.sanitizeSavedLists([{ channels: [{ url: 'http://x/1' }] }], 7);
  assert.equal(typeof anon.id, 'string');
  assert.ok(anon.id.length > 0);
  assert.equal(anon.name, 'Untitled list');
  assert.equal(anon.savedAt, 7);

  // non-object channel entries and non-http(s) urls are dropped
  const mixed = [{ channels: [1, null, { url: 'javascript:alert(1)' }, { url: 'https://ok/1' }] }];
  const [only] = mod.sanitizeSavedLists(mixed);
  assert.equal(only.channels.length, 1);
  assert.equal(only.channels[0].url, 'https://ok/1');
});

test('splitChannelGroup separates country of origin from category', () => {
  assert.deepEqual(mod.splitChannelGroup('UK|News'), { country: 'UK', category: 'News' });
  assert.deepEqual(mod.splitChannelGroup(' United States | Entertainment '), { country: 'United States', category: 'Entertainment' });
  // No separator: the whole group is a country with no category.
  assert.deepEqual(mod.splitChannelGroup('Germany'), { country: 'Germany', category: null });
  // Separator with an empty category keeps the country, drops the category.
  assert.deepEqual(mod.splitChannelGroup('France|'), { country: 'France', category: null });
  // Missing/empty groups land nowhere in particular.
  assert.deepEqual(mod.splitChannelGroup(null), { country: null, category: null });
  assert.deepEqual(mod.splitChannelGroup('   '), { country: null, category: null });
});

test('guideFacets lists countries and the categories each one offers', () => {
  const channels = [
    { group: 'UK|News' },
    { group: 'UK|Sports' },
    { group: 'US|News' },
    { group: 'US|Entertainment' },
    { group: 'Germany' },
    { group: null },          // groupless -> Other bucket, no categories
    { url: 'http://x/1' },
  ];
  const facets = mod.guideFacets(channels);
  assert.deepEqual(facets.countries, ['Germany', 'Other', 'UK', 'US']);
  assert.deepEqual(facets.categoriesFor('UK'), ['News', 'Sports']);
  // 'All' unions every country's categories.
  assert.deepEqual(facets.categoriesFor('All'), ['Entertainment', 'News', 'Sports']);
  // A country with no categories offers none.
  assert.deepEqual(facets.categoriesFor('Germany'), []);
  assert.deepEqual(mod.guideFacets(undefined).countries, []);
});

test('channelMatchesGuide filters by country first, then category', () => {
  const ukNews = { group: 'UK|News' };
  const usNews = { group: 'US|News' };
  const germany = { group: 'Germany' };
  assert.equal(mod.channelMatchesGuide(ukNews, 'All', 'All'), true);
  assert.equal(mod.channelMatchesGuide(ukNews, 'UK', 'All'), true);
  assert.equal(mod.channelMatchesGuide(ukNews, 'US', 'All'), false);
  // Category applies within (or across) countries.
  assert.equal(mod.channelMatchesGuide(ukNews, 'UK', 'News'), true);
  assert.equal(mod.channelMatchesGuide(ukNews, 'UK', 'Sports'), false);
  assert.equal(mod.channelMatchesGuide(usNews, 'All', 'News'), true);
  // Channels without a category only surface under the 'All' filter.
  assert.equal(mod.channelMatchesGuide(germany, 'Germany', 'All'), true);
  assert.equal(mod.channelMatchesGuide(germany, 'Other', 'All'), false);
  // Groupless channels belong to Other.
  const anon = { url: 'http://x/1' };
  assert.equal(mod.channelMatchesGuide(anon, 'Other', 'All'), true);
  assert.equal(mod.channelMatchesGuide(anon, 'All', 'News'), false);
});

test('a fully groupless list keeps the flat fallback (no country facets)', () => {
  assert.deepEqual(mod.guideFacets([{ url: 'http://x/1' }, { url: 'http://x/2' }]).countries, []);
});
