// WebGPUThreeBackend — the GPU arm of the EntityRenderBackend seam
// (openspec change add-realtime-gpu-rendering, tasks 2.1 + 2.2 + 2.3, and the
// module groundwork of 2.4). Sister of CPUThreeBackend in
// src/realtime/gpu/backend.js; honors the exact same surface:
//
//   ensureCapacity(n) — monotonic; allocates/grows persistent GPU buffers
//   applyDeltaPack(pack) — Promise<receipt>; scatter + on-GPU validation
//   sample(indices, out) — dense slots; ring-evaluated setPlayer-shaped rows
//   snapshot() — last acknowledged pack state (device-loss rebuild seed)
//   dispose() / onDeviceLost(handler) / reportDeviceLost(reason)
//
// DEPARTURE FROM THE CPU ARM, documented: applyDeltaPack returns a PROMISE of
// the receipt, not the receipt itself, because the spec ("wrong scatter fails
// loudly") requires the on-GPU checksum to be read back and compared BEFORE a
// pack is presented as applied. Consumers written as
// `const receipt = await backend.applyDeltaPack(pack)` work with both arms —
// awaiting a plain object is a no-op.
//
// DEVIATION FROM `extends EntityRenderBackend`, documented: backend.js imports
// three.js at module scope for the CPU arm, so subclassing its base class
// would put three.js on the import path of the pure scatter/ring/checksum
// math below — which Node tests must be able to load without a GPU and
// without three. backend.js's own header blesses duck-typed backends
// ("implement the same methods"), so this module ships a dependency-free
// mirror of the base class's device-loss registry (the ~15 lines below)
// instead. Friction worth a follow-up: split the interface class into a
// three-free module so GPU backends can subclass the real base and share one
// registry.
//
// ── GPU state layout (design.md "GPU state layout") ─────────────────────────
// Persistent storage buffers keyed by DENSE SLOT (not entity id), capacity C:
//   transforms  C × vec4<f32>   x, y, z, yaw — the ring's "next"/target row
//   ring        C × 6 × f32     prevX, prevY, prevZ, prevYaw, tPrev, tNext
//                               (together with transforms: the design's
//                               "2N vec4 + timestamps" interpolation ring)
//   motion      C × vec4<f32>   vx, vy, vz, segmentSeconds — per-tick estimate
//   metaFlags   C × vec2<u32>   word0: flag bits (walking|sitting|airborne),
//                               word1: alive<<31 | archetype<<16 | variant
//                               (the archetype/variant INSTANCE ATTRIBUTE:
//                               changes rarely, read by the vertex stage)
// Changed rows travel through ONE delta storage buffer with fixed
// per-capacity regions (header, ids, and one value region per section), so
// per tick the host performs exactly ONE queue.writeBuffer PER SECTION
// (never per entity — spec: "Per-entity queue.writeBuffer calls SHALL NOT
// exist in the fast path") followed by ONE compute dispatch that scatters
// every section into the persistent buffers by slot (the strategy measured
// by benchmarks/realtime/webgpu/probe.html). A second compute pass in the
// same submit XOR-folds the bit patterns of every persistent word into a
// small readback buffer — the probe's checksum pattern — which is compared
// against a CPU-computed expectation over the same rows before the pack's
// receipt says ok:true. A mismatch returns
// {ok:false, reason:'checksum_mismatch'} AND fires reportDeviceLost: bad
// state is never presented as applied.
//
// Capacity growth doubles from a floor and NEVER aliases live rows: mirrors
// are copied, brand-new buffers are created, the preserved rows are
// re-uploaded (one writeBuffer per persistent section), and only then are
// the old buffers destroyed — in-flight submissions on them complete per
// WebGPU semantics. Freed slots go through a free list (EntityStore
// discipline) and are zeroed by a kill row in the same scatter that
// processes `left`, so a recycled slot is always fully rewritten before its
// next tenant can render; rows that would land on a dead-or-dying slot snap
// instead of lerping from a previous tenant's position.
//
// ── Interpolation (task 2.3) ────────────────────────────────────────────────
// The scatter writes prev = the row's previous target, next = the new target,
// and timestamps mapped from SHARED-CLOCK server ticks (tickSeconds below),
// never from arrival wall-clock: a pack that arrives late or early changes
// nothing about the segment it lands in, so arrival jitter is excluded by
// construction. The vertex stage evaluates alpha = (now - tPrev)/(tNext -
// tPrev) (clamped) and mixes prev/next — the same math as the pure
// ringAlphaAt/evalRingRow functions here, which Node tests verify without a
// GPU. Out-of-order arrivals (a tick not newer than a row's tNext) are
// excluded from the scatter entirely, so a late frame can never drag a ring
// backwards, and a shared clock past tNext clamps to holding the target
// (no dead-reckoning drift; the motion buffer is there for a future pass).
//
// ── Harness recipe (task 2.4 groundwork — tools/realtime/gpu-harness.html,
//    owned by another agent) ─────────────────────────────────────────────────
//
//   import * as THREE from 'three/webgpu';   // r0.180: build/three.webgpu.js
//   import { createWebGPUThreeBackend } from '<src>/realtime/gpu/webgpuBackend.js';
//   import { resolveFlags } from '<src>/realtime/flags.js';
//
//   const flags = resolveFlags();            // renderer_webgpu_fastpath gate
//   let backend = null;
//   if (flags.renderer_webgpu_fastpath) {
//     backend = await createWebGPUThreeBackend({
//       maxSlots: 8192,
//       onUnavailable: (reason) => console.info('GPU arm unavailable:', reason),
//     });                                    // → backend | null; never throws
//   }
//   if (backend) {
//     const renderer = new THREE.WebGPURenderer({ canvas });
//     await renderer.init();
//     const state = backend.getRenderState(); // persistent buffers + layout
//     // Instanced draws: build TSL nodes reading the persistent buffers as
//     // storage (three/webgpu storage(buffer, type) nodes), addressed by
//     // instanceIndex exactly like the probe's render check
//     // (benchmarks/realtime/webgpu/probe.html RENDER_WGSL):
//     //   pos   = mix(ring[6*i .. 6*i+3], transforms[i], alpha)
//     //   alpha = ringAlphaAt(ring[6*i+4], ring[6*i+5], now)  — clamped
//     // with `now` refreshed per frame from backend.sharedNowSeconds() into a
//     // uniform, and flags/metaFlags (metaWordIsAlive/Archetype/Variant)
//     // driving poses, alive culling, and archetype selection. Per posted
//     // pack: `await backend.applyDeltaPack(pack)` and use the receipt for
//     // the ack round-trip. On onDeviceLost(reason, dying): snap =
//     // dying.snapshot(); dying.dispose(); rebuild CPUThreeBackend per the
//     // backend.js header (snapshot carries packId/epoch/tick/frameSequence,
//     // so the rebuilt arm rejoins the ack round-trip cleanly).
//   }
//
// NOTE ON DEVICES: the backend creates its own raw WebGPU device (no three
// import anywhere in this module). three/webgpu's WebGPURenderer creates its
// own device in r0.180; until three exposes device injection, the harness
// treats entity state (this backend's buffers) as one device's storage and
// three's scene rendering as another — the probe proved that split with a
// raw render pass over the same persistent buffer.
//
// Concurrency: applyDeltaPack serializes internally (a chain), so a caller
// may post the next pack before awaiting the previous receipt without ever
// interleaving planning against an in-flight scatter.

// ── Pure constants and layout (no imports above this point — ever) ──────────

