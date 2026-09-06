// Encoding F: Arrow IPC record batch of the whole entity table (snapshot).
// Encoding G: "Arrow IPC + Roaring component masks" — one compact Arrow IPC
//   record batch holding ONLY the changed rows' value columns, plus a Roaring
//   bitmap (portable CRoaring serialization) of the changed u32 ids.
//
// Contract fit (docs/architecture/realtime/contract.md):
//   - section payload encoding 4 (ARROW_RECORD_BATCH); contract §3 says
//     "mask/ids first, then one value column per field". Encoding G follows
//     that literally: the Roaring mask carries the ids (entity_count implicit
//     in mask cardinality), the Arrow batch carries the 5 value columns
//     (x, y, z, yaw, flags) for exactly the masked rows in ascending id order
//     (fixtures emit sorted changed ids). No entity_id column is duplicated.
//   - Encoding F is the trivial "delta = whole table" scheme: the full
//     entity table (entity_id u32 + 5 value columns) as one IPC stream. Used
//     here for FULL_SNAPSHOT sizing and as the "Arrow used as a delta" floor
//     case (send everything every tick).
//   - Wire bytes here are payload bytes only (no 24-byte ALRT header / 16-byte
//     section header), matching the JSON baseline (JSON.stringify bytes).
//
// Schema (both encodings, contract §2 transform+flags columns):
//   entity_id: u32 (F only), x/y/z/yaw: f32, flags: u8. Little-endian (Arrow
//   IPC is LE by spec). Fields are created non-nullable, so the JS writer
//   emits zero-length validity buffers (no bitmap overhead).
//
// =============================================================================
// EXACT Arrow JS API used (apache-arrow 21.2.0, the "arrow-js" implementation):
//   - tableFromArrays({entity_id: Uint32Array, x: Float32Array, ...})
//       -> wraps each TypedArray via vectorFromArray -> makeVector, which for
//          ArrayBuffer views is ZERO-COPY WRAP (factories.mjs:44-46 ->
//          vector.mjs:362 `ArrayBuffer.isView(init)` branch). No per-value
//          copy at Table build time. Column order = object key insertion order.
//   - tableToIPC(table) -> RecordBatchStreamWriter.writeAll(...).toUint8Array(true)
//       (ipc/serialization.mjs:39-44). Encode COPIES: the writer builds the
//       schema + record-batch FlatBuffers metadata and memcpy's each value
//       buffer into the output sink (ipc/writer.mjs -> MessageWriter), then
//       joins chunks into one Uint8Array. So encode = O(payload) copy +
//       O(1) FlatBuffers build (~microseconds, allocates writer machinery).
//   - tableFromIPC(bytes) -> RecordBatchStreamReader over a ByteStream.
//       DECODE IS ZERO-COPY over the input bytes (verified in source):
//         * io/adapters.mjs fromIterable/joinUint8Arrays + util/buffer.mjs
//           collapseContiguousByteRanges: reads out of a single-buffer source
//           return `subarray` views, no copy.
//         * ipc/message.mjs:70-77 readMessageBody: returns the view as-is when
//           it is 8-byte aligned (`buf.byteOffset % 8 === 0`), else one
//           defensive `buf.slice()`. Writer output is freshly allocated and
//           aligned, so the view path is taken.
//         * visitor/vectorloader.mjs:154 readData: `this.bytes.subarray(offset,
//           offset + length)` — every column buffer in the decoded Table is a
//           VIEW INTO THE INPUT Uint8Array. No value is copied.
//         * vector.mjs:180 toArray(): "If this Vector contains a single Data
//           chunk and the Vector's type is a primitive numeric type ... this
//           method returns a ZERO-COPY slice" (`data[0].values.subarray(...)`);
//           >1 chunk copies; non-primitive types do `[...this]` (JS array).
//           Our tables are single-batch => single-chunk => toArray() is O(1).
//       Consequences: (a) decode cost is O(schema + columns), NOT O(rows);
//       (b) the decoded Table RETAINS THE ENTIRE INPUT ArrayBuffer — the
//       caller must keep the IPC bytes alive for as long as the Table lives,
//       and mutating them mutates the "decoded" data (both verified above);
//       (c) it does NOT throw per-value on truncated input — it throws at
//       message level (readMessageBody/readMetadata throw Error), so the
//       contract §3 "a bad frame never throws into game code" rule needs a
//       try/catch wrapper around tableFromIPC, exactly as for JSON.parse.
//
// Schema evolution from this lib's perspective (verified empirically, see
// run-arrow.mjs asserts): every IPC stream is SELF-DESCRIBING — the reader
// takes the Schema from the stream's Schema message (ipc/reader.mjs) and
// loads vectors positionally in that schema's field order. Adding a trailing
// field to the schema and sending it to a consumer that decodes with
// tableFromIPC just works (the reader has no pinned "expected" schema);
// consumer code that accesses columns BY NAME via table.getChild(name)
// tolerates both added and removed fields (returns null for a missing
// column). There is NO cross-stream schema registry, no compat-checking, and
// no auto-backfill of absent columns in the JS lib: `schema.compareTo` does
// not even exist on Schema in v21 — app code must version the schema itself
// (e.g. a metadata key or an u8 in the contract frame header) and null-check
// getChild lookups. Renames and type changes (u16 -> u32 etc.) are invisible
// to the lib and silently reinterpret for any consumer that assumed the old
// type, because buffers are reinterpreted through the new stream's schema.
// Dictionary encoding (Dictionary type) exists for enum/string columns if we
// ever want the archetype/variant/stringRef columns.
//
// NOTE (benchmarking honesty): encode timing for F/G below includes the full
// fixture-state -> wire path (column wrap + table build + IPC serialize +
// Roaring serialize). The fixture world is already SoA columnar, which is
// Arrow's ideal input; a server storing rows would pay an extra gather that
// encoding G does pay per delta (gatherChangedRows below, included in
// encodeG timing).

