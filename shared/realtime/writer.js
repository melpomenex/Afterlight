// afterlight-soa-v1 frame writer — the JS reference encoder a server (or the
// prototype echo server / tests) uses to produce frames. Mirrors the BEAM
// reference in benchmarks/realtime/beam/bench_encode.exs.

import {
  HEADER_SIZE, FRAME_TYPE, FRAME_FLAG, SECTION, ENCODING, LIMITS, PROTOCOL_VERSION,
} from './constants.js';
import { writeHeader } from './frame.js';
import { writeSection, writeSpawnSection, writeStringTable } from './encoders.js';
import { serializeRoaring } from './roaring.js';
import { NO_STRING_REF } from './applyFrame.js';

// spec: {
//   frameType, roomEpoch, serverTick, frameSequence, baselineSequence,
//   spawn: [{id, guestId?, archetype, variant, x, y, z, yaw}] | null,
//   despawn: Uint32Array | null, despawnEncoding?,
//   transform: {encoding, ids, columns:{x,y,z,yaw}, count} | null,
//   flags:    {encoding, ids, columns:{flags}, count} | null,
//   maxId?    // required when BITSET encoding used
// }
export function writeFrame(spec) {
  const parts = [];
  let flags = 0;
  let guestIds = null;

  if (spec.spawn && spec.spawn.length) {
    guestIds = spec.spawn.filter((r) => r.guestId != null).map((r) => r.guestId);
    const table = writeStringTable(guestIds.length ? guestIds : ['']);
    parts.push(table.bytes);
    flags |= FRAME_FLAG.HAS_STRING_TABLE;
    let ref = 0;
    const rows = spec.spawn.map((r) => ({
      ...r,
      stringRef: r.guestId != null ? ref++ : NO_STRING_REF,
    }));
    const sp = writeSpawnSection(rows);
    if (!sp.ok) return sp;
    parts.push(sp.bytes);
  }

  const componentSpecs = [
    ['transform', SECTION.TRANSFORM],
    ['flags', SECTION.FLAGS],
  ];
  for (const [key, sectionId] of componentSpecs) {
    const c = spec[key];
    if (!c || !c.count) continue;
    const w = writeSection(sectionId, c.encoding, c.ids, c.columns, c.count, spec.maxId);
    if (!w.ok) return w;
    parts.push(w.bytes);
  }

  if (spec.despawn && spec.despawn.length) {
    const enc = spec.despawnEncoding ?? ENCODING.SORTED_IDS;
    let body;
    if (enc === ENCODING.SORTED_IDS) {
      body = new Uint8Array(spec.despawn.length * 4);
      const v = new DataView(body.buffer);
      spec.despawn.forEach((id, i) => v.setUint32(i * 4, id, true));
    } else if (enc === ENCODING.ROARING) {
      body = serializeRoaring(spec.despawn);
    } else {
      return { ok: false, reason: 'unsupported_despawn_encoding' };
    }
    const out = new Uint8Array(12 + body.length);
    const v = new DataView(out.buffer);
    v.setUint8(0, SECTION.DESPAWN);
    v.setUint8(1, enc);
    v.setUint32(4, spec.despawn.length, true);
    v.setUint32(8, body.length, true);
    out.set(body, 12);
    parts.push(out);
  }

  const bodyLen = parts.reduce((s, p) => s + p.length, 0);
  if (HEADER_SIZE + bodyLen > LIMITS.MAX_FRAME_BYTES) return { ok: false, reason: 'frame_too_large' };
  const frame = new Uint8Array(HEADER_SIZE + bodyLen);
  frame.set(writeHeader({
    version: PROTOCOL_VERSION,
    frameType: spec.frameType ?? FRAME_TYPE.DELTA,
    flags,
    roomEpoch: spec.roomEpoch ?? 0,
    serverTick: spec.serverTick ?? 0,
    frameSequence: spec.frameSequence ?? 0,
    baselineSequence: spec.baselineSequence ?? 0,
  }), 0);
  let off = HEADER_SIZE;
  for (const p of parts) {
    frame.set(p, off);
    off += p.length;
  }
  return { ok: true, bytes: frame, guestIds };
}