// Presence cadence (docs/architecture/realtime: presence at 10 Hz). The
// pack's `tick` is the server tick counter; the shared clock maps it.
export const DEFAULT_TICK_RATE = 10;

// Compute workgroup size, matching the probe's kernels.
export const WORKGROUP_SIZE = 64;

// Upload sections, in writeBuffer order. One contiguous compact array per
// section per tick — "the changed rows' compact arrays".
export const SCATTER_SECTIONS = Object.freeze([
  'index',       // u32 header (count, 3 reserved) + (entityId, slot) pairs
  'transforms',  // f32 x,y,z,yaw per changed row
  'ring',        // f32 prevX,prevY,prevZ,prevYaw,tPrev,tNext per changed row
  'motion',      // f32 vx,vy,vz,segmentSeconds per changed row
  'flags',       // u32 packed flag bits per changed row
  'meta',        // u32 alive|archetype|variant word per changed row
]);

// Slot flag bits (shared/realtime/entityStore.js contract).
export const FLAG_WALKING = 1;
export const FLAG_SITTING = 2;
export const FLAG_AIRBORNE = 4;

const ALIVE_BIT = 0x80000000;

// Fixed GPU state layout for a capacity of C dense slots. All regions are
// u32-word aligned; the delta buffer's region offsets are baked into the
// scatter WGSL as constants (regenerated only when capacity grows).
export function computeStateLayout(capacity) {
  const C = capacity >>> 0;
  const headerWords = 4;
  const idsWordOffset = headerWords;
  const transformsWordOffset = idsWordOffset + 2 * C;
  const ringWordOffset = transformsWordOffset + 4 * C;
  const motionWordOffset = ringWordOffset + 6 * C;
  const flagsWordOffset = motionWordOffset + 4 * C;
  const metaWordOffset = flagsWordOffset + C;
  const totalWords = metaWordOffset + C;
  return {
    capacity: C,
    workgroupSize: WORKGROUP_SIZE,
    // Persistent per-component buffers (task 2.1).
    persistent: {
      transforms: { strideBytes: 16, bytes: C * 16 },  // vec4 x,y,z,yaw (next)
      ring: { strideBytes: 24, bytes: C * 24 },        // prev vec4 + tPrev,tNext
      motion: { strideBytes: 16, bytes: C * 16 },      // vec4 vx,vy,vz,dt
      metaFlags: { strideBytes: 8, bytes: C * 8 },     // u32 flags | u32 meta
    },
    // Checksum footprint: words folded per slot (must match the checksum
    // kernel and expectedChecksum exactly).
    wordsPerSlot: 16,
    // Delta buffer regions (task 2.2 upload targets).
    delta: {
      headerWords,
      idsWordOffset,
      idWordsPerRow: 2,
      transformsWordOffset,
      transformsWordsPerRow: 4,
      ringWordOffset,
      ringWordsPerRow: 6,
      motionWordOffset,
      motionWordsPerRow: 4,
      flagsWordOffset,
      flagsWordsPerRow: 1,
      metaWordOffset,
      metaWordsPerRow: 1,
      totalWords,
      totalBytes: totalWords * 4,
    },
  };
}

// Capacity growth: double from a floor until `min` fits. Monotonicity is the
// caller's job (ensureCapacity never lets capacity shrink).
export function nextCapacity(current, min, floor = 64) {
  let cap = Math.max(current, floor);
  while (cap < min) cap *= 2;
  return cap;
}

// ── Shared clock + interpolation ring math (task 2.3, pure) ─────────────────

// Map a server tick to shared-clock seconds. `timeOrigin` is the shared-clock
// second of tick 0 within the current epoch; the alpha math only ever sees
// differences, so the origin's absolute value is irrelevant as long as ticks
// and `now` share one origin. Arrival wall-clock NEVER enters here.
export function tickSeconds(tick, opts = {}) {
  const rate = opts.tickRate ?? DEFAULT_TICK_RATE;
  const origin = opts.timeOrigin ?? 0;
  return origin + tick / rate;
}

// Interpolation alpha from ring timestamps: 0 at/behind tPrev, 1 at/past
// tNext. tNext <= tPrev (degenerate or already-arrived) → 1. Clamping means a
// shared clock past tNext holds the row at its target instead of drifting.
export function ringAlphaAt(tPrev, tNext, now) {
  const span = tNext - tPrev;
  if (!(span > 0)) return 1;
  const a = (now - tPrev) / span;
  if (a <= 0) return 0;
  if (a >= 1) return 1;
  return a;
}

// Shortest-path yaw interpolation (the CPU arm's wrap discipline).
export function lerpAngleWrapped(a, b, t) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

// Evaluate one ring row at shared-clock time `now` — the CPU-visible twin of
// the vertex-stage mix. prev/next are [x, y, z, yaw]; returns {x, y, z, rotY}.
export function evalRingRow(prev, next, tPrev, tNext, now) {
  const a = ringAlphaAt(tPrev, tNext, now);
  return {
    x: prev[0] + (next[0] - prev[0]) * a,
    y: prev[1] + (next[1] - prev[1]) * a,
    z: prev[2] + (next[2] - prev[2]) * a,
    rotY: lerpAngleWrapped(prev[3], next[3], a),
  };
}

// ── Packing helpers (pure) ──────────────────────────────────────────────────

export function packFlagsWord(flagsByte) {
  return (flagsByte ?? 0) & 0xff;
}

export function packMetaWord({ alive = true, archetype = 0, variant = 0 } = {}) {
  if (!alive) return 0;
  return (ALIVE_BIT | (((archetype & 0x7fff) << 16) | (variant & 0xffff))) >>> 0;
}

export function metaWordIsAlive(word) {
  return ((word >>> 0) & ALIVE_BIT) !== 0;
}

export function metaWordArchetype(word) {
  return ((word >>> 0) >> 16) & 0x7fff;
}

export function metaWordVariant(word) {
  return (word >>> 0) & 0xffff;
}

// ── Checksum math (pure; the probe's XOR-fold pattern) ──────────────────────
// XOR is order-independent and bit-exact, so any lost or misdirected scatter
// write flips the comparison. GPU side: the checksum kernel folds every
// persistent word per slot (16 words, buffer order) into per-invocation
// accumulators; the host folds the readback the same way.

const scratchWords = new Uint32Array(16);

// Bit-cast views over the float mirrors — the checksum folds f32 BIT
// PATTERNS (probe pattern; the kernel bitcast<s>f32</s>), so reading mirror
// floats through a Uint32Array view is required, not plain assignment (which
// would integer-truncate).
const u32Views = new WeakMap();

function mirrorU32(mirrors) {
  let v = u32Views.get(mirrors);
  if (!v) {
    v = {
      transforms: new Uint32Array(mirrors.transforms.buffer),
      ring: new Uint32Array(mirrors.ring.buffer),
      motion: new Uint32Array(mirrors.motion.buffer),
    };
    u32Views.set(mirrors, v);
  }
  return v;
}

function slotWords(mirrors, slot, out) {
  const u = mirrorU32(mirrors);
  const t = slot * 4, r = slot * 6, m = slot * 4;
  out[0] = u.transforms[t]; out[1] = u.transforms[t + 1];
  out[2] = u.transforms[t + 2]; out[3] = u.transforms[t + 3];
  out[4] = u.ring[r]; out[5] = u.ring[r + 1];
  out[6] = u.ring[r + 2]; out[7] = u.ring[r + 3];
  out[8] = u.ring[r + 4]; out[9] = u.ring[r + 5];
  out[10] = u.motion[m]; out[11] = u.motion[m + 1];
  out[12] = u.motion[m + 2]; out[13] = u.motion[m + 3];
  out[14] = mirrors.flags[slot]; out[15] = mirrors.meta[slot];
  return out;
}

