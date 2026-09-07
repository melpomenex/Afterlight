/**
 * Parity fixtures for shared/iptvModel.js and shared/xmltv.js — library
 * limits, guide caps, key-order hazards, timezone math, and M3U round-trip.
 */

import {
  applyAddPlaylist,
  applyRemoveList,
  applySetEpg,
  catalogSnapshot,
  epgSummary,
  normalizeEpg,
  normalizeIptvLibrary,
  sanitizeChannels,
  serializeM3U,
} from '../../shared/iptvModel.js';
import {
  createEpgIndex,
  decodeEntities,
  lookupNowNext,
  normalizeChannelKey,
  nowNextForId,
  parseXmltv,
  parseXmltvTime,
  resolveEpgKey,
} from '../../shared/xmltv.js';
import { parseM3U } from '../../shared/theaterModel.js';
import { recordCall } from './harness.mjs';

const T0 = 1_700_000_000_000;

const M3U = (lines) => `#EXTM3U\n${lines.join('\n')}\n`;

const SAMPLE_CHANNELS = [
  { url: 'http://a.example/one', name: 'Alpha', group: 'News', logo: 'http://a.example/1.png', tvgId: 'alpha.tv' },
  { url: 'http://b.example/two', name: 'Beta', group: 'Sports', logo: null, tvgId: null },
  { url: 'https://c.example/three', name: 'Gamma', group: null, logo: 'https://c.example/3.png', tvgId: 'gamma.tv' },
];

function sampleEpg() {
  return {
    name: 'Sample Guide',
    updatedAt: T0,
    channels: {
      'alpha.tv': { names: ['Alpha', 'Alpha HD'], icon: 'http://a.example/1.png' },
      'gamma.tv': { names: ['Gamma'], icon: null },
      'delta.tv': { names: ['Delta'], icon: null },
    },
    programmes: {
      'alpha.tv': [
        [T0 - 3_600_000, T0 + 1_800_000, 'Morning News'],
        [T0 + 1_800_000, T0 + 3_600_000, 'Noon Bulletin', 'with guests'],
      ],
      'gamma.tv': [[T0 + 10_000, T0 + 20_000, 'Late Slot']],
      'delta.tv': [[T0 - 10_000, T0 - 5_000, 'Ended Show']],
    },
  };
}

