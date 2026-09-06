import test from 'node:test';
import assert from 'node:assert/strict';
import { Storage } from '../server/storage.js';
import { TheaterManager } from '../server/theater.js';
import {
  extractPlaylistVideos,
  isYouTubeMixId,
  looksLikePlaylistId,
  resolvePlaylist,
} from '../server/youtubePlaylist.js';
import {
  applyTheaterAction,
  classifySource,
  createTheaterState,
  normalizeTheaterState,
  theaterErrorText,
  THEATER_LIMITS,
} from '../shared/theaterModel.js';

const T0 = 1_700_000_000_000;
const MP4 = 'https://example.com/movie.mp4';
const PLAYLIST = 'https://www.youtube.com/playlist?list=PLbpi6ZahtOH6Bl0mFGcyRhcPIDoigTpoV';

function addUrl(state, url, extra = {}, nowMs = T0) {
  return applyTheaterAction(state, { op: 'add', url, ...extra }, 'Tester', nowMs);
}

function ytUrl(i) {
  return `https://www.youtube.com/watch?v=vId0e0${String(i).padStart(5, '0')}xx`;
}

function importBatch(n, titlePrefix = 'Video') {
  return Array.from({ length: n }, (_, i) => ({ url: ytUrl(i), title: `${titlePrefix} ${i + 1}` }));
}

// --- Classification: playlist links ---

test('classifySource recognizes standalone YouTube playlist links', () => {
  const c = classifySource(PLAYLIST);
  assert.equal(c.kind, 'youtubePlaylist');
  assert.equal(c.listId, 'PLbpi6ZahtOH6Bl0mFGcyRhcPIDoigTpoV');
  assert.equal(c.url, PLAYLIST);
  assert.equal(c.videoId, undefined, 'a playlist has no video of its own');

  const music = classifySource('https://music.youtube.com/playlist?list=OLAK5uy_kExd8o4v5mAoNTLmXK9vKBTgDXlrPJUwY');
  assert.equal(music.kind, 'youtubePlaylist');
});

test('classifySource keeps mixed links playable and carries the list as context', () => {
  const watch = classifySource('https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLbpi6ZahtOH6Bl0mFGcyRhcPIDoigTpoV');
  assert.equal(watch.kind, 'youtube');
  assert.equal(watch.videoId, 'dQw4w9WgXcQ');
  assert.equal(watch.listId, 'PLbpi6ZahtOH6Bl0mFGcyRhcPIDoigTpoV');

  const short = classifySource('https://youtu.be/dQw4w9WgXcQ?list=PLbpi6ZahtOH6Bl0mFGcyRhcPIDoigTpoV');
  assert.equal(short.kind, 'youtube');
  assert.equal(short.listId, 'PLbpi6ZahtOH6Bl0mFGcyRhcPIDoigTpoV');

  // Mix/radio ids classify as playlists; the resolver declines them and the
  // video stays addable.
  const mix = classifySource('https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=RDdQw4w9WgXcQ');
  assert.equal(mix.kind, 'youtube');
  assert.equal(mix.listId, 'RDdQw4w9WgXcQ');
});

test('classifySource ignores unusable list parameters', () => {
  // WL (watch later) is far shorter than any real playlist id.
  const wl = classifySource('https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=WL');
  assert.equal(wl.kind, 'youtube');
  assert.equal(wl.listId, undefined);

  assert.equal(classifySource('https://www.youtube.com/playlist'), null, 'no list param, no video');
  assert.equal(classifySource('https://www.youtube.com/playlist?list=short'), null);
  assert.equal(classifySource('https://www.youtube.com/channel/UCr9w8Z-pZ8z'), null);
});

// --- Playlist entries never reach the bill directly ---

test('add and channel refuse playlist links with use_import', () => {
  assert.equal(addUrl(createTheaterState(), PLAYLIST).error, 'use_import');
  assert.equal(
    applyTheaterAction(createTheaterState(), { op: 'channel', url: PLAYLIST }, 'Tester', T0).error,
    'use_import',
  );
});