function xorAll(words) {
  let acc = 0;
  for (let i = 0; i < words.length; i++) acc = (acc ^ words[i]) >>> 0;
  return acc >>> 0;
}

// CPU expectation over ALL slots of a mirror state — the twin of what the
// checksum kernel computes on-device. Used after growth/reallocation; the
// per-tick expectation is the incremental expectedChecksum() below.
export function recomputeFold(mirrors, capacity) {
  let acc = 0;
  for (let slot = 0; slot < capacity; slot++) {
    acc = (acc ^ xorAll(slotWords(mirrors, slot, scratchWords))) >>> 0;
  }
  return acc >>> 0;
}

// Expected checksum for a pack = the last validated fold XORed with the rows
// the plan is about to change (each row contributes old^new, so untouched
// rows cancel). Computed BEFORE the mirror is committed: on a mismatch
// nothing is committed and the fold keeps describing the last VALIDATED state.
export function expectedChecksum(fold, plan) {
  return (fold ^ plan.changeFold) >>> 0;
}

export function xorHex(v) {
  return '0x' + (v >>> 0).toString(16).padStart(8, '0');
}

// ── Pack planning (pure; the planning half of tasks 2.2 + 2.3) ──────────────
// Turns one worker delta pack (createPack shape, src/realtime/worker/core.js:
// {ids/x/z/yaw/flags typed arrays, count, joined, left, packId, epoch, tick,
// frameSequence}) into the changed-set rows the scatter will write.
//
//   state: { epoch, ack, fold: {value}, idToSlot: Map<entityId, slot>,
//            freeSlots: number[] (stack), guestIdBySlot, guestIdOfEntity,
//            mirrors: {transforms, ring, motion, flags, meta} }
//   opts:  { tickTime — shared-clock seconds of pack.tick (tickSeconds) }
//
// Mutates ONLY allocation/bookkeeping state (idToSlot, freeSlots) —
// optimistically: a later checksum failure declares the whole backend lost,
// so allocation rollback is unnecessary by design. Mirror COMMIT is a
// separate function (commitPlan) so a failed validation leaves the last
// acknowledged state intact for snapshot().
//
// Lifecycle order mirrors PackConsumer/backend.js: joined seeds identity and
// slots, left frees slots (kill rows), then dense rows update state. A row
// for an unknown id spawns on sight (resync boundary, same as the CPU arm).
// Rows whose tick time is not newer than the row's tNext are STALE and
// excluded from the scatter — arrival jitter/reorder can never drag a ring
// backwards (plan.staleCount reports how many). Rows landing on a slot whose
// tenant is dead or was freed this tick SNAP (prev = next) instead of
// lerping from a previous tenant's position.

const ZEROS4 = [0, 0, 0, 0];

export function planPackApply(pack, state, opts = {}) {
  const { capacity, idToSlot, freeSlots, mirrors } = state;
  const tickTime = opts.tickTime;
  if (tickTime === undefined) throw new TypeError('planPackApply needs opts.tickTime');

  const rowsBySlot = new Map();
  const joinedPairs = [];
  const leftPairs = [];
  const killedSlots = new Set();
  let epochReset = false;
  let staleCount = 0;

  const allocSlot = () => {
    if (freeSlots.length === 0) {
      throw new RangeError(
        'planPackApply ran out of slots; the caller must ensureCapacity before planning'
      );
    }
    const slot = freeSlots.pop();
    return slot;
  };

  const killRow = (slot, entityId) => ({
    kind: 'kill', slot, entityId, joined: false,
    t: ZEROS4, ringPrev: ZEROS4, tPrev: 0, tNext: 0,
    motion: [0, 0, 0, 0], flags: 0, meta: 0,
  });

  // Epoch change = resync: every live slot dies this tick, then the pack
  // respawns its population into freshly allocated slots.
  if (pack.epoch !== state.epoch) {
    epochReset = true;
    for (const [entityId, slot] of idToSlot) {
      killedSlots.add(slot);
      if (!rowsBySlot.has(slot)) rowsBySlot.set(slot, killRow(slot, entityId));
    }
    idToSlot.clear();
    freeSlots.length = 0;
    for (let s = capacity - 1; s >= 0; s--) freeSlots.push(s);
  }

  // joined: seed identity + initial transform (spawn frames carry it once).
  for (const j of pack.joined) {
    let slot = idToSlot.get(j.entityId);
    if (slot === undefined) {
      slot = allocSlot();
      idToSlot.set(j.entityId, slot);
    }
    const x = j.x ?? 0, z = j.z ?? 0, yaw = j.yaw ?? 0;
    rowsBySlot.set(slot, {
      kind: 'join', slot, entityId: j.entityId, joined: true,
      t: [x, 0, z, yaw],
      ringPrev: [x, 0, z, yaw],         // snap: no motion invented for a spawn
      tPrev: tickTime, tNext: tickTime, // degenerate alpha → renders at target
      motion: [0, 0, 0, 0],
      flags: 0,
      meta: packMetaWord({ alive: true, archetype: j.archetype ?? 0, variant: j.variant ?? 0 }),
    });
    joinedPairs.push({ slot, entityId: j.entityId, guestId: j.guestId ?? null });
  }

  // left: free the slot and scatter a kill row (zeroes the row, clears alive).
  for (const entityId of pack.left) {
    const slot = idToSlot.get(entityId);
    if (slot === undefined) continue;
    idToSlot.delete(entityId);
    freeSlots.push(slot);
    killedSlots.add(slot);
    rowsBySlot.set(slot, killRow(slot, entityId));
    leftPairs.push({ slot, entityId });
  }

  // Dense rows: newest-wins coalesced transform/flag state.
  for (let i = 0; i < pack.count; i++) {
    const entityId = pack.ids[i];
    let slot = idToSlot.get(entityId);
    if (slot === undefined) {
      slot = allocSlot();
      idToSlot.set(entityId, slot);
    }
    const tNext = tickTime;
    const prevTNext = mirrors.ring[slot * 6 + 5];
    if (tNext <= prevTNext) { staleCount++; continue; } // out-of-order / duplicate
    const b = slot * 4;
    const x = pack.x[i], y = 0, z = pack.z[i], yaw = pack.yaw[i];
    const existing = rowsBySlot.get(slot);
    const resyncSpawn = !existing && (!metaWordIsAlive(mirrors.meta[slot]) || killedSlots.has(slot));
    if (existing && existing.joined) {
      // Join + row in one pack (snapshot frames): keep identity/meta, take
      // the row's transform state; the ring still snaps (spawn tick).
      rowsBySlot.set(slot, {
        kind: 'join', slot, entityId, joined: true,
        t: [x, y, z, yaw],
        ringPrev: [x, y, z, yaw],
        tPrev: tNext, tNext,
        motion: [0, 0, 0, 0],
        flags: packFlagsWord(pack.flags[i]),
        meta: existing.meta,
      });
      continue;
    }
    const tPrev = mirrors.ring[slot * 6 + 4];
    if (resyncSpawn) {
      // First sight on a dead/recycled slot: snap, never lerp a ghost.
      rowsBySlot.set(slot, {
        kind: 'update', slot, entityId, joined: false,
        t: [x, y, z, yaw],
        ringPrev: [x, y, z, yaw],
        tPrev: tNext, tNext,
        motion: [0, 0, 0, 0],
        flags: packFlagsWord(pack.flags[i]),
        meta: packMetaWord({ alive: true }),
      });
      continue;
    }
    const px = mirrors.transforms[b], py = mirrors.transforms[b + 1];
    const pz = mirrors.transforms[b + 2], pyaw = mirrors.transforms[b + 3];
    const dt = tNext - tPrev;
    rowsBySlot.set(slot, {
      kind: 'update', slot, entityId, joined: false,
      t: [x, y, z, yaw],
      ringPrev: [px, py, pz, pyaw],
      tPrev, tNext,
      motion: dt > 0
        ? [(x - px) / dt, (y - py) / dt, (z - pz) / dt, dt]
        : [0, 0, 0, 0],
      flags: packFlagsWord(pack.flags[i]),
      meta: (mirrors.meta[slot] & ~ALIVE_BIT | ALIVE_BIT) >>> 0, // keep archetype|variant, force alive
    });
  }

  // Finalize: dense row list + the checksum delta (old words XOR new words
  // per changed row, folded — untouched rows cancel out of the XOR). Both
  // sides are folded as f32 BIT PATTERNS (via typed-array views) — the same
  // convention as the GPU kernels; plain element copies would integer-
  // truncate and silently disagree with the device.
  const rows = [...rowsBySlot.values()];
  const oldWords = new Uint32Array(16);
  const newWords = new Uint32Array(16);
  const newF32 = new Float32Array(newWords.buffer);
  let changeFold = 0;
  let capacityNeeded = 0;
  for (const row of rows) {
    slotWords(mirrors, row.slot, oldWords);
    newF32.set(row.t, 0);
    newF32.set(row.ringPrev, 4);
    newF32[8] = row.tPrev;
    newF32[9] = row.tNext;
    newF32.set(row.motion, 10);
    newWords[14] = row.flags;
    newWords[15] = row.meta;
    changeFold = (changeFold ^ xorAll(oldWords) ^ xorAll(newWords)) >>> 0;
    if (row.slot + 1 > capacityNeeded) capacityNeeded = row.slot + 1;
  }

  return {
    epochReset,
    rows,
    rowCount: rows.length,
    joinedPairs,
    leftPairs,
    staleCount,
    capacityNeeded,
    changeFold,
    packId: pack.packId, epoch: pack.epoch, tick: pack.tick,
    frameSequence: pack.frameSequence,
    packJoined: pack.joined.length, packLeft: pack.left.length, packRows: pack.count,
  };
}

