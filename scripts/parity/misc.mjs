/**
 * Parity fixtures for shared/identity.js (nickname + palette hazards),
 * server/youtubePlaylist.js (pure extraction core), and shared/protocol.js
 * (parse/serialize).
 *
 * Random-fallback masking: sanitizeNickname / resolveDuplicateNickname fall
 * back to generated names when input is too short or the dedup ladder
 * exhausts. Those results are masked to "<generated>" by shape — the parity
 * contract is "some default nickname is produced", not its exact value.
 */

import {
  generateDefaultNickname,
  generatePlayerPalette,
  resolveDuplicateNickname,
  sanitizeNickname,
} from '../../shared/identity.js';
import { isYouTubeMixId, looksLikePlaylistId, extractPlaylistVideos } from '../../server/youtubePlaylist.js';
import { parse, serialize } from '../../shared/protocol.js';
import { recordCall } from './harness.mjs';

const T0 = 1_700_000_000_000;

const DEFAULT_NICK_SHAPE = /^[A-Z][a-z]+[A-Z][a-z]+\d\d$/;
const maskNick = (v) => (typeof v === 'string' && DEFAULT_NICK_SHAPE.test(v) ? '<generated>' : v);
const maskWren = (v) => (typeof v === 'string' && /^wren\d{3,}$/.test(v) ? '<generated>' : v);

function pinRandom(seed, fn) {
  const wrapped = (...args) => {
    const real = Math.random;
    Math.random = () => seed;
    try {
      return fn(...args);
    } finally {
      Math.random = real;
    }
  };
  Object.defineProperty(wrapped, 'name', { value: fn.name });
  return wrapped;
}

function resolveDup(desired, activeList) {
  return resolveDuplicateNickname(desired, new Set(activeList));
}
Object.defineProperty(resolveDup, 'name', { value: 'resolveDuplicateNickname' });

function nickList(set) {
  return [...set];
}

const roundtripMsg = (msg) => parse(serialize(msg));
const serializeMsg = (msg) => serialize(msg);

function ytHtml(inner) {
  return `<html><script>var ytInitialData = ${JSON.stringify(inner)};</script></html>`;
}

