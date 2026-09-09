/**
 * Summit Run canonical course — ALPINE RUSH (integrate-ssxtricky-snowboard
 * 3.2). Pure authoring, validation, hashing and sampling for the release
 * route, ported from the frozen user-owned source baseline
 * `SSXTricky/lib/game/rules.mjs` @ rev e87f6c7d (see the change's
 * baseline.md for provenance and file hashes).
 *
 * The course is ANALYTIC, not a baked height grid: the winding centerline,
 * ground height, ramps and speed zones are the source's own closed-form
 * functions, ported verbatim below. The same arithmetic runs in the browser
 * renderer, the client predictor and the Elixir authority
 * (Afterlight.Activities.Snowboard.Course), so render and contact agree
 * exactly inside the corridor. Only the enumerable course features (ramps,
 * speed zones, pickups, banners) are baked into the canonical document so
 * every runtime iterates identical numbers; `x`/`base` values are computed
 * once by the export script and round-trip through JSON exactly.
 *
 * Coordinate convention (source): `d`/`s` downhill meters increases downhill
 * (world z = -s); `x` is the ABSOLUTE world lateral coordinate; the legal
 * corridor is courseCenter(d) ± 35. Source bank noise beyond |x-center| > 29
 * is cosmetic render detail outside the groomed corridor and intentionally
 * absent from contact math, exactly as in the source game.
 */

export const COURSE_ID = 'alpine-rush';
export const COURSE_VERSION = 2;
export const RULES_VERSION = 2;

// Source constants (rules.mjs / engine.js at the frozen revision).
export const LENGTH_METERS = 1800; // source COURSE_LENGTH
export const CORRIDOR_HALF_WIDTH = 35; // source clamp: courseCenter ± 35
export const CARVE_HALF_WIDTH = 20; // source carve window |x-center| < 20
export const GROOMED_HALF_WIDTH = 23; // source groomed display tone boundary
export const BANK_NOISE_START = 29; // source: side > 29 gets bank noise
export const BANK_NOISE_MAX = 18;
export const EDGE_BLEED_HALF_WIDTH = 23; // source: |x-center| > 23 bleeds speed
export const RAMP_COUNT = 13;
export const PICKUP_COUNT = 22;
export const RENDER_SEED = 321; // source terrain/scenery seed (render-side)

const round6 = (value) => (Object.is(value, -0) ? 0 : Math.round(value * 1e6) / 1e6);

// --- source terrain functions (verbatim port) --------------------------------

/** Winding groomed centerline x(d). Source: sin(d*.003)*24 + sin(d*.009)*7. */
export function courseCenter(d) {
  return Math.sin(d * .003) * 24 + Math.sin(d * .009) * 7;
}

/**
 * Absolute ground height. Source:
 * -d*.18 + sin(d*.012)*2 + pow(max(0,|x-center(d)|-22),1.18)*.38
 */
export function groundHeight(x, d) {
  return -d * .18 + Math.sin(d * .012) * 2 + Math.pow(Math.max(0, Math.abs(x - courseCenter(d)) - 22), 1.18) * .38;
}

/** Source createRamps(): 13 ramps, centers 95+i*124, alternating lines. */
export function createRamps() {
  return Array.from({ length: RAMP_COUNT }, (_, i) => {
    const center = 95 + i * 124, x = courseCenter(center) + (i === 0 ? 0 : (i % 3 - 1) * 11);
    return { start: center - 9, end: center + 9, x, width: 12, height: 5, base: groundHeight(x, center - 9) };
  });
}

/** Height on a ramp at course distance d (clamped ramp profile). */
export function rampHeight(r, d) {
  return r.base + clamp((d - r.start) / (r.end - r.start), 0, 1) * r.height;
}

/** Whether (x, d) is on the ramp's footprint. */
export function onRamp(r, x, d) {
  return d >= r.start && d <= r.end && Math.abs(x - r.x) <= r.width / 2;
}

