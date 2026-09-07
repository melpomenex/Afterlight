/**
 * Parity fixtures for shared/identity.js (nickname + palette hazards),
 * server/nodes.js + server/machines.js (restoration), server/youtubePlaylist.js
 * (pure extraction core), and shared/protocol.js (parse/serialize).
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
import { NodesManager } from '../../server/nodes.js';
import { isMillRestoredInState, MachinesManager } from '../../server/machines.js';
import { isYouTubeMixId, looksLikePlaylistId, extractPlaylistVideos } from '../../server/youtubePlaylist.js';
import { parse, serialize } from '../../shared/protocol.js';
import { recordCall, recordScript } from './harness.mjs';

const T0 = 1_700_000_000_000;

const DEFAULT_NICK_SHAPE = /^[A-Z][a-z]+[A-Z][a-z]+\d\d$/;
const maskNick = (v) => (typeof v === 'string' && DEFAULT_NICK_SHAPE.test(v) ? '<generated>' : v);
const maskWren = (v) => (typeof v === 'string' && /^wren\d{3,}$/.test(v) ? '<generated>' : v);

function stubStorage() {
  return { state: {}, save() {} };
}

function newNodesManager() {
  return new NodesManager(stubStorage());
}

function newMachinesManager() {
  return new MachinesManager(stubStorage());
}

// Named step helpers (the recorded fn name is the Elixir dispatch key)
const nodesHarvest = (mgr, nodeId, now) => mgr.harvest(nodeId, now);
const nodesIsDepleted = (mgr, nodeId, now) => ({ depleted: mgr.isDepleted(nodeId, now) });
const nodesReap = (mgr, at) => {
  mgr.reapExpired(at);
  return { nodes: mgr.storage.state.nodes };
};
const nodesDistrictStates = (mgr) => {
  mgr.harvest('trestle_timber_cache', T0);
  return mgr.getStatesForDistrict('trestle', T0 + 1000);
};
const millContribute = (mgr, p, material, quantity) => mgr.contribute(p, material, quantity, T0);
const millWheat = (mgr, p, quantity) => mgr.millWheat(p, quantity);
const millCraft = (mgr, p, fixture) => mgr.craft(p, fixture);
const millSnapshot = (mgr) => mgr.mill;
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

function player(materials, produce = {}) {
  return {
    id: 'p1', nickname: 'Parity', coins: 100, xp: 0, level: 1, reputation: 10,
    reservedCoins: 0, materials, inventory: { seeds: {}, produce, reservedProduce: {}, sprinklers: 0 },
    currentRoom: 'market', lastSeen: T0,
  };
}

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
  nickInputs.push('punctuation!@#$%^&*()_+'); // [\w\s-] whitelist stripping
  for (const [i, input] of nickInputs.entries()) {
    cases.push(recordCall({ id: `nick/sanitize-${i}`, fn: sanitizeNickname, args: [input], mask: maskNick }));
  }

  // <3-char fallback with pinned seed
  cases.push(recordCall({ id: 'nick/sanitize-fallback-pinned-empty', fn: sanitizeNickname, args: [''], seed: 0.5 }));
  cases.push(recordCall({ id: 'nick/sanitize-fallback-pinned-short', fn: sanitizeNickname, args: ['ab'], seed: 0.1 }));

  // lower() vs toLowerCase() divergence / ASCII guarantee cases
  for (const [i, unicodeInput] of ['MÖSSY', 'İpek', 'straße', 'éclat', 'Ωmega'].entries()) {
    cases.push(recordCall({ id: `nick/divergence-ascii-${i}`, fn: sanitizeNickname, args: [unicodeInput] }));
  }

  // resolveDuplicateNickname: free base, ladder 2..99 in order, exhausted ladder with pinned seed, lowercase collision, active vs historical
  const ladder = new Set(['wren', ...Array.from({ length: 98 }, (_, i) => `wren${i + 2}`)]);
  cases.push(recordCall({ id: 'nick/dup-free-base', fn: resolveDuplicateNickname, args: ['wren', new Set(['other'])] }));
  cases.push(recordCall({ id: 'nick/dup-two', fn: resolveDuplicateNickname, args: ['wren', new Set(['wren'])] }));
  cases.push(recordCall({ id: 'nick/dup-ladder-three', fn: resolveDuplicateNickname, args: ['wren', new Set(['wren', 'wren2'])] }));
  cases.push(recordCall({ id: 'nick/dup-case', fn: resolveDuplicateNickname, args: ['Wren', new Set(['wren'])] }));
  cases.push(recordCall({ id: 'nick/dup-case-candidate', fn: resolveDuplicateNickname, args: ['Wren', new Set(['wren', 'wren2'])] }));
  cases.push(recordCall({ id: 'nick/dup-active-vs-historical', fn: resolveDuplicateNickname, args: ['wren', new Set(['historical_other'])] }));
  cases.push(recordCall({ id: 'nick/dup-ladder-exhausted', fn: resolveDuplicateNickname, args: ['wren', ladder], mask: maskWren }));
  cases.push(recordCall({ id: 'nick/dup-ladder-exhausted-pinned', fn: resolveDuplicateNickname, args: ['wren', ladder], seed: 0.5 }));

  const palettes = ['guest_abc123', 'Astral🌟Id', '\u{1F3AF}\u{1F3AF}', '', 'x'];
  for (const [i, id] of palettes.entries()) {
    cases.push(recordCall({ id: `palette/${i}`, fn: generatePlayerPalette, args: [id] }));
  }

  // ------------------------------------------------------------------
  // nodes — depletion boundaries, respawn, reap (fixed clock)
  // ------------------------------------------------------------------
  const NODE = 'foundry_copper_cache';
  cases.push(recordScript({
    id: 'nodes/harvest-and-deplete',
    steps: [
      { fn: newNodesManager, args: [] },
      { fn: nodesHarvest, args: ['<prev>', NODE, T0] },
      { fn: nodesIsDepleted, args: ['<prev>', NODE, T0 + 1] },
      { fn: nodesIsDepleted, args: ['<prev>', NODE, T0 + 179_999] },
      { fn: nodesIsDepleted, args: ['<prev>', NODE, T0 + 180_000] },
      { fn: nodesHarvest, args: ['<prev>', NODE, T0 + 1000] },
      { fn: nodesReap, args: ['<prev>', T0 + 180_001] },
    ],
    keepPrev: true,
  }));
  cases.push(recordScript({
    id: 'nodes/unknown-node',
    steps: [
      { fn: newNodesManager, args: [] },
      { fn: nodesHarvest, args: ['<prev>', 'made_up_node', T0] },
    ],
    keepPrev: true,
  }));
  cases.push(recordScript({
    id: 'nodes/district-states',
    steps: [
      { fn: newNodesManager, args: [] },
      { fn: nodesDistrictStates, args: ['<prev>'] },
    ],
    keepPrev: true,
  }));

  // ------------------------------------------------------------------
  // machines — contribute clamps, restore-in-same-step, mill order, craft
  // ------------------------------------------------------------------
  cases.push(recordScript({
    id: 'mill/contribute-clamp-matrix',
    steps: [
      { fn: newMachinesManager, args: [] },
      { fn: millContribute, args: ['<prev>', player({ copper: 3, timber: 0, glass: 0 }), 'copper', 2] },
      { fn: millContribute, args: ['<prev>', player({ copper: 3, timber: 0, glass: 0 }), 'copper', 5] },
      { fn: millContribute, args: ['<prev>', player({ copper: 1 }), 'gold', 1] },
      { fn: millContribute, args: ['<prev>', player({ copper: 1 }), 'copper', 0] },
      { fn: millContribute, args: ['<prev>', player({ copper: 1 }), 'copper', 1.5] },
      { fn: millContribute, args: ['<prev>', player({ timber: 4 }), 'timber', 4] },
      { fn: millContribute, args: ['<prev>', player({ glass: 4 }), 'glass', 4] },
      { fn: millContribute, args: ['<prev>', player({ copper: 1 }), 'copper', 1] },
      { fn: millSnapshot, args: ['<prev>'] },
    ],
    keepPrev: true,
  }));

  cases.push(recordScript({
    id: 'mill/wheat-consume-order',
    steps: [
      { fn: newMachinesManager, args: [] },
      { fn: millSnapshot, args: ['<prev>'] },
      { fn: millWheat, args: ['<prev>', player({}, { wheat_C: 2, wheat_B: 2, wheat_A: 1, wheat_Aplus: 3 }), 5] },
      { fn: millWheat, args: ['<prev>', player({}, { wheat_Aplus: 1 }), 2] },
      { fn: millWheat, args: ['<prev>', player({}), 1] },
    ],
    keepPrev: true,
  }));

  cases.push(recordScript({
    id: 'mill/craft-sprinkler',
    steps: [
      { fn: newMachinesManager, args: [] },
      { fn: millCraft, args: ['<prev>', player({ copper: 2, glass: 2 }), 'sprinkler'] },
      { fn: millCraft, args: ['<prev>', player({ copper: 2, glass: 1 }), 'sprinkler'] },
      { fn: millCraft, args: ['<prev>', player({ copper: 9, glass: 9 }), 'ladder'] },
    ],
    keepPrev: true,
  }));

  cases.push(recordCall({ id: 'mill/restored-predicate', fn: isMillRestoredInState, args: [{ machines: { mill: { status: 'restored' } } }] }));
  cases.push(recordCall({ id: 'mill/restored-predicate-broken', fn: isMillRestoredInState, args: [{ machines: { mill: { status: 'broken' } } }] }));
  cases.push(recordCall({ id: 'mill/restored-predicate-empty', fn: isMillRestoredInState, args: [{}] }));

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
  'generated-ids': ['nick/dup-ladder-exhausted', 'nick/sanitize-7', 'nick/sanitize-8'],
  'error-strings': ['nodes/*', 'mill/*', 'yt/*'],
  'key-order': ['yt/classic-renderers', 'yt/lockup-view-models'],
  'timestamps': ['nodes/*'],
  'number-coercion': ['mill/contribute-clamp-matrix', 'protocol/parse-*'],
  'json-roundtrip': ['protocol/*'],
};