import {
  tableFromArrays,
  tableFromIPC,
  tableToIPC,
  Uint32,
  Float32,
  Uint8,
  Field,
  Schema,
  Table,
} from 'apache-arrow';
import { RoaringBitmap32, roaringLibraryInitialize } from 'roaring-wasm';

const F32 = Float32;
export const SNAPSHOT_COLUMNS = ['entity_id', 'x', 'y', 'z', 'yaw', 'flags'];
export const DELTA_COLUMNS = ['x', 'y', 'z', 'yaw', 'flags']; // ids ride in the Roaring mask

export const snapshotSchema = new Schema([
  new Field('entity_id', new Uint32(), false),
  new Field('x', new F32(), false),
  new Field('y', new F32(), false),
  new Field('z', new F32(), false),
  new Field('yaw', new F32(), false),
  new Field('flags', new Uint8(), false),
]);

export const deltaSchema = new Schema([
  new Field('x', new F32(), false),
  new Field('y', new F32(), false),
  new Field('z', new F32(), false),
  new Field('yaw', new F32(), false),
  new Field('flags', new Uint8(), false),
]);

export async function initRoaring() {
  await roaringLibraryInitialize();
}

const pad8 = (n) => (n + 7) & ~7;

// ---------------------------------------------------------------------------
// Encoding F — full table snapshot
// ---------------------------------------------------------------------------

// world -> Table. Zero-copy wrap of the fixture's own typed arrays.
export function buildSnapshotTable(world) {
  return tableFromArrays({
    entity_id: world.ids,
    x: world.x,
    y: world.y,
    z: world.z,
    yaw: world.yaw,
    flags: world.flags,
  });
}

// Full path: fixture state -> IPC bytes. Returns the bytes; the intermediate
// Table is garbage after this (the writer copies buffers into the output).
export function encodeSnapshot(world) {
  return tableToIPC(buildSnapshotTable(world));
}

// IPC bytes -> usable typed arrays. Zero-copy per the source notes above.
// The returned views alias `bytes` — do not mutate or release it.
export function decodeSnapshot(bytes) {
  const t = tableFromIPC(bytes);
  return {
    entity_id: t.getChild('entity_id').toArray(),
    x: t.getChild('x').toArray(),
    y: t.getChild('y').toArray(),
    z: t.getChild('z').toArray(),
    yaw: t.getChild('yaw').toArray(),
    flags: t.getChild('flags').toArray(),
  };
}

// ---------------------------------------------------------------------------
// Encoding G — changed rows only (compact columns) + Roaring id mask
// ---------------------------------------------------------------------------