// Commit a validated plan to the CPU mirrors + bookkeeping. Called ONLY after
// the on-GPU checksum matched, so mirrors always describe the last validated
// GPU image (sample()/snapshot() therefore never present bad state).
export function commitPlan(plan, state) {
  const { mirrors } = state;
  for (const row of plan.rows) {
    const b = row.slot * 4, r = row.slot * 6, m = row.slot * 4;
    mirrors.transforms.set(row.t, b);
    mirrors.ring.set(row.ringPrev, r);
    mirrors.ring[r + 4] = row.tPrev;
    mirrors.ring[r + 5] = row.tNext;
    mirrors.motion.set(row.motion, m);
    mirrors.flags[row.slot] = row.flags;
    mirrors.meta[row.slot] = row.meta;
  }
  for (const { slot, entityId, guestId } of plan.joinedPairs) {
    state.guestIdBySlot[slot] = guestId;
    if (guestId) state.guestIdOfEntity.set(entityId, guestId);
  }
  for (const { slot, entityId } of plan.leftPairs) {
    state.guestIdBySlot[slot] = null;
    state.guestIdOfEntity.delete(entityId);
  }
  if (plan.epochReset) state.epoch = plan.epoch;
  state.fold.value = (state.fold.value ^ plan.changeFold) >>> 0;
  state.ack = { packId: plan.packId, epoch: plan.epoch, tick: plan.tick, frameSequence: plan.frameSequence };
  return state;
}

// ── WGSL (browser path; the tests' mock device executes the SAME kernel
//    semantics against these exact buffer layouts) ───────────────────────────

// Scatter kernel: one dispatch covers every section for every changed row —
// ids travel as (entityId, slot) pairs because the id→slot remap is a
// CPU-side concern (probe README). Region offsets are baked per capacity.
export function buildScatterShader(layout) {
  const d = layout.delta;
  return /* wgsl */ `
// afterlight scatter — capacity ${layout.capacity}; generated by webgpuBackend.js
struct Delta {
  count: u32,
  _p0: u32,
  _p1: u32,
  _p2: u32,
  data: array<u32>, // word regions at baked offsets (see computeStateLayout)
}

@group(0) @binding(0) var<storage, read> delta : Delta;
@group(0) @binding(1) var<storage, read_write> transforms : array<vec4f>;
@group(0) @binding(2) var<storage, read_write> ring : array<f32>;      // 6 words/slot
@group(0) @binding(3) var<storage, read_write> motion : array<vec4f>;
@group(0) @binding(4) var<storage, read_write> metaFlags : array<vec2u>;

@compute @workgroup_size(${WORKGROUP_SIZE})
fn scatter(@builtin(global_invocation_id) gid : vec3u) {
  let i = gid.x;
  if (i >= delta.count) { return; }
  let idsBase = ${d.idsWordOffset}u + 2u * i;
  let slot = delta.data[idsBase + 1u];

  let tb = ${d.transformsWordOffset}u + 4u * i;
  transforms[slot] = vec4f(
    bitcast<f32>(delta.data[tb]),
    bitcast<f32>(delta.data[tb + 1u]),
    bitcast<f32>(delta.data[tb + 2u]),
    bitcast<f32>(delta.data[tb + 3u]));

  let rb = ${d.ringWordOffset}u + ${d.ringWordsPerRow}u * i;
  let sb = ${d.ringWordsPerRow}u * slot;
  ring[sb] = bitcast<f32>(delta.data[rb]);
  ring[sb + 1u] = bitcast<f32>(delta.data[rb + 1u]);
  ring[sb + 2u] = bitcast<f32>(delta.data[rb + 2u]);
  ring[sb + 3u] = bitcast<f32>(delta.data[rb + 3u]);
  ring[sb + 4u] = bitcast<f32>(delta.data[rb + 4u]); // tPrev
  ring[sb + 5u] = bitcast<f32>(delta.data[rb + 5u]); // tNext

  let mb = ${d.motionWordOffset}u + 4u * i;
  motion[slot] = vec4f(
    bitcast<f32>(delta.data[mb]),
    bitcast<f32>(delta.data[mb + 1u]),
    bitcast<f32>(delta.data[mb + 2u]),
    bitcast<f32>(delta.data[mb + 3u]));

  metaFlags[slot] = vec2u(delta.data[${d.flagsWordOffset}u + i],
                          delta.data[${d.metaWordOffset}u + i]);
}
`;
}

