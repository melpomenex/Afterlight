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

// --- effective volume seam (add-atmosphere-weather-system task 4.1, D7) ---
// The mix seam keeps the user's local volume separate: effective = user x
// mix, applied on every engine start/slider/mix path without touching the
// slider preference or the shared queue.

async function createSeamUi() {
  const stubNet = { on() {}, send() {} };
  const ui = new mod.TheaterScreenUI(stubNet);
  ui.setMasterSound(true); // mix-seam tests run under sound-on; the off default is covered below
  return ui;
}

test('setMixGain: effective volume multiplies user volume by mix gain without overwriting it', async () => {
  const ui = await createSeamUi();
  ui.volume = 0.8;
  assert.equal(ui.effectiveVolume(), 0.8, 'neutral mix keeps user volume');
  ui.setMixGain(0.5);
  assert.equal(ui.effectiveVolume(), 0.4);
  assert.equal(ui.volume, 0.8, 'the user slider preference survives ducking');

  ui.setMixGain(42); // clamped, never amplified past the user's choice
  assert.equal(ui.effectiveVolume(), 0.8);
  ui.setMixGain(-1);
  assert.equal(ui.effectiveVolume(), 0);
  ui.setMixGain('nonsense');
  assert.equal(ui.mixGain, 1, 'garbage input restores the neutral mix');
});

test('setMixGain: mix changes reach the current engine, including after engine replacement', async () => {
  const ui = await createSeamUi();
  ui.volume = 0.5;

  const engine = { volumes: [], setVolume(v) { this.volumes.push(v); } };
  ui.engine = engine;
  ui.setMixGain(0.6);
  assert.deepEqual(engine.volumes, [0.3], 'setMixGain applies to the live engine');

  // New engine initialization (new media item): the fresh engine receives
  // the effective volume, mirroring the video/YouTube/Vimeo start paths.
  const nextEngine = { volumes: [], setVolume(v) { this.volumes.push(v); } };
  ui.engine = nextEngine;
  assert.equal(ui.applyEffectiveVolume(), true);
  assert.deepEqual(nextEngine.volumes, [0.3], 'engine start path carries user x mix');
  assert.ok(ui.setMixGain(1));
  assert.deepEqual(nextEngine.volumes, [0.3, 0.5], 'unduck restores the full user volume');
});

test('setMixGain: a provider without volume control reports ducking as unavailable', async () => {
  const ui = await createSeamUi();
  ui.volume = 0.9;
  ui.engine = { degraded: true }; // e.g. Vimeo without its SDK: no volume API
  assert.equal(ui.setMixGain(0.5), false, 'ducking reported unavailable, never simulated');
  assert.equal(ui.mixGain, 0.5, 'the factor is still recorded for engines that CAN take it');
  ui.engine = null;
  assert.equal(ui.applyEffectiveVolume(), false, 'no engine: nothing to apply');
});

// --- master sound gate (the game defaults to sound off; media must be silent) ---

test('setMasterSound: media is silent until the Sound gesture, then the user volume applies live', async () => {
  const stubNet = { on() {}, send() {} };
  const ui = new mod.TheaterScreenUI(stubNet); // raw construction: the real default
  ui.volume = 0.8;
  assert.equal(ui.masterSound, false, 'sound starts off');
  assert.equal(ui.effectiveVolume(), 0, 'no audio before the master gesture, whatever the slider says');

  const engine = { volumes: [], setVolume(v) { this.volumes.push(v); } };
  ui.engine = engine;
  assert.equal(ui.applyEffectiveVolume(), true);
  assert.deepEqual(engine.volumes, [0], 'fresh engines (new media items) start silent');

  assert.equal(ui.setMasterSound(true), true);
  assert.deepEqual(engine.volumes, [0, 0.8], 'turning sound on restores the user volume on the live engine');
  assert.equal(ui.effectiveVolume(), 0.8);

  assert.equal(ui.setMasterSound(false), true);
  assert.deepEqual(engine.volumes, [0, 0.8, 0], 'muting silences the live engine again');
  assert.equal(ui.effectiveVolume(), 0);

  ui.setMasterSound('nonsense'); // only an explicit true enables audio
  assert.equal(ui.masterSound, false, 'garbage input keeps the gate closed');
  assert.equal(ui.setMasterSound(true), true, '...and a later real toggle still works');
});