/** Contact surface: max(ground, ramp surfaces) — render/contact agreement. */
export function surfaceHeight(x, d, ramps) {
  return ramps.reduce((h, r) => onRamp(r, x, d) ? Math.max(h, rampHeight(r, d)) : h, groundHeight(x, d));
}

export function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

// --- canonical document --------------------------------------------------------

/**
 * The full canonical course document. Deterministic: two calls produce
 * deep-equal structures and the export serializes byte-identically. Ramp and
 * pickup coordinates are baked (computed once, round-tripped exactly through
 * JSON) so JS and Elixir iterate identical numbers.
 */
export function buildCourseDocument() {
  const ramps = createRamps().map((r, i) => ({
    id: `ramp-${i}`,
    start: round6(r.start),
    end: round6(r.end),
    x: round6(r.x),
    width: r.width,
    height: r.height,
    base: round6(r.base),
  }));
  // Source engine: speedZones = ramps.map(r => ({start:r.start-41,end:r.start-19,x:r.x,width:10}))
  const speedZones = ramps.map((r, i) => ({
    id: `zone-${i}`,
    start: round6(r.start - 41),
    end: round6(r.start - 19),
    x: r.x,
    width: 10,
  }));
  // Source engine: 22 pickups at d=70+i*76, x=center(d)+sin(i*2)*15.
  const pickups = Array.from({ length: PICKUP_COUNT }, (_, i) => {
    const d = 70 + i * 76;
    return { id: i, d: round6(d), x: round6(courseCenter(d) + Math.sin(i * 2) * 15) };
  });
  const banners = [
    { d: -12, title: 'ALPINE RUSH', finish: false },
    { d: 600, title: 'GO BIG.', finish: false },
    { d: 1200, title: 'FULL SEND.', finish: false },
    { d: LENGTH_METERS, title: 'FINISH', finish: true },
  ];

  const doc = {
    id: COURSE_ID,
    version: COURSE_VERSION,
    rulesVersion: RULES_VERSION,
    lengthMeters: LENGTH_METERS,
    corridorHalfWidth: CORRIDOR_HALF_WIDTH,
    carveHalfWidth: CARVE_HALF_WIDTH,
    groomedHalfWidth: GROOMED_HALF_WIDTH,
    edgeBleedHalfWidth: EDGE_BLEED_HALF_WIDTH,
    bankNoiseStart: BANK_NOISE_START,
    bankNoiseMax: BANK_NOISE_MAX,
    renderSeed: RENDER_SEED,
    ramps,
    speedZones,
    pickups,
    banners,
    finish: { s: LENGTH_METERS },
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

const APPROX = 1e-6;

/**
 * Validates one course document and returns a list of problems (empty =
 * valid). Checks identity, source-derived constants, feature invariants and
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
  at(doc.corridorHalfWidth === CORRIDOR_HALF_WIDTH, `corridorHalfWidth must be ${CORRIDOR_HALF_WIDTH}`);
  at(doc.carveHalfWidth === CARVE_HALF_WIDTH, `carveHalfWidth must be ${CARVE_HALF_WIDTH}`);
  at(doc.groomedHalfWidth === GROOMED_HALF_WIDTH, `groomedHalfWidth must be ${GROOMED_HALF_WIDTH}`);
  at(doc.edgeBleedHalfWidth === EDGE_BLEED_HALF_WIDTH, `edgeBleedHalfWidth must be ${EDGE_BLEED_HALF_WIDTH}`);

  // Ramps: the source thirteen, ordered, on the route, bases matching the
  // analytic terrain they sit on.
  const ramps = doc.ramps ?? [];
  at(Array.isArray(ramps) && ramps.length === RAMP_COUNT, `course must declare exactly ${RAMP_COUNT} ramps`);
  const rampIds = new Set();
  ramps.forEach((ramp, i) => {
    at(typeof ramp?.id === 'string' && !rampIds.has(ramp.id), 'ramp ids must be unique strings');
    rampIds.add(ramp?.id);
    const center = 95 + i * 124;
    const sourceX = courseCenter(center) + (i === 0 ? 0 : (i % 3 - 1) * 11);
    at(Math.abs(ramp.start - (center - 9)) <= APPROX, `ramp ${i} start must match the source layout`);
    at(Math.abs(ramp.end - (center + 9)) <= APPROX, `ramp ${i} end must match the source layout`);
    at(Math.abs(ramp.x - sourceX) <= 1e-4, `ramp ${i} x must match the source line`);
    at(ramp.width === 12 && ramp.height === 5, `ramp ${i} must keep the source width/height`);
    at(Math.abs(ramp.base - groundHeight(ramp.x, ramp.start)) <= 1e-4, `ramp ${i} base must sit on the terrain`);
    at(ramp.start > 0 && ramp.end < LENGTH_METERS, `ramp ${i} must sit inside the route`);
  });

  // Speed zones: exactly the source derivation from each ramp.
  const zones = doc.speedZones ?? [];
  at(Array.isArray(zones) && zones.length === RAMP_COUNT, `course must declare exactly ${RAMP_COUNT} speed zones`);
  zones.forEach((zone, i) => {
    const ramp = ramps[i];
    if (!ramp || !zone) return;
    at(Math.abs(zone.start - (ramp.start - 41)) <= APPROX, `zone ${i} must start 41 m before its ramp`);
    at(Math.abs(zone.end - (ramp.start - 19)) <= APPROX, `zone ${i} must end 19 m before its ramp`);
    at(zone.x === ramp.x && zone.width === 10, `zone ${i} must feed its ramp at source width`);
  });

  // Pickups: the source twenty-two, on the route, inside the corridor.
  const pickups = doc.pickups ?? [];
  at(Array.isArray(pickups) && pickups.length === PICKUP_COUNT, `course must declare exactly ${PICKUP_COUNT} pickups`);
  pickups.forEach((p, i) => {
    if (!p) return;
    const d = 70 + i * 76;
    const sourceX = courseCenter(d) + Math.sin(i * 2) * 15;
    at(Math.abs(p.d - d) <= APPROX, `pickup ${i} must sit at the source distance`);
    at(Math.abs(p.x - sourceX) <= 1e-4, `pickup ${i} must sit on the source line`);
    at(Math.abs(p.x - courseCenter(p.d)) <= CORRIDOR_HALF_WIDTH, `pickup ${i} must stay inside the corridor`);
    at(p.d > 0 && p.d < LENGTH_METERS, `pickup ${i} must sit inside the route`);
  });

  // Banners and finish.
  const banners = doc.banners ?? [];
  at(Array.isArray(banners) && banners.length === 4, 'course must declare the four source banners');
  at(banners.some((b) => b?.finish === true && b.d === LENGTH_METERS), 'the finish banner must sit at the finish');
  at(doc.finish?.s === LENGTH_METERS, 'finish must sit at 1800m');

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
 * A validated, sampling-ready course. The samplers are the source functions
 * themselves; document features (ramps/zones/pickups) are the baked arrays.
 */
export function loadCourse(doc) {
  const problems = validateCourse(doc);
  if (problems.length > 0) {
    throw new Error(`refusing to load invalid course: ${problems[0]}`);
  }

  /** Absolute-x contact surface including ramps. */
  const surfaceAt = (x, d) => surfaceHeight(x, d, doc.ramps);

  return {
    doc,
    hash: doc.hash,
    lengthMeters: doc.lengthMeters,
    corridorHalfWidth: doc.corridorHalfWidth,
    carveHalfWidth: doc.carveHalfWidth,
    groomedHalfWidth: doc.groomedHalfWidth,
    ramps: doc.ramps,
    speedZones: doc.speedZones,
    pickups: doc.pickups,
    banners: doc.banners,
    finish: doc.finish,
    /** Contact height at absolute (x, d). */
    heightAt: (s, u) => surfaceAt(courseCenter(s) + u, s),
    /** Absolute-x contact height (source convention). */
    surfaceAt,
    centerXAt: (s) => courseCenter(s),
  };
}
