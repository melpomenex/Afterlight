import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createServer, resolveTorrentGrantConfig } from '../server/index.js';
import { TorrentManager, parseRange } from '../server/torrents.js';
import { Storage } from '../server/storage.js';
import {
  mintTorrentGrant,
  verifyTorrentGrant,
  redactGrantQuery,
  TORRENT_GRANT_TTL_SECS,
} from '../shared/torrentGrant.js';
import {
  applyTheaterAction,
  classifySource,
  createTheaterState,
  normalizeTheaterState,
} from '../shared/theaterModel.js';
import {
  TORRENT_LIMITS,
  isVideoFile,
  normalizeTorrentStatus,
  orderFilesForPicker,
  parseMagnet,
  sanitizeTorrentPick,
  torrentErrorText,
  torrentTitle,
} from '../shared/torrentModel.js';

const T0 = 1_700_000_000_000;
const HEX = '08ada5a7a6183aae1e09d831df6748d566095a10';
const MAGNET = `magnet:?xt=urn:btih:${HEX}&dn=Sintel&tr=udp%3A%2F%2Fexplodie.org%3A6969`;
const TEST_GRANT_SECRET = 'test-torrent-grant-secret-000000000000000000';

function tempDir(label) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `afterlight-torrent-${label}-`));
}

// --- Playback grant validation ---

test('verifyTorrentGrant accepts valid grants and rejects tampered/expired/wrong-file tokens', () => {
  const nowMs = Date.now();
  const nowSec = Math.floor(nowMs / 1000);
  const { grant } = mintTorrentGrant('player_a', HEX, 0, { secret: TEST_GRANT_SECRET, nowMs });
  assert.equal(verifyTorrentGrant(grant, HEX, 0, [TEST_GRANT_SECRET], nowSec + 60).ok, true);

  const [payload] = grant.split('.');
  assert.equal(verifyTorrentGrant(`${payload}.badsig`, HEX, 0, [TEST_GRANT_SECRET], nowSec).ok, false);

  const expired = mintTorrentGrant('player_a', HEX, 0, {
    secret: TEST_GRANT_SECRET,
    nowMs: nowMs - (TORRENT_GRANT_TTL_SECS + 120) * 1000,
  });
  assert.equal(verifyTorrentGrant(expired.grant, HEX, 0, [TEST_GRANT_SECRET], nowSec).reason, 'expired');

  const wrongIndex = mintTorrentGrant('player_a', HEX, 0, { secret: TEST_GRANT_SECRET, nowMs });
  assert.equal(verifyTorrentGrant(wrongIndex.grant, HEX, 1, [TEST_GRANT_SECRET], nowSec).reason, 'wrong_file');

  const otherHash = mintTorrentGrant('player_a', 'f'.repeat(40), 0, { secret: TEST_GRANT_SECRET, nowMs });
  assert.equal(verifyTorrentGrant(otherHash.grant, HEX, 0, [TEST_GRANT_SECRET], nowSec).reason, 'wrong_file');
});

test('redactGrantQuery hides grant values for logging', () => {
  const redacted = redactGrantQuery(`/api/theater/torrent/${HEX}/0?grant=secret-token-value`);
  assert.match(redacted, /grant=\[redacted\]/);
  assert.doesNotMatch(redacted, /secret-token-value/);
});

test('resolveTorrentGrantConfig refuses production boot with grants disabled', () => {
  const prev = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  try {
    assert.throws(
      () => resolveTorrentGrantConfig({ grantsRequired: false, loopbackDev: true }),
      /cannot be disabled in production/,
    );
  } finally {
    process.env.NODE_ENV = prev;
  }
});

// --- Magnet parsing ---

test('parseMagnet accepts v1 hex and base32 infohashes and normalizes to hex', () => {
  const hex = parseMagnet(MAGNET);
  assert.deepEqual(hex, { url: MAGNET, infohash: HEX });

  const base32 = parseMagnet('magnet:?xt=urn:btih:ORQI5RVWXJTPQHDKSJUHJCCQVXNZ6XKI&dn=test');
  assert.match(base32.infohash, /^[0-9a-f]{40}$/);
  assert.equal(base32.url, 'magnet:?xt=urn:btih:ORQI5RVWXJTPQHDKSJUHJCCQVXNZ6XKI&dn=test');
});