test('setMasterSound: the gate multiplies with mix gain, it does not overwrite it', async () => {
  const ui = await createSeamUi(); // sound on, neutral mix
  ui.volume = 0.5;
  ui.setMixGain(0.4); // e.g. a call is ducking the mix
  assert.equal(ui.effectiveVolume(), 0.2);
  ui.setMasterSound(false);
  assert.equal(ui.effectiveVolume(), 0, 'sound off wins over any mix state');
  ui.setMasterSound(true);
  assert.equal(ui.effectiveVolume(), 0.2, 'sound on restores user x mix');
  assert.equal(ui.mixGain, 0.4, 'the duck factor was never touched by the gate');
});

test('fitOverlaySize: tiny far quad floors at the 100px base', async () => {
  const mod2 = await import('../src/ui/theaterScreen.js');
  const quad = [{ x: 0, y: 0 }, { x: 30, y: 0 }, { x: 30, y: 9 }, { x: 0, y: 9 }];
  assert.deepEqual(mod2.fitOverlaySize(quad, 3.25), { w: 100, h: 31 });
});

test('fitOverlaySize: close-up quad larger than the old 2400px cap stays 1:1', async () => {
  // Regression: the old side cap shrank the element below the on-screen quad,
  // so the homography magnified the raster (~3x up close) and text went soft
  // and jagged. The fit must track the projected quad instead.
  const mod2 = await import('../src/ui/theaterScreen.js');
  const quad = [{ x: 0, y: 500 }, { x: 3600, y: 500 }, { x: 3600, y: 0 }, { x: 0, y: 0 }];
  const { w, h } = mod2.fitOverlaySize(quad, 3.25);
  assert.equal(w, 3600, 'width follows the projected quad edge, uncapped');
  assert.equal(h, Math.round(3600 / 3.25), 'height keeps the in-world screen aspect');
  assert.ok(Math.abs(w / 3600 - 1) < 0.01, 'mapped horizontal scale stays ~1');
});

test('fitOverlaySize: absurd quad degrades through the area budget, never explodes', async () => {
  const mod2 = await import('../src/ui/theaterScreen.js');
  const quad = [{ x: 0, y: 0 }, { x: 40000, y: 0 }, { x: 40000, y: 12000 }, { x: 0, y: 12000 }];
  const { w, h } = mod2.fitOverlaySize(quad, 3.25);
  assert.ok(w * h <= 8_400_000, `area budget respected, got ${w * h}`);
  assert.ok(w >= 100 && h >= 1, 'still a usable rect');
});

test('fitOverlaySize: degenerate input falls back to the base square sizing', async () => {
  const mod2 = await import('../src/ui/theaterScreen.js');
  assert.deepEqual(mod2.fitOverlaySize(null, 3.25), { w: 100, h: 31 });
  assert.deepEqual(mod2.fitOverlaySize([{ x: 5, y: 5 }, { x: 5, y: 5 }, { x: 5, y: 5 }, { x: 5, y: 5 }], 3.25), { w: 100, h: 31 });
  assert.deepEqual(mod2.fitOverlaySize([{ x: NaN, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }], 3.25), { w: 100, h: 31 });
  assert.deepEqual(mod2.fitOverlaySize(undefined, NaN), { w: 100, h: 100 }, 'bad aspect falls back to 1');
});

