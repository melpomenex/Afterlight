// afterlight-soa-v1 frame header + section table reading.
// Strict per contract §3: every length validated against remaining bytes
// BEFORE use; unknown enums rejected; trailing bytes rejected.

import {
  MAGIC, PROTOCOL_VERSION, HEADER_SIZE, FRAME_TYPE, SECTION, ENCODING, LIMITS,
} from './constants.js';

export function readHeader(bytes) {
  if (!(bytes instanceof Uint8Array)) return err('bad_input');
  if (bytes.length < HEADER_SIZE) return err('truncated_header');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const magic = view.getUint32(0, true);
  if (magic !== MAGIC) return err('bad_magic');
  const header = {
    version: view.getUint8(4),
    frameType: view.getUint8(5),
    flags: view.getUint8(6),
    headerSize: view.getUint8(7),
    roomEpoch: view.getUint32(8, true),
    serverTick: view.getUint32(12, true),
    frameSequence: view.getUint32(16, true),
    baselineSequence: view.getUint32(20, true),
  };
  if (header.version !== PROTOCOL_VERSION) return err('bad_version');
  if (!Object.values(FRAME_TYPE).includes(header.frameType)) return err('bad_frame_type');
  if (header.headerSize < HEADER_SIZE) return err('bad_header_size');
  if (bytes.length > LIMITS.MAX_FRAME_BYTES) return err('frame_too_large');
  return { ok: true, header, bodyOffset: header.headerSize };
}

// Walks sections without touching payloads. Returns {ok, sections:[{id,
// encoding, count, payloadOffset, payloadLen}]} or {ok:false, reason}.
export function readSections(bytes, bodyOffset) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const sections = [];
  let off = bodyOffset;
  while (off < bytes.length) {
    if (sections.length >= LIMITS.MAX_SECTIONS) return err('too_many_sections');
    if (off + 12 > bytes.length) return err('truncated_section_header');
    const id = view.getUint8(off);
    const encoding = view.getUint8(off + 1);
    // reserved u16 at off+2
    const count = view.getUint32(off + 4, true);
    const payloadLen = view.getUint32(off + 8, true);
    if (!Object.values(SECTION).includes(id)) return err('bad_section_id');
    if (!Object.values(ENCODING).includes(encoding)) return err('bad_section_encoding');
    if (count > LIMITS.MAX_SECTION_ROWS) return err('section_rows_over_limit');
    const payloadOffset = off + 12;
    if (payloadLen > bytes.length - payloadOffset) return err('section_payload_overrun');
    sections.push({ id, encoding, count, payloadOffset, payloadLen });
    off = payloadOffset + payloadLen;
  }
  if (off !== bytes.length) return err('trailing_bytes'); // unreachable with exact math, kept as guard
  return { ok: true, sections };
}

export function writeHeader(frame) {
  const bytes = new Uint8Array(HEADER_SIZE);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, MAGIC, true);
  view.setUint8(4, frame.version ?? PROTOCOL_VERSION);
  view.setUint8(5, frame.frameType);
  view.setUint8(6, frame.flags ?? 0);
  view.setUint8(7, HEADER_SIZE);
  view.setUint32(8, frame.roomEpoch >>> 0, true);
  view.setUint32(12, frame.serverTick >>> 0, true);
  view.setUint32(16, frame.frameSequence >>> 0, true);
  view.setUint32(20, frame.baselineSequence >>> 0, true);
  return bytes;
}

function err(reason) { return { ok: false, reason }; }