// Checksum kernel: XOR-folds every persistent word (16 per slot) into per-
// invocation accumulators, strided across invocations — the probe's pattern.
export function buildChecksumShader() {
  return /* wgsl */ `
// afterlight scatter checksum — mirrors recomputeFold()/expectedChecksum()
struct Params { capacity: u32, invocations: u32, _p0: u32, _p1: u32 }
struct Chk { sums: array<u32> }

@group(0) @binding(0) var<storage, read> transforms : array<vec4f>;
@group(0) @binding(1) var<storage, read> ring : array<f32>;
@group(0) @binding(2) var<storage, read> motion : array<vec4f>;
@group(0) @binding(3) var<storage, read> metaFlags : array<vec2u>;
@group(0) @binding(4) var<uniform> params : Params;
@group(0) @binding(5) var<storage, read_write> chk : Chk;

@compute @workgroup_size(${WORKGROUP_SIZE})
fn checksum(@builtin(global_invocation_id) gid : vec3u) {
  var acc = 0u;
  for (var s = gid.x; s < params.capacity; s = s + params.invocations) {
    let t = transforms[s];
    acc = acc ^ bitcast<u32>(t.x) ^ bitcast<u32>(t.y) ^ bitcast<u32>(t.z) ^ bitcast<u32>(t.w);
    let rb = 6u * s;
    for (var k = 0u; k < 6u; k = k + 1u) { acc = acc ^ bitcast<u32>(ring[rb + k]); }
    let m = motion[s];
    acc = acc ^ bitcast<u32>(m.x) ^ bitcast<u32>(m.y) ^ bitcast<u32>(m.z) ^ bitcast<u32>(m.w);
    let mf = metaFlags[s];
    acc = acc ^ mf.x ^ mf.y;
  }
  chk.sums[gid.x] = acc;
}
`;
}

// Binding plans (explicit layouts — stable binding numbers for the harness
// and the mock device; no 'auto' layout introspection needed anywhere).
export const SCATTER_BINDINGS = Object.freeze({
  delta: 0, transforms: 1, ring: 2, motion: 3, metaFlags: 4,
});
export const CHECKSUM_BINDINGS = Object.freeze({
  transforms: 0, ring: 1, motion: 2, metaFlags: 3, params: 4, out: 5,
});

// Typed error for the GPU arm. `code` is stable: 'unavailable' | 'disposed'
// | 'validation' (checksum failures come back as receipts +
// reportDeviceLost('checksum_mismatch'), not exceptions).
export class WebGPUBackendError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'WebGPUBackendError';
    this.code = code;
  }
}

// ── Three-free mirror of EntityRenderBackend's device-loss registry ─────────
// (see the header: why this is not imported from backend.js). Contract is
// identical: handlers fire on loss with (reason, backend); unsubscribe fn.

class EntityRenderBackendBase {
  constructor() {
    this._deviceLostHandlers = [];
  }

  onDeviceLost(handler) {
    if (typeof handler !== 'function') {
      throw new TypeError('onDeviceLost expects a handler function');
    }
    this._deviceLostHandlers.push(handler);
    const handlers = this._deviceLostHandlers;
    return () => {
      const i = handlers.indexOf(handler);
      if (i !== -1) handlers.splice(i, 1);
    };
  }

  reportDeviceLost(reason) {
    for (const handler of [...this._deviceLostHandlers]) handler(reason, this);
  }
}

// ── WebGPUThreeBackend ───────────────────────────────────────────────────────

const GPU_USAGE = {
  STORAGE: 0x80, COPY_DST: 0x08, COPY_SRC: 0x04, MAP_READ: 0x01, UNIFORM: 0x40,
};
const COMPUTE_STAGE = 4; // GPUShaderStage.COMPUTE

function defaultNow() {
  try {
    if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
      return performance.now() / 1000;
    }
  } catch { /* headless */ }
  return Date.now() / 1000;
}

function emptyMirrors() {
  return {
    transforms: new Float32Array(0), ring: new Float32Array(0),
    motion: new Float32Array(0), flags: new Uint32Array(0), meta: new Uint32Array(0),
  };
}

export class WebGPUThreeBackend extends EntityRenderBackendBase {
  // device — an object with the WebGPUDevice surface this class touches:
  //   createBuffer/createBindGroupLayout/createPipelineLayout/createShaderModule/
  //   createComputePipeline/createCommandEncoder/pushErrorScope?/popErrorScope?/
  //   addEventListener?/lost:Promise/queue{writeBuffer,submit,onSubmittedWorkDone}
  //   (a real GPUDevice, or the hand-rolled mock used by tests). Required:
  //   constructing without one throws WebGPUBackendError('unavailable') — use
  //   createWebGPUThreeBackend() to probe availability instead.
  // maxSlots — the store's slot budget; the default matches EntityStore.
  // tickRate — shared-clock ticks per second (presence cadence).
  // now — () => shared-clock seconds; injectable for deterministic tests.
  // timeOrigin — shared-clock second of tick 0; defaults to now() at construct.
  constructor({ device = null, maxSlots = 8192, tickRate = DEFAULT_TICK_RATE, now = null, timeOrigin = null } = {}) {
    super();
    if (!device || typeof device.createBuffer !== 'function' || !device.queue) {
      throw new WebGPUBackendError(
        'unavailable',
        'WebGPUThreeBackend needs a WebGPU device (or compatible mock); ' +
        'use createWebGPUThreeBackend() to probe availability'
      );
    }
    this.device = device;
    this.queue = device.queue;
    this.maxSlots = maxSlots >>> 0;
    this.tickRate = tickRate;
    this._nowFn = now ?? defaultNow;
    this._timeOrigin = timeOrigin ?? this._nowFn();
    this.disposed = false;
    this.lost = false;
    this.lastFailure = null;

    // Single persistent state object shared with the pure planning/commit
    // functions (they mutate it in place — see planPackApply/commitPlan).
    this._state = {
      capacity: 0,
      epoch: 0,
      ack: { packId: 0, epoch: 0, tick: 0, frameSequence: 0 },
      fold: { value: 0 }, // XOR fold of the last VALIDATED mirror state
      idToSlot: new Map(),        // u32 entityId -> slot
      freeSlots: [],
      guestIdBySlot: new Array(this.maxSlots).fill(null),
      guestIdOfEntity: new Map(), // entityId -> guestId string
      mirrors: null,
    };

    this._gpu = null;          // buffers + pipelines + bind groups per capacity
    this._layout = null;
    this._deltaScratch = null; // per-section upload scratch, grown with capacity
    this._applyChain = Promise.resolve();
    this._onUncapturedError = null;

    // Async device loss → onDeviceLost (first loss wins).
    if (device.lost && typeof device.lost.then === 'function') {
      device.lost.then(
        (info) => this._handleLoss((info && info.reason) || 'device-lost'),
        () => this._handleLoss('device-lost')
      );
    }
    if (typeof device.addEventListener === 'function') {
      this._onUncapturedError = (e) => {
        const msg = (e && e.error && e.error.message) || String(e);
        this._handleLoss('validation: ' + msg);
      };
      device.addEventListener('uncapturederror', this._onUncapturedError);
    }
  }

  get capacity() { return this._state.capacity; }
  get epoch() { return this._state.epoch; }
  get ack() { return this._state.ack; }
  get population() { return this._state.idToSlot.size; }

  // Shared-clock seconds (the base ring timestamps live on). The vertex stage
  // and sample() both evaluate the ring at this clock.
  sharedNowSeconds() { return this._nowFn(); }

  slotOf(entityId) {
    const s = this._state.idToSlot.get(entityId);
    return s === undefined ? -1 : s;
  }