test('parseMagnet rejects wrong scheme, missing/bad infohash, oversize, garbage', () => {
  assert.equal(parseMagnet('magnet:?dn=no-hash-here'), null);
  assert.equal(parseMagnet('magnet:?xt=urn:btmh:1220abcdef'), null, 'v2-only magnets are out of scope');
  assert.equal(parseMagnet('magnet:?xt=urn:btih:ZZZZ'), null);
  assert.equal(parseMagnet('magnet:?xt=urn:sha1:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'), null);
  assert.equal(parseMagnet('https://example.com/movie.mp4'), null);
  assert.equal(parseMagnet(`magnet:?xt=urn:btih:${'a'.repeat(39)}`), null);
  assert.equal(parseMagnet(`magnet:?xt=urn:btih:${HEX}&x=${'y'.repeat(3000)}`), null, 'URL_MAX is respected');
  assert.equal(parseMagnet('not a magnet at all'), null);
  assert.equal(parseMagnet(null), null);
  assert.equal(parseMagnet(42), null);
});

test('classifySource routes magnets to the torrent kind with an infohash', () => {
  const c = classifySource(MAGNET);
  assert.equal(c.kind, 'torrent');
  assert.equal(c.infohash, HEX);
  assert.equal(c.url, MAGNET);
  assert.equal(classifySource('magnet:?dn=nope'), null);
  assert.equal(classifySource('magnet:?xt=urn:btih:short'), null);
});

// --- File selection for the picker ---

test('isVideoFile recognizes video extensions only', () => {
  assert.equal(isVideoFile('Sintel.mp4'), true);
  assert.equal(isVideoFile('movie.mkv'), true);
  assert.equal(isVideoFile('a/b/c.AVI'), true);
  assert.equal(isVideoFile('readme.txt'), false);
  assert.equal(isVideoFile('cover.jpg'), false);
  assert.equal(isVideoFile('noextension'), false);
  assert.equal(isVideoFile(''), false);
});

test('orderFilesForPicker filters non-videos, ranks playable first then size, caps', () => {
  const files = [
    { index: 0, path: 'readme.txt', length: 10 },
    { index: 1, path: 'extras/featurette.mp4', length: 500 },
    { index: 2, path: 'film/main.mp4', length: 900 },
    { index: 3, path: 'film/backup.avi', length: 9900 },
    { index: 4, path: 'subs/en.srt', length: 1 },
    { index: 5, path: 'extras/short.webm', length: 300 },
    { index: 6, path: 'junk', length: 5 },
  ];
  const ordered = orderFilesForPicker(files, 3);
  assert.deepEqual(ordered.map((f) => f.index), [2, 1, 5], 'playable by size, capped at 3');
  assert.equal(ordered[0].playable, true);

  const all = orderFilesForPicker(files);
  assert.deepEqual(all.map((f) => f.index), [2, 1, 5, 3], 'the unplayable avi sorts after playable files');
  assert.equal(all[3].playable, false);
  assert.equal(all[0].bytes, 900);
});

test('orderFilesForPicker tolerates junk input and returns a safe list', () => {
  assert.deepEqual(orderFilesForPicker(null), []);
  assert.deepEqual(orderFilesForPicker([undefined, 42, { index: -1, path: 'a.mp4' }]), []);
});

// --- Torrent pick + status sanitation ---

test('sanitizeTorrentPick accepts only structurally valid picks', () => {
  assert.deepEqual(
    sanitizeTorrentPick({ fileIndex: 2, filePath: 'Sintel.mp4', fileBytes: 129 }),
    { fileIndex: 2, filePath: 'Sintel.mp4', fileBytes: 129 },
  );
  assert.equal(sanitizeTorrentPick({ fileIndex: -1, filePath: 'a.mp4', fileBytes: 1 }), null);
  assert.equal(sanitizeTorrentPick({ fileIndex: 1.5, filePath: 'a.mp4', fileBytes: 1 }), null);
  assert.equal(sanitizeTorrentPick({ fileIndex: 0, filePath: '', fileBytes: 1 }), null);
  assert.equal(sanitizeTorrentPick({ fileIndex: 0, filePath: 'a'.repeat(600), fileBytes: 1 }), null);
  assert.equal(sanitizeTorrentPick({ fileIndex: 0, filePath: 'a.mp4', fileBytes: 'big' }), null);
  assert.equal(sanitizeTorrentPick(null), null);
});