async function build() {
  const cases = [];

  // ------------------------------------------------------------------
  // iptvModel: channels, library actions, catalog metadata
  // ------------------------------------------------------------------
  cases.push(recordCall({ id: 'channels/sanitize-valid', fn: sanitizeChannels, args: [SAMPLE_CHANNELS, 100] }));
  cases.push(recordCall({
    id: 'channels/sanitize-drops-and-counts',
    fn: sanitizeChannels,
    args: [[
      { url: 'ftp://bad/x', name: 'Nope' },
      { url: 'http://ok/a', name: '' },
      { url: 'http://ok/b' },
      { name: 'no url' },
      { url: 'http://ok/c', name: 'Named', group: 'G', logo: 'javascript:alert(1)', tvgId: 'c.tv' },
    ], 100],
  }));
  cases.push(recordCall({ id: 'channels/cap-3', fn: sanitizeChannels, args: [Array.from({ length: 8 }, (_, i) => ({ url: `http://x/${i}`, name: `C${i}` })), 3] }));

  cases.push(recordCall({
    id: 'library/add-valid',
    fn: applyAddPlaylist,
    args: [{ lists: [] }, { name: 'Core Mix', text: M3U(['#EXTINF:-1 tvg-id="one.tv",One\nhttp://one/stream', 'http://two/stream']), addedBy: 'tester' }],
    nowMs: T0,
  }));
  cases.push(recordCall({ id: 'library/add-not-playlist', fn: applyAddPlaylist, args: [{ lists: [] }, { name: 'X', text: 'hello' }], nowMs: T0 }));
  cases.push(recordCall({ id: 'library/add-no-channels', fn: applyAddPlaylist, args: [{ lists: [] }, { name: 'X', text: '#EXTM3U\n' }], nowMs: T0 }));
  cases.push(recordCall({ id: 'library/add-text-too-large', fn: applyAddPlaylist, args: [{ lists: [] }, { name: 'X', text: 'x'.repeat(8 * 1024 * 1024 + 1) }], nowMs: T0 }));
  cases.push(recordCall({ id: 'library/add-too-many-lists', fn: applyAddPlaylist, args: [{ lists: Array.from({ length: 24 }, (_, i) => ({ id: `l${i}`, channels: [] })) }, { name: 'X', text: M3U(['http://one/stream']) }], nowMs: T0 }));
  cases.push(recordCall({
    id: 'library/add-too-many-channels',
    fn: applyAddPlaylist,
    args: [{ lists: [] }, {
      name: 'Huge',
      text: M3U(Array.from({ length: 20_001 }, (_, i) => [`#EXTINF:-1,C${i}`, `http://x/${i}`]).flat()),
    }],
    nowMs: T0,
  }));
  cases.push(recordCall({ id: 'library/remove-hit', fn: applyRemoveList, args: [{ lists: [{ id: 'keep', channels: [] }, { id: 'gone', channels: [] }] }, 'gone'] }));
  cases.push(recordCall({ id: 'library/remove-miss', fn: applyRemoveList, args: [{ lists: [{ id: 'keep', channels: [] }] }, 'nope'] }));
  cases.push(recordCall({
    id: 'library/normalize-repairs',
    fn: normalizeIptvLibrary,
    args: [{ lists: [null, { id: '', name: 'X', channels: 'nope', addedAt: 'nope' }, { id: 'ok', name: 'Ok', addedBy: 'a', addedAt: T0, channels: [{ url: 'http://ok/1', name: 'N' }] }] }],
    nowMs: T0,
  }));
  cases.push(recordCall({ id: 'catalog/snapshot', fn: catalogSnapshot, args: [{ lists: [{ id: 'l1', name: 'List', addedBy: 'a', addedAt: T0, channels: SAMPLE_CHANNELS }], epg: sampleEpg() }] }));
  cases.push(recordCall({ id: 'catalog/epg-summary', fn: epgSummary, args: [sampleEpg()] }));

  // serializeM3U ↔ parseM3U round-trip
  cases.push(recordCall({ id: 'm3u/serialize', fn: serializeM3U, args: [SAMPLE_CHANNELS] }));
  const serialized = serializeM3U(SAMPLE_CHANNELS);
  cases.push(recordCall({ id: 'm3u/round-trip', fn: parseM3U, args: [serialized] }));

  // ------------------------------------------------------------------
  // applySetEpg — unsorted programmes in, sorted out; caps; entities
  // ------------------------------------------------------------------
  cases.push(recordCall({
    id: 'epg/set-unsorted-sorts',
    fn: applySetEpg,
    args: [{
      name: 'Guide',
      channels: { 'z.tv': { names: ['Zed'] } },
      programmes: {
        'z.tv': [
          [T0 + 3_000, T0 + 4_000, 'Later'],
          [T0 + 1_000, T0 + 2_000, 'Sooner'],
          [T0 + 2_000, T0 + 1_000, 'Backwards dropped'],
          [T0 + 2_000, T0 + 2_500, 'Middle'],
        ],
      },
    }],
    nowMs: T0,
  }));
  cases.push(recordCall({
    id: 'epg/set-entities-and-caps',
    fn: applySetEpg,
    args: [{
      name: 'Guide',
      channels: { 'e.tv': { names: ['&amp; <Echo>'] } },
      programmes: { 'e.tv': [[T0, T0 + 1_000, `Title ${'x'.repeat(250)}`, `Desc ${'y'.repeat(250)}`]] },
    }],
    nowMs: T0,
  }));
  cases.push(recordCall({ id: 'epg/normalize-null-guide', fn: normalizeEpg, args: [null], nowMs: T0 }));

  // ------------------------------------------------------------------
  // xmltv: parseXmltvTime — tz offsets, Date.UTC rollover semantics
  // ------------------------------------------------------------------
  const times = [
    ['utc', '20231114093000 +0000'],
    ['utc-short', '202311140930 +0000'],
    ['positive-offset', '20231114120000 +0530'],
    ['positive-colon', '20231114120000 +05:30'],
    ['negative-offset', '20231114040000 -0800'],
    ['no-tz', '20231114093000'],
    ['seconds-discarded', '20231114093059 +0000'],
    ['rollover-month13', '20231301120000 +0000'],
    ['rollover-day0', '20231100120000 +0000'],
    ['rollover-hour25', '202311142500 +0000'],
    ['garbage', 'not-a-time'],
    ['empty', ''],
    ['truncated', '2023'],
  ];
  for (const [name, value] of times) {
    cases.push(recordCall({ id: `time/${name}`, fn: parseXmltvTime, args: [value] }));
  }

  cases.push(recordCall({ id: 'entities/decode', fn: decodeEntities, args: ['A &amp; B &lt;tag&gt; &#65; &#x42; &amp;amp; &unknown;'] }));

  // parseXmltv end-to-end (async but deterministic)
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<tv generator-info-name="t">
  <channel id="alpha.tv"><display-name>Alpha</display-name><display-name>Alpha HD</display-name><icon src="http://a.example/1.png"/></channel>
  <channel id="gamma.tv"><display-name>&#71;amma</display-name></channel>
  <programme start="20231114080000 +0000" stop="20231114090000 +0000" channel="alpha.tv"><title>One</title><desc>First</desc></programme>
  <programme start="20231114090000 +0000" stop="20231114100000 +0000" channel="alpha.tv"><title>Two</title></programme>
  <programme start="20231114090000 +0000" stop="20231114080000 +0000" channel="gamma.tv"><title>Backwards</title></programme>
</tv>`;
  cases.push(recordCall({ id: 'xmltv/parse-small', fn: (text) => parseXmltv(text), args: [xml] }));
  cases.push(recordCall({ id: 'xmltv/parse-empty', fn: (text) => parseXmltv(text), args: ['<html><body>nope</body></html>'] }));

  // Key-order hazard: first-wins on duplicate normalized names
  cases.push(recordCall({
    id: 'xmltv/index-first-wins',
    fn: (epg) => createEpgIndex(epg),
    args: [{
      channels: {
        'id-b': { names: ['Dup Name'] },
        'id-a': { names: ['Dup Name'] },
        'id-c': { names: ['  Dup  Name! '] },
        'solo': { names: ['Solo'] },
      },
      programmes: {},
    }],
  }));
  cases.push(recordCall({ id: 'xmltv/key-normalize', fn: normalizeChannelKey, args: ['  Alpha TV (HD)! '] }));
  cases.push(recordCall({ id: 'xmltv/key-nonlatin', fn: normalizeChannelKey, args: ['日本テレビ'] }));

  // resolveEpgKey + now/next boundaries + lookup caps
  const epg = sampleEpg();
  const index = createEpgIndex(epg);
  cases.push(recordCall({ id: 'xmltv/resolve-by-id', fn: (idx, k) => resolveEpgKey(idx, k), args: [index, 'alpha.tv'] }));
  cases.push(recordCall({ id: 'xmltv/resolve-by-name', fn: (idx, k) => resolveEpgKey(idx, k), args: [index, 'gamma'] }));
  cases.push(recordCall({ id: 'xmltv/resolve-miss', fn: (idx, k) => resolveEpgKey(idx, k), args: [index, 'nope'] }));
  cases.push(recordCall({ id: 'nownext/current', fn: (idx, id, at) => nowNextForId(idx, id, at), args: [index, 'alpha.tv', T0] }));
  cases.push(recordCall({ id: 'nownext/exact-start', fn: (idx, id, at) => nowNextForId(idx, id, at), args: [index, 'alpha.tv', T0 + 1_800_000] }));
  cases.push(recordCall({ id: 'nownext/exact-stop', fn: (idx, id, at) => nowNextForId(idx, id, at), args: [index, 'alpha.tv', T0 + 3_600_000] }));
  cases.push(recordCall({ id: 'nownext/future-only', fn: (idx, id, at) => nowNextForId(idx, id, at), args: [index, 'gamma.tv', T0] }));
  cases.push(recordCall({ id: 'nownext/past-only', fn: (idx, id, at) => nowNextForId(idx, id, at), args: [index, 'delta.tv', T0] }));
  cases.push(recordCall({ id: 'nownext/unknown-id', fn: (idx, id, at) => nowNextForId(idx, id, at), args: [index, 'nope.tv', T0] }));
  cases.push(recordCall({
    id: 'lookup/order-and-cap',
    fn: (idx, keys, at, max) => lookupNowNext(idx, keys, at, max),
    args: [index, ['alpha.tv', 'gamma.tv', 'delta.tv', 'nope.tv', 'alpha'], T0, 3],
  }));

  return cases;
}

export async function catalogCases() {
  return build();
}
export const catalogHazards = {
  'key-order': ['xmltv/index-first-wins', 'epg/set-unsorted-sorts'],
  'timestamps-rollover': ['time/*'],
  'utf16-slicing': ['epg/set-entities-and-caps'],
  'number-coercion': ['library/normalize-repairs'],
  'error-strings': ['library/*', 'channels/*'],
  'locale-excluded': ['library/add-*'],
};