test('fitOverlaySize: horizontally-foreshortened perspective quad sizes to satisfy vertical height', async () => {
  // When looking at the screen at an angle in first person, width is foreshortened
  // (e.g., span = 350px) while the nearest vertical edge is tall (e.g. 400px).
  // The overlay must scale width up so the raster height matches the near edge (400px).
  const mod2 = await import('../src/ui/theaterScreen.js');
  // bl, br, tr, tl
  const quad = [
    { x: 100, y: 450 }, // bl (near)
    { x: 450, y: 300 }, // br (far)
    { x: 450, y: 150 }, // tr (far, h = 150)
    { x: 100, y: 50 },  // tl (near, h = 400)
  ];
  const { w, h } = mod2.fitOverlaySize(quad, 3.25);
  assert.equal(h, 400, 'height matches the tall near vertical edge');
  assert.equal(w, Math.round(400 * 3.25), 'width is scaled proportionally to maintain world aspect');
});

test('fitOverlaySize: vertically-foreshortened quad sizes to satisfy horizontal span', async () => {
  const mod2 = await import('../src/ui/theaterScreen.js');
  const quad = [
    { x: 0, y: 200 },
    { x: 1300, y: 200 },
    { x: 1200, y: 120 },
    { x: 100, y: 120 },
  ];
  const { w, h } = mod2.fitOverlaySize(quad, 3.25);
  assert.equal(w, 1300, 'width matches the long horizontal edge');
  assert.equal(h, Math.round(1300 / 3.25), 'height matches aspect ratio');
});


// --- YouTube display titles: cache, display rule, oEmbed lookup ---

test('sanitizeYouTubeTitles: keeps clean pairs, drops junk, caps and dedupes', async () => {
  const mod2 = await import('../src/ui/theaterScreen.js');
  const map = mod2.sanitizeYouTubeTitles([
    ['dQw4w9WgXcQ', 'Never Gonna Give You Up'],
    ['bad id!', 'nope'], // invalid id shape
    ['abcdefgh123', '   '], // empty title
    ['short1', 42], // non-string title
    ['abcdefgh123', 'Renamed'], // last wins
    ['x'.repeat(6), 't'.repeat(500)], // oversized title clamps to TITLE_MAX
  ]);
  assert.equal(map.size, 3);
  assert.equal(map.get('dQw4w9WgXcQ'), 'Never Gonna Give You Up');
  assert.equal(map.get('abcdefgh123'), 'Renamed');
  assert.equal(map.get('xxxxxx').length, 120);
  assert.equal(mod2.sanitizeYouTubeTitles('nonsense').size, 0);
  assert.equal(mod2.sanitizeYouTubeTitles([['okidok1', 'ok']], 1).size, 1);
  assert.equal(
    mod2.sanitizeYouTubeTitles([['okidok1', 'a'], ['second2', 'b']], 1).size,
    1,
    'entry cap is respected',
  );
});

test('displayTitleFor: cache fills the generic placeholder, never a real title', async () => {
  const mod2 = await import('../src/ui/theaterScreen.js');
  const titles = new Map([['dQw4w9WgXcQ', 'Never Gonna Give You Up']]);
  // Generic placeholder is replaced by the cached real name
  assert.equal(
    mod2.displayTitleFor({ kind: 'youtube', videoId: 'dQw4w9WgXcQ', title: 'A YouTube video' }, titles),
    'Never Gonna Give You Up',
  );
  // A real title carried by the item always wins over the cache
  assert.equal(
    mod2.displayTitleFor({ kind: 'youtube', videoId: 'dQw4w9WgXcQ', title: 'Playlist-given name' }, titles),
    'Playlist-given name',
  );
  // Uncached item keeps its own (default) title
  assert.equal(
    mod2.displayTitleFor({ kind: 'youtube', videoId: 'zzzzzzzzzzz', title: 'A YouTube video' }, titles),
    'A YouTube video',
  );
  // Non-youtube kinds are untouched, missing/absent inputs are safe
  assert.equal(mod2.displayTitleFor({ kind: 'file', url: 'http://x/a.mp4', title: 'A video link' }, titles), 'A video link');
  assert.equal(mod2.displayTitleFor(null, titles), '');
  assert.equal(mod2.displayTitleFor({ kind: 'youtube', videoId: 'dQw4w9WgXcQ', title: 'A YouTube video' }, null), 'A YouTube video');
});