test('normalizeTheaterState drops playlist entries from untrusted state', () => {
  const state = normalizeTheaterState({
    now: { url: PLAYLIST, title: 'Not playable' },
    queue: [
      { url: PLAYLIST, title: 'Not playable either' },
      { url: MP4, title: 'Fine' },
    ],
  }, T0);
  assert.equal(state.now, null);
  assert.equal(state.queue.length, 1);
  assert.equal(state.queue[0].url, MP4);
});

// --- Reducer: addMany (atomic batch import) ---

test('addMany starts the first video on an idle screen and queues the rest', () => {
  const res = applyTheaterAction(createTheaterState(), { op: 'addMany', items: importBatch(3) }, 'Importer', T0);
  assert.equal(res.error, null);
  assert.deepEqual(res.report, { queued: 3, skipped: 0, didNotFit: 0 });
  assert.equal(res.state.now.url, ytUrl(0), 'first video starts immediately');
  assert.equal(res.state.now.playing, true);
  assert.equal(res.state.now.title, 'Video 1');
  assert.deepEqual(res.state.queue.map((i) => i.url), [ytUrl(1), ytUrl(2)]);
  assert.equal(res.state.queue[0].kind, 'youtube');
});

test('addMany fills the remaining capacity in order and reports the rest', () => {
  let state = addUrl(createTheaterState(), MP4).state; // screen busy
  for (let i = 0; i < THEATER_LIMITS.QUEUE_MAX - 2; i++) {
    state = addUrl(state, `https://example.com/f${i}.mp4`, {}, T0 + i + 1).state;
  }
  const free = THEATER_LIMITS.QUEUE_MAX - state.queue.length;
  assert.equal(free, 2, 'precondition: two slots left');

  const res = applyTheaterAction(state, { op: 'addMany', items: importBatch(5) }, 'Importer', T0 + 999);
  assert.equal(res.error, null);
  assert.deepEqual(res.report, { queued: 2, skipped: 0, didNotFit: 3 });
  assert.equal(state.queue.length, THEATER_LIMITS.QUEUE_MAX - 2, 'input state untouched');
  assert.equal(res.state.queue.length, THEATER_LIMITS.QUEUE_MAX);
  assert.deepEqual(
    res.state.queue.slice(-2).map((i) => i.url),
    [ytUrl(0), ytUrl(1)],
    'playlist order wins up to the cap',
  );
});

test('addMany skips unplayable entries without failing the batch', () => {
  const res = applyTheaterAction(createTheaterState(), {
    op: 'addMany',
    items: [
      { url: 'javascript:alert(1)', title: 'Bad' },
      { url: PLAYLIST, title: 'Not directly playable' },
      { url: MP4, title: 'Good' },
      null,
      { title: 'No url' },
    ],
  }, 'Importer', T0);
  assert.equal(res.error, null);
  assert.deepEqual(res.report, { queued: 1, skipped: 4, didNotFit: 0 });
  assert.equal(res.state.now.url, MP4);
});

test('addMany against a full reel is rejected cleanly as queue_full', () => {
  let state = addUrl(createTheaterState(), MP4).state;
  for (let i = 0; i < THEATER_LIMITS.QUEUE_MAX; i++) {
    state = addUrl(state, `https://example.com/v${i}.mp4`, {}, T0 + i + 1).state;
  }
  const res = applyTheaterAction(state, { op: 'addMany', items: importBatch(3) }, 'Importer', T0 + 999);
  assert.equal(res.error, 'queue_full');
  assert.equal(res.state, null);
  assert.equal(state.queue.length, THEATER_LIMITS.QUEUE_MAX, 'shared state unchanged');
});

test('addMany validates the batch shape', () => {
  assert.equal(applyTheaterAction(createTheaterState(), { op: 'addMany' }, 'T', T0).error, 'invalid_action');
  assert.equal(applyTheaterAction(createTheaterState(), { op: 'addMany', items: [] }, 'T', T0).error, 'invalid_action');
  assert.equal(
    applyTheaterAction(createTheaterState(), { op: 'addMany', items: importBatch(THEATER_LIMITS.RESOLVE_MAX + 1) }, 'T', T0).error,
    'invalid_action',
    'batches beyond RESOLVE_MAX are refused outright',
  );
});

