/**
 * Summit Run canonical course (add-multiplayer-snowboard-arcade 3.1, design
 * D5/D6): pure authoring, validation, hashing and sampling for the one
 * release route `summit-night`.
 *
 * Everything here is deterministic numeric data — no Three.js, no DOM — so
 * the browser renderer, the client predictor and the Elixir authority all
 * consume the SAME document and hash. Rendering and contact must agree: the
 * bilinear height sampler over the baked grid IS the mountain; cosmetic noise
 * is forbidden inside the legal corridor (investigation.md, contact parity).
 *
 * Coordinate convention (D5): course progress `s` in meters increases
 * downhill; lateral `u` from the centerline; world x = centerX(s) + u,
 * y = height(s, u) + boardClearance.
 *
 * Export: `node scripts/export-snowboard-course.mjs` writes the canonical
 * JSON (shared + Elixir priv copies). `--check` fails on drift. The document
 * carries its own sha256 over the canonical (sorted-key, hash-free) form.
 */

export const COURSE_ID = 'summit-night';
export const COURSE_VERSION = 1;
export const RULES_VERSION = 1;

// Grid constants are contract (tests/fixtures/snowboard/contract.json
// simulation block): 2m longitudinal, 2m lateral, ±24m corridor, ±18m groomed.
export const LENGTH_METERS = 1800;
export const GRID_STEP_METERS = 2;
export const LATERAL_STEP_METERS = 2;
export const CORRIDOR_HALF_WIDTH = 24;
export const GROOMED_HALF_WIDTH = 18;
export const GATE_ALTITUDE_CEILING = 30;
export const CHECKPOINT_PLANES = Object.freeze([200, 400, 600, 800, 1000, 1200, 1400, 1600]);
export const FINISH_METERS = 1800;
export const MAX_COLLIDERS = 64;

const S_COUNT = LENGTH_METERS / GRID_STEP_METERS + 1; // 901
const U_COUNT = (CORRIDOR_HALF_WIDTH * 2) / LATERAL_STEP_METERS + 1; // 25

const round2 = (value) => Math.round(value * 100) / 100;

// --- deterministic authoring functions ---------------------------------------
// Smoothstep with clamped edges — the only curve family used below, so the
// whole course stays reproducible from a handful of constants.

function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/** Lateral centerline offset x(s): broad S-carves, then a gentle drift. */
function centerXAt(s) {
  const carveEnvelope = 14 * smoothstep(150, 260, s) * (1 - smoothstep(560, 700, s));
  const driftEnvelope = 6 * smoothstep(720, 860, s) * (1 - smoothstep(1360, 1500, s));
  const carve = carveEnvelope * Math.sin((2 * Math.PI * s) / 260);
  const drift = driftEnvelope * Math.sin((2 * Math.PI * s) / 520 + 1.1);
  return round2(carve + drift);
}

/** Rideable full width at s: wider ridge section in the middle third. */
function widthAt(s) {
  const ridge = 4 * smoothstep(980, 1080, s) * (1 - smoothstep(1330, 1430, s));
  return round2(40 + ridge);
}

/**
 * Downhill grade g(s) = -dHeight/ds (clamped to [0, 0.6] by contract). A
 * steep lit start, broad relaxations into the carve section, a steeper ridge
 * and a gentle floodlit runout to the lodge.
 */
function gradeAt(s) {
  const start = 0.10 + 0.10 * (1 - smoothstep(0, 220, s));
  const carve = 0.10 + 0.05 * Math.abs(Math.cos((2 * Math.PI * s) / 260));
  const ridge = 0.05 * smoothstep(1000, 1120, s) * (1 - smoothstep(1300, 1420, s));
  const runout = -0.05 * smoothstep(1420, 1560, s);
  return Math.max(0, Math.min(0.6, start * (1 - smoothstep(180, 320, s)) + carve + ridge + runout));
}

/** Two authored ramp lips (D6: one in the pine cut, one on the ridge). */
const RAMPS = [
  { id: 'pine-cut-jump', s: 800, uMin: -7, uMax: 1, lipHeight: 1.7 },
  { id: 'ridge-jump', s: 1250, uMin: 3, uMax: 12, lipHeight: 1.9 },
];
const RAMP_APPROACH_METERS = 8;

/**
 * The two gate planes every rider must cross in order are the eight
 * checkpoints plus the finish; all full-width (v1 corridor).
 */