  // Monotonic capacity hint; allocates or grows the persistent buffers.
  // Growth never aliases live rows: new buffers are created and the preserved
  // rows re-uploaded before the old buffers are destroyed (in-flight
  // submissions on destroyed buffers complete per WebGPU semantics).
  ensureCapacity(n) {
    if (this.disposed) throw new WebGPUBackendError('disposed', 'WebGPUThreeBackend disposed');
    const want = Math.min(n >>> 0, this.maxSlots);
    if (want <= this.capacity && this._gpu) return this.capacity;
    const target = nextCapacity(this.capacity, Math.max(want, 1));
    if (!this._gpu) this._allocate(target);
    else this._grow(target);
    return this.capacity;
  }

  // applyDeltaPack — Promise<receipt> (see header). Packs serialize through a
  // chain, so posting the next pack before awaiting the previous receipt is
  // safe. Receipt (ok):
  //   { ok:true, packId, epoch, tick, frameSequence, appliedRows, joined,
  //     left, capacity, checksum:{passed,expectedXor,actualXor} }
  // Receipt (scatter/checksum failure — the pack is NOT applied):
  //   { ok:false, reason:'checksum_mismatch', packId, … } + reportDeviceLost.
  // After device loss, further packs get {ok:false, reason:'device_lost'}.
  applyDeltaPack(pack) {
    const run = this._applyChain.then(() => this._applyImpl(pack));
    this._applyChain = run.catch(() => { /* keep the chain alive; the caller saw the rejection */ });
    return run;
  }

  async _applyImpl(pack) {
    if (this.disposed) throw new WebGPUBackendError('disposed', 'WebGPUThreeBackend disposed');
    const head = { packId: pack.packId, epoch: pack.epoch, tick: pack.tick, frameSequence: pack.frameSequence };
    if (this.lost) {
      return { ok: false, reason: 'device_lost', ...head, appliedRows: 0, checksum: null };
    }

    // Pre-size: every new entity needs a slot; a delta row may also spawn on
    // sight. A loose upper bound — the planner throws if the free list is
    // empty, and it never is after this.
    const needed = this.population + pack.joined.length + (pack.epoch !== this.epoch ? 0 : pack.count) + 1;
    if (needed > this.capacity || !this._gpu) this.ensureCapacity(needed);

    const tickTime = tickSeconds(pack.tick, { tickRate: this.tickRate, timeOrigin: this._timeOrigin });
    const plan = planPackApply(pack, this._state, { tickTime });

    // Nothing to scatter (empty or all-stale tick): commit bookkeeping and
    // acknowledge honestly — appliedRows 0, nothing presented as applied.
    if (plan.rowCount === 0) {
      commitPlan(plan, this._state);
      return {
        ok: true, ...this.ack, appliedRows: 0,
        staleRows: plan.staleCount,
        joined: plan.joinedPairs.length, left: plan.leftPairs.length,
        capacity: this.capacity,
        checksum: { passed: true, expectedXor: xorHex(this._state.fold.value), actualXor: xorHex(this._state.fold.value) },
      };
    }

    const gpu = this._gpu;
    const d = this._layout.delta;
    const writes = this._fillScratch(plan);
    const count = plan.rowCount;
    const expected = expectedChecksum(this._state.fold.value, plan);

    // ONE writeBuffer per section (task 2.2) — never per entity.
    this.queue.writeBuffer(gpu.buffers.delta, 0, writes.ids, 0, d.headerWords + 2 * count);
    this.queue.writeBuffer(gpu.buffers.delta, d.transformsWordOffset * 4, writes.transforms, 0, 4 * count);
    this.queue.writeBuffer(gpu.buffers.delta, d.ringWordOffset * 4, writes.ring, 0, 6 * count);
    this.queue.writeBuffer(gpu.buffers.delta, d.motionWordOffset * 4, writes.motion, 0, 4 * count);
    this.queue.writeBuffer(gpu.buffers.delta, d.flagsWordOffset * 4, writes.flags, 0, count);
    this.queue.writeBuffer(gpu.buffers.delta, d.metaWordOffset * 4, writes.meta, 0, count);

    // One submit: scatter dispatch + checksum pass + readback copy. The
    // validation error scope catches encode-time validation errors (spec:
    // route them to onDeviceLost).
    const workgroups = Math.max(1, Math.ceil(count / WORKGROUP_SIZE));
    const scoped = typeof this.device.pushErrorScope === 'function';
    if (scoped) this.device.pushErrorScope('validation');
    const encoder = this.device.createCommandEncoder();
    const pass = encoder.beginComputePass();
    pass.setPipeline(gpu.scatterPipeline);
    pass.setBindGroup(0, gpu.scatterBind);
    pass.dispatchWorkgroups(workgroups);
    pass.end();
    const chkPass = encoder.beginComputePass();
    chkPass.setPipeline(gpu.checksumPipeline);
    chkPass.setBindGroup(0, gpu.checksumBind);
    chkPass.dispatchWorkgroups(gpu.checksumWorkgroups);
    chkPass.end();
    encoder.copyBufferToBuffer(gpu.buffers.chkOut, 0, gpu.buffers.chkRead, 0, gpu.buffers.chkRead.size);
    this.queue.submit([encoder.finish()]);
    let validationError = null;
    if (scoped) {
      try { validationError = await this.device.popErrorScope(); } catch { validationError = null; }
    }
    await this.queue.onSubmittedWorkDone();

    if (validationError) {
      const reason = 'validation: ' + validationError.message;
      const receipt = { ok: false, reason: 'validation', detail: reason, ...head, appliedRows: 0, checksum: null };
      this.lastFailure = receipt;
      this._handleLoss(reason);
      return receipt;
    }

    // On-GPU checksum: read back the fold, compare against the CPU
    // expectation over the same rows (probe pattern).
    let actual = 0;
    await gpu.buffers.chkRead.mapAsync(GPU_USAGE.MAP_READ);
    try {
      const u32 = new Uint32Array(gpu.buffers.chkRead.getMappedRange());
      for (let i = 0; i < gpu.checksumInvocations; i++) actual = (actual ^ u32[i]) >>> 0;
    } finally {
      gpu.buffers.chkRead.unmap();
    }

    if (actual !== expected) {
      const receipt = {
        ok: false, reason: 'checksum_mismatch', ...head, appliedRows: 0,
        joined: plan.joinedPairs.length, left: plan.leftPairs.length,
        checksum: { passed: false, expectedXor: xorHex(expected), actualXor: xorHex(actual) },
      };
      this.lastFailure = receipt;
      // Fence the backend: GPU state has diverged from the mirrors in unknown
      // ways, so no further pack may be presented as applied. Fires
      // onDeviceLost('checksum_mismatch') for the CPU rebuild.
      this._handleLoss('checksum_mismatch');
      return receipt;
    }

    // Validated: commit mirrors + ack bookkeeping, then acknowledge.
    commitPlan(plan, this._state);
    return {
      ok: true, ...this.ack,
      appliedRows: count,
      staleRows: plan.staleCount,
      joined: plan.joinedPairs.length, left: plan.leftPairs.length,
      capacity: this.capacity,
      checksum: { passed: true, expectedXor: xorHex(expected), actualXor: xorHex(actual) },
    };
  }