test('addMany never mutates the input state and other ops carry no report', () => {
  const before = createTheaterState();
  const frozen = JSON.stringify(before);
  applyTheaterAction(before, { op: 'addMany', items: importBatch(2) }, 'Importer', T0);
  assert.equal(JSON.stringify(before), frozen);

  const plain = addUrl(createTheaterState(), MP4);
  assert.equal(plain.report, undefined, 'single adds stay report-free');
});

// --- Manager: report passthrough ---

test('TheaterManager surfaces the addMany report and persists once', () => {
  const storage = new Storage(`/tmp/test-ytpl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`);
  const theater = new TheaterManager(storage);
  const res = theater.applyAction('Ana', { op: 'addMany', items: importBatch(2) });
  assert.equal(res.success, true);
  assert.deepEqual(res.report, { queued: 2, skipped: 0, didNotFit: 0 });
  assert.equal(theater.snapshot().now.url, ytUrl(0), 'first video takes the idle screen');
  assert.equal(theater.snapshot().queue.length, 1);

  const rejected = theater.applyAction('Ana', { op: 'add', url: PLAYLIST });
  assert.equal(rejected.success, false);
  assert.equal(rejected.reason, 'use_import');
});

// --- Error texts ---

test('every new playlist reason has a readable message', () => {
  for (const reason of ['use_import', 'is_mix', 'playlist_not_public', 'playlist_unreadable', 'resolve_in_flight', 'resolve_cooldown']) {
    const text = theaterErrorText(reason);
    assert.notEqual(text, 'The projector ignores that.', `${reason} should be translated`);
    assert.ok(text.length > 10);
  }
});

// --- Resolver: pure extraction over synthetic fixtures ---

/** Synthetic playlist page mimicking ytInitialData's real shape. */
function fixtureHtml(videos, { title = 'Test Mixtape', simpleText = false } = {}) {
  const data = {
    metadata: { playlistMetadataRenderer: { title } },
    contents: {
      twoColumnBrowseResultsRenderer: {
        tabs: [{
          tabRenderer: {
            content: {
              sectionListRenderer: {
                contents: [{
                  itemSectionRenderer: {
                    contents: [{
                      playlistVideoListRenderer: {
                        contents: videos.map((v) => ({
                          playlistVideoRenderer: {
                            videoId: v.id,
                            title: simpleText ? { simpleText: v.title } : { runs: [{ text: v.title }] },
                          },
                        })),
                      },
                    }],
                  },
                }],
              },
            },
          },
        }],
      },
    },
  };
  return `<html><head><script>var ytInitialData = ${JSON.stringify(data)};</script></head><body></body></html>`;
}

test('extractPlaylistVideos reads title and ordered videos', () => {
  const out = extractPlaylistVideos(fixtureHtml([
    { id: 'aaaaaaaaaaa', title: 'First Song' },
    { id: 'bbbbbbbbbbb', title: 'Second Song' },
  ], { title: 'Evening Reel' }));
  assert.deepEqual(out, {
    title: 'Evening Reel',
    videos: [
      { videoId: 'aaaaaaaaaaa', title: 'First Song' },
      { videoId: 'bbbbbbbbbbb', title: 'Second Song' },
    ],
  });
});

test('extractPlaylistVideos reads simpleText titles and skips broken entries', () => {
  const html = fixtureHtml([{ id: 'aaaaaaaaaaa', title: 'Runs Title' }], { simpleText: true })
    // A malformed renderer (no videoId) rides along uninvited.
    .replace('</script>', '</script><script>var junk = {"playlistVideoRenderer":{"title":{"simpleText":"x"}}};</script>');
  const out = extractPlaylistVideos(html);
  assert.equal(out.videos.length, 1);
  assert.equal(out.videos[0].title, 'Runs Title');
});

