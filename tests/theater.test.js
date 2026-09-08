import test from 'node:test';
import assert from 'node:assert/strict';
import { Storage } from '../server/storage.js';
import { TheaterManager } from '../server/theater.js';
import {
  applyTheaterAction,
  classifySource,
  createTheaterState,
  effectivePositionSec,
  normalizeTheaterState,
  parseM3U,
  THEATER_LIMITS,
} from '../shared/theaterModel.js';

function tempPath(label) {
  return `/tmp/test-theater-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`;
}

const T0 = 1_700_000_000_000;
const MP4 = 'https://example.com/movie.mp4';

function addUrl(state, url, extra = {}, nowMs = T0) {
  return applyTheaterAction(state, { op: 'add', url, ...extra }, 'Tester', nowMs);
}

// --- URL classification ---

test('classifySource accepts youtube, vimeo, direct files, and HLS', () => {
  const watch = classifySource('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  assert.equal(watch.kind, 'youtube');
  assert.equal(watch.videoId, 'dQw4w9WgXcQ');

  assert.equal(classifySource('https://youtu.be/dQw4w9WgXcQ').kind, 'youtube');
  assert.equal(classifySource('https://www.youtube.com/shorts/dQw4w9WgXcQ').kind, 'youtube');
  assert.equal(classifySource('https://vimeo.com/1234567').kind, 'vimeo');
  assert.equal(classifySource('https://player.vimeo.com/video/1234567').kind, 'vimeo');
  assert.equal(classifySource('https://example.com/movie.mp4').kind, 'file');
  assert.equal(classifySource('https://example.com/clip.webm').kind, 'file');
  assert.equal(classifySource('https://example.com/live/stream.m3u8').kind, 'hls');
});

test('classifySource accepts mkv as a file needing preparation', () => {
  const mkv = classifySource('https://example.com/movie.mkv');
  assert.equal(mkv.kind, 'file');
  assert.equal(mkv.needsPrepare, true);
});

test('classifySource rejects non-playable inputs', () => {
  assert.equal(classifySource('javascript:alert(1)'), null);
  assert.equal(classifySource('ftp://example.com/movie.mp4'), null);
  assert.equal(classifySource(''), null);
  assert.equal(classifySource('   '), null);
  assert.equal(classifySource(null), null);
  assert.equal(classifySource(42), null);
  assert.equal(classifySource('https://www.youtube.com/channel/UCr9w8Z-pZ8z'), null); // no video id
  assert.equal(classifySource('https://example.com/just-a-page'), null); // arbitrary site
  assert.equal(
    classifySource(`https://example.com/${'a'.repeat(THEATER_LIMITS.URL_MAX)}`),
    null,
    'URLs beyond the cap are refused',
  );
});

test('classifySource accepts magnet links as torrent sources', () => {
  const magnet = 'magnet:?xt=urn:btih:08ada5a7a6183aae1e09d831df6748d566095a10&dn=Sintel';
  const c = classifySource(magnet);
  assert.equal(c.kind, 'torrent');
  assert.equal(c.infohash, '08ada5a7a6183aae1e09d831df6748d566095a10');
  assert.equal(c.url, magnet);

  // Base32 v1 infohashes normalize to hex; hashless or v2-only magnets are refused.
  assert.match(classifySource('magnet:?xt=urn:btih:ORQI5RVWXJTPQHDKSJUHJCCQVXNZ6XKI').infohash, /^[0-9a-f]{40}$/);
  assert.equal(classifySource('magnet:?dn=no-infohash'), null);
  assert.equal(classifySource('magnet:?xt=urn:btmh:1220abcdef'), null);
});

// --- Reducer: queue management ---

test('add to an idle screen starts playing immediately with an empty queue', () => {
  const res = addUrl(createTheaterState(), MP4, { title: 'Movie Night' });
  assert.equal(res.error, null);
  assert.ok(res.state.now);
  assert.equal(res.state.now.kind, 'file');
  assert.equal(res.state.now.playing, true);
  assert.equal(res.state.now.positionSec, 0);
  assert.equal(res.state.now.updatedAt, T0);
  assert.equal(res.state.now.title, 'Movie Night');
  assert.equal(res.state.now.by, 'Tester');
  assert.deepEqual(res.state.queue, []);
});

test('add while something plays joins the queue', () => {
  const first = addUrl(createTheaterState(), MP4).state;
  const res = addUrl(first, 'https://example.com/b.mp4', {}, T0 + 1);
  assert.equal(res.error, null);
  assert.equal(res.state.now.url, MP4);
  assert.equal(res.state.queue.length, 1);
  assert.equal(res.state.queue[0].url, 'https://example.com/b.mp4');
});

test('the queue refuses entries beyond QUEUE_MAX', () => {
  let state = addUrl(createTheaterState(), MP4).state; // screen busy
  for (let i = 0; i < THEATER_LIMITS.QUEUE_MAX; i++) {
    const res = addUrl(state, `https://example.com/v${i}.mp4`, {}, T0 + i + 1);
    assert.equal(res.error, null);
    state = res.state;
  }
  assert.equal(state.queue.length, THEATER_LIMITS.QUEUE_MAX);

  const over = addUrl(state, 'https://example.com/over.mp4', {}, T0 + 999);
  assert.equal(over.error, 'queue_full');
  assert.equal(over.state, null); // rejected actions change nothing
});

test('invalid urls are rejected as invalid_url', () => {
  const res = addUrl(createTheaterState(), 'javascript:alert(1)');
  assert.equal(res.error, 'invalid_url');
  assert.equal(res.state, null);
});

test('remove takes a queued item out without touching the live one', () => {
  let state = addUrl(createTheaterState(), MP4).state;
  state = addUrl(state, 'https://example.com/b.mp4', {}, T0 + 1).state;
  state = addUrl(state, 'https://example.com/c.mp4', {}, T0 + 2).state;
  const target = state.queue[0];

  const res = applyTheaterAction(state, { op: 'remove', itemId: target.id }, 'Tester', T0 + 3);
  assert.equal(res.error, null);
  assert.equal(res.state.now.url, MP4);
  assert.equal(res.state.queue.length, 1);
  assert.equal(res.state.queue[0].url, 'https://example.com/c.mp4');
});

test('removing the live item advances the queue', () => {
  let state = addUrl(createTheaterState(), MP4).state;
  state = addUrl(state, 'https://example.com/next.mp4', {}, T0 + 1).state;

  const res = applyTheaterAction(state, { op: 'remove', itemId: state.now.id }, 'Tester', T0 + 2);
  assert.equal(res.error, null);
  assert.equal(res.state.now.url, 'https://example.com/next.mp4');
  assert.equal(res.state.now.playing, true);
  assert.deepEqual(res.state.queue, []);
});

test('playNow promotes a queued item and backs the live one up at the front', () => {
  let state = addUrl(createTheaterState(), MP4).state;
  state = addUrl(state, 'https://example.com/b.mp4', {}, T0 + 1).state;
  state = addUrl(state, 'https://example.com/c.mp4', {}, T0 + 2).state;
  const queuedB = state.queue[0];

  const res = applyTheaterAction(state, { op: 'playNow', itemId: queuedB.id }, 'Tester', T0 + 3);
  assert.equal(res.error, null);
  assert.equal(res.state.now.id, queuedB.id);
  assert.equal(res.state.now.playing, true);
  assert.equal(res.state.queue.length, 2);
  assert.equal(res.state.queue[0].url, MP4, 'displaced live item returns to the front');
  assert.equal(res.state.queue[1].url, 'https://example.com/c.mp4');
});

test('skip advances and clear resets the room to idle', () => {
  let state = addUrl(createTheaterState(), MP4).state;
  state = addUrl(state, 'https://example.com/two.mp4', {}, T0 + 1).state;

  const skip = applyTheaterAction(state, { op: 'skip' }, 'Tester', T0 + 2);
  assert.equal(skip.error, null);
  assert.equal(skip.state.now.url, 'https://example.com/two.mp4');
  assert.deepEqual(skip.state.queue, []);

  // Skipping the last item idles the room.
  const skipIdle = applyTheaterAction(skip.state, { op: 'skip' }, 'Tester', T0 + 3);
  assert.deepEqual(skipIdle.state, { now: null, queue: [] });
  assert.equal(applyTheaterAction(skipIdle.state, { op: 'skip' }, 'Tester', T0 + 4).error, 'nothing_playing');

  const cleared = applyTheaterAction(
    addUrl(createTheaterState(), MP4).state,
    { op: 'clear' }, 'Tester', T0 + 5,
  );
  assert.equal(cleared.error, null);
  assert.deepEqual(cleared.state, { now: null, queue: [] });
});

// --- Reducer: playback controls ---

test('pause freezes the shared clock and resume continues from it', () => {
  const state = addUrl(createTheaterState(), MP4).state;

  const pause = applyTheaterAction(state, { op: 'pause' }, 'Tester', T0 + 10_000);
  assert.equal(pause.error, null);
  const pausedNow = pause.state.now;
  assert.equal(pausedNow.playing, false);
  assert.equal(pausedNow.positionSec, 10, 'position captured at the pause instant');
  assert.equal(effectivePositionSec(pausedNow, T0 + 60_000), 10, 'frozen: no longer advances');

  const resume = applyTheaterAction(pause.state, { op: 'resume' }, 'Tester', T0 + 60_000);
  assert.equal(resume.error, null);
  assert.equal(resume.state.now.playing, true);
  assert.equal(resume.state.now.positionSec, 10, 'resumes from the frozen position');
  assert.equal(resume.state.now.updatedAt, T0 + 60_000);
  assert.equal(effectivePositionSec(resume.state.now, T0 + 65_000), 15, 'clock runs again');
});

test('seek clamps negatives to zero, rejects NaN, and refuses live channels', () => {
  const state = addUrl(createTheaterState(), MP4).state;

  const negative = applyTheaterAction(state, { op: 'seek', positionSec: -30 }, 'Tester', T0 + 1000);
  assert.equal(negative.error, null);
  assert.equal(negative.state.now.positionSec, 0);

  const nan = applyTheaterAction(negative.state, { op: 'seek', positionSec: Number.NaN }, 'Tester', T0 + 1001);
  assert.equal(nan.error, 'invalid_position');
  assert.equal(nan.state, null);

  const text = applyTheaterAction(negative.state, { op: 'seek', positionSec: 'soon' }, 'Tester', T0 + 1002);
  assert.equal(text.error, 'invalid_position');

  const live = applyTheaterAction(
    createTheaterState(),
    { op: 'channel', url: 'https://example.com/live.m3u8' }, 'Tester', T0,
  ).state;
  assert.equal(
    applyTheaterAction(live, { op: 'seek', positionSec: 5 }, 'Tester', T0 + 1).error,
    'seek_unsupported',
  );
});

test('ended and failed reports are guarded by the current item id', () => {
  let state = addUrl(createTheaterState(), MP4).state;
  state = addUrl(state, 'https://example.com/b.mp4', {}, T0 + 1).state;

  const stale = applyTheaterAction(state, { op: 'ended', itemId: 'itm_stale' }, 'Tester', T0 + 2);
  assert.equal(stale.error, 'item_mismatch');
  assert.equal(stale.state, null);

  const ended = applyTheaterAction(state, { op: 'ended', itemId: state.now.id }, 'Tester', T0 + 3);
  assert.equal(ended.error, null);
  assert.equal(ended.state.now.url, 'https://example.com/b.mp4', 'matching report advances the queue');

  const failed = applyTheaterAction(ended.state, { op: 'failed', itemId: ended.state.now.id }, 'Tester', T0 + 4);
  assert.equal(failed.error, null);
  assert.equal(failed.state.now, null, 'failed behaves like ended');

  // Both reject reports when nothing is playing.
  assert.equal(
    applyTheaterAction(failed.state, { op: 'ended', itemId: 'itm_whatever' }, 'Tester', T0 + 5).error,
    'nothing_playing',
  );
});

test('channel flips the screen keeping the queue intact', () => {
  let state = addUrl(createTheaterState(), MP4).state;
  state = addUrl(state, 'https://example.com/b.mp4', {}, T0 + 1).state;

  const res = applyTheaterAction(
    state,
    { op: 'channel', url: 'https://example.com/news.m3u8', title: 'Evening News' },
    'Tester', T0 + 2,
  );
  assert.equal(res.error, null);
  assert.equal(res.state.now.kind, 'hls');
  assert.equal(res.state.now.url, 'https://example.com/news.m3u8');
  assert.equal(res.state.now.title, 'Evening News');
  assert.equal(res.state.queue.length, 1, 'queue survives the flip');
  assert.equal(res.state.queue[0].url, 'https://example.com/b.mp4');

  assert.equal(
    applyTheaterAction(state, { op: 'channel', url: 'nope' }, 'Tester', T0 + 3).error,
    'invalid_url',
  );
});

test('applying an action never mutates the input state', () => {
  const before = addUrl(createTheaterState(), MP4).state;
  const frozen = JSON.parse(JSON.stringify(before));

  const after = applyTheaterAction(before, { op: 'add', url: 'https://example.com/b.mp4' }, 'Tester', T0 + 1).state;
  assert.deepEqual(JSON.parse(JSON.stringify(before)), frozen);
  assert.notEqual(before, after);
  assert.notEqual(before.now, after.now);
  assert.notEqual(before.queue, after.queue);
});

test('titles are truncated to TITLE_MAX and defaulted when blank', () => {
  const long = addUrl(createTheaterState(), MP4, { title: 'x'.repeat(500) });
  assert.equal(long.state.now.title.length, THEATER_LIMITS.TITLE_MAX);

  const blank = addUrl(createTheaterState(), MP4, { title: '   ' });
  assert.equal(blank.state.now.title, 'A video link');

  const untitled = addUrl(
    createTheaterState(),
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    {}, T0,
  );
  assert.equal(untitled.state.now.title, 'A YouTube video');
});

// --- Shared clock math ---

test('effectivePositionSec advances while playing, freezes when paused, 0 when idle', () => {
  assert.equal(effectivePositionSec(null, T0), 0);

  const playing = { playing: true, positionSec: 30, updatedAt: T0 };
  assert.equal(effectivePositionSec(playing, T0 + 5000), 35);
  assert.equal(effectivePositionSec(playing, T0 - 1000), 30, 'elapsed never goes negative');

  const paused = { playing: false, positionSec: 42, updatedAt: T0 };
  assert.equal(effectivePositionSec(paused, T0 + 5000), 42);
});

// --- M3U parsing ---

test('parseM3U reads a classic playlist with attributes and display names', () => {
  const text = [
    '#EXTM3U',
    '#EXTINF:-1 tvg-id="CanalUno.nl" tvg-name="Canal Uno" group-title="News" tvg-logo="https://example.com/uno.png",Canal Uno HD',
    'https://example.com/uno.m3u8',
    '#EXTINF:-1 tvg-name="Kino" group-title="Movies",Kino',
    'https://example.com/kino.mp4',
  ].join('\n');

  const { entries, skipped, recognized } = parseM3U(text);
  assert.equal(recognized, true);
  assert.equal(skipped, 0);
  assert.equal(entries.length, 2);
  assert.equal(entries[0].url, 'https://example.com/uno.m3u8');
  assert.equal(entries[0].name, 'Canal Uno HD');
  assert.equal(entries[0].group, 'News');
  assert.equal(entries[0].logo, 'https://example.com/uno.png');
  assert.equal(entries[0].tvgId, 'CanalUno.nl');
  assert.equal(entries[1].name, 'Kino');
  assert.equal(entries[1].group, 'Movies');
  assert.equal(entries[1].tvgId, null, 'tvg-id is optional and defaults to null');
});

test('parseM3U names bare URL lines Channel N', () => {
  const { entries, skipped, recognized } = parseM3U(
    'https://example.com/a.m3u8\nhttps://example.com/b.m3u8',
  );
  assert.equal(recognized, true);
  assert.equal(skipped, 0);
  assert.deepEqual(entries.map(e => e.name), ['Channel 1', 'Channel 2']);
  assert.deepEqual(entries.map(e => e.url),
    ['https://example.com/a.m3u8', 'https://example.com/b.m3u8']);
});

test('parseM3U survives malformed EXTINF lines without aborting', () => {
  const text = [
    '#EXTM3U',
    '#EXTINF:broken-no-quotes',
    'https://example.com/after-broken.m3u8',
    '#EXTINF:-1 tvg-name="Unterminated group-title="News",Still Fine',
    'https://example.com/still.m3u8',
  ].join('\n');

  const { entries, recognized } = parseM3U(text);
  assert.equal(recognized, true);
  assert.equal(entries.length, 2);
  assert.equal(entries[0].name, 'Channel 1', 'unusable attributes fall back to Channel N');
  assert.equal(entries[1].name, 'Still Fine');
});

test('parseM3U counts non-http lines as skipped', () => {
  const text = [
    '#EXTM3U',
    'https://example.com/ok.m3u8',
    'rtsp://example.com/nope',
    'just some text',
    '',
    '#EXTVLCOPT:network-caching=1000',
  ].join('\n');

  const { entries, skipped, recognized } = parseM3U(text);
  assert.equal(recognized, true);
  assert.equal(entries.length, 1);
  assert.equal(skipped, 2);
});

test('parseM3U reports garbage text as unrecognized', () => {
  assert.deepEqual(parseM3U('this is not a playlist at all'), { entries: [], skipped: 1, recognized: false });
  assert.equal(parseM3U('').recognized, false);
  assert.equal(parseM3U(null).recognized, false);
  assert.equal(parseM3U(undefined).recognized, false);
});

test('parseM3U tolerates uppercase headers and CRLF line endings', () => {
  const lower = parseM3U('#extm3u\n#extinf:-1,Lower FM\nhttps://example.com/fm.m3u8');
  assert.equal(lower.recognized, true);
  assert.equal(lower.entries[0].name, 'Lower FM');

  const crlf = parseM3U('#EXTM3U\r\n#EXTINF:-1,CRLF FM\r\nhttps://example.com/fm.m3u8\r\n');
  assert.equal(crlf.recognized, true);
  assert.equal(crlf.entries.length, 1);
  assert.equal(crlf.entries[0].name, 'CRLF FM');
});

// --- Normalization of untrusted state ---

test('normalizeTheaterState repairs corrupt persisted data', () => {
  const raw = {
    now: { id: 'keep-me', url: 'javascript:alert(1)', title: 'Bad', playing: 'yes', positionSec: 'nan' },
    queue: [
      null,
      { url: 'https://example.com/good.mp4', title: 123, positionSec: -5 },
      { url: 'ftp://example.com/no.mp4' },
      { url: 'https://example.com/fine.m3u8', queuedBy: '' },
    ],
  };
  for (let i = 0; i < 60; i++) raw.queue.push({ url: `https://example.com/filler${i}.mp4` });

  const state = normalizeTheaterState(raw, T0);
  assert.equal(state.now, null, 'a non-playable now is dropped');
  assert.equal(state.queue.length, THEATER_LIMITS.QUEUE_MAX, 'queue is capped');

  const good = state.queue[0];
  assert.equal(good.url, 'https://example.com/good.mp4');
  assert.equal(good.title, 'A video link', 'non-string titles fall back to the default');
  assert.equal(typeof good.id, 'string');
  assert.equal(state.queue[1].url, 'https://example.com/fine.m3u8');
  assert.equal(state.queue[1].queuedBy, 'Someone');
});

test('normalizeTheaterState coerces bad numbers on a playable now', () => {
  const state = normalizeTheaterState({
    now: { url: 'https://example.com/w.mp4', playing: false, positionSec: 'bogus', updatedAt: 'nope', by: null },
  }, T0);
  assert.equal(state.now.positionSec, 0);
  assert.equal(state.now.updatedAt, T0);
  assert.equal(state.now.playing, false);
  assert.equal(state.now.by, 'Someone');
  assert.equal(state.now.queuedBy, 'Someone');
});

test('normalizeTheaterState keeps magnet torrents (with picks) playable and shaped', () => {
  const magnet = 'magnet:?xt=urn:btih:08ada5a7a6183aae1e09d831df6748d566095a10&dn=Sintel';
  const state = normalizeTheaterState({
    now: {
      kind: 'torrent', url: magnet, title: 'Sintel', fileIndex: 0,
      filePath: 'Sintel.mp4', fileBytes: 129, playing: true, positionSec: 8, updatedAt: 42,
    },
  }, T0);
  assert.equal(state.now.kind, 'torrent');
  assert.equal(state.now.infohash, '08ada5a7a6183aae1e09d831df6748d566095a10');
  assert.equal(state.now.positionSec, 8);
  assert.equal(state.now.playing, true);
  // A torrent whose pick was lost can never play, so it is dropped.
  const dropped = normalizeTheaterState({ now: { url: magnet, title: 'S' } }, T0);
  assert.equal(dropped.now, null);
});

test('normalizeTheaterState passes a valid state through unchanged', () => {
  const valid = {
    now: {
      id: 'itm_a', kind: 'file', url: 'https://example.com/a.mp4', videoId: null,
      title: 'A', playing: true, positionSec: 12.5, updatedAt: 1234, by: 'Ana', queuedBy: 'Ben',
    },
    queue: [{
      id: 'itm_b', kind: 'youtube', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      videoId: 'dQw4w9WgXcQ', title: 'B', queuedBy: 'Ben',
    }],
  };
  const out = normalizeTheaterState(valid, T0);
  assert.deepEqual(out.now, valid.now);
  assert.deepEqual(out.queue, valid.queue);
});

// --- Manager + persistence ---

test('TheaterManager delegates to the reducer and only persists accepted actions', () => {
  const storage = new Storage(tempPath('manager'));
  const theater = new TheaterManager(storage);
  assert.deepEqual(theater.snapshot(), { now: null, queue: [] }, 'fresh file starts idle');

  const rejected = theater.applyAction('Ana', { op: 'add', url: 'javascript:alert(1)' });
  assert.equal(rejected.success, false);
  assert.equal(rejected.reason, 'invalid_url');
  assert.deepEqual(theater.snapshot(), { now: null, queue: [] });

  assert.equal(theater.applyAction('Ana', { op: 'add', url: MP4, title: 'Feature' }).success, true);
  assert.equal(theater.snapshot().now.url, MP4);
});

test('theater state persists across a restart via Storage', () => {
  const path = tempPath('persist');
  const first = new TheaterManager(new Storage(path));
  assert.equal(first.applyAction('Ana', { op: 'add', url: MP4, title: 'Feature' }).success, true);
  assert.equal(first.applyAction('Ben', { op: 'add', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }).success, true);
  assert.equal(first.applyAction('Ana', { op: 'pause', itemId: first.state.now.id }).success, true);
  const before = first.snapshot();

  // Simulate a full restart by re-reading the same state file.
  const second = new TheaterManager(new Storage(path));
  assert.equal(second.snapshot().now.url, MP4);
  assert.equal(second.snapshot().now.playing, false);
  assert.equal(second.snapshot().now.title, 'Feature');
  assert.deepEqual(second.snapshot().queue, before.queue);
  assert.deepEqual(second.snapshot().now, before.now);
});
