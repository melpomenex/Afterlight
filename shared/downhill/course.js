/**
 * Downhill Mayhem canonical course (integrate-multiplayer-downhill-mayhem-arcade
 * 4.1/4.2). Pure, renderer-free generation and sampling of the downhill track,
 * ported faithfully from the frozen source game
 * `games/downhill-mayhem/standalone.html` (game script lines 468–1418, commit
 * recorded in the change's baseline.md).
 *
 * Track-space model: `s` = metres along the course (world z = -s), `lat` =
 * metres right of the centreline. Physics, terrain and scenery all read
 * `heightAt(s, lat)`.
 *
 * The generator runs ONCE (browser or Node) to bake a versioned, hash-pinned
 * numeric document: the centreline/curvature/grade sample arrays, the ramp and
 * drop lists, and the collision obstacle set. Every runtime — the client
 * renderer, the client predictor and the Elixir authority — loads the same
 * document and evaluates the same tiny sampler, so a live race never depends on
 * two independently regenerated terrains. `Float32Array` is used internally so
 * the baked values are bit-identical to the source's array storage.
 */

export const COURSE_ID = 'classic';
export const COURSE_VERSION = 1;
export const RULES_VERSION = 1;

// Source constants (standalone.html config + track).
export const SEED = 20030723;
export const DS = 2;
export const S_MIN = -80;
export const S_MAX = 2520;
export const FINISH_S = 2300;
export const HALF_W = 8;
export const RIDE_W = 26;
export const LAT_CLAMP = 27.5;
export const NSAMP = Math.floor((S_MAX - S_MIN) / DS) + 1;
export const START_LATS = Object.freeze([1.25, -6.25, -3.75, -1.25, 3.75, 6.25]);

export const MOUNTAINS = Object.freeze({
  classic: Object.freeze({ id: 'classic', label: 'CLASSIC', seed: SEED, trees: 1, rocks: 0, v: null }),
  timber: Object.freeze({
    id: 'timber', label: 'TIMBERLINE', seed: 19770527, trees: 1.8, rocks: 0,
    v: Object.freeze({ twist: 1.18, rhythm: 0.78, chute: 0.92, dropN: 3, rampN: 12, cold: 0.12, warm: 0.9 }),
  }),
  rock: Object.freeze({
    id: 'rock', label: 'ROCKGARDEN', seed: 19930211, trees: 0.35, rocks: 1,
    v: Object.freeze({ twist: 0.82, rhythm: 1.22, chute: 1.16, dropN: 6, rampN: 8, cold: 0.14, warm: 0.52 }),
  }),
});

/** The UTC date seed the source `dailySeed()` uses (external clock input). */
export function dailySeedFromDate(date = new Date()) {
  return date.getUTCFullYear() * 10000 + (date.getUTCMonth() + 1) * 100 + date.getUTCDate();
}

// --- deterministic primitives (verbatim from the source) ---------------------