const GATES = [
  ...CHECKPOINT_PLANES.map((s, i) => ({ index: i + 1, s, uMin: -CORRIDOR_HALF_WIDTH, uMax: CORRIDOR_HALF_WIDTH })),
];

const FINISH = Object.freeze({ s: FINISH_METERS, uMin: -CORRIDOR_HALF_WIDTH, uMax: CORRIDOR_HALF_WIDTH });

/** Safe recovery points: one per checkpoint segment plus the runout. */
const RECOVERY_POINTS = [
  { id: 'rec-0', s: 150, u: 0, segment: 0 },
  { id: 'rec-1', s: 350, u: 0, segment: 1 },
  { id: 'rec-2', s: 550, u: 0, segment: 2 },
  { id: 'rec-3', s: 745, u: -12, segment: 3 },
  { id: 'rec-4', s: 950, u: 0, segment: 4 },
  { id: 'rec-5', s: 1150, u: 2, segment: 5 },
  { id: 'rec-6', s: 1350, u: 0, segment: 6 },
  { id: 'rec-7', s: 1550, u: -4, segment: 7 },
  { id: 'rec-8', s: 1700, u: 0, segment: 8 },
];

/** Bounded colliders (≤ MAX_COLLIDERS): readable hazards only. */
function buildObstacles() {
  const obstacles = [];
  let nextId = 0;
  const push = (kind, s, u, halfS, halfU, height) => {
    obstacles.push({ id: `ob-${nextId++}`, kind, s: round2(s), u: round2(u), halfS, halfU, height });
  };
  // Pine cut (600–1000): alternating corridor-edge pines, clear of groomed.
  for (let i = 0; i < 16; i++) {
    const s = 620 + i * 24;
    const u = (i % 2 === 0 ? -1 : 1) * (15 + (i % 3) * 2.5);
    push('pine', s, u, 1.2, 1.2, 7);
  }
  // Marked rock hazards inside the groomed bowl — sparse and visible.
  for (const [s, u] of [[480, 6], [705, -4], [1075, -8], [1300, 8], [1495, 5], [1650, -6]]) {
    push('rock', s, u, 1.0, 1.0, 1.2);
  }
  // Lift towers line the ridge on one side, outside groomed.
  for (let i = 0; i < 7; i++) {
    push('lift-tower', 1010 + i * 60, 21.5, 1.0, 1.0, 9);
  }
  // Lodge fence funnels the finish straight.
  for (let i = 0; i < 4; i++) {
    push('fence', 1720 + i * 20, -21, 0.4, 3, 1.1);
    push('fence', 1720 + i * 20, 21, 0.4, 3, 1.1);
  }
  return obstacles;
}

/**
 * Surface height above the base profile: a gentle bowl that keeps riders in
 * the corridor, plus the baked ramp approaches/lips. No noise — render and
 * contact must agree.
 */
function surfaceOffset(s, u) {
  let h = -0.008 * u * u;
  for (const ramp of RAMPS) {
    const from = ramp.s - RAMP_APPROACH_METERS;
    if (s >= from && s <= ramp.s && u >= ramp.uMin && u <= ramp.uMax) {
      const t = (s - from) / RAMP_APPROACH_METERS;
      h += ramp.lipHeight * t * t;
    }
  }
  return h;
}

function surfaceTag(s, u) {
  const absU = Math.abs(u);
  if (absU > GROOMED_HALF_WIDTH) return 1; // snowbank shoulder
  return 0; // groomed
}

/** Build the full course height profile by integrating the grade function. */
function buildHeights() {
  const base = new Float64Array(S_COUNT);
  let h = 0;
  for (let i = 0; i < S_COUNT; i++) {
    if (i > 0) h -= gradeAt((i - 1) * GRID_STEP_METERS) * GRID_STEP_METERS;
    base[i] = h;
  }
  // Normalize so the start gate sits at height 220.
  const shift = 220 - base[0];
  const heights = [];
  for (let i = 0; i < S_COUNT; i++) {
    const row = new Array(U_COUNT);
    const s = i * GRID_STEP_METERS;
    for (let j = 0; j < U_COUNT; j++) {
      const u = -CORRIDOR_HALF_WIDTH + j * LATERAL_STEP_METERS;
      row[j] = round2(base[i] + shift + surfaceOffset(s, u));
    }
    heights.push(row);
  }
  return heights;
}

/**
 * The full canonical document. Deterministic: two calls produce deep-equal
 * structures, and the export serializes them byte-identically.
 */
