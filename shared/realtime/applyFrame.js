// Applies afterlight-soa-v1 frames to an EntityStore with explicit
// snapshot/delta/baseline/epoch semantics (contract §4). Bounded rejection:
// returns {ok:false, reason} per bad frame; the store stays usable.

import { readHeader, readSections } from './frame.js';
import {
  readSectionColumns, readSpawnSection, readStringTable, decodeVarintIds,
} from './encoders.js';
import { deserializeRoaring } from './roaring.js';
import { FRAME_TYPE, SECTION, ENCODING } from './constants.js';

export const NO_STRING_REF = 0xffffffff;

// session: {epoch, frameSequence} — caller-held client state (mutated on
// success). opts (all optional):
//   collectEntries: build per-entity entry objects (default true). Set false
//     with onRow for zero-allocation visitor application (worker pipeline).
//   onRow(id, slot, sectionId, i, columns) — per applied component row.
//   onJoin(row, guestId) / onLeave(id) — lifecycle visitors.
// Returns one of:
//   {ok:true, kind:'applied', joined:[], left:[], entries:[]}
//   {ok:true, kind:'resync'}
//   {ok:false, reason}
export function applyFrame(store, bytes, session, opts = emptyOpts()) {
  const head = readHeader(bytes);
  if (!head.ok) return head;
  const h = head.header;

  if (h.frameType === FRAME_TYPE.RESYNC_REQUIRED) {
    return { ok: true, kind: 'resync' };
  }
  // Epoch fencing: stale owners are discarded unconditionally. A FULL_
  // SNAPSHOT is self-validating (no baseline needed) — a higher-epoch
  // snapshot IS the resync delivery and applies; a higher-epoch DELTA is
  // unappliable and triggers resync below.
  if (h.roomEpoch < session.epoch) return { ok: true, kind: 'stale_dropped' };

  const isSnapshot = h.frameType === FRAME_TYPE.FULL_SNAPSHOT || h.frameType === FRAME_TYPE.SNAPSHOT_CHUNK;
  const isDelta = h.frameType === FRAME_TYPE.DELTA || h.frameType === FRAME_TYPE.DELTA_CHUNK;
  const chunkEnd = (h.flags & 2) !== 0; // FRAME_FLAG.CHUNK_END

  if (isDelta) {
    if (h.baselineSequence !== session.frameSequence || h.roomEpoch !== session.epoch) {
      return { ok: true, kind: 'resync' };
    }
  }

  const secs = readSections(bytes, head.bodyOffset);
  if (!secs.ok) return secs;

  if (h.frameType === FRAME_TYPE.FULL_SNAPSHOT) {
    store.reset();
  } else if (h.frameType === FRAME_TYPE.SNAPSHOT_CHUNK) {
    // A chunk whose sequence differs from the accumulating one starts a new
    // snapshot: reset and begin. CHUNK_END commits the delta baseline.
    if (session.chunkSeq !== h.frameSequence) {
      store.reset();
      session.chunkSeq = h.frameSequence;
    }
    if (chunkEnd) {
      session.frameSequence = h.frameSequence;
      session.chunkSeq = 0;
    }
  }

  const collect = opts.collectEntries !== false; // default: build entries
  const entries = collect ? [] : EMPTY_ENTRIES;
  const joined = opts.onJoin ? EMPTY_ENTRIES : [];
  const left = opts.onLeave ? EMPTY_ENTRIES : [];

  // Pass 1: structural sections that other sections reference.
  let strings = null;
  for (const sec of secs.sections) {
    if (sec.id === SECTION.STRING_TABLE) {
      const r = readStringTable(bytes, sec);
      if (!r.ok) return r;
      strings = r.strings;
    }
  }
  if (secs.sections.some((s) => s.id === SECTION.SPAWN) && !(h.flags & 1)) {
    return { ok: false, reason: 'spawn_without_string_table' };
  }

  // Pass 2: lifecycle.
  for (const sec of secs.sections) {
    if (sec.id === SECTION.SPAWN) {
      const r = readSpawnSection(bytes, sec);
      if (!r.ok) return r;
      for (const row of r.rows) {
        let guestId = null;
        if (row.stringRef !== NO_STRING_REF) {
          if (!strings || row.stringRef >= strings.length) return { ok: false, reason: 'bad_string_ref' };
          guestId = strings[row.stringRef];
        }
        const res = store.spawn(row.id, {
          archetype: row.archetype, variant: row.variant,
          x: row.x, y: row.y, z: row.z, yaw: row.yaw, guestId,
        });
        if (!res.ok) return { ok: false, reason: 'spawn_' + res.reason };
        if (opts.onJoin) opts.onJoin(row, guestId);
        else joined.push({ id: guestId ?? row.id, slot: res.slot });
      }
    } else if (sec.id === SECTION.DESPAWN) {
      const r = maskIds(bytes, sec);
      if (!r.ok) return r;
      for (const id of r.ids) {
        if (store.despawn(id)) {
          if (opts.onLeave) opts.onLeave(id);
          else left.push({ id });
        }
      }
    }
  }

  // Pass 3: component sections — apply only to ids that exist (a transform
  // for an unknown id is stale/broken; count it, never apply).
  for (const sec of secs.sections) {
    if (sec.id === SECTION.TRANSFORM || sec.id === SECTION.FLAGS || sec.id === SECTION.ANIM || sec.id === SECTION.VISUAL || sec.id === SECTION.MOTION) {
      const r = readSectionColumns(bytes, sec);
      if (!r.ok) return r;
      const ids = sec.encoding === ENCODING.DENSE ? denseIds(store, sec, h.frameType) : r.ids;
      if (!ids) return { ok: false, reason: 'missing_mask' };
      if (ids.length !== sec.count) return { ok: false, reason: 'mask_count_mismatch' };
      for (let i = 0; i < ids.length; i++) {
        const slot = store.slot(ids[i]);
        if (slot < 0) continue; // stale reference (e.g. despawn+update same tick)
        if (sec.id === SECTION.TRANSFORM) {
          store.x[slot] = r.columns.x[i]; store.y[slot] = r.columns.y[i];
          store.z[slot] = r.columns.z[i]; store.yaw[slot] = r.columns.yaw[i];
        } else if (sec.id === SECTION.FLAGS) {
          store.flags[slot] = r.columns.flags[i];
        } else if (sec.id === SECTION.ANIM) {
          store.animState[slot] = r.columns.state[i];
          store.emote[slot] = r.columns.emote[i];
        } else if (sec.id === SECTION.VISUAL) {
          store.archetype[slot] = r.columns.archetype[i];
          store.variant[slot] = r.columns.variant[i];
        } else if (sec.id === SECTION.MOTION) {
          store.vx[slot] = r.columns.vx[i]; store.vy[slot] = r.columns.vy[i]; store.vz[slot] = r.columns.vz[i];
        }
        if (opts.onRow) opts.onRow(ids[i], slot, sec.id, i, r.columns);
        else if (collect) entries.push(store.entryFor(slot));
      }
    }
  }

  session.epoch = h.roomEpoch;
  // Chunked frames commit their sequence only on the final chunk, so a
  // following delta chunk still matches its original baseline.
  if (!h.frameType || h.frameType === FRAME_TYPE.FULL_SNAPSHOT || h.frameType === FRAME_TYPE.DELTA || chunkEnd) {
    session.frameSequence = h.frameSequence;
  }
  return { ok: true, kind: 'applied', frameType: h.frameType, joined, left, entries };
}