export function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
export function lerp(a, b, t) { return a + (b - a) * t; }
export function smoothstep(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export function hash2(i, j) {
  let h = (i * 374761393 + j * 668265263) | 0;
  h = (h ^ (h >>> 13)) | 0;
  h = Math.imul(h, 1274126177);
  return (((h ^ (h >>> 16)) >>> 0) / 4294967296);
}

export function vnoise2(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  const u = smoothstep(xf), v = smoothstep(yf);
  return (lerp(lerp(a, b, u), lerp(c, d, u), v) * 2 - 1);
}

// --- generator ---------------------------------------------------------------

function buildProfile(rngf, makeSeg) {
  const arr = new Float32Array(NSAMP); let i = 0;
  while (i < NSAMP) {
    const g = makeSeg(i * DS + S_MIN);
    const n = Math.max(2, Math.round(g.len / DS));
    for (let k = 0; k < n && i < NSAMP; k++, i++) arr[i] = g.val;
  }
  return arr;
}

function blur(arr, win, passes) {
  for (let p = 0; p < passes; p++) {
    const src = arr.slice();
    for (let i = 0; i < arr.length; i++) {
      let sum = 0, c = 0;
      for (let k = -win; k <= win; k++) { const j = i + k; if (j >= 0 && j < arr.length) { sum += src[j]; c++; } }
      arr[i] = sum / c;
    }
  }
}

/**
 * Port of the source `buildTrack()`. Produces the baked centreline arrays plus
 * the ramps/drops lists and the per-mountain knobs.
 */
function buildTrack(seed) {
  const rng = mulberry32(seed);
  const noff = (seed % 977) * 13.7;
  const vr = mulberry32((seed ^ 0x9e3779) >>> 0);
  const T = Object.values(MOUNTAINS).find(t => t.seed === seed);
  let V, COLD_EDGE, WARM_EDGE, TREE_D, ROCK_D;
  if (T && T.v) {
    V = T.v; COLD_EDGE = T.v.cold; WARM_EDGE = T.v.warm; TREE_D = T.trees; ROCK_D = T.rocks;
  } else if (T) {
    V = { twist: 1, rhythm: 1, chute: 1, dropN: 4, rampN: 12 };
    COLD_EDGE = 0.32; WARM_EDGE = 0.68; TREE_D = 1; ROCK_D = 0;
  } else {
    V = {
      twist: 0.72 + vr() * 0.75, rhythm: 0.68 + vr() * 0.85, chute: 0.85 + vr() * 0.5,
      dropN: 2 + Math.floor(vr() * 5), rampN: 7 + Math.floor(vr() * 6),
    };
    COLD_EDGE = 0.18 + vr() * 0.34; WARM_EDGE = 0.55 + vr() * 0.35;
    TREE_D = 0.55 + vr() * 1.1; ROCK_D = vr() < 0.35 ? 0.6 + vr() * 0.6 : 0;
  }

  let lastTurn = rng() < 0.5 ? 1 : -1, wasTurn = false, hEst = 0;
  const curv = buildProfile(rng, (s) => {
    if (s < -20) return { len: 60, val: 0 };
    if (wasTurn || s < 40) { wasTurn = false; return { len: (50 + rng() * 80) * V.rhythm, val: (rng() * 2 - 1) * 0.0008 }; }
    wasTurn = true;
    const dir = Math.abs(hEst) > 0.9 ? -Math.sign(hEst) : (rng() < 0.72 ? -lastTurn : lastTurn);
    lastTurn = dir;
    const mag = (0.0045 + rng() * 0.004) * V.twist, len = (80 + rng() * 110) * V.rhythm;
    hEst += dir * mag * len;
    return { len, val: dir * mag };
  });
  const grade = buildProfile(rng, (s) => {
    if (s < 30) return { len: 110, val: -0.08 };
    if (s > FINISH_S - 60) return { len: 400, val: -0.06 };
    const r = rng();
    if (r < 0.10) return { len: 25 + rng() * 20, val: -0.04 - rng() * 0.03 };
    if (r < 0.34) return { len: 55 + rng() * 45, val: (-0.26 - rng() * 0.09) * V.chute };
    return { len: 80 + rng() * 70, val: (-0.11 - rng() * 0.08) * V.chute };
  });
  blur(curv, 7, 2); blur(grade, 7, 2);

  const cx = new Float32Array(NSAMP), cz = new Float32Array(NSAMP), cy = new Float32Array(NSAMP);
  const ch = new Float32Array(NSAMP), ccurv = new Float32Array(NSAMP), cgrade = new Float32Array(NSAMP);
  let x = 0, z = 0, y = 0, h = 0;
  for (let i = 0; i < NSAMP; i++) {
    const s = S_MIN + i * DS;
    ccurv[i] = curv[i]; cgrade[i] = s > FINISH_S ? lerp(grade[i], 0.03, smoothstep((s - FINISH_S) / 70)) : grade[i];
    cx[i] = x; cz[i] = z; cy[i] = y; ch[i] = h;
    h += ccurv[i] * DS; x += Math.sin(h) * DS; z += Math.cos(h) * DS; y += cgrade[i] * DS;
  }

  const drops = [];
  for (let k = 0; k < V.dropN; k++) {
    const s0 = 420 + k * (1560 / V.dropN) + rng() * 150, depth = 2.4 + rng() * 1.0;
    drops.push({ s0, depth });
    for (let i = 0; i < NSAMP; i++) { const s = S_MIN + i * DS; cy[i] -= depth * smoothstep((s - s0) / 4); }
  }

  const ramps = [];
  const tmp = {};
  const sampleCurv = (s) => {
    const f = clamp((s - S_MIN) / DS, 0, NSAMP - 1.001);
    const i = Math.floor(f), t = f - i;
    return lerp(ccurv[i], ccurv[i + 1], t);
  };
  let sTry = 170;
  while (sTry < 2200 && ramps.length < V.rampN) {
    let best = null;
    for (let d = -55; d <= 55; d += 6) {
      const s = sTry + d;
      if (s < 150 || s > 2200) continue;
      const c = Math.abs(sampleCurv(s));
      const nearDrop = drops.some(dr => Math.abs(dr.s0 - s) < 70);
      const nearRamp = ramps.some(rp => Math.abs(rp.s0 - s) < 110);
      if (!nearDrop && !nearRamp && (best === null || c < best.c)) best = { s, c };
    }
    if (best && best.c < 0.0062) {
      const full = rng() < 0.4;
      ramps.push({
        s0: best.s, len: 9 + rng() * 4, h: 1.25 + rng() * 1.0,
        latC: full ? 0 : (rng() * 2 - 1) * 3.2, halfW: full ? 8.5 : 3.4 + rng() * 2.6,
      });
    }
    sTry += 140 + rng() * 55;
  }
  ramps.sort((a, b) => a.s0 - b.s0);

  return { V, COLD_EDGE, WARM_EDGE, TREE_D, ROCK_D, noff, cx, cz, cy, ch, ccurv, cgrade, ramps, drops };
}

/**
 * Port of the source `buildScenery()` collider stream. The cosmetic Three.js
 * instancing is omitted, but every `rng()` draw is preserved in order so the
 * derived collision obstacles (slalom trees on the line and rock-garden
 * boulders) match the source exactly.
 */
function buildColliders({ seed, TREE_D, ROCK_D, ramps, drops, ccurv }) {
  const rng = mulberry32(seed + 31);
  const colliders = [];
  const sampleCurv = (s) => {
    const f = clamp((s - S_MIN) / DS, 0, NSAMP - 1.001);
    const i = Math.floor(f), t = f - i;
    return lerp(ccurv[i], ccurv[i + 1], t);
  };
  const pickFol = (s) => {
    if (s < FINISH_S * 0.30) return rng() < 0.6 ? 'snow' : 'fol1';
    if (s > FINISH_S * 0.70) return rng() < 0.6 ? 'dry' : 'fol2';
    return rng() < 0.5 ? 'fol1' : 'fol2';
  };
  const addTree = (s, lat) => {
    const sc = 0.75 + rng() * 0.7;
    rng(); // yaw
    if (Math.abs(lat) < RIDE_W + 1) colliders.push({ kind: 'tree', s, lat, r: 0.75 * sc });
  };

  // slalom trees on the racing line.
  for (let s = 200; s < FINISH_S - 80; s += (130 + rng() * 90) / Math.max(TREE_D, 0.05)) {
    const sT = s + rng() * 30;
    const nearFeature = ramps.some(r => sT > r.s0 - 30 && sT < r.s0 + r.len + 45) || drops.some(d => Math.abs(d.s0 - sT) < 45);
    if (nearFeature) continue;
    const lat = (rng() * 2 - 1) * 6.2;
    pickFol(sT);
    addTree(sT, lat);
  }

  // rock gardens (boulders on the line).
  if (ROCK_D > 0) {
    const rkClear = (sT) => !(ramps.some(r => sT > r.s0 - 26 && sT < r.s0 + r.len + 45) || drops.some(d => sT > d.s0 - 18 && sT < d.s0 + 50))
      && Math.abs(sampleCurv(sT)) < 0.010;
    for (let s = Math.max(230, FINISH_S * 0.32 + 40); s < FINISH_S - 110; s += (88 + rng() * 70) / ROCK_D) {
      let s0 = -1;
      for (let t = 0; t < 6; t++) { const c = s + rng() * 26 + t * 34; if (c < FINISH_S - 80 && rkClear(c) && rkClear(c + 17)) { s0 = c; break; } }
      if (s0 < 0) continue;
      const cLat = (rng() * 2 - 1) * 4.6, n = 2 + Math.floor(rng() * 3.2);
      for (let i = 0; i < n; i++) {
        const sT = s0 + i * (3.5 + rng() * 4);
        if (!rkClear(sT)) continue;
        const lat = clamp(cLat + (rng() * 2 - 1) * 2.4, -6.6, 6.6), sc = 0.65 + rng() * 0.55;
        rng(); rng(); rng(); // rock rotation x/y/z
        rng(); rng(); // scale x/z
        colliders.push({ kind: 'rock', s: sT, lat, r: 0.8 * sc });
      }
    }
  }

  // scattered trees on the open hillside + forest on the slopes; only the
  // in-corridor ones become colliders, but every draw is preserved.
  for (let s = 60; s < S_MAX - 40; s += 8 + rng() * 10) {
    if (rng() < Math.min(0.4 * TREE_D, 0.85)) {
      const side = rng() < 0.5 ? 1 : -1;
      const sT = s + rng() * 4, lat = side * (9.5 + rng() * 15.5);
      pickFol(sT);
      addTree(sT, lat);
    }
    for (let k = 0; k < 2; k++) {
      if (rng() < Math.min(0.8 * Math.max(TREE_D, 0.45), 0.95)) {
        const side = rng() < 0.5 ? 1 : -1;
        const sT = s + rng() * 8, lat = side * (28 + rng() * 36);
        pickFol(sT);
        addTree(sT, lat);
      }
    }
  }

  // boulders outside the corridor (never colliders; draws preserved).
  for (let s = 40; s < S_MAX - 40; s += 26 + rng() * 34) {
    rng(); // side
    rng(); // lat
    rng(); // scale
    rng(); rng(); rng(); // rotation x/y/z
    rng(); rng(); // scale x/z
    rng(); // rocks1/rocks2 pick
  }

  colliders.sort((a, b) => (a.s - b.s) || (a.lat - b.lat));
  return colliders;
}

const q6 = (v) => (Object.is(v, -0) ? 0 : Math.round(v * 1e6) / 1e6);
const arr6 = (f32) => Array.from(f32, q6);
// Physics arrays are stored at full float32 precision (a float32 value is
// exactly representable as a double, so JSON round-trips it exactly on every
// runtime). Geometry-only arrays are quantized to keep the document small.
const arrExact = (f32) => Array.from(f32);

/** Generate the canonical course document for a crafted mountain or the Daily. */
export function generateCourseDocument({ mountain = 'classic', dailySeed = null } = {}) {
  const isDaily = mountain === 'daily';
  const def = isDaily ? null : MOUNTAINS[mountain];
  if (!isDaily && !def) throw new Error(`unknown mountain "${mountain}"`);
  const seed = isDaily ? (dailySeed >>> 0) : def.seed;
  const built = buildTrack(seed);
  const colliders = buildColliders({ seed, TREE_D: built.TREE_D, ROCK_D: built.ROCK_D, ramps: built.ramps, drops: built.drops, ccurv: built.ccurv });

  return {
    id: isDaily ? 'daily' : mountain,
    version: COURSE_VERSION,
    rulesVersion: RULES_VERSION,
    mountain: isDaily ? 'daily' : mountain,
    seed,
    ds: DS, sMin: S_MIN, sMax: S_MAX, finishS: FINISH_S, halfW: HALF_W,
    rideW: RIDE_W, latClamp: LAT_CLAMP,
    knobs: {
      twist: built.V.twist, rhythm: built.V.rhythm, chute: built.V.chute,
      cold: built.COLD_EDGE, warm: built.WARM_EDGE,
      trees: q6(built.TREE_D), rocks: q6(built.ROCK_D),
    },
    startLats: [...START_LATS],
    cgrade: arrExact(built.cgrade),
    ccurv: arrExact(built.ccurv),
    cy: arrExact(built.cy),
    cx: arr6(built.cx),
    cz: arr6(built.cz),
    ch: arr6(built.ch),
    ramps: built.ramps.map(r => ({ s0: r.s0, len: r.len, h: r.h, latC: r.latC, halfW: r.halfW })),
    drops: built.drops.map(d => ({ s0: d.s0, depth: d.depth })),
    colliders: colliders.map(c => ({ kind: c.kind, s: q6(c.s), lat: q6(c.lat), r: q6(c.r) })),
  };
}

// --- sampler -----------------------------------------------------------------

function asF32(arr) { return Float32Array.from(arr); }

/**
 * Load a canonical document into a sampler. The sampler contains only
 * interpolation plus the small deterministic noise relief, so JS and the
 * Elixir authority share the same contact surface exactly.
 */
export function loadCourse(doc) {
  if (!doc || typeof doc !== 'object') throw new Error('course document required');
  const ds = doc.ds ?? DS, sMin = doc.sMin ?? S_MIN;
  const cx = asF32(doc.cx), cz = asF32(doc.cz), cy = asF32(doc.cy);
  const ch = asF32(doc.ch), ccurv = asF32(doc.ccurv), cgrade = asF32(doc.cgrade);
  const ramps = (doc.ramps ?? []).map(r => ({ s0: r.s0, len: r.len, h: r.h, latC: r.latC, halfW: r.halfW }));
  const finishS = doc.finishS ?? FINISH_S;
  const halfW = doc.halfW ?? HALF_W;
  const rideW = doc.rideW ?? RIDE_W;
  const noff = (doc.seed % 977) * 13.7;
  const n = cx.length;

  const sampleTrack = (s, out = {}) => {
    const f = clamp((s - sMin) / ds, 0, n - 1.001);
    const i = Math.floor(f), t = f - i;
    out.x = lerp(cx[i], cx[i + 1], t); out.z = lerp(cz[i], cz[i + 1], t); out.y = lerp(cy[i], cy[i + 1], t);
    out.h = lerp(ch[i], ch[i + 1], t); out.curv = lerp(ccurv[i], ccurv[i + 1], t); out.grade = lerp(cgrade[i], cgrade[i + 1], t);
    return out;
  };

  const rampHeightAt = (s, lat) => {
    for (let i = 0; i < ramps.length; i++) {
      const r = ramps[i];
      if (s < r.s0) break;
      if (s <= r.s0 + r.len) {
        const dl = Math.abs(lat - r.latC);
        if (dl <= r.halfW) {
          const t = (s - r.s0) / r.len;
          const edge = clamp((r.halfW - dl) / 0.8, 0, 1);
          return r.h * Math.pow(t, 1.6) * edge;
        }
      }
    }
    return 0;
  };

  const scratch = {};
  const heightAt = (s, lat) => {
    const c = sampleTrack(s, scratch);
    const a = Math.abs(lat);
    let y = c.y + c.curv * 9 * clamp(lat, -10, 10);
    const rollAmp = a < halfW ? 0.22 * smoothstep(a / halfW) : Math.min(1.7, 0.22 + (a - halfW) * 0.11);
    y += vnoise2(s * 0.05 + noff, lat * 0.062 + noff) * rollAmp + vnoise2(s * 0.23 + noff, lat * 0.21 + noff) * rollAmp * 0.35;
    if (a > halfW) {
      const d = a - halfW;
      y += 0.045 * Math.pow(d, 1.45);
      if (a > rideW) { const w = a - rideW; y += Math.min(0.5 * w + 0.03 * w * w, 21); }
    }
    return y + rampHeightAt(s, lat);
  };

  const worldPosition = (s, lat, y, out) => {
    const c = sampleTrack(s, scratch);
    out.set(c.x - Math.cos(c.h) * lat, y, c.z + Math.sin(c.h) * lat);
    return out;
  };

  const colliderBuckets = new Map();
  for (const c of doc.colliders ?? []) {
    const b = Math.floor(c.s / 10);
    if (!colliderBuckets.has(b)) colliderBuckets.set(b, []);
    colliderBuckets.get(b).push(c);
  }

  return {
    doc, id: doc.id, version: doc.version, rulesVersion: doc.rulesVersion, mountain: doc.mountain,
    seed: doc.seed, finishS, startLats: doc.startLats ?? START_LATS,
    ramps, drops: doc.drops ?? [], colliders: doc.colliders ?? [], colliderBuckets,
    sampleTrack, heightAt, rampHeightAt, worldPosition,
  };
}

/** Structural validation for a canonical document. Returns an array of problems. */
export function validateCourse(doc) {
  const p = [];
  const at = (ok, m) => { if (!ok) p.push(m); };
  at(doc && typeof doc === 'object', 'document must be an object');
  if (!doc || typeof doc !== 'object') return p;
  at(typeof doc.id === 'string' && doc.id.length > 0, 'id required');
  at(Number.isInteger(doc.version) && doc.version >= 1, 'version must be an integer >= 1');
  at(Number.isInteger(doc.rulesVersion) && doc.rulesVersion >= 1, 'rulesVersion must be an integer >= 1');
  at(Number.isFinite(doc.seed), 'seed must be finite');
  for (const key of ['cgrade', 'ccurv', 'cy', 'cx', 'cz', 'ch']) {
    at(Array.isArray(doc[key]) && doc[key].length === NSAMP, `${key} must have ${NSAMP} samples`);
  }
  at(Array.isArray(doc.ramps) && doc.ramps.length >= 7, 'ramps list required');
  at(Array.isArray(doc.drops), 'drops list required');
  at(Array.isArray(doc.colliders), 'colliders list required');
  return p;
}