const playlistRenderer = (videoId, title) => ({
  playlistVideoRenderer: { videoId, title: { runs: [{ text: title }] } },
});
const lockupRenderer = (videoId, title) => ({
  lockupViewModel: {
    contentType: 'LOCKUP_CONTENT_TYPE_VIDEO',
    contentId: videoId,
    metadata: { lockupMetadataViewModel: { title: { content: title } } },
  },
});
function build() {
  const cases = [];

  // ------------------------------------------------------------------
  // identity — libm trig seeds, UTF-16 truncation, dedup ladder, 32-bit mask
  // ------------------------------------------------------------------
  for (const seed of [0, 0.1, 0.5, 0.999]) {
    cases.push(recordCall({ id: `nick/default-seed-${seed}`, fn: generateDefaultNickname, args: [seed], seed }));
  }
  const nickInputs = ['plain', '  spaced   name  ', '<b>Bold</b>name', 'control\x01char', 'idemi_'];
  nickInputs.push('🌟'.repeat(25)); // astral-only: 50 UTF-16 units → sliced at 20
  nickInputs.push(`ab${'🌟'.repeat(12)}`); // short after byte-think, 26 units → 20
  nickInputs.push('AB'.repeat(12));
  nickInputs.push('');
  nickInputs.push('a');
  for (const [i, input] of nickInputs.entries()) {
    const seed = 0.42;
    const fn = (i === 5 || i === 6 || i === 8 || i === 9) ? pinRandom(seed, sanitizeNickname) : sanitizeNickname;
    cases.push(recordCall({
      id: `nick/sanitize-${i}`,
      fn,
      args: [input],
      ...(fn !== sanitizeNickname ? { seed } : {}),
      mask: fn === sanitizeNickname ? maskNick : undefined,
    }));
  }
  // UTF-16 truncation keeps remaining ASCII; astral pair counts as 2 units.
  cases.push(recordCall({
    id: 'nick/sanitize-utf16-keep-ascii',
    fn: sanitizeNickname,
    args: [`Hello${'🌟'.repeat(6)}WorldExtra`],
  }));
  // Post-sanitize output is ASCII [\w\s-], so SQL lower() and JS toLowerCase agree.
  cases.push(recordCall({
    id: 'nick/ascii-only-after-sanitize',
    fn: sanitizeNickname,
    args: ['Bright🌟Lantern!!! Café'],
  }));
  const ladder = nickList(new Set(['wren', ...Array.from({ length: 98 }, (_, i) => `wren${i + 2}`)]));
  const exhaustedSeed = 0.5;
  cases.push(recordCall({
    id: 'nick/dup-ladder-exhausted',
    fn: pinRandom(exhaustedSeed, resolveDup),
    args: ['wren', ladder],
    seed: exhaustedSeed,
  }));
  cases.push(recordCall({ id: 'nick/dup-free-base', fn: resolveDup, args: ['wren', nickList(new Set(['other']))] }));
  cases.push(recordCall({ id: 'nick/dup-two', fn: resolveDup, args: ['wren', nickList(new Set(['wren']))] }));
  cases.push(recordCall({ id: 'nick/dup-ladder-mid', fn: resolveDup, args: ['wren', nickList(new Set(['wren', 'wren2']))] }));
  cases.push(recordCall({ id: 'nick/dup-case', fn: resolveDup, args: ['Wren', nickList(new Set(['wren']))] }));
  cases.push(recordCall({
    id: 'nick/dup-historical-ignored',
    fn: resolveDup,
    args: ['MistyCompass94', nickList(new Set(['liveOther']))],
  }));
  const palettes = ['guest_abc123', 'Astral🌟Id', '\u{1F3AF}\u{1F3AF}', '', 'x'];
  for (const [i, id] of palettes.entries()) {
    cases.push(recordCall({ id: `palette/${i}`, fn: generatePlayerPalette, args: [id] }));
  }

  // ------------------------------------------------------------------
  // youtubePlaylist — pure extraction core
  // ------------------------------------------------------------------
  cases.push(recordCall({
    id: 'yt/classic-renderers',
    fn: extractPlaylistVideos,
    args: [ytHtml({
      title: 'Parity List',
      contents: [playlistRenderer('vid00000001', 'One'), playlistRenderer('vid00000002', 'Two'), playlistRenderer('vid00000001', 'One Again')],
    })],
  }));
  cases.push(recordCall({
    id: 'yt/lockup-view-models',
    fn: extractPlaylistVideos,
    args: [ytHtml({
      header: { pageHeaderViewModel: { metadata: { contentPageViewModel: { title: { content: 'Lockups' } } } } },
      contents: [lockupRenderer('lock00000001', 'L1'), { lockupViewModel: { contentType: 'LOCKUP_CONTENT_TYPE_PLAYLIST', contentId: 'PLxxx' } }, lockupRenderer('lock00000002', 'L2')],
    })],
  }));
  cases.push(recordCall({ id: 'yt/no-initial-data', fn: extractPlaylistVideos, args: ['<html>nothing</html>'] }));
  cases.push(recordCall({ id: 'yt/damaged-json', fn: extractPlaylistVideos, args: ['<script>var ytInitialData = {broken;;</script>'] }));
  cases.push(recordCall({
    id: 'yt/dedupe-keeps-first',
    fn: extractPlaylistVideos,
    args: [ytHtml({
      contents: Array.from({ length: 12 }, (_, i) => playlistRenderer(`v${String(i).padStart(9, '0')}`, `V${i}`)).concat([playlistRenderer('v000000000', 'Dup')]),
    })],
  }));
  cases.push(recordCall({ id: 'yt/mix-id-rd', fn: isYouTubeMixId, args: ['RD12345678901'] }));
  cases.push(recordCall({ id: 'yt/mix-id-ul', fn: isYouTubeMixId, args: ['UL12345678901'] }));
  cases.push(recordCall({ id: 'yt/mix-id-no', fn: isYouTubeMixId, args: ['PL12345678901'] }));
  cases.push(recordCall({ id: 'yt/listid-short', fn: looksLikePlaylistId, args: ['PL123456789'] }));
  cases.push(recordCall({ id: 'yt/listid-chars', fn: looksLikePlaylistId, args: ['PL12345678901'] }));
  cases.push(recordCall({ id: 'yt/listid-bad-chars', fn: looksLikePlaylistId, args: ['PL12345/8901!!'] }));

  // ------------------------------------------------------------------
  // protocol — parse robustness, serialize round-trip
  // ------------------------------------------------------------------
  cases.push(recordCall({ id: 'protocol/parse-valid', fn: parse, args: ['{"type":"movement","x":1.5,"z":-2}'] }));
  cases.push(recordCall({ id: 'protocol/parse-truncated', fn: parse, args: ['{"type":"movement"'] }));
  cases.push(recordCall({ id: 'protocol/parse-not-json', fn: parse, args: ['hello'] }));
  cases.push(recordCall({ id: 'protocol/parse-empty', fn: parse, args: [''] }));
  cases.push(recordCall({ id: 'protocol/parse-primitive', fn: parse, args: ['42'] }));
  cases.push(recordCall({ id: 'protocol/serialize-roundtrip', fn: roundtripMsg, args: [{ type: 'theater_state', theater: { now: null, queue: [] }, serverNow: T0 }] }));
  cases.push(recordCall({ id: 'protocol/serialize-integral-float', fn: serializeMsg, args: [{ type: 'movement', x: 1.0, z: -0.5 }] }));

  return cases;
}

export const miscCases = build();
export const miscHazards = {
  'bitops32': ['palette/*'],
  'utf16-slicing': ['nick/sanitize-*', 'palette/*'],
  'libm-trig': ['nick/default-seed-*'],
  'generated-ids': ['nick/dup-ladder-exhausted', 'nick/sanitize-5', 'nick/sanitize-8', 'nick/sanitize-9'],
  'ascii-folding': ['nick/ascii-only-after-sanitize', 'nick/dup-case'],
  'error-strings': ['yt/*'],
  'key-order': ['yt/classic-renderers', 'yt/lockup-view-models'],
  'number-coercion': ['protocol/parse-*'],
  'json-roundtrip': ['protocol/*'],
};