test('normalizeTorrentStatus keeps fresh-shaped snapshots and drops the rest', () => {
  const good = normalizeTorrentStatus({ infohash: HEX, progress: 1.5, peers: 3, downloaded: -4, ready: 'yes' });
  assert.equal(good.infohash, HEX);
  assert.equal(good.progress, 1, 'progress clamped to 0..1');
  assert.equal(good.peers, 3);
  assert.equal(good.downloaded, 0, 'negative bytes coerced');
  assert.equal(good.ready, false, 'non-boolean ready coerced');
  assert.equal(normalizeTorrentStatus({ infohash: 'nope' }), null);
  assert.equal(normalizeTorrentStatus(null), null);
});

test('torrentTitle pairs torrent and file, capped', () => {
  assert.equal(torrentTitle('Sintel', 'Sintel/Sintel.mp4'), 'Sintel — Sintel.mp4');
  assert.equal(torrentTitle('Sintel', ''), 'Sintel');
  assert.equal(torrentTitle('', 'x/a.mp4'), 'a.mp4');
  assert.equal(torrentTitle('', ''), 'A torrent stream');
  assert.equal(torrentTitle('n', 'a/'.concat('b'.repeat(300))).length <= 120, true);
});

test('every torrent error reason has a readable message', () => {
  for (const reason of ['engine_unavailable', 'invalid_magnet', 'resolve_timeout', 'resolve_failed', 'metadata_timeout', 'file_not_streamable', 'resolve_in_flight', 'unknown']) {
    assert.equal(typeof torrentErrorText(reason), 'string');
    assert.ok(torrentErrorText(reason).length > 10);
  }
});

// --- Reducer integration ---

test('a torrent cannot reach the bill without a valid picked file', () => {
  const state = createTheaterState();
  const noPick = applyTheaterAction(state, { op: 'add', url: MAGNET }, 'Ana', T0);
  assert.equal(noPick.error, 'no_file_chosen');

  const badPick = applyTheaterAction(state, {
    op: 'add', url: MAGNET, fileIndex: 0, filePath: 'readme.txt', fileBytes: 12,
  }, 'Ana', T0);
  assert.equal(badPick.error, 'no_file_chosen', 'non-video picks are refused');

  const ok = applyTheaterAction(state, {
    op: 'add', url: MAGNET, title: 'Sintel', fileIndex: 0, filePath: 'Sintel/Sintel.mp4', fileBytes: 129,
  }, 'Ana', T0);
  assert.equal(ok.error, null);
  assert.equal(ok.state.now.kind, 'torrent');
  assert.equal(ok.state.now.filePath, 'Sintel/Sintel.mp4');
  assert.equal(ok.state.now.fileIndex, 0);
});

test('queued torrent items keep their pick through playNow displacement', () => {
  let state = createTheaterState();
  state = applyTheaterAction(state, {
    op: 'add', url: 'https://example.com/a.mp4', fileIndex: undefined,
  }, 'Ana', T0).state;
  state = applyTheaterAction(state, {
    op: 'add', url: MAGNET, fileIndex: 1, filePath: 'ep2.mkv', fileBytes: 99,
  }, 'Ana', T0 + 1).state;

  const promote = applyTheaterAction(state, { op: 'playNow', itemId: state.queue[0].id }, 'Ana', T0 + 2);
  assert.equal(promote.state.now.filePath, 'ep2.mkv');
  const back = promote.state.queue[0];
  assert.equal(back.kind, 'file', 'the displaced file item comes back unchanged');

  const promoteAgain = applyTheaterAction(promote.state, { op: 'playNow', itemId: back.id }, 'Ana', T0 + 3);
  assert.equal(promoteAgain.state.queue[0].filePath, 'ep2.mkv', 'displaced torrent keeps its pick');
});

test('channel op carries a torrent play-now with pick fields', () => {
  const res = applyTheaterAction(createTheaterState(), {
    op: 'channel', url: MAGNET, torrentName: 'Sintel', fileIndex: 2, filePath: 'subs/nope.srt', fileBytes: 1,
  }, 'Ana', T0);
  assert.equal(res.error, 'no_file_chosen');

  const ok = applyTheaterAction(createTheaterState(), {
    op: 'channel', url: MAGNET, fileIndex: 2, filePath: 'Sintel.mp4', fileBytes: 129,
  }, 'Ana', T0);
  assert.equal(ok.error, null);
  assert.equal(ok.state.now.title, 'Sintel.mp4', 'title falls back to the file name');
  assert.equal(ok.state.now.fileIndex, 2);
});

