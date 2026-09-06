/**
 * Tests for the shared IPTV library and program guide:
 *   - pure rules: shared/xmltv.js (XMLTV parsing, matching, now/next) and
 *     shared/iptvModel.js (limits, library actions, normalization, M3U out)
 *   - integration: HTTP uploads on a real server, IPTV_STATE broadcast /
 *     snapshots, on-demand channel pulls, guide lookups, persistence across
 *     a server restart (pattern follows tests/theater-net.test.js)
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import { WebSocket } from 'ws';
import { createServer } from '../server/index.js';
import { Storage } from '../server/storage.js';
import { MSG_TYPES, ROOMS, parse, serialize } from '../shared/protocol.js';
import { parseM3U } from '../shared/theaterModel.js';
import {
  IPTV_LIMITS,
  applyAddPlaylist,
  applyRemoveList,
  applySetEpg,
  catalogSnapshot,
  epgSummary,
  iptvErrorText,
  normalizeEpg,
  normalizeIptvLibrary,
  serializeM3U,
} from '../shared/iptvModel.js';
import {
  createEpgIndex,
  lookupNowNext,
  normalizeChannelKey,
  nowNextForId,
  parseXmltv,
  parseXmltvTime,
  resolveEpgKey,
} from '../shared/xmltv.js';

// Chat relay binds its own TCP port; tests use an ephemeral one.
process.env.IRC_PORT = '0';

// --- XMLTV time parsing ---

test('parseXmltvTime reads timestamps with and without timezones', () => {
  const utc = Date.UTC(2026, 8, 6, 12, 0, 0);
  assert.equal(parseXmltvTime('20260906120000 +0000'), utc);
  assert.equal(parseXmltvTime('20260906120000'), utc);
  assert.equal(parseXmltvTime('20260906120000 -0530'), utc + 5.5 * 3600000);
  assert.equal(parseXmltvTime('20260906120000 +0200'), utc - 2 * 3600000);
  assert.equal(parseXmltvTime('not-a-time'), null);
  assert.equal(parseXmltvTime(null), null);
});

// --- XMLTV parsing ---

const SAMPLE_GUIDE = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE tv SYSTEM "xmltv.dtd">
<tv generator-info-name="Test Compiler">
  <channel id="Tolo.tv">
    <display-name>Tolo TV</display-name>
    <display-name>Tolo TV (AF)</display-name>
    <icon src="https://example.com/tolo.png"/>
  </channel>
  <channel id="Mezzo.fr">
    <display-name>Mezzo &amp; Sons</display-name>
  </channel>
  <channel id="Broken.ch">
    <display-name>
  </channel>
  <programme start="20260906120000 +0000" stop="20260906130000 +0000" channel="Tolo.tv">
    <title>Morning News</title>
    <desc>Headlines &amp; weather.</desc>
  </programme>
  <programme start="20260906130000 +0000" stop="20260906140000 +0000" channel="Tolo.tv">
    <title>Afternoon Movie</title>
  </programme>
  <programme start="garbage" stop="20260906140000 +0000" channel="Tolo.tv">
    <title>Skipped: bad start</title>
  </programme>
  <programme start="20260906130000 +0000" stop="20260906110000 +0000" channel="Tolo.tv">
    <title>Skipped: stop before start</title>
  </programme>
  <programme start="20260906130000 +0000" stop="20260906140000 +0000" channel="Mezzo.fr">
    <desc>Skipped: no title</desc>
  </programme>
</tv>`;

test('parseXmltv reads channels, programmes, entities, and counts damage', async () => {
  const guide = await parseXmltv(SAMPLE_GUIDE);
  assert.equal(guide.recognized, true);
  assert.equal(guide.skipped, 3, 'bad start, stop-before-start, and titleless programmes are skipped');
  assert.equal(guide.truncated, false);

  assert.deepEqual(Object.keys(guide.channels).sort(), ['Broken.ch', 'Mezzo.fr', 'Tolo.tv'], 'a channel with no display-name still carries its matchable id');
  assert.equal(guide.channels['Tolo.tv'].names[0], 'Tolo TV');
  assert.equal(guide.channels['Tolo.tv'].icon, 'https://example.com/tolo.png');
  assert.equal(guide.channels['Mezzo.fr'].names[0], 'Mezzo & Sons', 'entities decode');

  const tolo = guide.programmes['Tolo.tv'];
  assert.equal(tolo.length, 2);
  assert.equal(tolo[0][2], 'Morning News');
  assert.equal(tolo[0][3], 'Headlines & weather.', 'desc kept when present');
  assert.equal(tolo[1].length, 3, 'no desc field when absent');
});

test('parseXmltv rejects non-XMLTV input and empty text', async () => {
  assert.equal((await parseXmltv('hello, this is not xml at all')).recognized, false);
  assert.equal((await parseXmltv('')).recognized, false);
  assert.equal((await parseXmltv(null)).recognized, false);
});

test('parseXmltv honors channel and programme caps and reports truncation', async () => {
  let text = '<?xml version="1.0"?><tv>';
  for (let i = 0; i < 10; i++) {
    text += `<channel id="ch${i}"><display-name>Ch ${i}</display-name></channel>`;
    text += `<programme start="20260906000000 +0000" stop="20260906010000 +0000" channel="ch${i}"><title>T${i}</title></programme>`;
  }
  text += '</tv>';

  const cappedChannels = await parseXmltv(text, { maxChannels: 3, maxProgrammes: 100 });
  assert.equal(Object.keys(cappedChannels.channels).length, 3);
  assert.equal(cappedChannels.truncated, true);

  const cappedProgrammes = await parseXmltv(text, { maxChannels: 100, maxProgrammes: 4 });
  const total = Object.values(cappedProgrammes.programmes).reduce((n, arr) => n + arr.length, 0);
  assert.equal(total, 4);
  assert.equal(cappedProgrammes.truncated, true);
});

test('parseXmltv yields so large guides do not block the event loop', async () => {
  let text = '<?xml version="1.0"?><tv>';
  for (let i = 0; i < 20_000; i++) {
    text += `<programme start="20260906000000 +0000" stop="20260906010000 +0000" channel="big"><title>T${i}</title></programme>`;
  }
  text += '</tv>';
  let progressed = false;
  const promise = parseXmltv(text, { maxProgrammes: 20_000 }).then((r) => {
    const total = Object.values(r.programmes).reduce((n, arr) => n + arr.length, 0);
    assert.equal(total, 20_000);
    return r;
  });
  Promise.resolve().then(() => {
    progressed = true; // microtask runs while the parser awaits yields
  });
  await promise;
  assert.equal(progressed, true);
});

// --- Matching and now/next ---

test('normalizeChannelKey is punctuation/case insensitive and keeps non-latin names', () => {
  assert.equal(normalizeChannelKey('Tolo TV (AF)'), 'tolotvaf');
  assert.equal(normalizeChannelKey('  HBO *HD!* '), 'hbohd');
  assert.equal(normalizeChannelKey('Кинопоказ'), 'кинопоказ', 'non-latin keeps its lowercase form');
  assert.equal(normalizeChannelKey('***'), '***');
  assert.equal(normalizeChannelKey(null), '');
});

function sampleIndex() {
  const epg = {
    channels: { 'Tolo.tv': { names: ['Tolo TV'], icon: null } },
    programmes: {
      'Tolo.tv': [
        [Date.UTC(2026, 8, 6, 12, 0), Date.UTC(2026, 8, 6, 13, 0), 'Morning News', 'Headlines'],
        [Date.UTC(2026, 8, 6, 13, 0), Date.UTC(2026, 8, 6, 14, 0), 'Afternoon Movie'],
      ],
    },
  };
  return createEpgIndex(epg);
}

test('resolveEpgKey matches tvg-ids exactly, then by normalized name', () => {
  const index = sampleIndex();
  assert.equal(resolveEpgKey(index, 'Tolo.tv'), 'Tolo.tv', 'exact id');
  assert.equal(resolveEpgKey(index, 'Tolo TV'), 'Tolo.tv', 'display-name fallback');
  assert.equal(resolveEpgKey(index, 'unknown channel'), null);
  assert.equal(resolveEpgKey(index, ''), null);
});

test('nowNextForId finds the on-air programme and the follow-up', () => {
  const index = sampleIndex();
  const mid = Date.UTC(2026, 8, 6, 12, 30);
  const nn = nowNextForId(index, 'Tolo.tv', mid);
  assert.equal(nn.now.title, 'Morning News');
  assert.equal(nn.next.title, 'Afternoon Movie');

  const between = Date.UTC(2026, 8, 6, 11, 0);
  const gap = nowNextForId(index, 'Tolo.tv', between);
  assert.equal(gap.now, null);
  assert.equal(gap.next.title, 'Morning News');

  const after = Date.UTC(2026, 8, 7, 0, 0);
  assert.deepEqual(nowNextForId(index, 'Tolo.tv', after), { now: null, next: null });
});

test('lookupNowNext batches bounded lookups with per-key results', () => {
  const index = sampleIndex();
  const at = Date.UTC(2026, 8, 6, 12, 30);
  const entries = lookupNowNext(index, ['Tolo.tv', 'Tolo TV', 'mystery', 'x'], at, 3);
  assert.equal(entries.length, 3, 'capped at max keys');
  assert.equal(entries[0].key, 'Tolo.tv');
  assert.equal(entries[0].now.title, 'Morning News');
  assert.equal(entries[1].key, 'Tolo TV', 'name key answered via fallback');
  assert.equal(entries[2].now, null, 'unmatched keys answer empty, not errors');
});

// --- Library model ---

const PLAYLIST = [
  '#EXTM3U',
  '#EXTINF:-1 tvg-id="Tolo.tv" tvg-name="Tolo" group-title="AF|News",Tolo TV',
  'https://example.com/tolo.m3u8',
  '#EXTINF:-1 group-title="AF|Music",Mezzo',
  'https://example.com/mezzo.m3u8',
].join('\n');

test('applyAddPlaylist parses, names, and stores a shared list', () => {
  const { library, error, list } = applyAddPlaylist({ lists: [] }, { name: 'AF mix', text: PLAYLIST, addedBy: 'ReelKeeper' }, 1234);
  assert.equal(error, null);
  assert.equal(library.lists.length, 1);
  assert.equal(list.name, 'AF mix');
  assert.equal(list.addedBy, 'ReelKeeper');
  assert.equal(list.addedAt, 1234);
  assert.equal(list.channels.length, 2);
  assert.equal(list.channels[0].tvgId, 'Tolo.tv');
  assert.equal(list.channels[0].group, 'AF|News');
  assert.equal(list.channels[1].tvgId, null);

  const fallback = applyAddPlaylist({ lists: [] }, { text: '#EXTM3U\nhttps://example.com/a.m3u8' }, 0);
  assert.match(fallback.list.name, /^Imported /, 'unnamed uploads get a dated fallback name');
  assert.equal(fallback.list.addedBy, 'Someone');
});

test('applyAddPlaylist rejects bad uploads without changing the library', () => {
  const lib = { lists: [applyAddPlaylist({ lists: [] }, { text: PLAYLIST }, 1).list] };

  assert.equal(applyAddPlaylist(lib, { text: 'just some prose' }).error, 'not_a_playlist');
  assert.equal(applyAddPlaylist(lib, { text: '#EXTM3U\nrtsp://nope' }).error, 'no_channels');
  assert.equal(applyAddPlaylist(lib, { text: '#EXTM3U\n' + 'x'.repeat(IPTV_LIMITS.LIST_TEXT_MAX + 1) }).error, 'text_too_large');

  const huge = '#EXTM3U\n' + Array.from({ length: IPTV_LIMITS.CHANNELS_MAX + 1 }, (_, i) => `https://example.com/${i}.m3u8`).join('\n');
  assert.equal(applyAddPlaylist(lib, { text: huge }).error, 'too_many_channels');
  assert.equal(lib.lists.length, 1, 'rejected uploads leave the library unchanged');

  let full = lib;
  for (let i = full.lists.length; i < IPTV_LIMITS.LISTS_MAX; i++) {
    full = applyAddPlaylist(full, { text: '#EXTM3U\nhttps://example.com/a.m3u8' }, i).library;
  }
  assert.equal(applyAddPlaylist(full, { text: PLAYLIST }).error, 'too_many_lists');
});

test('applyRemoveList removes by id and reports unknown ids', () => {
  const { list } = applyAddPlaylist({ lists: [] }, { name: 'A', text: PLAYLIST }, 1);
  const removed = applyRemoveList({ lists: [list] }, list.id);
  assert.equal(removed.error, null);
  assert.equal(removed.library.lists.length, 0);
  assert.equal(applyRemoveList({ lists: [list] }, 'missing').error, 'list_not_found');
});

test('normalizeIptvLibrary repairs corrupt persisted data', () => {
  const good = applyAddPlaylist({ lists: [] }, { name: 'A', text: PLAYLIST }, 1).list;
  const repaired = normalizeIptvLibrary({
    lists: [
      good,
      null,
      { name: 'empty' },
      { name: 'bad urls', channels: [{ url: 'ftp://nope' }, 'junk'] },
      { channels: [{ url: 'https://ok.example/a.m3u8' }] },
      42,
    ],
  });
  assert.equal(repaired.lists.length, 2);
  assert.equal(repaired.lists[0].channels[0].tvgId, 'Tolo.tv');
  assert.equal(repaired.lists[1].name, 'Untitled list');
  assert.deepEqual(normalizeIptvLibrary(null).lists, []);
  assert.deepEqual(normalizeIptvLibrary({ lists: 'nope' }).lists, []);
});

test('applySetEpg / normalizeEpg sanitize guide data and summaries count honestly', () => {
  const { epg } = applySetEpg({
    name: 'Nightly guide',
    channels: { 'Tolo.tv': { names: ['Tolo TV', '', 42], icon: 'javascript:alert(1)' } },
    programmes: {
      'Tolo.tv': [[Date.UTC(2026, 8, 6, 12), Date.UTC(2026, 8, 6, 13), 'News', '  desc  ']],
      'empty.ch': [[999, 1, 'backwards']],
      'junk.ch': 'not an array',
    },
  }, 77);
  assert.equal(epg.name, 'Nightly guide');
  assert.deepEqual(epg.channels['Tolo.tv'].names, ['Tolo TV']);
  assert.equal(epg.channels['Tolo.tv'].icon, null, 'non-http icons are dropped');
  assert.equal(epg.programmes['Tolo.tv'][0][3], 'desc');
  assert.equal(epg.programmes['empty.ch'], undefined);
  assert.equal(epg.updatedAt, 77);

  const summary = epgSummary(epg);
  assert.deepEqual(summary, { name: 'Nightly guide', updatedAt: 77, channels: 1, programmes: 1 });
  assert.equal(epgSummary(null), null);
  assert.deepEqual(catalogSnapshot({ lists: [], epg }).epg, summary);

  const snapshot = catalogSnapshot({ lists: [{ id: 'l1', name: 'List', addedBy: 'A', channels: [{ url: 'https://x' }] }], epg: null });
  assert.deepEqual(snapshot.lists, [{ id: 'l1', name: 'List', addedBy: 'A', channelCount: 1 }], 'catalog carries metadata, never channel arrays');
  assert.equal(snapshot.epg, null);

  const restored = normalizeEpg({ name: 'G', channels: { a: { names: ['A'] } }, programmes: { a: [[1, 2, 'T']] }, updatedAt: 5 });
  assert.equal(restored.channels.a.names[0], 'A');
  assert.equal(normalizeEpg('junk'), null);
});

test('serializeM3U round-trips through parseM3U including tvg-id', () => {
  const channels = [
    { url: 'https://example.com/tolo.m3u8', name: 'Tolo "TV"', group: 'AF|News', logo: 'https://example.com/l.png', tvgId: 'Tolo.tv' },
    { url: 'https://example.com/bare.m3u8', name: 'Bare', tvgId: null },
  ];
  const text = serializeM3U(channels);
  const parsed = parseM3U(text);
  assert.equal(parsed.recognized, true);
  assert.equal(parsed.entries.length, 2);
  assert.equal(parsed.entries[0].tvgId, 'Tolo.tv');
  assert.equal(parsed.entries[0].name, 'Tolo "TV"');
  assert.equal(parsed.entries[0].group, 'AF|News');
  assert.equal(parsed.entries[1].tvgId, null);
  assert.equal(parsed.entries[1].group, null);
});

test('iptvErrorText speaks player-facing copy for every reason', () => {
  for (const reason of ['too_many_lists', 'text_too_large', 'too_many_channels', 'no_channels', 'not_a_playlist', 'list_not_found', 'whatever']) {
    assert.equal(typeof iptvErrorText(reason), 'string');
    assert.ok(iptvErrorText(reason).length > 0);
  }
});

// --- Integration: HTTP uploads + WS broadcast/snapshot against a real server ---

function tempDir(label) {
  return `/tmp/test-iptv-epg-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function tempPath(label) {
  return `${tempDir(label)}/game-state.json`;
}

async function waitFor(predicate, description, timeout = 5000, step = 25) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (predicate()) return;
    await new Promise((r) => setTimeout(r, step));
  }
  assert.ok(predicate(), `Timed out waiting for: ${description}`);
}

async function listen(label, dataDir = tempDir(label)) {
  const storage = new Storage(tempPath(label));
  const handle = createServer(storage, { dataDir });
  await new Promise((resolve) => handle.server.listen(0, '127.0.0.1', resolve));
  const port = handle.server.address().port;
  return { handle, wsUrl: `ws://127.0.0.1:${port}`, api: `http://127.0.0.1:${port}`, dataDir };
}

function makeClient(wsUrl, guestId, nickname) {
  const ws = new WebSocket(wsUrl);
  const client = { ws, guestId, inbox: [] };
  ws.on('message', (data) => client.inbox.push(parse(data)));
  ws.on('error', () => {});
  ws.on('open', () => ws.send(serialize({ type: MSG_TYPES.HELLO, guestId, nickname })));
  client.joinTheater = () => ws.send(serialize({ type: MSG_TYPES.JOIN_ROOM, roomId: ROOMS.THEATER }));
  client.send = (msg) => ws.send(serialize(msg));
  client.ofType = (type) => client.inbox.filter((m) => m.type === type);
  client.last = (type) => client.ofType(type).at(-1);
  client.lastCatalog = () => client.last(MSG_TYPES.IPTV_STATE)?.iptv;
  client.close = () => {
    try {
      ws.close();
    } catch {}
  };
  return client;
}

function xmltvAroundNow() {
  const t0 = Date.now() - 60_000;
  const t1 = Date.now() + 60 * 60_000;
  const t2 = t1 + 60 * 60_000;
  const fmt = (ms) => {
    const d = new Date(ms);
    const p = (n, w = 2) => String(n).padStart(w, '0');
    return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())} +0000`;
  };
  return `<?xml version="1.0" encoding="UTF-8"?>
<tv>
  <channel id="Tolo.tv"><display-name>Tolo TV</display-name></channel>
  <channel id="Quiet.ch"><display-name>Quiet Channel</display-name></channel>
  <programme start="${fmt(t0)}" stop="${fmt(t1)}" channel="Tolo.tv"><title>On Air Now</title></programme>
  <programme start="${fmt(t1)}" stop="${fmt(t2)}" channel="Tolo.tv"><title>Up Next Show</title></programme>
</tv>`;
}

test('upload playlist over HTTP, share with the room, pull channels, remove', async () => {
  const env = await listen('flow');
  const a = makeClient(env.wsUrl, 'guest_epg_a', 'ReelKeeper');
  const b = makeClient(env.wsUrl, 'guest_epg_b', 'BalconyMouse');
  try {
    await Promise.all([
      waitFor(() => a.last(MSG_TYPES.WELCOME), 'A welcomed'),
      waitFor(() => b.last(MSG_TYPES.WELCOME), 'B welcomed'),
    ]);
    a.joinTheater();
    b.joinTheater();
    await waitFor(() => a.lastCatalog(), 'A join catalog');
    await waitFor(() => b.lastCatalog(), 'B join catalog');
    assert.equal(a.lastCatalog().lists.length, 0, 'library starts empty');

    // Upload over HTTP with a CORS preflight, like the browser does (the
    // browser always sends Origin on preflights).
    const preflight = await fetch(`${env.api}/api/theater/playlists`, {
      method: 'OPTIONS',
      headers: { Origin: 'http://localhost:5173' },
    });
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get('access-control-allow-origin'), 'http://localhost:5173', 'preflight answers CORS');

    const upload = await fetch(`${env.api}/api/theater/playlists?name=AF%20mix&by=ReelKeeper`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: PLAYLIST,
    });
    assert.equal(upload.status, 200);
    const uploadBody = await upload.json();
    assert.equal(uploadBody.list.channelCount, 2);

    await waitFor(() => (a.lastCatalog()?.lists.length || 0) === 1, 'A sees the uploaded list');
    assert.deepEqual(b.lastCatalog().lists, a.lastCatalog().lists, 'the whole room sees the same catalog');
    assert.equal(a.lastCatalog().lists[0].name, 'AF mix');
    assert.equal(a.lastCatalog().lists[0].channelCount, 2, 'catalog metadata only — no channel arrays on the wire');
    assert.ok(!('channels' in a.lastCatalog().lists[0]));

    // Pull the list's channels on demand.
    const listId = a.lastCatalog().lists[0].id;
    a.send({ type: MSG_TYPES.IPTV_LIST_GET, listId });
    await waitFor(() => a.last(MSG_TYPES.IPTV_LIST), 'A pulled channels');
    const pulled = a.last(MSG_TYPES.IPTV_LIST);
    assert.equal(pulled.listId, listId);
    assert.equal(pulled.channels.length, 2);
    assert.equal(pulled.channels[0].tvgId, 'Tolo.tv');

    // Non-importers can browse: B pulls the same list without uploading.
    b.send({ type: MSG_TYPES.IPTV_LIST_GET, listId });
    await waitFor(() => b.last(MSG_TYPES.IPTV_LIST), 'B pulled channels');
    assert.deepEqual(b.last(MSG_TYPES.IPTV_LIST).channels, pulled.channels);

    // Garbage is rejected with the catalog unchanged.
    const bad = await fetch(`${env.api}/api/theater/playlists`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: 'plain prose, not a playlist',
    });
    assert.equal(bad.status, 400);
    assert.equal((await bad.json()).error.length > 0, true);
    await new Promise((r) => setTimeout(r, 50));
    assert.equal(a.lastCatalog().lists.length, 1, 'rejected upload changed nothing');

    // Oversized playlist: rejected before the body is fully read.
    const huge = await fetch(`${env.api}/api/theater/playlists`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: 'x'.repeat(IPTV_LIMITS.LIST_TEXT_MAX + 64),
    });
    assert.equal(huge.status, 413);

    // Anyone in the room may remove a list; the room hears about it.
    a.send({ type: MSG_TYPES.IPTV_LIST_REMOVE, listId: 'missing' });
    await waitFor(() => a.last(MSG_TYPES.ERROR), 'unknown removal errors');
    b.send({ type: MSG_TYPES.IPTV_LIST_REMOVE, listId });
    await waitFor(() => (a.lastCatalog()?.lists.length || 0) === 0, 'A sees the removal B made');
  } finally {
    a.close();
    b.close();
    await new Promise((r) => setTimeout(r, 50));
    env.handle.close();
  }
});

test('import-by-URL is fetched server-side and rejects unsafe schemes', async () => {
  const env = await listen('urlfetch');
  const a = makeClient(env.wsUrl, 'guest_epg_c', 'ReelKeeper');
  try {
    await waitFor(() => a.last(MSG_TYPES.WELCOME), 'A welcomed');
    a.joinTheater();
    await waitFor(() => a.lastCatalog(), 'A join catalog');

    const ftp = await fetch(`${env.api}/api/theater/playlists`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'ftp://example.com/list.m3u8' }),
    });
    assert.equal(ftp.status, 400, 'non-http(s) schemes are refused');

    const dead = await fetch(`${env.api}/api/theater/playlists?name=dead`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'http://127.0.0.1:9/list.m3u8' }),
    });
    assert.equal(dead.status, 502, 'unreachable hosts answer a readable failure');
    assert.equal(a.lastCatalog().lists.length, 0, 'failed fetches change nothing');
  } finally {
    a.close();
    await new Promise((r) => setTimeout(r, 50));
    env.handle.close();
  }
});

test('upload a gzipped program guide, look up now/next, replace guides', async () => {
  const env = await listen('epg');
  const a = makeClient(env.wsUrl, 'guest_epg_d', 'ReelKeeper');
  try {
    await waitFor(() => a.last(MSG_TYPES.WELCOME), 'A welcomed');
    a.joinTheater();
    await waitFor(() => a.lastCatalog(), 'A join catalog');
    assert.equal(a.lastCatalog().epg, null, 'no guide ships with the game');

    // gzipped, like the real-world 4.6 MB guide.epg.gz
    const gz = zlib.gzipSync(Buffer.from(xmltvAroundNow(), 'utf8'));
    const upload = await fetch(`${env.api}/api/theater/epg?name=Nightly%20guide`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: gz,
    });
    assert.equal(upload.status, 200);
    const body = await upload.json();
    assert.equal(body.epg.name, 'Nightly guide');
    assert.equal(body.epg.channels, 1, 'summary counts channels that carry schedule data');

    await waitFor(() => a.lastCatalog()?.epg, 'A sees the active guide');
    assert.equal(a.lastCatalog().epg.name, 'Nightly guide');

    // now/next lookup for a tvg-id key and a display-name key.
    a.send({ type: MSG_TYPES.EPG_LOOKUP, keys: ['Tolo.tv', 'Tolo TV', 'Quiet Channel'] });
    await waitFor(() => a.last(MSG_TYPES.EPG_SCHEDULE), 'schedule reply');
    const entries = a.last(MSG_TYPES.EPG_SCHEDULE).entries;
    assert.equal(entries.length, 3);
    assert.equal(entries[0].now.title, 'On Air Now');
    assert.equal(entries[0].next.title, 'Up Next Show');
    assert.equal(entries[1].now.title, 'On Air Now', 'name fallback matches');
    assert.equal(entries[2].now, null, 'channels without schedule data answer empty');

    // A garbage guide upload is refused and the active guide stays.
    const bad = await fetch(`${env.api}/api/theater/epg`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: Buffer.from('definitely not a guide'),
    });
    assert.equal(bad.status, 400);
    await new Promise((r) => setTimeout(r, 50));
    assert.equal(a.lastCatalog().epg.name, 'Nightly guide', 'failed upload leaves the guide active');

    // A second upload replaces the guide (summary reflects the new one).
    const second = await fetch(`${env.api}/api/theater/epg?name=Replacement`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: Buffer.from(
        `<?xml version="1.0"?><tv><channel id="X1"><display-name>X One</display-name></channel>` +
        `<programme start="20260906120000 +0000" stop="20260906130000 +0000" channel="X1"><title>Solo</title></programme></tv>`,
        'utf8',
      ),
    });
    assert.equal(second.status, 200);
    await waitFor(() => a.lastCatalog()?.epg?.name === 'Replacement', 'guide replaced');
  } finally {
    a.close();
    await new Promise((r) => setTimeout(r, 50));
    env.handle.close();
  }
});

test('library and guide persist across a server restart; corrupt files start empty', async () => {
  const dataDir = tempDir('persist');
  const env = await listen('persist', dataDir);
  try {
    const upload = await fetch(`${env.api}/api/theater/playlists?name=Persisted`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: PLAYLIST,
    });
    assert.equal(upload.status, 200);
    const epgUpload = await fetch(`${env.api}/api/theater/epg?name=Kept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: Buffer.from(xmltvAroundNow(), 'utf8'),
    });
    assert.equal(epgUpload.status, 200);
  } finally {
    env.handle.close();
    await new Promise((r) => setTimeout(r, 50));
  }
  assert.ok(fs.existsSync(`${dataDir}/iptv.json`), 'library has its own data file');
  assert.ok(fs.existsSync(`${dataDir}/epg.json`), 'guide has its own data file');

  // Restart: a fresh server over the same data dir presents the same catalog.
  const env2 = await listen('persist2', dataDir);
  const a = makeClient(env2.wsUrl, 'guest_epg_e', 'BalconyMouse');
  try {
    await waitFor(() => a.last(MSG_TYPES.WELCOME), 'welcomed after restart');
    const welcomeCatalog = a.last(MSG_TYPES.WELCOME).iptv;
    assert.equal(welcomeCatalog.lists.length, 1);
    assert.equal(welcomeCatalog.lists[0].name, 'Persisted');
    assert.equal(welcomeCatalog.epg.name, 'Kept', 'guide survives the restart');

    // game-state.json stays out of the guide/library business (the file may
    // not even exist when nothing else persisted — that is fine too).
    const statePath = `${dataDir}/game-state.json`;
    if (fs.existsSync(statePath)) {
      assert.equal(JSON.parse(fs.readFileSync(statePath, 'utf8')).iptv, undefined);
    }
  } finally {
    a.close();
    await new Promise((r) => setTimeout(r, 50));
    env2.handle.close();
  }

  // Corrupt data files degrade to empty instead of crashing.
  fs.writeFileSync(`${dataDir}/iptv.json`, '{{{not json');
  fs.writeFileSync(`${dataDir}/epg.json`, '[[[broken');
  const env3 = await listen('persist3', dataDir);
  const b = makeClient(env3.wsUrl, 'guest_epg_f', 'QuietMouse');
  try {
    await waitFor(() => b.last(MSG_TYPES.WELCOME), 'welcomed over corrupt data');
    const catalog = b.last(MSG_TYPES.WELCOME).iptv;
    assert.deepEqual(catalog.lists, []);
    assert.equal(catalog.epg, null);
  } finally {
    b.close();
    await new Promise((r) => setTimeout(r, 50));
    env3.handle.close();
  }
});