test('rememberYouTubeTitle: caches, and titles show through titleFor without localStorage', async () => {
  const mod2 = await import('../src/ui/theaterScreen.js');
  const ui2 = new mod2.TheaterScreenUI(null);
  assert.equal(ui2.rememberYouTubeTitle('bad id!', 'Nope'), false, 'junk ids are refused');
  assert.equal(ui2.rememberYouTubeTitle('dQw4w9WgXcQ', '  Never Gonna Give You Up  '), true);
  assert.equal(
    ui2.titleFor({ kind: 'youtube', videoId: 'dQw4w9WgXcQ', title: 'A YouTube video' }),
    'Never Gonna Give You Up',
  );
  assert.equal(ui2.rememberYouTubeTitle('dQw4w9WgXcQ', 'Never Gonna Give You Up'), false, 'unchanged titles are no-ops');
});

test('YouTube title lookups: snapshots fetch real names via oEmbed; failures sit out the session', async () => {
  const mod2 = await import('../src/ui/theaterScreen.js');
  const stubNet = {
    handlers: new Map(),
    on(type, fn) {
      if (!this.handlers.has(type)) this.handlers.set(type, []);
      this.handlers.get(type).push(fn);
    },
  };
  const ui2 = new mod2.TheaterScreenUI(stubNet);
  const calls = [];
  const origFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    if (String(url).includes('dQw4w9WgXcQ')) {
      return { ok: true, json: async () => ({ title: 'Never Gonna Give You Up' }) };
    }
    return { ok: false, status: 400, json: async () => ({}) }; // unavailable video
  };
  try {
    const base = { playing: true, positionSec: 0, updatedAt: Date.now(), by: 'T', queuedBy: 'T' };
    ui2.applyState({
      now: { id: 'itm_y1', kind: 'youtube', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', videoId: 'dQw4w9WgXcQ', title: 'A YouTube video', ...base },
      queue: [
        { id: 'itm_y2', kind: 'youtube', url: 'https://www.youtube.com/watch?v=brokenvid99', videoId: 'brokenvid99', title: 'A YouTube video', ...base },
        { id: 'itm_f', kind: 'file', url: 'http://example.com/a.mp4', title: 'A video link', ...base },
      ],
    }, Date.now());

    // The pump works sequentially in the background; wait for it to drain.
    for (let i = 0; i < 200 && (ui2.ytTitlePending.size || ui2.ytTitleInFlight); i++) {
      await new Promise((r) => setTimeout(r, 10));
    }
    assert.ok(!ui2.ytTitleInFlight, 'lookup queue drains');
    assert.equal(calls.length, 2, 'one oEmbed request per uncached youtube item (the file item is skipped)');
    assert.ok(calls[0].startsWith('https://www.youtube.com/oembed?'), 'requests hit the oEmbed endpoint');
    assert.equal(
      ui2.titleFor({ kind: 'youtube', videoId: 'dQw4w9WgXcQ', title: 'A YouTube video' }),
      'Never Gonna Give You Up',
      'successful lookup is cached and displayed',
    );
    assert.equal(
      ui2.titleFor({ kind: 'youtube', videoId: 'brokenvid99', title: 'A YouTube video' }),
      'A YouTube video',
      'failed lookup keeps the generic placeholder',
    );

    // A fresh snapshot must not re-request the cached or the failed id.
    ui2.applyState({
      now: { id: 'itm_y1', kind: 'youtube', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', videoId: 'dQw4w9WgXcQ', title: 'A YouTube video', ...base },
      queue: [],
    }, Date.now());
    assert.equal(calls.length, 2, 'no retry for cached or failed ids');
  } finally {
    globalThis.fetch = origFetch;
  }
});