test('normalizeTheaterState keeps torrent items with picks and drops them without', () => {
  const kept = normalizeTheaterState({
    now: {
      id: 'itm_t', kind: 'torrent', url: MAGNET, title: 'Sintel', fileIndex: 0,
      filePath: 'Sintel.mp4', fileBytes: 129, playing: true, positionSec: 5, updatedAt: 1,
    },
    queue: [{ url: MAGNET, fileIndex: 1, filePath: 'b.mp4', fileBytes: 2 }],
  }, T0);
  assert.equal(kept.now.infohash, HEX);
  assert.equal(kept.now.fileIndex, 0);
  assert.equal(kept.queue[0].filePath, 'b.mp4');

  const dropped = normalizeTheaterState({
    queue: [
      { url: MAGNET }, // no pick
      { url: MAGNET, fileIndex: 0, filePath: 'n.txt', fileBytes: 1 }, // non-video
      { url: 'https://example.com/ok.mp4' },
    ],
  }, T0);
  assert.deepEqual(dropped.queue.map((q) => q.kind), ['file'], 'only the healthy item survives');
});

// --- Range parsing ---

test('parseRange handles full, open-ended, suffix, and rejects malformed ranges', () => {
  assert.equal(parseRange('bytes=0-99', 1000).start, 0);
  assert.equal(parseRange('bytes=0-99', 1000).end, 99);
  assert.equal(parseRange('bytes=500-', 1000).end, 999);
  assert.equal(parseRange('bytes=-100', 1000).start, 900);
  assert.equal(parseRange('bytes=0-', 1000).end, 999);
  assert.equal(parseRange('bytes=200-100', 1000), null, 'end before start');
  assert.equal(parseRange('bytes=1000-', 1000), null, 'start at total is unsatisfiable');
  assert.equal(parseRange('bytes=--5', 1000), null);
  assert.equal(parseRange('bytes=abc-def', 1000), null);
  assert.equal(parseRange('chunks=0-1', 1000), null);
  assert.equal(parseRange(null, 1000), null);
  assert.equal(parseRange('bytes=0-10', 0), null, 'empty files have no ranges');
  assert.equal(parseRange('bytes=900-1200', 1000).end, 999, 'end clamps to total');
});

// --- TorrentManager with a stub engine ---

/** A webtorrent-shaped stub whose add() emits the torrent's ready event. */
function stubClientFactory(torrentDef) {
  return () => ({
    add(magnetUri, opts) {
      const torrent = new EventEmitter();
      Object.assign(torrent, {
        info: { name: torrentDef.name },
        name: torrentDef.name,
        numPeers: 2,
        downloadSpeed: 0,
        downloaded: 0,
        progress: 0,
        destroyed: false,
        destroyArgs: null,
        destroy(opts, done) {
          torrent.destroyed = true;
          torrent.destroyArgs = opts;
          if (done) done();
        },
        files: torrentDef.files.map((f) => ({
          path: f.path,
          length: f.length,
          selected: false,
          select() { this.selected = true; },
          createReadStream(range = {}) {
            // Read from a fixture file so Range behavior is real bytes.
            return fs.createReadStream(torrentDef.fixture, range);
          },
        })),
      });
      queueMicrotask(() => torrent.emit('ready')); // v3 API: events, not a callback
      return torrent;
    },
    on() {},
    destroy(done) {
      if (done) done();
    },
  });
}

function fakeTorrentManager(dir, fixture) {
  return new TorrentManager({
    dataDir: dir,
    clientFactory: stubClientFactory({
      name: 'Sintel',
      fixture,
      files: [
        { path: 'Sintel/Sintel.mp4', length: 12 },
        { path: 'Sintel/Subs/en.srt', length: 4 },
        { path: 'Sintel/Posters/poster.jpg', length: 3 },
      ],
    }),
  });
}