  // Read rendered state for dense slots into setPlayer-shaped rows
  // ({id, entityId, x, z, rotY, walking, sitting, airborne}). Evaluates the
  // interpolation ring at the shared clock — the same math the vertex stage
  // runs — so sampled rows match what the GPU draws. Unknown/dead slots fill
  // null; row objects are reused in place.
  sample(indices, out) {
    const mirrors = this._state.mirrors ?? emptyMirrors();
    const now = this.sharedNowSeconds();
    for (let i = 0; i < indices.length; i++) {
      const slot = indices[i];
      if (!this._state.mirrors || slot < 0 || slot >= this.capacity || !metaWordIsAlive(mirrors.meta[slot])) {
        out[i] = null;
        continue;
      }
      const b = slot * 4, r = slot * 6;
      const row = out[i] ?? (out[i] = {});
      const entityId = this._entityIdOfSlot(slot);
      row.id = this._state.guestIdBySlot[slot] ?? entityId;
      row.entityId = entityId;
      const v = evalRingRow(
        [mirrors.ring[r], mirrors.ring[r + 1], mirrors.ring[r + 2], mirrors.ring[r + 3]],
        [mirrors.transforms[b], mirrors.transforms[b + 1], mirrors.transforms[b + 2], mirrors.transforms[b + 3]],
        mirrors.ring[r + 4], mirrors.ring[r + 5], now
      );
      row.x = v.x; row.z = v.z; row.rotY = v.rotY;
      const f = mirrors.flags[slot];
      row.walking = !!(f & FLAG_WALKING);
      row.sitting = !!(f & FLAG_SITTING);
      row.airborne = !!(f & FLAG_AIRBORNE);
    }
    return out;
  }

  // State of the last acknowledged (checksum-validated) pack — the seed for
  // the CPU rebuild on device loss. Targets, not interpolated positions.
  snapshot() {
    const entities = [];
    const mirrors = this._state.mirrors;
    if (mirrors) {
      for (const [entityId, slot] of this._state.idToSlot) {
        // Alive-gated: a checksum-failed pack's optimistic allocations never
        // committed a row, so their slots still read dead here.
        if (!metaWordIsAlive(mirrors.meta[slot])) continue;
        const b = slot * 4;
        entities.push({
          entityId,
          guestId: this._state.guestIdBySlot[slot] ?? null,
          x: mirrors.transforms[b],
          z: mirrors.transforms[b + 2],
          yaw: mirrors.transforms[b + 3],
          flags: mirrors.flags[slot] & 0xff,
        });
      }
    }
    entities.sort((p, q) => p.entityId - q.entityId);
    return { kind: 'webgpu-three', ...this.ack, capacity: this.capacity, entities };
  }

  // Task 2.4 groundwork: everything an instanced-draw harness page needs to
  // bind the persistent buffers under three/webgpu's WebGPURenderer (see the
  // header recipe).
  getRenderState() {
    return {
      kind: 'webgpu-three',
      device: this.device,
      capacity: this.capacity,
      layout: this._layout,
      workgroupSize: WORKGROUP_SIZE,
      buffers: this._gpu ? { ...this._gpu.publicBuffers } : null,
    };
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    if (this._gpu) {
      for (const b of Object.values(this._gpu.buffers)) {
        if (b && typeof b.destroy === 'function') b.destroy();
      }
      this._gpu = null;
    }
    this._state.mirrors = null;
    this._state.idToSlot.clear();
    this._state.freeSlots.length = 0;
    this._state.guestIdOfEntity.clear();
    this._deviceLostHandlers.length = 0;
    if (typeof this.device.removeEventListener === 'function' && this._onUncapturedError) {
      this.device.removeEventListener('uncapturederror', this._onUncapturedError);
    }
  }

  // ── internals ─────────────────────────────────────────────────────────────

  // Fresh free list, every slot free (used at allocation; _grow re-narrows it
  // around live tenants).
  _resetFreeList(capacity) {
    const free = this._state.freeSlots;
    free.length = 0;
    for (let s = capacity - 1; s >= 0; s--) free.push(s);
  }

  _entityIdOfSlot(slot) {
    // Reverse lookup; population is dozens at Afterlight scale and sample()
    // is the rare CPU read path (backend.js header). Dead slots never reach
    // here (alive bit gates sample()).
    for (const [id, s] of this._state.idToSlot) if (s === slot) return id;
    return 0;
  }

  _initMirrors(capacity) {
    const transforms = new Float32Array(capacity * 4);
    const ring = new Float32Array(capacity * 6);
    const motion = new Float32Array(capacity * 4);
    const flags = new Uint32Array(capacity);
    const meta = new Uint32Array(capacity);
    const metaCombined = new Uint32Array(capacity * 2);
    this._state.mirrors = {
      transforms, ring, motion, flags, meta,
      // metaFlags on the GPU is two interleaved u32 lanes; the mirror keeps
      // them separate for planning and interleaves only at upload time.
      metaCombined() {
        for (let i = 0; i < capacity; i++) {
          metaCombined[2 * i] = flags[i];
          metaCombined[2 * i + 1] = meta[i];
        }
        return metaCombined;
      },
    };
    this._state.fold.value = 0;
  }

  _allocate(capacity) {
    const layout = this._layout = computeStateLayout(capacity);
    const U = GPU_USAGE;
    const mk = (label, bytes, usage) => this.device.createBuffer({ size: bytes, usage, label });
    const publicBuffers = {
      transforms: mk('afterlight.transforms', layout.persistent.transforms.bytes, U.STORAGE | U.COPY_DST),
      ring: mk('afterlight.ring', layout.persistent.ring.bytes, U.STORAGE | U.COPY_DST),
      motion: mk('afterlight.motion', layout.persistent.motion.bytes, U.STORAGE | U.COPY_DST),
      metaFlags: mk('afterlight.metaFlags', layout.persistent.metaFlags.bytes, U.STORAGE | U.COPY_DST),
    };
    const chkWords = Math.ceil(capacity / WORKGROUP_SIZE) * WORKGROUP_SIZE;
    const buffers = {
      ...publicBuffers,
      delta: mk('afterlight.scatterDelta', layout.delta.totalBytes, U.STORAGE | U.COPY_DST),
      chkOut: mk('afterlight.chkOut', 4 * chkWords, U.STORAGE | U.COPY_SRC),
      chkRead: mk('afterlight.chkRead', 4 * chkWords, U.COPY_DST | U.MAP_READ),
      params: mk('afterlight.chkParams', 16, U.UNIFORM | U.COPY_DST),
    };
    // Checksum params are capacity-stable: written once per allocation.
    const invocations = chkWords;
    this.queue.writeBuffer(buffers.params, 0, new Uint32Array([capacity, invocations, 0, 0]));

    const sModule = this.device.createShaderModule({ code: buildScatterShader(layout), label: 'afterlight.scatter.wgsl' });
    const cModule = this.device.createShaderModule({ code: buildChecksumShader(), label: 'afterlight.checksum.wgsl' });
    const rwStorage = (binding) => ({ binding, visibility: COMPUTE_STAGE, buffer: { type: 'storage' } });
    const roStorage = (binding) => ({ binding, visibility: COMPUTE_STAGE, buffer: { type: 'read-only-storage' } });
    const scatterLayout = this.device.createBindGroupLayout({
      label: 'afterlight.scatter.bgl',
      entries: [roStorage(0), rwStorage(1), rwStorage(2), rwStorage(3), rwStorage(4)],
    });
    const checksumLayout = this.device.createBindGroupLayout({
      label: 'afterlight.checksum.bgl',
      entries: [
        roStorage(0), roStorage(1), roStorage(2), roStorage(3),
        { binding: 4, visibility: COMPUTE_STAGE, buffer: { type: 'uniform' } },
        rwStorage(5),
      ],
    });
    const scatterPipeline = this.device.createComputePipeline({
      label: 'afterlight.scatter',
      layout: this.device.createPipelineLayout({ bindGroupLayouts: [scatterLayout] }),
      compute: { module: sModule, entryPoint: 'scatter' },
    });
    const checksumPipeline = this.device.createComputePipeline({
      label: 'afterlight.checksum',
      layout: this.device.createPipelineLayout({ bindGroupLayouts: [checksumLayout] }),
      compute: { module: cModule, entryPoint: 'checksum' },
    });
    const bind = (l, entries) => this.device.createBindGroup({ layout: l, entries });
    const scatterBind = bind(scatterLayout, [
      { binding: 0, resource: { buffer: buffers.delta } },
      { binding: 1, resource: { buffer: buffers.transforms } },
      { binding: 2, resource: { buffer: buffers.ring } },
      { binding: 3, resource: { buffer: buffers.motion } },
      { binding: 4, resource: { buffer: buffers.metaFlags } },
    ]);
    const checksumBind = bind(checksumLayout, [
      { binding: 0, resource: { buffer: buffers.transforms } },
      { binding: 1, resource: { buffer: buffers.ring } },
      { binding: 2, resource: { buffer: buffers.motion } },
      { binding: 3, resource: { buffer: buffers.metaFlags } },
      { binding: 4, resource: { buffer: buffers.params } },
      { binding: 5, resource: { buffer: buffers.chkOut } },
    ]);

    this._gpu = {
      buffers,
      publicBuffers,
      checksumInvocations: invocations,
      checksumWorkgroups: invocations / WORKGROUP_SIZE,
      scatterPipeline, checksumPipeline, scatterBind, checksumBind,
    };
    this._initMirrors(capacity);
    this._deltaScratch = {
      ids: new Uint32Array(layout.delta.headerWords + 2 * capacity),
      transforms: new Float32Array(4 * capacity),
      ring: new Float32Array(6 * capacity),
      motion: new Float32Array(4 * capacity),
      flags: new Uint32Array(capacity),
      meta: new Uint32Array(capacity),
    };
    this._state.capacity = capacity;
    this._resetFreeList(capacity);
    // Initial upload: the mirrors are the GPU image (one writeBuffer per
    // persistent section — allocation, not a tick).
    this.queue.writeBuffer(buffers.transforms, 0, this._state.mirrors.transforms);
    this.queue.writeBuffer(buffers.ring, 0, this._state.mirrors.ring);
    this.queue.writeBuffer(buffers.motion, 0, this._state.mirrors.motion);
    this.queue.writeBuffer(buffers.metaFlags, 0, this._state.mirrors.metaCombined());
  }