const EMPTY_ENTRIES = [];
function emptyOpts() { return {}; }

// DENSE component sections are only meaningful in a FULL_SNAPSHOT whose spawn
// rows were just applied in order (slots 0..n-1 after reset).
function denseIds(store, sec, frameType) {
  if (frameType !== FRAME_TYPE.FULL_SNAPSHOT) return null;
  if (store.count !== sec.count) return null;
  const ids = new Uint32Array(sec.count);
  for (const [id, slot] of store.slotOf) ids[slot] = id;
  return ids;
}

// DESPAWN payload is a bare mask (ids only).
function maskIds(bytes, sec) {
  if (sec.encoding === ENCODING.SORTED_IDS) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (sec.payloadLen < sec.count * 4) return { ok: false, reason: 'despawn_overrun' };
    const ids = new Uint32Array(sec.count);
    for (let i = 0; i < sec.count; i++) ids[i] = view.getUint32(sec.payloadOffset + i * 4, true);
    return { ok: true, ids };
  }
  if (sec.encoding === ENCODING.ROARING) {
    const r = deserializeRoaring(bytes.subarray(sec.payloadOffset, sec.payloadOffset + sec.payloadLen));
    if (!r.ok) return r;
    if (r.ids.length !== sec.count) return { ok: false, reason: 'roaring_count_mismatch' };
    return { ok: true, ids: r.ids };
  }
  if (sec.encoding === ENCODING.DELTA_VARINT) {
    const r = decodeVarintIds(bytes.subarray(sec.payloadOffset, sec.payloadOffset + sec.payloadLen), sec.count);
    if (!r.ok) return r;
    if (r.ids.length !== sec.count) return { ok: false, reason: 'varint_count_mismatch' };
    return { ok: true, ids: r.ids };
  }
  return { ok: false, reason: 'unsupported_despawn_encoding' };
}
