// Deterministic fixture generation for realtime encoding benchmarks.
// Implements docs/architecture/realtime/contract.md §2/§8 exactly.
// All encoders must consume these fixtures — never invent private ones.

export const POPULATIONS = [50, 100, 200, 500, 1000, 5000, 10000, 50000];
export const FRACTIONS = [0.001, 0.01, 0.05, 0.1, 0.25, 0.5, 1.0];

export const WORLD_BOUNDS = { minX: -11.3, maxX: 11.3, minZ: -9.5, maxZ: 10.3, maxY: 0.72 };

// Seeded LCG (repo convention: deterministic procedural randomness, cf. src/districts.js).
export function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
}

const B64 = 'abcdefghijklmnopqrstuvwxyz0123456789';
function guestId(rand) {
  let s = 'guest_';
  for (let i = 0; i < 9; i++) s += B64[(rand() * 36) | 0];
  return s;
}

// A "world" is the server-side authoritative snapshot: SoA columns over dense
// local slots 0..n-1, with sparse u32 server ids (gap-y, like real id spaces).
export function makeWorld(n, seed = 42) {
  const rand = rng(seed);
  const ids = new Uint32Array(n);
  const guestIds = new Array(n);
  const archetype = new Uint16Array(n);
  const x = new Float32Array(n), y = new Float32Array(n), z = new Float32Array(n), yaw = new Float32Array(n);
  const vx = new Float32Array(n), vy = new Float32Array(n), vz = new Float32Array(n);
  const flags = new Uint8Array(n); // bit0 walking, bit1 sitting, bit2 airborne
  const emote = new Uint8Array(n);
  let id = 100 + ((rand() * 900) | 0);
  for (let i = 0; i < n; i++) {
    id += 1 + ((rand() * 6) | 0); // gap-y id space
    ids[i] = id;
    guestIds[i] = guestId(rand);
    archetype[i] = rand() < 0.9 ? 0 : 1; // player vs kiln
    x[i] = WORLD_BOUNDS.minX + rand() * (WORLD_BOUNDS.maxX - WORLD_BOUNDS.minX);
    z[i] = WORLD_BOUNDS.minZ + rand() * (WORLD_BOUNDS.maxZ - WORLD_BOUNDS.minZ);
    y[i] = 0;
    yaw[i] = rand() * Math.PI * 2;
    // Busy-room flag mix (contract §8): ~60% idle, 25% walking, 10% sitting, 5% airborne.
    const r = rand();
    flags[i] = r < 0.6 ? 0 : r < 0.85 ? 1 : r < 0.95 ? 2 : 4;
    emote[i] = rand() < 0.02 ? 1 + ((rand() * 6) | 0) : 0;
  }
  return { n, seed, ids, guestIds, archetype, x, y, z, yaw, vx, vy, vz, flags, emote };
}

// Advance the world one 100 ms tick: `count = max(1, round(n*fraction))`
// entities move realistically (small steps along yaw, occasional flag flips).
// Returns the sorted-u32 changed id list; mutates `world` in place so
// consecutive steps chain like a real session.
export function stepWorld(world, fraction, tickSeed) {
  const rand = rng(tickSeed);
  const count = Math.max(1, Math.round(world.n * fraction));
  const changed = new Uint32Array(count);
  // Sample without replacement via a shuffle of slot indices (n can be 50k;
  // partial Fisher-Yates keeps this O(count)).
  const idx = new Int32Array(count);
  const order = new Int32Array(world.n);
  for (let i = 0; i < world.n; i++) order[i] = i;
  for ( let k = 0; k < count; k++) {
    const j = k + ((rand() * (world.n - k)) | 0);
    const t = order[k]; order[k] = order[j]; order[j] = t;
    idx[k] = order[k];
  }
  for (let k = 0; k < count; k++) {
    const i = idx[k];
    const speed = (world.flags[i] & 1) ? 2.2 : 0; // walk speed ≈ 2.2 u/s → 0.22 u/tick
    world.x[i] = Math.min(WORLD_BOUNDS.maxX, Math.max(WORLD_BOUNDS.minX, world.x[i] + Math.sin(world.yaw[i]) * speed * 0.1));
    world.z[i] = Math.min(WORLD_BOUNDS.maxZ, Math.max(WORLD_BOUNDS.minZ, world.z[i] - Math.cos(world.yaw[i]) * speed * 0.1));
    world.yaw[i] = (world.yaw[i] + (rand() - 0.5) * 0.5 + Math.PI * 2) % (Math.PI * 2);
    if (rand() < 0.04) world.flags[i] = [0, 1, 2, 4][(rand() * 4) | 0];
    changed[k] = world.ids[i];
  }
  changed.sort();
  return changed;
}

// Wire shape of today's JSON baseline: presence_update-style, string ids.
// (docs/architecture/elixir/protocol-catalog.md §1 — flush entry shape.)
export function worldToJsonUpdate(world, changedIds) {
  const byId = new Map();
  for (let i = 0; i < world.n; i++) byId.set(world.ids[i], i);
  const players = new Array(changedIds.length);
  for (let k = 0; k < changedIds.length; k++) {
    const i = byId.get(changedIds[k]);
    players[k] = {
      id: world.guestIds[i],
      x: Math.round(world.x[i] * 1000) / 1000,
      z: Math.round(world.z[i] * 1000) / 1000,
      rotY: Math.round(world.yaw[i] * 1000) / 1000,
      walking: !!(world.flags[i] & 1),
      sitting: !!(world.flags[i] & 2),
      airborne: !!(world.flags[i] & 4),
    };
  }
  return { type: 'presence_update', players };
}