  _grow(capacity) {
    const old = this._gpu;
    const oldCapacity = this.capacity;
    const oldMirrors = this._state.mirrors;
    // 1. Fresh buffers, pipelines (baked offsets changed), zeroed mirrors.
    this._allocate(capacity);
    // 2. Copy the existing rows into the new mirrors — typed-array growth
    //    preserves every live row's content and slot identity.
    this._state.mirrors.transforms.set(oldMirrors.transforms.subarray(0, oldCapacity * 4));
    this._state.mirrors.ring.set(oldMirrors.ring.subarray(0, oldCapacity * 6));
    this._state.mirrors.motion.set(oldMirrors.motion.subarray(0, oldCapacity * 4));
    this._state.mirrors.flags.set(oldMirrors.flags.subarray(0, oldCapacity));
    this._state.mirrors.meta.set(oldMirrors.meta.subarray(0, oldCapacity));
    // 2b. Rebuild the free list: slots of LIVE entities stay claimed (the
    //     fresh allocation from _allocate handed out every slot).
    const occupied = new Set(this._state.idToSlot.values());
    const free = this._state.freeSlots;
    free.length = 0;
    for (let s = capacity - 1; s >= 0; s--) if (!occupied.has(s)) free.push(s);
    // 3. Re-upload the preserved rows (one writeBuffer per persistent
    //    section) — the new GPU image matches the mirrors again.
    const b = this._gpu.buffers;
    this.queue.writeBuffer(b.transforms, 0, this._state.mirrors.transforms);
    this.queue.writeBuffer(b.ring, 0, this._state.mirrors.ring);
    this.queue.writeBuffer(b.motion, 0, this._state.mirrors.motion);
    this.queue.writeBuffer(b.metaFlags, 0, this._state.mirrors.metaCombined());
    // 4. Fold re-derived over the full new capacity; old resources released.
    this._state.fold.value = recomputeFold(this._state.mirrors, capacity);
    for (const buf of Object.values(old.buffers)) {
      if (buf && typeof buf.destroy === 'function') buf.destroy();
    }
  }

  // Pack the plan's changed rows into the per-section upload scratch.
  _fillScratch(plan) {
    const s = this._deltaScratch;
    const count = plan.rowCount;
    s.ids.fill(0, 0, 4 + 2 * count);
    s.ids[0] = count;
    for (let i = 0; i < count; i++) {
      const row = plan.rows[i];
      s.ids[4 + 2 * i] = row.entityId;
      s.ids[4 + 2 * i + 1] = row.slot;
      s.transforms.set(row.t, 4 * i);
      s.ring.set(row.ringPrev, 6 * i);
      s.ring[6 * i + 4] = row.tPrev;
      s.ring[6 * i + 5] = row.tNext;
      s.motion.set(row.motion, 4 * i);
      s.flags[i] = row.flags;
      s.meta[i] = row.meta;
    }
    return s;
  }

  _handleLoss(reason) {
    if (this.lost || this.disposed) return;
    this.lost = true;
    this.reportDeviceLost(reason);
  }
}

// ── Factory ─────────────────────────────────────────────────────────────────
// createWebGPUThreeBackend(opts) → Promise<WebGPUThreeBackend | null>.
//
// SEMANTICS (chosen and documented per the task): resolves NULL for any
// boring unavailability — navigator.gpu absent, requestAdapter() null or
// throwing, requestDevice() rejecting — and reports the reason through the
// optional `onUnavailable` callback. It NEVER throws for unavailability
// ("adapter absence must be boring, not a crash"); typed WebGPUBackendErrors
// are reserved for programmer errors (e.g. constructing the class directly
// without a device). Loss AFTER construction routes through onDeviceLost.
export async function createWebGPUThreeBackend({
  device = null,
  navigator: nav = null,
  onUnavailable = null,
  ...backendOpts
} = {}) {
  const unavailable = (reason) => {
    if (typeof onUnavailable === 'function') onUnavailable(reason);
    return null;
  };
  try {
    if (device) return new WebGPUThreeBackend({ device, ...backendOpts });
    const n = nav ?? (typeof navigator !== 'undefined' ? navigator : null);
    if (!n || !n.gpu) return unavailable('no-webgpu: navigator.gpu is undefined');
    let adapter = null;
    try {
      adapter = await n.gpu.requestAdapter();
    } catch (e) {
      return unavailable('adapter-error: requestAdapter() threw: ' + (e && e.message));
    }
    if (!adapter) return unavailable('no-adapter: requestAdapter() returned null');
    let dev = null;
    try {
      dev = await adapter.requestDevice();
    } catch (e) {
      return unavailable('device-request-failed: requestDevice() rejected: ' + (e && e.message));
    }
    if (!dev) return unavailable('device-request-failed: requestDevice() returned null');
    return new WebGPUThreeBackend({ device: dev, ...backendOpts });
  } catch (e) {
    // Programmer errors (bad opts) and construction surprises: still boring
    // for the caller — surfaced via onUnavailable, never a crash.
    return unavailable('construction-failed: ' + ((e && e.message) || e));
  }
}
