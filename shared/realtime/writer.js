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
  let flags = spec.headerFlags ?? 0; // header bits (spec.flags is the FLAGS SECTION)
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

// writeChunkedFrames — split an oversized snapshot/delta into frames that
// each fit `maxBytes` (contract v0 amendment: frame types SNAPSHOT_CHUNK /
// DELTA_CHUNK, final chunk carries FRAME_FLAG.CHUNK_END; old readers reject
// the unknown types cleanly instead of misapplying). Spawn-row transforms
// are embedded in spawn rows; each chunk's string table carries only its own
// identities. A spec that fits one frame degrades to a plain writeFrame.
export function writeChunkedFrames(spec, { maxBytes = LIMITS.MAX_FRAME_BYTES } = {}) {
  const base = {
    roomEpoch: spec.roomEpoch ?? 0,
    serverTick: spec.serverTick ?? 0,
    frameSequence: spec.frameSequence ?? 0,
    baselineSequence: spec.baselineSequence ?? 0,
  };
  const single = writeFrame({ ...spec, ...base });
  if (single.ok && single.bytes.length <= maxBytes) {
    return { ok: true, frames: [single.bytes], guestIds: single.guestIds };
  }
  if (!single.ok && single.reason !== 'frame_too_large') return single;

  const frameType = (spec.frameType ?? FRAME_TYPE.DELTA) === FRAME_TYPE.FULL_SNAPSHOT
    ? FRAME_TYPE.SNAPSHOT_CHUNK
    : FRAME_TYPE.DELTA_CHUNK;

  // Unified row model: every row is one spawn (snapshot, transform embedded)
  // or one transform/flags row (delta). Despawn rides the final chunk.
  const rows = [];
  const snapshot = frameType === FRAME_TYPE.SNAPSHOT_CHUNK;
  if (snapshot) {
    for (const r of spec.spawn ?? []) rows.push({ spawn: r });
  } else {
    const count = spec.transform?.count ?? 0;
    for (let i = 0; i < count; i++) rows.push({ col: i });
  }
  const hasExtras = (i) => !snapshot && i === rows.length && (spec.despawn?.length ?? 0) > 0;

  // Conservative per-row estimate; a written frame over budget shrinks the
  // window (pathological strings only) — correctness via writeFrame's own
  // 1 MiB check, never by trusting the estimate alone.
  const perRow = snapshot ? 64 : 34;
  const frames = [];
  let i = 0;
  while (i < rows.length || (frames.length === 0 && rows.length === 0)) {
    let end = Math.min(rows.length, i + Math.max(1, Math.floor((maxBytes - 256) / perRow)));
    let f;
    for (;;) {
      const slice = rows.slice(i, end);
      const final = end >= rows.length;
      f = writeFrame({
        ...base,
        frameType,
        headerFlags: final ? FRAME_FLAG.CHUNK_END : 0,
        spawn: snapshot && slice.length ? slice.map((r) => r.spawn) : undefined,
        despawn: final ? spec.despawn : undefined,
        despawnEncoding: spec.despawnEncoding,
        transform: !snapshot && slice.length ? {
          encoding: ENCODING.SORTED_IDS,
          ids: spec.transform.ids.subarray(slice[0].col, slice[slice.length - 1].col + 1),
          count: slice.length,
          columns: {
            x: spec.transform.columns.x.subarray(slice[0].col, slice[slice.length - 1].col + 1),
            y: spec.transform.columns.y.subarray(slice[0].col, slice[slice.length - 1].col + 1),
            z: spec.transform.columns.z.subarray(slice[0].col, slice[slice.length - 1].col + 1),
            yaw: spec.transform.columns.yaw.subarray(slice[0].col, slice[slice.length - 1].col + 1),
          },
        } : undefined,
        flags: !snapshot && spec.flags?.count ? {
          encoding: ENCODING.SORTED_IDS,
          ids: spec.flags.ids.subarray(slice[0].col, slice[slice.length - 1].col + 1),
          count: slice.length,
          columns: { flags: spec.flags.columns.flags.subarray(slice[0].col, slice[slice.length - 1].col + 1) },
        } : undefined,
      });
      if (f.ok || end - 1 <= i) break; // single row over budget: give up honestly
      end = i + Math.max(1, Math.floor((end - i) * 0.8)); // shrink and retry
    }
    if (!f.ok) return f;
    frames.push(f.bytes);
    if (end >= rows.length) break;
    i = end;
  }
  return { ok: true, frames };
}
