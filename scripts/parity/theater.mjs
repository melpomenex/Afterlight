/**
 * Parity fixtures for shared/theaterModel.js — the highest-priority set:
 * the reducer op matrix, the classifySource URL table, parseM3U,
 * normalizeTheaterState (Number-coercion hazards) and effectivePositionSec.
 */

import {
  applyTheaterAction,
  classifySource,
  createTheaterState,
  effectivePositionSec,
  newItemId,
  normalizeTheaterState,
  parseM3U,
} from '../../shared/theaterModel.js';
import { recordCall, recordScript, withFrozenClock } from './harness.mjs';

const T0 = 1_700_000_000_000;
const T1 = 1_700_000_060_000;
const ACTOR = 'parity_actor';

const MAGNET = 'magnet:?xt=urn:btih:0123456789abcdef0123456789abcdef01234567&dn=Sintel';
const PICK = { torrentName: 'Sintel', fileIndex: 1, filePath: 'Sintel/sintel.mp4', fileBytes: 1_293_149_503 };

function add(url, title, extra = {}) {
  return { op: 'add', url, ...(title !== undefined ? { title } : {}), ...extra };
}

function build() {
  const cases = [];

  // ------------------------------------------------------------------
  // classifySource URL table (WHATWG-URL hazard + error outcomes)
  // ------------------------------------------------------------------
  const urls = [
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', { kind: 'youtube', videoId: 'dQw4w9WgXcQ' }],
    ['https://youtube.com/watch?v=abc12345678', { kind: 'youtube', videoId: 'abc12345678' }],
    ['http://youtube.com/watch?v=shortid1', null],
    ['https://m.youtube.com/watch?v=abcdefghijk', { kind: 'youtube', videoId: 'abcdefghijk' }],
    ['https://www.youtube.com/watch?v=abc&list=PL1234567890', { kind: 'youtube', videoId: 'abc', listId: 'PL1234567890' }],
    ['https://youtu.be/dQw4w9WgXcQ', { kind: 'youtube', videoId: 'dQw4w9WgXcQ' }],
    ['https://www.youtube.com/shorts/abcdefghijk', { kind: 'youtube', videoId: 'abcdefghijk' }],
    ['HTTPS://WWW.YOUTUBE.COM/WATCH?V=dQw4w9WgXcQ', { kind: 'youtube', videoId: 'dQw4w9WgXcQ' }],
    ['https://www.youtube.com/watch?vi=dQw4w9WgXcQ', null],
    ['https://vimeo.com/123456789', { kind: 'vimeo' }],
    ['https://vimeo.com/12345678', null],
    ['https://vimeo.com/123456789012', null],
    ['https://www.vimeo.com/123456789', { kind: 'vimeo' }],
    ['ftp://vimeo.com/123456789', null],
    ['https://vimeo.com/abc', null],
    ['https://example.com/media/clip.mp4', { kind: 'file' }],
    ['https://example.com/media/clip.MP4?token=x', { kind: 'file' }],
    ['https://example.com/media/clip.webm', { kind: 'file' }],
    ['https://example.com/media/clip.ogv', { kind: 'file' }],
    ['https://example.com/media/clip.txt', null],
    ['https://example.com/media/noext', null],
    ['https://example.com/stream/index.m3u8', { kind: 'hls' }],
    ['https://example.com/stream/index.M3U8', { kind: 'hls' }],
    ['https://example.com/stream/playlist.m3u', null],
    [MAGNET, { kind: 'torrent', infohash: '0123456789abcdef0123456789abcdef01234567' }],
    ['magnet:?xt=urn:btih:MFRGGDFCMYTDE2LQGJTGKNBZGY4TQNJRGUZTANJZMU3DKOBVGY3A====&dn=x', { kind: 'torrent', infohash: '31472420a066a10ecb72230bb8cc536c1449c47b' }],
    ['magnet:?xt=urn:btih:0123456789ABCDEF0123456789ABCDEF01234567&dn=x', { kind: 'torrent', infohash: '0123456789abcdef0123456789abcdef01234567' }],
    ['magnet:?xt=urn:btih:zzzz&dn=x', null],
    ['magnet:?dn=only-display-name', null],
    ['https://www.youtube.com/playlist?list=PL1234567890abcdef', { kind: 'youtubePlaylist', listId: 'PL1234567890abcdef' }],
    ['https://www.youtube.com/playlist?list=RD1234567890', { kind: 'youtubePlaylist', listId: 'RD1234567890' }],
    ['https://www.youtube.com/playlist?list=short', null],
    ['https://www.youtube.com/watch?v=abc12345678&list=RDabcdef123456', { kind: 'youtube', videoId: 'abc12345678', listId: 'RDabcdef123456' }],
    ['not a url', null],
    ['javascript:alert(1)', null],
    ['//example.com/clip.mp4', null],
    ['https://example.com/' + 'a'.repeat(2100), null],
    ['', null],
    ['https://例え.jp/clip.mp4', { kind: 'file' }],
    ['data:text/html,boom', null],
    ['javascript:void(0)', null],
    ['file:///etc/passwd', null],
    ['https://www.youtube.com/watch?v=toolongvideoid12345', null],
    ['https://www.youtube.com/watch?v=', null],
    ['https://player.vimeo.com/video/123456789', { kind: 'vimeo', videoId: '123456789' }],
  ];
  // Expected values are RECORDED from the real JS (never hand-authored):
  // parity fixtures must pin what the implementation does, not what we
  // assumed it does.
  for (const [url] of urls) {
    cases.push(recordCall({ id: `classify/${url.slice(0, 42).replace(/[^\w.-]+/g, '_')}`, fn: classifySource, args: [url] }));
  }

  // ------------------------------------------------------------------
  // Reducer op matrix over a scripted queue
  // ------------------------------------------------------------------
  const YT = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
  const YT2 = 'https://youtu.be/abc12345678';
  const FILE = 'https://example.com/media/clip.mp4';

  const base = () => {
    let st = withFrozenClock(T0, () => applyTheaterAction(createTheaterState(), add(YT, 'Never Gonna Give You Up'), ACTOR, T0)).state;
    st = withFrozenClock(T0, () => applyTheaterAction(st, add(FILE), ACTOR, T0)).state;
    return withFrozenClock(T0, () => applyTheaterAction(st, add(YT2, 'Second'), ACTOR, T0)).state;
  };

  cases.push(recordScript({
    id: 'reducer/seed-state',
    steps: [
      { fn: applyTheaterAction, args: [createTheaterState(), add(YT, 'Never Gonna Give You Up'), ACTOR], nowMs: T0 },
      { fn: applyTheaterAction, args: ['<prev>', add(FILE), ACTOR], nowMs: T0 },
      { fn: applyTheaterAction, args: ['<prev>', add(YT2, 'Second'), ACTOR], nowMs: T0 },
    ],
    thread: 'state',
  }));

  cases.push(recordCall({ id: 'reducer/create-state', fn: createTheaterState, args: [] }));

  // add: success into empty state (becomes `now`), success queues, invalid url, use_import, torrent without/with pick, queue_full
  cases.push(recordCall({ id: 'reducer/add-empty-becomes-now', fn: applyTheaterAction, args: [createTheaterState(), add(FILE, 'A Clip'), ACTOR], nowMs: T0 }));
  cases.push(recordCall({ id: 'reducer/add-invalid-url', fn: applyTheaterAction, args: [createTheaterState(), add('notaurl'), ACTOR], nowMs: T0 }));
  cases.push(recordCall({ id: 'reducer/add-playlist-use-import', fn: applyTheaterAction, args: [createTheaterState(), add('https://www.youtube.com/playlist?list=PL1234567890abcdef'), ACTOR], nowMs: T0 }));
  cases.push(recordCall({ id: 'reducer/add-torrent-no-pick', fn: applyTheaterAction, args: [createTheaterState(), add(MAGNET), ACTOR], nowMs: T0 }));
  cases.push(recordCall({ id: 'reducer/add-torrent-with-pick', fn: applyTheaterAction, args: [createTheaterState(), add(MAGNET, 'Sintel', PICK), ACTOR], nowMs: T0 }));
  cases.push(recordCall({ id: 'reducer/add-torrent-bad-pick-ext', fn: applyTheaterAction, args: [createTheaterState(), add(MAGNET, 'Sintel', { ...PICK, filePath: 'Sintel/readme.txt' })], nowMs: T0 }));
  cases.push(recordCall({ id: 'reducer/add-queue-full', fn: applyTheaterAction, args: [
    (() => {
      let st = createTheaterState();
      st = withFrozenClock(T0, () => applyTheaterAction(st, add(FILE), ACTOR, T0)).state;
      for (let i = 0; i < 50; i++) st = withFrozenClock(T0, () => applyTheaterAction(st, add(`${FILE}?v=${i}`), ACTOR, T0)).state;
      return st;
    })(),
    add('https://example.com/media/other.webm'),
    ACTOR,
  ], nowMs: T0 }));

  // addMany: mixed batch with report
  cases.push(recordCall({ id: 'reducer/addMany-mixed-report', fn: applyTheaterAction, args: [createTheaterState(), {
    op: 'addMany',
    items: [
      { url: YT },
      { url: 'https://www.youtube.com/playlist?list=PL1234567890abcdef' },
      { url: 'not a url' },
      { url: FILE, title: 'Custom Title Ignored' },
      { url: 'https://vimeo.com/123456789' },
    ],
  }, ACTOR], nowMs: T0 }));
  cases.push(recordCall({ id: 'reducer/addMany-invalid', fn: applyTheaterAction, args: [createTheaterState(), { op: 'addMany', items: [] }, ACTOR], nowMs: T0 }));
  cases.push(recordCall({ id: 'reducer/addMany-does-not-touch-now', fn: applyTheaterAction, args: [base(), {
    op: 'addMany',
    items: [{ url: FILE }],
  }, ACTOR], nowMs: T0 }));
  cases.push(recordCall({
    id: 'reducer/addMany-with-didNotFit',
    fn: applyTheaterAction,
    args: [
      (() => {
        let st = createTheaterState();
        st = withFrozenClock(T0, () => applyTheaterAction(st, add(FILE), ACTOR, T0)).state;
        for (let i = 0; i < 49; i++) st = withFrozenClock(T0, () => applyTheaterAction(st, add(`${FILE}?v=${i}`), ACTOR, T0)).state;
        return st;
      })(),
      {
        op: 'addMany',
        items: [
          { url: `${FILE}?v=fit` },
          { url: `${FILE}?v=overflow1` },
          { url: `${FILE}?v=overflow2` },
        ],
      },
      ACTOR,
    ],
    nowMs: T0,
  }));

  // remove / playNow / skip / clear on the seeded state
  cases.push(recordCall({ id: 'reducer/remove-queued', fn: applyTheaterAction, args: [base(), { op: 'remove', itemId: '<gen:2>' }, ACTOR], nowMs: T0 }));
  cases.push(recordCall({ id: 'reducer/remove-live', fn: applyTheaterAction, args: [base(), { op: 'remove', itemId: '<gen:0>' }, ACTOR], nowMs: T0 }));
  cases.push(recordCall({ id: 'reducer/remove-missing', fn: applyTheaterAction, args: [base(), { op: 'remove', itemId: 'itm_nope' }, ACTOR], nowMs: T0 }));
  cases.push(recordCall({ id: 'reducer/playNow-displaces-live', fn: applyTheaterAction, args: [base(), { op: 'playNow', itemId: '<gen:2>' }, ACTOR], nowMs: T0 }));
  cases.push(recordCall({ id: 'reducer/playNow-missing', fn: applyTheaterAction, args: [base(), { op: 'playNow', itemId: 'itm_nope' }, ACTOR], nowMs: T0 }));
  cases.push(recordCall({ id: 'reducer/skip', fn: applyTheaterAction, args: [base(), { op: 'skip' }, ACTOR], nowMs: T0 }));
  cases.push(recordCall({ id: 'reducer/skip-nothing-playing', fn: applyTheaterAction, args: [createTheaterState(), { op: 'skip' }, ACTOR], nowMs: T0 }));
  cases.push(recordCall({ id: 'reducer/clear', fn: applyTheaterAction, args: [base(), { op: 'clear' }, ACTOR], nowMs: T0 }));
  cases.push(recordCall({ id: 'reducer/invalid-op', fn: applyTheaterAction, args: [createTheaterState(), { op: 'explode' }, ACTOR], nowMs: T0 }));
  cases.push(recordCall({ id: 'reducer/null-action', fn: applyTheaterAction, args: [createTheaterState(), null, ACTOR], nowMs: T0 }));

  // pause / resume / seek — clock semantics
  cases.push(recordCall({ id: 'reducer/pause', fn: applyTheaterAction, args: [base(), { op: 'pause' }, ACTOR], nowMs: T1 }));
  cases.push(recordCall({ id: 'reducer/pause-nothing-playing', fn: applyTheaterAction, args: [createTheaterState(), { op: 'pause' }, ACTOR], nowMs: T1 }));
  cases.push(recordCall({ id: 'reducer/resume', fn: applyTheaterAction, args: [
    withFrozenClock(T1, () => applyTheaterAction(base(), { op: 'pause' }, ACTOR, T1)).state,
    { op: 'resume' }, ACTOR,
  ], nowMs: T1 + 5_000 }));
  cases.push(recordCall({ id: 'reducer/resume-nothing-playing', fn: applyTheaterAction, args: [createTheaterState(), { op: 'resume' }, ACTOR], nowMs: T1 }));
  cases.push(recordCall({ id: 'reducer/seek', fn: applyTheaterAction, args: [base(), { op: 'seek', positionSec: 42.5 }, ACTOR], nowMs: T1 }));
  cases.push(recordCall({ id: 'reducer/seek-negative-clamps', fn: applyTheaterAction, args: [base(), { op: 'seek', positionSec: -30 }, ACTOR], nowMs: T1 }));
  cases.push(recordCall({ id: 'reducer/seek-nonfinite', fn: applyTheaterAction, args: [base(), { op: 'seek', positionSec: 'soon' }, ACTOR], nowMs: T1 }));
  cases.push(recordCall({ id: 'reducer/seek-hls-unsupported', fn: applyTheaterAction, args: [(() => {
    const r = withFrozenClock(T0, () => applyTheaterAction(createTheaterState(), add('https://example.com/stream/index.m3u8'), ACTOR, T0));
    return r.state;
  })(), { op: 'seek', positionSec: 10 }, ACTOR], nowMs: T1 }));
  cases.push(recordCall({ id: 'reducer/seek-nothing-playing', fn: applyTheaterAction, args: [createTheaterState(), { op: 'seek', positionSec: 5 }, ACTOR], nowMs: T1 }));

  // ended / failed with id guard (item_mismatch)
  cases.push(recordCall({ id: 'reducer/ended-advances', fn: applyTheaterAction, args: [base(), { op: 'ended', itemId: '<gen:0>' }, ACTOR], nowMs: T1 }));
  cases.push(recordCall({ id: 'reducer/ended-wrong-id', fn: applyTheaterAction, args: [base(), { op: 'ended', itemId: 'itm_stale' }, ACTOR], nowMs: T1 }));
  cases.push(recordCall({ id: 'reducer/ended-nothing-playing', fn: applyTheaterAction, args: [createTheaterState(), { op: 'ended', itemId: 'itm_none' }, ACTOR], nowMs: T1 }));
  cases.push(recordCall({ id: 'reducer/failed-advances', fn: applyTheaterAction, args: [base(), { op: 'failed', itemId: '<gen:0>' }, ACTOR], nowMs: T1 }));
  cases.push(recordCall({ id: 'reducer/failed-wrong-id', fn: applyTheaterAction, args: [base(), { op: 'failed', itemId: 'itm_stale' }, ACTOR], nowMs: T1 }));
  cases.push(recordCall({ id: 'reducer/failed-nothing-playing', fn: applyTheaterAction, args: [createTheaterState(), { op: 'failed', itemId: 'itm_none' }, ACTOR], nowMs: T1 }));

  // channel op (iptv url / torrent pick)
  cases.push(recordCall({ id: 'reducer/channel-yt', fn: applyTheaterAction, args: [base(), { op: 'channel', url: YT2, title: 'Take Over' }, ACTOR], nowMs: T1 }));
  cases.push(recordCall({ id: 'reducer/channel-torrent-pick', fn: applyTheaterAction, args: [base(), { op: 'channel', url: MAGNET, title: 'Sintel', ...PICK }, ACTOR], nowMs: T1 }));
  cases.push(recordCall({ id: 'reducer/channel-torrent-no-pick', fn: applyTheaterAction, args: [base(), { op: 'channel', url: MAGNET }, ACTOR], nowMs: T1 }));
  cases.push(recordCall({ id: 'reducer/channel-torrent-bad-pick-ext', fn: applyTheaterAction, args: [base(), { op: 'channel', url: MAGNET, title: 'Sintel', ...PICK, filePath: 'Sintel/readme.txt' }, ACTOR], nowMs: T1 }));
  cases.push(recordCall({ id: 'reducer/channel-playlist-use-import', fn: applyTheaterAction, args: [base(), { op: 'channel', url: 'https://www.youtube.com/playlist?list=PL1234567890abcdef' }, ACTOR], nowMs: T1 }));
  cases.push(recordCall({ id: 'reducer/channel-invalid', fn: applyTheaterAction, args: [base(), { op: 'channel', url: 'nope' }, ACTOR], nowMs: T1 }));

  // newItemId with pinned clock and seed
  cases.push(recordCall({ id: 'reducer/new-item-id-pinned', fn: newItemId, args: [T0], seed: 0.123456789 }));

  // multi-step: add → pause at T0 → (time passes) → seek at T1 → ended at T1
  cases.push(recordScript({
    id: 'reducer/lifecycle-add-pause-seek-ended',
    steps: [
      { fn: applyTheaterAction, args: [createTheaterState(), add(YT, 'Life'), ACTOR], nowMs: T0 },
      { fn: applyTheaterAction, args: ['<prev>', { op: 'pause' }, ACTOR], nowMs: T0 + 10_000 },
      { fn: applyTheaterAction, args: ['<prev>', { op: 'seek', positionSec: 7 }, ACTOR], nowMs: T1 },
      { fn: applyTheaterAction, args: ['<prev>', { op: 'ended', itemId: '<gen:0>' }, ACTOR], nowMs: T1 },
    ],
    thread: 'state',
  }));

  // ------------------------------------------------------------------
  // effectivePositionSec — shared-clock math (float)
  // ------------------------------------------------------------------
  const playingAtT0 = withFrozenClock(T0, () => applyTheaterAction(createTheaterState(), add(YT), ACTOR, T0)).state;
  const pausedAtT0 = withFrozenClock(T0, () => applyTheaterAction(playingAtT0, { op: 'pause' }, ACTOR, T0)).state;
  for (const [name, state] of [['playing', playingAtT0], ['paused', pausedAtT0]]) {
    cases.push(recordCall({ id: `position/${name}-t1`, fn: effectivePositionSec, args: [state, T1] }));
    cases.push(recordCall({ id: `position/${name}-same-instant`, fn: effectivePositionSec, args: [state, T0] }));
    cases.push(recordCall({ id: `position/${name}-before-updated`, fn: effectivePositionSec, args: [state, T0 - 5_000] }));
  }
  cases.push(recordCall({ id: 'position/null-now', fn: effectivePositionSec, args: [createTheaterState(), T1] }));

  // ------------------------------------------------------------------
  // parseM3U
  // ------------------------------------------------------------------
  const m3uBodies = [
    ['basic', '#EXTM3U\n#EXTINF:-1 tvg-id="Chan.TV" tvg-name="Chan" group-title="News" tvg-logo="http://l/1.png",Channel One\nhttp://example.com/1\n#EXTINF:-1,Channel Two\nhttp://example.com/2\n'],
    ['crlf', '#EXTM3U\r\n#EXTINF:-1,Alpha\r\nhttp://a.example/x.mp4\r\n#EXTINF:-1,Beta\r\nhttp://b.example/y.m3u8\r\n'],
    ['damaged-and-skips', '#EXTM3U\n#EXTINF broken line\nhttp://ok.example/1\n#EXTINF:-1 tvg-id="X"\nhttp://ok.example/2\nftp://not-http/file\njust some text\n#EXTINF:-1,Named\nhttps://ok.example/3\n'],
    ['no-header', '#EXTINF:-1,Headerless\nhttp://h.example/1\n'],
    ['empty', ''],
    ['garbage', 'hello world this is not a playlist'],
    ['unicode-names', '#EXTM3U\n#EXTINF:-1 group-title="音楽",日本のチャンネル\nhttp://jp.example/1\n'],
    ['dup-attrs', '#EXTM3U\n#EXTINF:-1 tvg-id="A" tvg-id="B" group-title="G1" group-title="G2",Named\nhttp://d.example/1\n'],
  ];
  for (const [name, text] of m3uBodies) {
    cases.push(recordCall({ id: `m3u/${name}`, fn: parseM3U, args: [text] }));
  }

  // ------------------------------------------------------------------
  // normalizeTheaterState — Number coercion / null vs absent hazards
  // ------------------------------------------------------------------
  const raws = [
    ['null', null],
    ['empty', {}],
    ['null-now', { now: null, queue: [] }],
    ['string-numbers', { now: { id: 'itm_x', kind: 'youtube', url: YT, videoId: 'abc12345678', title: 'T', playing: 'yes', positionSec: '12.5', updatedAt: '1700000000000', by: 'a', queuedBy: 'a' }, queue: [] }],
    ['null-fields', { now: { id: 'itm_x', kind: 'file', url: FILE, title: 'T', playing: null, positionSec: null, updatedAt: null, by: null, queuedBy: null }, queue: [] }],
    ['torrent-without-pick', { now: { id: 'itm_x', kind: 'torrent', url: MAGNET, title: 'S', playing: true, positionSec: 0, updatedAt: T0, infohash: '0123456789abcdef0123456789abcdef01234567' }, queue: [] }],
    ['playlist-in-queue', { now: null, queue: [{ id: 'itm_y', kind: 'youtubePlaylist', url: 'https://www.youtube.com/playlist?list=PL1234567890abcdef', title: 'P' }] }],
    ['bad-ids-and-long-queue', {
      now: { id: '', kind: 'file', url: FILE, title: 'x'.repeat(200), playing: false, positionSec: -5, updatedAt: T0, by: 'b'.repeat(60), queuedBy: 'b' },
      queue: Array.from({ length: 55 }, (_, i) => ({ id: `itm_q${i}`, kind: 'file', url: `${FILE}?v=${i}`, title: `q${i}`, playing: true, positionSec: i, updatedAt: T0 })),
    }],
    ['unknown-kind-dropped', { now: null, queue: [{ id: 'itm_z', kind: 'alien', url: 'https://x.example/a' }, { id: 'itm_keep', kind: 'file', url: FILE, title: 'keep' }] }],
  ];
  for (const [name, raw] of raws) {
    cases.push(recordCall({ id: `normalize/${name}`, fn: normalizeTheaterState, args: [raw], nowMs: T0 }));
  }

  return cases;
}

export const theaterCases = build();
export const theaterHazards = {
  'url-whatwg': ['classify/*'],
  'error-strings': ['reducer/*'],
  'float-position': ['position/*'],
  'number-coercion': ['normalize/string-numbers', 'normalize/null-fields'],
  'null-undefined-absent': ['normalize/null', 'normalize/empty', 'normalize/null-fields'],
  'utf16-slicing': ['m3u/unicode-names', 'normalize/bad-ids-and-long-queue'],
  'timestamps': ['reducer/lifecycle-add-pause-seek-ended', 'position/*'],
};