test('TorrentManager.resolve returns a picker list and rejects bad magnets', async () => {
  const dir = tempDir('resolve');
  const fixture = path.join(dir, 'fixture.bin');
  fs.writeFileSync(fixture, '0123456789abcdef');
  const torrents = fakeTorrentManager(path.join(dir, 'data'), fixture);

  await assert.rejects(torrents.resolve('not a magnet'), (err) => err?.reason === 'invalid_magnet');

  const snap = await torrents.resolve(MAGNET);
  assert.equal(snap.name, 'Sintel');
  assert.deepEqual(snap.files.map((f) => f.path), ['Sintel/Sintel.mp4'], 'only the video is offered');
  assert.equal(snap.files[0].playable, true);

  // The magnet library persists so the stream endpoint can re-add after restart.
  const library = JSON.parse(fs.readFileSync(path.join(dir, 'data', 'torrents', 'library.json'), 'utf8'));
  assert.equal(library[HEX], MAGNET);
});

test('TorrentManager.streamFile serves real ranged bytes and refuses junk', async () => {
  const dir = tempDir('stream');
  const fixture = path.join(dir, 'fixture.bin');
  fs.writeFileSync(fixture, '0123456789abcdef');
  const torrents = fakeTorrentManager(path.join(dir, 'data'), fixture);
  await torrents.resolve(MAGNET);

  // Unknown infohash / index / non-video file
  assert.equal((await torrents.streamFile('f'.repeat(40), 0, null)).statusCode, 404);
  assert.equal((await torrents.streamFile(HEX, 99, null)).statusCode, 404);
  assert.equal((await torrents.streamFile(HEX, 1, null)).statusCode, 404, 'srt is not served');
  assert.equal((await torrents.streamFile(HEX, 2, null)).statusCode, 404, 'jpg is not served');

  const full = await torrents.streamFile(HEX, 0, null);
  assert.equal(full.statusCode, 200);
  assert.equal(full.headers['Accept-Ranges'], 'bytes');
  assert.equal(full.headers['Content-Length'], 12);
  assert.equal(full.headers['Content-Type'], 'video/mp4');
  const whole = await readStream(full.stream);
  assert.equal(whole.toString(), '0123456789abcdef');

  const ranged = await torrents.streamFile(HEX, 0, 'bytes=4-9');
  assert.equal(ranged.statusCode, 206);
  assert.equal(ranged.headers['Content-Range'], 'bytes 4-9/12');
  assert.equal(ranged.headers['Content-Length'], 6);
  const slice = await readStream(ranged.stream);
  assert.equal(slice.toString(), '456789');
  assert.equal(torrents.entries.get(HEX).torrent.files[0].selected, true, 'streaming selects the file');

  assert.equal((await torrents.streamFile(HEX, 0, 'bytes=99-120')).statusCode, 416);
});

test('TorrentManager reaps idle torrents but never bill-referenced ones', async () => {
  const dir = tempDir('reap');
  const fixture = path.join(dir, 'fixture.bin');
  fs.writeFileSync(fixture, 'x');
  const torrents = fakeTorrentManager(path.join(dir, 'data'), fixture);
  await torrents.resolve(MAGNET);
  const entry = torrents.entries.get(HEX);
  assert.ok(entry.torrent);

  const soon = Date.now(); // entry just served -> not idle yet
  await torrents.tick([], soon);
  assert.ok(entry.torrent, 'fresh torrent survives the reap window');

  const afterIdle = soon + TORRENT_LIMITS.IDLE_REAP_MS + 1000;
  await torrents.tick([HEX], afterIdle);
  assert.ok(entry.torrent, 'referenced by the bill -> kept');

  await torrents.tick([], afterIdle);
  assert.equal(entry.torrent, null, 'idle + unreferenced -> torn down');
  assert.equal(entry.lastDestroyOpts?.destroyStore, false, 'reap keeps cached data (destroyStore: false)');
});

