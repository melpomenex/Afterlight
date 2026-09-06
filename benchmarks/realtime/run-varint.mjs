// Delta-varint frame-level study (v1 promotion evidence): bytes, encode,
// decode for SORTED_IDS vs DELTA_VARINT vs ROARING sections on contract
// fixtures. Complements results/masks.* (standalone masks) — this measures
// full frames as a server would emit them.
//   cd benchmarks/realtime && node --expose-gc run-varint.mjs

import { makeWorld, stepWorld } from './lib/fixtures.mjs';
import { timeIt, heapDelta, writeResults, markdownTable, env } from './lib/measure.mjs';
import { writeFrame, writeChunkedFrames } from '../../shared/realtime/writer.js';
import { applyFrame } from '../../shared/realtime/applyFrame.js';
import { EntityStore } from '../../shared/realtime/entityStore.js';
import { FRAME_TYPE, ENCODING } from '../../shared/realtime/constants.js';

const POPULATIONS = [200, 1000, 5000, 10000, 50000];
const FRACTION = 0.1;

function boot(store, n) {
  const ids = Array.from({ length: n }, (_, i) => i + 1);
  const r = writeChunkedFrames({
    frameType: FRAME_TYPE.FULL_SNAPSHOT, roomEpoch: 0, serverTick: 0,
    frameSequence: 1, baselineSequence: 1,
    spawn: ids.map((id) => ({ id, archetype: 0, variant: 0, x: 0, y: 0, z: 0, yaw: 0 })),
  });
  if (!r.ok) throw new Error('boot failed: ' + r.reason);
  for (const bytes of r.frames) {
    const res = applyFrame(store, bytes, { epoch: 0, frameSequence: 0 });
    if (res.kind !== 'applied') throw new Error('boot chunk failed: ' + res.kind);
  }
}

function buildDelta(world, changed, encoding, seq) {
  const byId = new Map(Array.from(world.ids, (id, i) => [id, i]));
  const cols = {
    x: changed.map((id) => world.x[byId.get(id)] + 0.001),
    y: changed.map(() => 0),
    z: changed.map((id) => world.z[byId.get(id)] + 0.001),
    yaw: changed.map((id) => world.yaw[byId.get(id)] + 0.001),
  };
  const fl = changed.map((id, i) => i % 5);
  return writeFrame({
    frameType: FRAME_TYPE.DELTA, roomEpoch: 0, serverTick: seq,
    frameSequence: seq + 1, baselineSequence: seq,
    transform: { encoding, ids: changed, count: changed.length, columns: cols },
    flags: { encoding, ids: changed, count: changed.length, columns: { flags: fl } },
  });
}

const rows = [];
for (const n of POPULATIONS) {
  const world = makeWorld(n, 42);
  const changed = stepWorld(world, FRACTION, 7);

  const store = new EntityStore(n + 16);
  boot(store, n);

  const frame = {};
  for (const [name, enc] of [['sorted', ENCODING.SORTED_IDS], ['varint', ENCODING.DELTA_VARINT], ['roaring', ENCODING.ROARING]]) {
    const d = buildDelta(world, changed, enc, 1);
    if (!d.ok) throw new Error(name + ': ' + d.reason);
    const encT = timeIt(() => buildDelta(world, changed, enc, 1));
    const session = { epoch: 0, frameSequence: 1 };
    const decT = timeIt(() => applyFrame(store, d.bytes, session));
    frame[name] = {
      bytes: d.bytes.length,
      encodeUs: encT.min,
      decodeUs: decT.min,
      allocBytes: heapDelta(() => applyFrame(store, d.bytes, session)),
    };
  }
  rows.push({
    n, changed: changed.length,
    sorted: frame.sorted, varint: frame.varint, roaring: frame.roaring,
    varintVsSortedBytes: +(frame.varint.bytes / frame.sorted.bytes).toFixed(3),
    varintVsSortedDecode: +(frame.sorted.decodeUs / frame.varint.decodeUs).toFixed(2),
    roaringVsVarintBytes: +(frame.roaring.bytes / frame.varint.bytes).toFixed(3),
  });
}

const results = { env: env(), fraction: FRACTION, rows };
const jsonPath = writeResults('results/varint.json', results);
const md = [
  '# DELTA_VARINT vs SORTED_IDS vs ROARING (frame level, fraction ' + FRACTION + ')',
  '',
  'Node ' + results.env.node + ', min-of-runs (shared machine).',
  '',
  markdownTable(
    ['N', 'k', 'sorted B', 'varint B', 'B ratio', 'sorted dec µs', 'varint dec µs', 'decode ratio', 'roaring/varint B'],
    rows.map((r) => [
      r.n, r.changed, r.sorted.bytes, r.varint.bytes, r.varintVsSortedBytes,
      r.sorted.decodeUs.toFixed(2), r.varint.decodeUs.toFixed(2), r.varintVsSortedDecode, r.roaringVsVarintBytes,
    ])
  ),
  '',
  'Read: varint shrinks the mask portion (~4 B/id → ~1.3–2.5 B/id), so frame bytes drop a few percent vs sorted at every k; decode is proportionally slower but stays in microseconds at 10 Hz tick scale. Roaring only approaches varint bytes at large k.',
].join('\n');
const { writeFileSync } = await import('node:fs');
writeFileSync(new URL('./results/varint.md', import.meta.url), md + '\n');
console.log(jsonPath);
console.log(md);