// Gather the changed rows out of the SoA world into fresh contiguous typed
// arrays. This is real encoder work (the world is column-major by slot, the
// changed set is by sparse u32 id), so it is measured as part of encodeG.
export function gatherChangedRows(world, changedIds, idToSlot) {
  const k = changedIds.length;
  const x = new Float32Array(k), y = new Float32Array(k), z = new Float32Array(k);
  const yaw = new Float32Array(k), flags = new Uint8Array(k);
  for (let i = 0; i < k; i++) {
    const s = idToSlot.get(changedIds[i]);
    x[i] = world.x[s]; y[i] = world.y[s]; z[i] = world.z[s];
    yaw[i] = world.yaw[s]; flags[i] = world.flags[s];
  }
  return { x, y, z, yaw, flags };
}

// Changed columns -> IPC bytes (fresh self-contained stream per frame, the
// realistic per-tick usage: every frame re-pays schema + batch metadata).
export function encodeDeltaColumns(cols) {
  return tableToIPC(tableFromArrays(cols));
}

// Wire tuple for contract §3 ROARING + ARROW_RECORD_BATCH sections.
// NOTE: RoaringBitmap32 allocates in WASM memory — serialize() copies into a
// JS Uint8Array, then we dispose() the bitmap, so the measured encode path is
// allocation-clean (the library docs mandate manual dispose).
export function encodeDelta(world, changedIds, idToSlot) {
  const cols = gatherChangedRows(world, changedIds, idToSlot);
  const mask = new RoaringBitmap32(changedIds); // sorted u32 in, ascending out
  const maskBytes = mask.serialize('portable'); // CRoaring portable format
  mask.dispose();
  const ipcBytes = encodeDeltaColumns(cols);
  return { ipcBytes, maskBytes, k: changedIds.length };
}

// Wire -> ids + typed arrays. `ipc` views alias the input bytes.
export function decodeDelta(ipcBytes, maskBytes) {
  const mask = RoaringBitmap32.deserialize(maskBytes, 'portable');
  const ids = mask.toArray(); // number[] ascending
  mask.dispose();
  const t = tableFromIPC(ipcBytes);
  return {
    ids,
    x: t.getChild('x').toArray(),
    y: t.getChild('y').toArray(),
    z: t.getChild('z').toArray(),
    yaw: t.getChild('yaw').toArray(),
    flags: t.getChild('flags').toArray(),
  };
}

// ---------------------------------------------------------------------------
// Byte decomposition — quantify FlatBuffers/schema overhead
// ---------------------------------------------------------------------------

// IPC stream layout (metadata v5, stream format):
//   [schema message: 4B continuation + 4B metaLen + FlatBuffers Schema (padded)]
//   [batch message:  4B continuation + 4B metaLen + FlatBuffers RecordBatch (padded)]
//   [body: each column buffer at 8-byte-aligned offsets]
//   [EOS: 4B continuation(0) + 4B len(0)] (8 bytes)
// We do NOT parse FlatBuffers to decompose; we measure the two fixed-size
// messages once per schema with a 0-row batch and compute body/value bytes
// arithmetically (writer aligns each buffer to 8). Verify() checks this
// against actual output lengths at startup.

export function measureStreamOverhead(schema) {
  const emptyCols = {};
  for (const f of schema.fields) {
    emptyCols[f.name] = new f.type.ArrayType(0);
  }
  const empty = tableFromArrays(emptyCols);
  const bytes = tableToIPC(empty);
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const msgs = [];
  let o = 0;
  for (let m = 0; m < 2; m++) {
    const cont = dv.getUint32(o, true);
    const metaLen = dv.getUint32(o + 4, true);
    msgs.push({ continuation: cont, metaLen, total: 8 + metaLen });
    o += 8 + metaLen;
  }
  const valueBytesAt = (nRows) =>
    // byte width per value: Float32/Uint32/Uint8 all expose ArrayType with
    // BYTES_PER_ELEMENT (Float type has no .bitWidth in v21 — verified).
    schema.fields.reduce((sum, f) => sum + pad8(nRows * f.type.ArrayType.BYTES_PER_ELEMENT), 0);
  return {
    totalEmpty: bytes.length,
    schemaMessageBytes: msgs[0].total,     // fixed FlatBuffers Schema message
    batchMessageBytes: msgs[1].total,      // fixed FlatBuffers RecordBatch message
    eosBytes: bytes.length - o,            // end-of-stream marker (8)
    fixedBytes: bytes.length,              // everything except row values
    valueBytes: valueBytesAt,              // (rows) -> padded body value bytes
  };
}

// Size of an F/G wire tuple without re-encoding: fixed overhead + values.
export const predictSnapshotBytes = (ovh, n) => ovh.fixedBytes + ovh.valueBytes(n);

export { Table, tableToIPC, tableFromIPC, tableFromArrays };