export function buildCourseDocument() {
  const centerline = [];
  for (let i = 0; i < S_COUNT; i++) {
    const s = round2(i * GRID_STEP_METERS);
    centerline.push({ s, x: centerXAt(s), width: widthAt(s) });
  }
  const sValues = [];
  for (let i = 0; i < S_COUNT; i++) sValues.push(round2(i * GRID_STEP_METERS));
  const uValues = [];
  for (let j = 0; j < U_COUNT; j++) uValues.push(round2(-CORRIDOR_HALF_WIDTH + j * LATERAL_STEP_METERS));
  const heights = buildHeights();
  const surface = heights.map((row, i) => row.map((_h, j) => surfaceTag(i * GRID_STEP_METERS, uValues[j])));

  const doc = {
    id: COURSE_ID,
    version: COURSE_VERSION,
    rulesVersion: RULES_VERSION,
    lengthMeters: LENGTH_METERS,
    gridStepMeters: GRID_STEP_METERS,
    lateralStepMeters: LATERAL_STEP_METERS,
    corridorHalfWidth: CORRIDOR_HALF_WIDTH,
    groomedHalfWidth: GROOMED_HALF_WIDTH,
    gateAltitudeCeiling: GATE_ALTITUDE_CEILING,
    centerline,
    grid: { sValues, uValues, height: heights, surface },
    ramps: RAMPS.map((r) => ({ ...r, approach: RAMP_APPROACH_METERS })),
    obstacles: buildObstacles(),
    gates: GATES.map((g) => ({ ...g })),
    finish: { ...FINISH },
    recoveryPoints: RECOVERY_POINTS.map((p) => ({ ...p })),
  };
  if (!hashImplementation) {
    throw new Error('buildCourseDocument requires setCourseHashImplementation (Node-only authoring)');
  }
  return { ...doc, hash: courseHashOf(doc) };
}

// --- canonical form + hash -----------------------------------------------------
// The BROWSER consumes the document's embedded hash and never recomputes it,
// so node:crypto stays out of this module entirely: Node callers (export
// script, tests) inject the implementation from courseHash.js.
let hashImplementation = null;

/** Node-only hook: inject courseHash from shared/snowboard/courseHash.js. */
export function setCourseHashImplementation(fn) {
  hashImplementation = fn;
}

function courseHashOf(doc) {
  return hashImplementation ? hashImplementation(doc) : null;
}

// --- validation (must pass before any physics use) -------------------------------

/**
 * Validates one course document and returns a list of problems (empty =
 * valid). Checks the grid contract, gate/recovery/obstacle invariants and
 * the hash before the rules engine or the renderer ever sample it.
 */