test('TorrentManager enforces the cache cap, evicting least-recently-served first', async () => {
  const dir = tempDir('cap');
  const cacheDir = path.join(dir, 'data', 'torrents');
  const mk = (infohash, bytes, lastServedMs) => {
    fs.mkdirSync(path.join(cacheDir, infohash), { recursive: true });
    fs.writeFileSync(path.join(cacheDir, infohash, 'data.bin'), Buffer.alloc(bytes, 1));
    torrents.entries.set(infohash, {
      infohash, magnet: `magnet:?xt=urn:btih:${infohash}`, torrent: null,
      name: null, lastServedMs, addedMs: 0,
    });
  };
  const a = 'a'.repeat(40);
  const b = 'b'.repeat(40);
  const c = 'c'.repeat(40);
  const torrents = new TorrentManager({
    dataDir: path.join(dir, 'data'),
    maxCacheBytes: 1000,
    clientFactory: stubClientFactory({ name: 'x', fixture: dir, files: [] }),
  });
  mk(a, 400, 100); // oldest
  mk(b, 400, 300);
  mk(c, 400, 500); // newest; total 1200 > 1000

  await torrents.enforceCacheCap([]);
  assert.ok(!fs.existsSync(path.join(cacheDir, a)), 'oldest evicted first');
  assert.ok(fs.existsSync(path.join(cacheDir, b)));
  assert.ok(fs.existsSync(path.join(cacheDir, c)));

  // A referenced infohash survives even when oldest.
  const d = 'd'.repeat(40);
  mk(d, 400, 50); // pushes total to 1200 again; d is oldest but referenced
  await torrents.enforceCacheCap([d]);
  assert.ok(fs.existsSync(path.join(cacheDir, d)), 'the playing torrent is never evicted');
});

test('setExemptInfohashes keeps bill torrents off the reap list', async () => {
  const dir = tempDir('exempt-push');
  const fixture = path.join(dir, 'fixture.bin');
  fs.writeFileSync(fixture, 'x');
  const torrents = fakeTorrentManager(path.join(dir, 'data'), fixture);
  await torrents.resolve(MAGNET);
  const entry = torrents.entries.get(HEX);
  assert.ok(entry.torrent);

  torrents.setExemptInfohashes([HEX]);
  const afterIdle = Date.now() + TORRENT_LIMITS.IDLE_REAP_MS + 1000;
  await torrents.tick([], afterIdle);
  assert.ok(entry.torrent, 'exempt infohash survives reap');

  torrents.setExemptInfohashes([]);
  await torrents.tick([], afterIdle);
  assert.equal(entry.torrent, null, 'clearing exempt list allows reap again');
});

test('setExemptInfohashes replaces the advisory exempt set', () => {
  const torrents = new TorrentManager({ dataDir: tempDir('exempt-set') });
  const a = 'a'.repeat(40);
  const b = 'b'.repeat(40);
  torrents.setExemptInfohashes([a]);
  assert.ok(torrents.exemptInfohashes.has(a));
  torrents.setExemptInfohashes([b]);
  assert.ok(!torrents.exemptInfohashes.has(a));
  assert.ok(torrents.exemptInfohashes.has(b));
});

test('TorrentManager answers engine_unavailable when webtorrent cannot load', async () => {
  const broken = new TorrentManager({
    dataDir: tempDir('broken'),
    clientFactory: () => {
      throw new Error('module blew up');
    },
  });
  await assert.rejects(broken.resolve(MAGNET), (err) => err?.reason === 'engine_unavailable');
  assert.equal((await broken.streamFile(HEX, 0, null)).statusCode, 503);
});

test('streamFile revives a bill-known torrent when the library entry is gone', async () => {
  const dir = tempDir('revive');
  const fixture = path.join(dir, 'fixture.bin');
  fs.writeFileSync(fixture, '0123456789ab'); // 12 bytes, matches metadata
  const torrents = new TorrentManager({
    dataDir: path.join(dir, 'data'),
    clientFactory: stubClientFactory({
      name: 'Sintel',
      fixture,
      files: [{ path: 'Sintel/Sintel.mp4', length: 12 }],
    }),
  });
  // No resolve ever happened on THIS manager: the entry is unknown, but the
  // persisted bill still carries the magnet (as game-state.json does).
  torrents.setMagnetResolver((infohash) => (infohash === HEX ? MAGNET : null));

  const res = await torrents.streamFile(HEX, 0, 'bytes=0-3');
  assert.equal(res.statusCode, 206, 'the bill revived the torrent and the file streams');
  const slice = await readStream(res.stream);
  assert.equal(slice.toString(), '0123');

  // The revived entry is remembered and persisted for future boots.
  assert.equal(torrents.entries.get(HEX).magnet, MAGNET);
  const library = JSON.parse(fs.readFileSync(path.join(dir, 'data', 'torrents', 'library.json'), 'utf8'));
  assert.equal(library[HEX], MAGNET);

  // Unknown infohashes still 404 even with a resolver wired.
  assert.equal((await torrents.streamFile('f'.repeat(40), 0, null)).statusCode, 404);
});