test('extractPlaylistVideos reads the current lockupViewModel layout in order', () => {
  const lockups = [
    { videoId: 'yMoGiIeDH9s', title: 'Artemis Resource Reel' },
    { videoId: 'zNfKiIeDH9t', title: 'Launch Sequence' },
  ].map((v) => ({
    lockupViewModel: {
      contentType: 'LOCKUP_CONTENT_TYPE_VIDEO',
      contentId: v.videoId,
      metadata: { lockupMetadataViewModel: { title: { content: v.title } } },
      contentImage: { thumbnailViewModel: {} },
    },
  }));
  // A playlist-typed lockup (channel-page furniture) must not sneak in.
  lockups.push({
    lockupViewModel: {
      contentType: 'LOCKUP_CONTENT_TYPE_PLAYLIST',
      contentId: 'PLbpi6ZahtOH6Bl0mFGcyRhcPIDoigTpoV',
      metadata: { lockupMetadataViewModel: { title: { content: 'Not a video' } } },
    },
  });
  const html = `<html><script>var ytInitialData = ${JSON.stringify({
    metadata: { playlistMetadataRenderer: { title: 'NASA Reel' } },
    contents: { some: { nested: { list: lockups } } },
  })};</script></html>`;
  const out = extractPlaylistVideos(html);
  assert.equal(out.title, 'NASA Reel');
  assert.deepEqual(out.videos, [
    { videoId: 'yMoGiIeDH9s', title: 'Artemis Resource Reel' },
    { videoId: 'zNfKiIeDH9t', title: 'Launch Sequence' },
  ]);
});

test('extractPlaylistVideos dedupes video ids and caps at RESOLVE_MAX', () => {
  const many = Array.from({ length: THEATER_LIMITS.RESOLVE_MAX + 10 }, (_, i) => ({
    id: `id${String(i).padStart(8, '0')}`,
    title: `Song ${i}`,
  }));
  many.push({ ...many[0] }); // exact duplicate of the first
  const out = extractPlaylistVideos(fixtureHtml(many));
  assert.equal(out.videos.length, THEATER_LIMITS.RESOLVE_MAX);
  assert.equal(out.videos[0].videoId, many[0].id, 'playlist order wins');
});

test('extractPlaylistVideos survives braces inside strings', () => {
  const out = extractPlaylistVideos(fixtureHtml([
    { id: 'aaaaaaaaaaa', title: 'The "Best" of {curly} \\ stuff' },
  ]));
  assert.equal(out.videos[0].title, 'The "Best" of {curly} \\ stuff');
});

test('extractPlaylistVideos maps unreadable and non-public pages to reasons', () => {
  assert.equal(extractPlaylistVideos('<html>consent wall, no data</html>').reason, 'playlist_unreadable');
  assert.equal(extractPlaylistVideos(null).reason, 'playlist_unreadable');
  // A real page whose video list is empty: private or deleted.
  assert.equal(extractPlaylistVideos(fixtureHtml([])).reason, 'playlist_not_public');
});

test('mix and id-shape helpers gate what the resolver accepts', () => {
  assert.equal(isYouTubeMixId('RDdQw4w9WgXcQ'), true);
  assert.equal(isYouTubeMixId('ULOLAK5uy_kX'), true);
  assert.equal(isYouTubeMixId('PLbpi6ZahtOH6Bl0mFGcy'), false);
  assert.equal(looksLikePlaylistId('PLbpi6ZahtOH6Bl0mFGcy'), true);
  assert.equal(looksLikePlaylistId('WL'), false);
  assert.equal(looksLikePlaylistId(null), false);
});

test('resolvePlaylist declines mixes and malformed ids without touching the network', async () => {
  assert.equal((await resolvePlaylist('RDdQw4w9WgXcQ')).reason, 'is_mix');
  assert.equal((await resolvePlaylist('short')).reason, 'playlist_unreadable');
  assert.equal((await resolvePlaylist(null)).reason, 'playlist_unreadable');
});