export function validateCourse(doc) {
  const problems = [];
  const at = (ok, message) => { if (!ok) problems.push(message); };

  at(doc && typeof doc === 'object', 'course document must be an object');
  if (!doc || typeof doc !== 'object') return problems;

  at(doc.id === COURSE_ID, `course id must be ${COURSE_ID}`);
  at(doc.version === COURSE_VERSION, `course version must be ${COURSE_VERSION}`);
  at(doc.rulesVersion === RULES_VERSION, `rulesVersion must be ${RULES_VERSION}`);
  at(doc.lengthMeters === LENGTH_METERS, `lengthMeters must be ${LENGTH_METERS}`);
  at(doc.gridStepMeters === GRID_STEP_METERS, 'gridStepMeters must be 2');
  at(doc.lateralStepMeters === LATERAL_STEP_METERS, 'lateralStepMeters must be 2');
  at(doc.corridorHalfWidth === CORRIDOR_HALF_WIDTH, 'corridorHalfWidth must be 24');
  at(doc.groomedHalfWidth === GROOMED_HALF_WIDTH, 'groomedHalfWidth must be 18');

  const grid = doc.grid ?? {};
  const sValues = grid.sValues ?? [];
  const uValues = grid.uValues ?? [];
  const height = grid.height ?? [];
  const surface = grid.surface ?? [];
  at(sValues.length === S_COUNT, `grid needs ${S_COUNT} s samples`);
  at(uValues.length === U_COUNT, `grid needs ${U_COUNT} u samples`);
  at(height.length === S_COUNT, 'height rows must match s samples');
  at(surface.length === S_COUNT, 'surface rows must match s samples');

  let uniform = sValues.length === S_COUNT;
  if (uniform) {
    for (let i = 0; i < S_COUNT; i++) {
      if (sValues[i] !== round2(i * GRID_STEP_METERS)) { uniform = false; break; }
    }
  }
  at(uniform, 'sValues must run 0..1800 uniformly at 2m');
  const uUniform = uValues.every((u, j) => u === round2(-CORRIDOR_HALF_WIDTH + j * LATERAL_STEP_METERS));
  at(uUniform, 'uValues must span -24..24 uniformly at 2m');

  let finite = true;
  for (const row of height) {
    if (!Array.isArray(row) || row.length !== U_COUNT) { finite = false; break; }
    for (const h of row) {
      if (!Number.isFinite(h)) { finite = false; break; }
    }
    if (!finite) break;
  }
  at(finite, 'all heights must be finite with 25 columns');

  const surfaceOk = surface.every((row) => Array.isArray(row) && row.length === U_COUNT
    && row.every((tag) => Number.isInteger(tag) && tag >= 0 && tag <= 1));
  at(surfaceOk, 'surface rows must carry 25 tags in [0, 1]');

  // Centerline: ascending, matching coverage, rideable width within corridor.
  const center = doc.centerline ?? [];
  at(center.length === S_COUNT, 'centerline must sample every grid row');
  let centerOk = center.length === S_COUNT;
  if (centerOk) {
    for (let i = 0; i < S_COUNT; i++) {
      const c = center[i];
      if (!c || c.s !== sValues[i] || !Number.isFinite(c.x) || Math.abs(c.x) > CORRIDOR_HALF_WIDTH
        || !Number.isFinite(c.width) || c.width <= 0 || c.width > 2 * CORRIDOR_HALF_WIDTH) {
        centerOk = false;
        break;
      }
    }
  }
  at(centerOk, 'centerline entries must be finite, in-bounds, with rideable width');

  // Gates: exactly the eight checkpoints, ordered, full-width.
  const gates = doc.gates ?? [];
  at(gates.length === CHECKPOINT_PLANES.length, `course must declare exactly ${CHECKPOINT_PLANES.length} gates`);
  gates.forEach((gate, i) => {
    at(gate?.index === i + 1, `gate ${i} must carry index ${i + 1}`);
    at(gate?.s === CHECKPOINT_PLANES[i], `gate ${i + 1} must sit at ${CHECKPOINT_PLANES[i]}m`);
    at(gate?.uMin === -CORRIDOR_HALF_WIDTH && gate?.uMax === CORRIDOR_HALF_WIDTH, `gate ${i + 1} must be full-width`);
  });

  const finish = doc.finish ?? {};
  at(finish.s === FINISH_METERS, 'finish must sit at 1800m');
  at(gates.every((g) => g.s < finish.s), 'all gates must precede the finish');

  // Ramps: inside the route, finite, unique ids.
  const rampIds = new Set();
  for (const ramp of doc.ramps ?? []) {
    at(ramp && typeof ramp.id === 'string' && !rampIds.has(ramp.id), 'ramp ids must be unique strings');
    rampIds.add(ramp?.id);
    at(Number.isFinite(ramp?.s) && ramp.s > 0 && ramp.s < FINISH_METERS, 'ramp lip must sit inside the route');
    at(Number.isFinite(ramp?.uMin) && Number.isFinite(ramp?.uMax) && ramp.uMin < ramp.uMax, 'ramp lateral span must be valid');
    at(Math.abs(ramp?.uMin ?? 0) <= CORRIDOR_HALF_WIDTH && Math.abs(ramp?.uMax ?? 0) <= CORRIDOR_HALF_WIDTH, 'ramp span must stay inside the corridor');
    at(Number.isFinite(ramp?.lipHeight) && ramp.lipHeight > 0, 'ramp lipHeight must be positive');
  }

  // Obstacles: bounded count, finite, inside the route.
  const obstacles = doc.obstacles ?? [];
  at(obstacles.length <= MAX_COLLIDERS, `obstacle colliders must stay <= ${MAX_COLLIDERS}`);
  for (const obstacle of obstacles) {
    at(obstacle && typeof obstacle.id === 'string', 'obstacle ids must be strings');
    at(Number.isFinite(obstacle?.s) && obstacle.s >= 0 && obstacle.s <= FINISH_METERS, 'obstacle s must sit on the route');
    at(Math.abs(obstacle?.u ?? 0) <= CORRIDOR_HALF_WIDTH, 'obstacle u must stay inside the corridor');
    at(Number.isFinite(obstacle?.halfS) && obstacle.halfS > 0 && Number.isFinite(obstacle?.halfU) && obstacle.halfU > 0, 'obstacle half extents must be positive');
    at(Number.isFinite(obstacle?.height) && obstacle.height > 0, 'obstacle height must be positive');
  }

  // Recovery points: on the route, never skipping an unearned gate, and at a
  // spot the samplers can stand on.
  for (const point of doc.recoveryPoints ?? []) {
    at(point && typeof point.id === 'string', 'recovery ids must be strings');
    at(Number.isFinite(point?.s) && point.s >= 0 && point.s < FINISH_METERS, 'recovery s must sit on the route');
    at(Math.abs(point?.u ?? 0) < GROOMED_HALF_WIDTH, 'recovery u must stay inside the groomed bowl');
    at(Number.isInteger(point?.segment) && point.segment >= 0 && point.segment <= CHECKPOINT_PLANES.length, 'recovery segment must index the checkpoint segments');
    const earnedThrough = point.segment === 0 ? 0 : CHECKPOINT_PLANES[point.segment - 1];
    const nextGate = CHECKPOINT_PLANES[point.segment] ?? FINISH_METERS;
    at(point.s >= earnedThrough && point.s < nextGate, `recovery ${point?.id} must sit inside its earned segment`);
  }

  at(typeof doc.hash === 'string' && /^[0-9a-f]{64}$/.test(doc.hash ?? ''), 'hash must be sha256 hex');
  if (problems.length === 0 && hashImplementation) {
    // Hash verification only where a hash implementation was injected (Node).
    // The browser trusts the server's authoritative copy by construction.
    at(doc.hash === courseHashOf(doc), 'hash must match the canonical document');
  }
  return problems;
}