test('TorrentManager sweeps malformed cache directories at startup', () => {
  const dir = tempDir('sweep');
  const cacheDir = path.join(dir, 'data', 'torrents');
  fs.mkdirSync(path.join(cacheDir, 'not-a-hash'), { recursive: true });
  fs.mkdirSync(path.join(cacheDir, HEX), { recursive: true });
  new TorrentManager({ dataDir: path.join(dir, 'data') });
  assert.ok(!fs.existsSync(path.join(cacheDir, 'not-a-hash')), 'junk dir removed');
  assert.ok(fs.existsSync(path.join(cacheDir, HEX)), 'valid infohash dir kept');
});

// --- HTTP endpoint integration (real server, stub engine) ---

test('GET /api/theater/torrent streams ranged bytes over HTTP with a valid grant', async () => {
  const dir = tempDir('http');
  const fixture = path.join(dir, 'fixture.bin');
  fs.writeFileSync(fixture, '0123456789ab'); // exactly the metadata length (12)
  const torrents = fakeTorrentManager(path.join(dir, 'data'), fixture);
  await torrents.resolve(MAGNET); // someone picked this file before the request
  const { server } = createServer(new Storage(path.join(dir, 'state.json')), {
    dataDir: path.join(dir, 'data'),
    torrents,
    grantsRequired: true,
    grantSecrets: [TEST_GRANT_SECRET],
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const { grant } = mintTorrentGrant('player_a', HEX, 0, { secret: TEST_GRANT_SECRET });
  const withGrant = () => `${base}/api/theater/torrent/${HEX}/0?grant=${encodeURIComponent(grant)}`;
  try {
    assert.equal((await fetch(`${base}/api/theater/torrent/${HEX}/0`)).status, 403, 'no grant');

    const wrongFile = mintTorrentGrant('player_a', HEX, 1, { secret: TEST_GRANT_SECRET });
    assert.equal(
      (await fetch(`${base}/api/theater/torrent/${HEX}/0?grant=${encodeURIComponent(wrongFile.grant)}`)).status,
      403,
      'wrong-file grant',
    );

    const full = await fetch(withGrant());
    assert.equal(full.status, 200);
    assert.equal(full.headers.get('accept-ranges'), 'bytes');
    assert.equal(full.headers.get('content-type'), 'video/mp4');
    assert.equal(await full.text(), '0123456789ab');

    const part = await fetch(withGrant(), { headers: { Range: 'bytes=2-5' } });
    assert.equal(part.status, 206);
    assert.equal(part.headers.get('content-range'), 'bytes 2-5/12');
    assert.equal(await part.text(), '2345');

    const missingGrant = mintTorrentGrant('player_a', HEX, 1, { secret: TEST_GRANT_SECRET });
    assert.equal(
      (await fetch(`${base}/api/theater/torrent/${HEX}/1?grant=${encodeURIComponent(missingGrant.grant)}`)).status,
      404,
      'non-video index refused over HTTP',
    );
    const junk = await fetch(`${base}/api/theater/torrent/nothash/0?grant=${encodeURIComponent(grant)}`);
    assert.equal(junk.status, 403, 'grant must match URL infohash');

    const head = await fetch(withGrant(), { method: 'HEAD' });
    assert.equal(head.status, 200);
    assert.equal(head.headers.get('content-length'), '12');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('loopback dev may stream without grants when explicitly configured', async () => {
  const dir = tempDir('http-open');
  const fixture = path.join(dir, 'fixture.bin');
  fs.writeFileSync(fixture, '0123456789ab');
  const torrents = fakeTorrentManager(path.join(dir, 'data'), fixture);
  await torrents.resolve(MAGNET);
  const { server } = createServer(new Storage(path.join(dir, 'state.json')), {
    dataDir: path.join(dir, 'data'),
    torrents,
    grantsRequired: false,
    loopbackDev: true,
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const res = await fetch(`${base}/api/theater/torrent/${HEX}/0`);
    assert.equal(res.status, 200);
    assert.equal(await res.text(), '0123456789ab');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

function readStream(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}