// --- runtime samplers (identical math to the Elixir authority) -------------------

/**
 * A validated, sampling-ready course. Linear center interpolation and
 * bilinear height interpolation, clamped at the edges — the exact arithmetic
 * the Elixir port must reproduce (parity tolerance: 1cm / 0.01 m/s).
 */
export function loadCourse(doc) {
  const problems = validateCourse(doc);
  if (problems.length > 0) {
    throw new Error(`refusing to load invalid course: ${problems[0]}`);
  }
  const { grid, centerline } = doc;
  const { sValues, uValues, height } = grid;

  const heightAt = (s, u) => {
    // Clamp to the sampled rectangle (D5: clamped at edges).
    const fs = Math.max(0, Math.min(sValues.length - 1, s / GRID_STEP_METERS));
    const i0 = Math.min(Math.floor(fs), sValues.length - 2);
    const ts = fs - i0;
    const fu = Math.max(0, Math.min(uValues.length - 1, (u + CORRIDOR_HALF_WIDTH) / LATERAL_STEP_METERS));
    const j0 = Math.min(Math.floor(fu), uValues.length - 2);
    const tu = fu - j0;
    const h00 = height[i0][j0];
    const h10 = height[i0 + 1][j0];
    const h01 = height[i0][j0 + 1];
    const h11 = height[i0 + 1][j0 + 1];
    return (h00 * (1 - ts) + h10 * ts) * (1 - tu) + (h01 * (1 - ts) + h11 * ts) * tu;
  };

  const centerXAtSample = (s) => {
    const fs = Math.max(0, Math.min(centerline.length - 1, s / GRID_STEP_METERS));
    const i0 = Math.min(Math.floor(fs), centerline.length - 2);
    const ts = fs - i0;
    return centerline[i0].x * (1 - ts) + centerline[i0 + 1].x * ts;
  };

  const gradeAtSample = (s) => {
    const back = Math.max(0, s - GRID_STEP_METERS);
    const ahead = Math.min(LENGTH_METERS, s + GRID_STEP_METERS);
    const slope = (heightAt(ahead, 0) - heightAt(back, 0)) / (ahead - back);
    return Math.max(0, Math.min(0.6, -slope));
  };

  return {
    doc,
    lengthMeters: doc.lengthMeters,
    corridorHalfWidth: doc.corridorHalfWidth,
    groomedHalfWidth: doc.groomedHalfWidth,
    gates: doc.gates,
    finish: doc.finish,
    ramps: doc.ramps,
    obstacles: doc.obstacles,
    recoveryPoints: doc.recoveryPoints,
    heightAt,
    centerXAt: centerXAtSample,
    gradeAt: gradeAtSample,
  };
}
