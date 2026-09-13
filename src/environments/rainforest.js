/**
 * Rainforest Canopy — THE GREEN CATHEDRAL BREATHES.
 *
 * The Orpheum stands in an enormous tropical clearing. The ground is held
 * just below the auditorium floor, then climbs away into a rolling jungle
 * shelf; the architecture is framed by layers of green:
 *
 *   FLOOR  — damp humus, moss cushions, leaf litter, ferns, grass, boulders
 *   WALL   — ancient emergent giants (15–28 m, buttressed trunks + merged
 *            crowns), mid canopy broadleaves, shrubs, hanging vines
 *   DEPTH  — a distant massif with a white waterfall falling into a plunge
 *            pool and its mist, cliff silhouettes, cloud bank
 *
 * Weather response (the manifest presets own the sky/fog/exposure; this
 * builder owns the surroundings):
 *   mist         — shafts on, calm pool, drifting spores, a few fireflies
 *   afternoon    — shafts dim, saturated wet greens, more ground mist
 *   thunderstorm — shafts off, dark silhouettes, leaf litter driving on the
 *                  wind; rain and distant flashes belong to the atmosphere
 *
 * Deterministic: every random draw comes from the kit stream. Everything is
 * tier-budgeted and owned by the kit ledger, and no shared scene, theater or
 * module-level resource is touched. Switching variants never rebuilds
 * geometry (the runtime only rebuilds when setVariant throws).
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { fbm, clamp, smoothstep, createTerrain } from './lib/terrain.js';
import { scatter } from './lib/scatter.js';
import { createRockGeometry, createRockField } from './lib/rocks.js';
import {
  createAncientTrunkGeometry,
  createBroadleafGeometry,
  createFernGeometry,
  createGrassTuftGeometry,
  instanceVegetation,
} from './lib/vegetation.js';
import { createWater } from './lib/water.js';
import { createParticleField, createFlock } from './lib/particles.js';
import { createCloudBank, createLightShafts } from './lib/skyFx.js';
import { scaleForTier } from './quality.js';

// --- Layout ------------------------------------------------------------------
// The clearing floor must stay below y=-0.6 across the Theater footprint
// rectangle x[-14.5, 14.5] z[-17, 13.5]; outside it the jungle climbs. All
// scenery stays within a 160-unit radius of the origin.
const THEATER_X = 14.5;
const THEATER_N = 17.0;
const THEATER_S = 13.5;
const FLOOR_Y = -1.45;
// Trees, rocks and props stay well inside the 160-unit scenery cap even at
// their widest instance extents (crowns/rocks reach ~8–29 units from center).
const SCENERY_RADIUS = 146;

// Waterfall sector: north-west of the Orpheum, beyond the tree wall. The
// fall lands at WATERFALL_RADIUS (60–100 out); the massif sits behind it.
const WATERFALL_ANGLE = -2.72;
const WATERFALL_RADIUS = 74;
const MASSIF_RADIUS = 98;
const WATERFALL_X = Math.cos(WATERFALL_ANGLE) * WATERFALL_RADIUS;
const WATERFALL_Z = Math.sin(WATERFALL_ANGLE) * WATERFALL_RADIUS;
const MASSIF_X = Math.cos(WATERFALL_ANGLE) * MASSIF_RADIUS;
const MASSIF_Z = Math.sin(WATERFALL_ANGLE) * MASSIF_RADIUS;
// The fall planes hang just in front of the plunge pool, on the line home.
const FALL_X = Math.cos(WATERFALL_ANGLE) * (WATERFALL_RADIUS - 0.5);
const FALL_Z = Math.sin(WATERFALL_ANGLE) * (WATERFALL_RADIUS - 0.5);
const FALL_FACING = Math.atan2(-Math.cos(WATERFALL_ANGLE), -Math.sin(WATERFALL_ANGLE));
// Screen-side perpendicular for the second, narrower sheet.
const FALL_SIDE_X = -Math.sin(WATERFALL_ANGLE);
const FALL_SIDE_Z = Math.cos(WATERFALL_ANGLE);

// --- Waterfall surface -------------------------------------------------------
// A vertical sheet of falling water, animated entirely on the GPU. It is
// deliberately fog-exempt: the manifest's rainforest fog is dense enough to
// erase anything 40+ units out, so a distance-cued white veil is the only
// honest way the hero fall stays visible through the mist.
const WATERFALL_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`;

const WATERFALL_FRAGMENT = /* glsl */ `
uniform float uTime;
uniform float uFlow;
uniform vec3 uColor;
uniform vec3 uFoam;
uniform float uOpacity;
varying vec2 vUv;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

void main() {
  // Downward-scrolling foam streaks: two scales so the sheet never reads flat.
  float flow = uTime * uFlow;
  float streak = noise(vec2(vUv.x * 12.0, vUv.y * 3.0 + flow));
  streak += noise(vec2(vUv.x * 26.0 + 4.7, vUv.y * 7.0 + flow * 1.55)) * 0.5;
  float core = smoothstep(0.42, 0.96, streak);
  float edge = smoothstep(0.0, 0.16, vUv.x) * smoothstep(1.0, 0.84, vUv.x);
  float ends = smoothstep(0.0, 0.2, vUv.y) * smoothstep(1.0, 0.82, vUv.y);
  float alpha = (0.26 + core * 0.74) * edge * ends * uOpacity;
  vec3 color = mix(uColor, uFoam, 0.3 + core * 0.7);
  color *= 0.93 + 0.07 * sin((vUv.y + flow * 0.2) * 38.0);
  if (alpha < 0.012) discard;
  gl_FragColor = vec4(color, alpha);
}
`;

const FALL_WHITE = new THREE.Color('#f3f9f6');

function clearingDistance(x, z) {
  const dx = Math.max(0, Math.abs(x) - THEATER_X);
  const dz = z > 0 ? Math.max(0, z - THEATER_S) : Math.max(0, -z - THEATER_N);
  return Math.hypot(dx, dz);
}

/** Keep tall scenery out of the Orpheum's own shell (walls at ±11.5, north
 * backdrop at z=-13): vegetation may crowd the clearing right up to the
 * building, never through it. */
function insideTheaterFootprint(x, z) {
  return Math.abs(x) < 13.8 && z > -14.5 && z < 13.8;
}

function trianglesOf(geometry, instances = 1) {
  const positions = geometry?.attributes?.position?.count ?? 0;
  return Math.round((positions / 3) * instances);
}

export function buildRainforest({ kit, row, variantId = 'mist', tier = 'high', quality }) {
  const { float, range, pick, int, mesh, track } = kit;
  const budget = quality;
  const root = new THREE.Group();
  root.name = 'rainforest-world';

  // Placement bounds follow the terrain so rocks/plants never hang off the
  // plane edge on the smaller tiers.
  const scatterRadius = Math.min(SCENERY_RADIUS, budget.terrainSize * 0.5 - 14);
  const farMaxRadius = Math.min(126, budget.terrainSize * 0.5 - 24);

  // --- Terrain: a hidden floor under the theater, rising into the jungle ----
  function heightAt(x, z) {
    const d = clearingDistance(x, z);
    // Flat damp clearing: always far below -0.6 across the footprint.
    let h = FLOOR_Y + (fbm(x, z, { octaves: 3, frequency: 0.055, seed: 101 }) - 0.5) * 0.5;
    // Long rise away from the clearing with broad jungle swells.
    const rise = smoothstep(2, 26, d);
    const wave = (fbm(x, z, { octaves: 5, frequency: 0.024, seed: 211 }) - 0.5) * 2;
    h += rise * (6.2 + wave * 3.2);
    h += (fbm(x, z, { octaves: 4, frequency: 0.1, seed: 223 }) - 0.5) * 2 * (0.16 + rise * 0.85);
    // Far rim: rolling highlands toward the fog line.
    const far = smoothstep(78, 150, Math.hypot(x, z));
    h += far * (4.5 + (fbm(x, z, { octaves: 4, frequency: 0.016, seed: 307 }) - 0.5) * 7);
    // Plunge basin + raised rim so the pool is a genuinely closed depression.
    const basinD = Math.hypot(x - WATERFALL_X, z - WATERFALL_Z);
    h -= smoothstep(15, 4, basinD) * 6.5;
    h += smoothstep(22, 13, basinD) * smoothstep(3, 13, basinD) * 5.4;
    // Massif shoulder behind the fall.
    const shoulder = smoothstep(26, 7, Math.hypot(x - MASSIF_X, z - MASSIF_Z));
    h += shoulder * (8 + (fbm(x, z, { octaves: 3, frequency: 0.05, seed: 401 }) - 0.5) * 5);
    return h;
  }

  const POOL_WATER_Y = heightAt(WATERFALL_X, WATERFALL_Z) + 0.8;

  const soil = new THREE.Color('#3b3524');
  const humus = new THREE.Color('#2e2a1d');
  const moss = new THREE.Color('#45612f');
  const mossBright = new THREE.Color('#5f7f3a');
  const litter = new THREE.Color('#5c4a2c');
  const highland = new THREE.Color('#3d4a3a');
  const poolBed = new THREE.Color('#2b3b32');
  const clearingEarth = new THREE.Color('#38352a');
  const colorScratch = new THREE.Color();

  const terrain = createTerrain({
    size: budget.terrainSize,
    segments: budget.terrainSegments,
    height: heightAt,
    colorAt: ({ x, z, h, slope }) => {
      const d = clearingDistance(x, z);
      const n = fbm(x, z, { octaves: 4, frequency: 0.055, seed: 511 });
      colorScratch.copy(soil);
      colorScratch.lerp(humus, clamp((0.5 - n) * 1.6, 0, 1) * 0.5);
      colorScratch.lerp(moss, clamp((n - 0.36) * 2.4, 0, 1) * 0.7);
      colorScratch.lerp(mossBright, clamp((fbm(x, z, { octaves: 3, frequency: 0.16, seed: 523 }) - 0.55) * 3, 0, 1) * 0.45);
      colorScratch.lerp(litter, clamp((fbm(x, z, { octaves: 3, frequency: 0.12, seed: 531 }) - 0.5) * 2.4, 0, 1) * 0.3);
      // The trampled clearing around the Orpheum: packed wet earth, less moss.
      const clearing = smoothstep(6, 0.5, d);
      if (clearing > 0.02) {
        colorScratch.lerp(clearingEarth, clearing * 0.55);
        colorScratch.lerp(humus, clearing * 0.35);
      }
      // Steep faces read as wet rock and thin soil.
      colorScratch.lerp(highland, smoothstep(0.35, 1.1, slope) * 0.45);
      // The plunge basin: bare wet mud and stone.
      const basin = smoothstep(14, 4, Math.hypot(x - WATERFALL_X, z - WATERFALL_Z));
      if (basin > 0.02) colorScratch.lerp(poolBed, basin * 0.7);
      // Higher shelves fade toward a cooler grey-green.
      colorScratch.lerp(highland, smoothstep(8, 22, h) * 0.35);
      return colorScratch;
    },
    y: 0,
    roughness: 0.93,
    metalness: 0.02,
  });
  root.add(terrain.mesh);
  track(terrain);

  // --- Rocks: boulders, the massif, distant cliffs --------------------------
  const rockGeometry = createRockGeometry({ float, detail: 1, jaggedness: 0.42, color: '#63685d' });
  track(rockGeometry);
  const rockMaterial = kit.track(new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.96, metalness: 0.02, flatShading: true,
  }));

  const boulderPlacements = scatter({
    count: scaleForTier(tier, 'rockScale', 130),
    minRadius: 16.5,
    maxRadius: 60,
    float,
    heightAt,
    accept: ({ x, z, h }) => !insideTheaterFootprint(x, z) && h > POOL_WATER_Y + 0.3,
    minSpacing: 2.2,
  }).map((p) => ({
    x: p.x,
    z: p.z,
    y: p.h - 0.4,
    rot: float() * Math.PI * 2,
    rx: (float() - 0.5) * 0.3,
    rz: (float() - 0.5) * 0.3,
    scale: range(0.5, 2.2),
    scaleY: range(0.45, 1.3),
  }));
  const boulderField = createRockField({ kit, geometry: rockGeometry, placements: boulderPlacements, material: rockMaterial, name: 'rainforest-boulders' });
  root.add(boulderField);

  // Far silhouettes share one pale-painted geometry so their material tint
  // (no fog) carries the atmospheric color; near geometry keeps real lights.
  const farRockGeometry = createRockGeometry({ float, detail: 1, jaggedness: 0.4, color: '#cdd4cc', squash: [1.7, 1.25, 1.5] });
  track(farRockGeometry);
  const massifMaterial = kit.track(new THREE.MeshBasicMaterial({ vertexColors: true, fog: false }));
  const distantMaterial = kit.track(new THREE.MeshBasicMaterial({ vertexColors: true, fog: false }));

  const massifGround = heightAt(MASSIF_X, MASSIF_Z);
  const massifPlacements = [{
    x: MASSIF_X,
    z: MASSIF_Z,
    y: massifGround + 1.2,
    rot: range(0, Math.PI * 2),
    scale: range(7.5, 9.0),
    scaleY: range(12, 15),
  }];
  // Flanks stay beside/behind the hero so no rock can swallow the fall sheet
  // in front of it (the widest rock axis must not point home).
  for (let i = 0; i < 5; i++) {
    const lateral = (i % 2 === 0 ? 1 : -1) * range(10, 22);
    const back = range(4, 16);
    const x = MASSIF_X + FALL_SIDE_X * lateral + Math.cos(WATERFALL_ANGLE) * back;
    const z = MASSIF_Z + FALL_SIDE_Z * lateral + Math.sin(WATERFALL_ANGLE) * back;
    const scale = range(6, 10);
    const scaleY = range(5, 9);
    massifPlacements.push({ x, z, y: heightAt(x, z) - 0.2 * scaleY, rot: float() * Math.PI * 2, scale, scaleY });
  }
  const massifField = createRockField({ kit, geometry: farRockGeometry, placements: massifPlacements, material: massifMaterial, name: 'rainforest-massif' });
  root.add(massifField);

  const cliffPlacements = scatter({
    count: scaleForTier(tier, 'rockScale', 16),
    minRadius: Math.max(96, WATERFALL_RADIUS + 24),
    maxRadius: farMaxRadius,
    float,
    heightAt,
    accept: ({ x, z, h }) => h > POOL_WATER_Y + 2 && Math.hypot(x - MASSIF_X, z - MASSIF_Z) > 34,
    minSpacing: 18,
  }).map((p) => {
    const scale = range(5, 12);
    const scaleY = range(6, 13);
    return { x: p.x, z: p.z, y: p.h - 0.2 * scaleY, rot: float() * Math.PI * 2, scale, scaleY };
  });
  const cliffField = createRockField({ kit, geometry: farRockGeometry, placements: cliffPlacements, material: distantMaterial, name: 'rainforest-cliffs' });
  root.add(cliffField);

  // --- Waterfall: two fog-exempt sheets and a plunge pool -------------------
  const waterfallMaterial = kit.track(new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uFlow: { value: 1 },
      uColor: { value: new THREE.Color('#cfe0d8') },
      uFoam: { value: new THREE.Color('#f3f9f6') },
      uOpacity: { value: 0.55 },
    },
    vertexShader: WATERFALL_VERTEX,
    fragmentShader: WATERFALL_FRAGMENT,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false,
  }));
  const waterfall = new THREE.Group();
  waterfall.name = 'rainforest-waterfall';
  const fallSheets = [
    { width: 9.0, height: 27, side: 0, lift: -1.2 },
    { width: 4.4, height: 21, side: 4.6, lift: -0.4 },
  ];
  for (const sheet of fallSheets) {
    const geometry = new THREE.PlaneGeometry(sheet.width, sheet.height);
    track(geometry);
    const plane = new THREE.Mesh(geometry, waterfallMaterial);
    plane.position.set(
      FALL_X + FALL_SIDE_X * sheet.side,
      POOL_WATER_Y + sheet.height * 0.5 + sheet.lift,
      FALL_Z + FALL_SIDE_Z * sheet.side,
    );
    plane.rotation.y = FALL_FACING;
    plane.renderOrder = 2;
    waterfall.add(plane);
  }
  root.add(waterfall);

  const pool = createWater({
    size: 24,
    segments: Math.max(20, Math.round(budget.waterSegments * 0.5)),
    waterY: POOL_WATER_Y,
    terrainHeight: heightAt,
    shoreRange: 2.2,
    waveHeight: 0.13,
    chop: 0.06,
    deepColor: '#123a31',
    shallowColor: '#3b7a62',
    opacity: 0.94,
    name: 'rainforest-pool',
  });
  pool.mesh.position.x = WATERFALL_X;
  pool.mesh.position.z = WATERFALL_Z;
  // createWater builds with matrixAutoUpdate off: move it before committing.
  pool.mesh.updateMatrix();
  root.add(pool.mesh);
  track(pool);

  // --- Vegetation: giants, canopy, shrubs, ferns, grass, moss, vines --------
  // Emergent giant: buttressed trunk and crown merged so one instance is one
  // tree (trunk width 1.7–2.8, height 17–29 across the instance range).
  const giantTrunkGeometry = createAncientTrunkGeometry({
    height: 20, radius: 1.2, color: '#4b3b2c', ridgeColor: '#33281e', rng: float, buttresses: 7,
  });
  const giantCrownGeometry = createBroadleafGeometry({
    height: 8.5, radius: 4.6, blobs: 5, color: '#2c4a2a', trunkColor: '#3a2c1f', rng: float,
  });
  giantCrownGeometry.translate(0, 14.2, 0);
  const giantGeometry = mergeGeometries([giantTrunkGeometry, giantCrownGeometry], false);
  giantTrunkGeometry.dispose();
  giantCrownGeometry.dispose();
  track(giantGeometry);
  const giantMaterial = kit.wind(new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.9, metalness: 0,
  }), { height: 14, strength: 0.15 });

  const giantPlacements = scatter({
    count: scaleForTier(tier, 'vegetationScale', 40),
    minRadius: 18,
    maxRadius: 62,
    float,
    heightAt,
    accept: ({ x, z, h }) => !insideTheaterFootprint(x, z) && h > POOL_WATER_Y + 0.4,
    minSpacing: 8.5,
  }).map((p) => ({
    x: p.x,
    z: p.z,
    h: p.h,
    y: p.h - 0.25,
    rot: float() * Math.PI * 2,
    scale: range(0.72, 1.18),
  }));
  root.add(instanceVegetation({
    geometry: giantGeometry,
    material: giantMaterial,
    placements: giantPlacements,
    name: 'rainforest-giants',
    castShadow: false,
  }));

  const canopyTints = [new THREE.Color('#ffffff'), new THREE.Color('#e6f0d2'), new THREE.Color('#d4e6c4')];
  const canopyGeometry = createBroadleafGeometry({
    height: 11, radius: 3.9, blobs: 5, color: '#33552f', trunkColor: '#423324', rng: float,
  });
  track(canopyGeometry);
  const canopyMaterial = kit.wind(new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.92, metalness: 0,
  }), { height: 8, strength: 0.22 });
  const canopyPlacements = scatter({
    count: scaleForTier(tier, 'vegetationScale', 110),
    minRadius: 16,
    maxRadius: 55,
    float,
    heightAt,
    accept: ({ x, z, h }) => !insideTheaterFootprint(x, z) && h > POOL_WATER_Y + 0.4,
    minSpacing: 4.2,
  }).map((p) => ({
    x: p.x,
    z: p.z,
    y: p.h - 0.15,
    rot: float() * Math.PI * 2,
    scale: range(0.55, 1.0),
    color: pick(canopyTints),
  }));
  root.add(instanceVegetation({
    geometry: canopyGeometry,
    material: canopyMaterial,
    placements: canopyPlacements,
    name: 'rainforest-canopy',
    castShadow: false,
  }));

  const shrubTints = [new THREE.Color('#ffffff'), new THREE.Color('#dcead0'), new THREE.Color('#cfe4c2')];
  const shrubGeometry = createBroadleafGeometry({
    height: 4.2, radius: 2.1, blobs: 4, color: '#3f6d34', trunkColor: '#40301f', rng: float,
  });
  track(shrubGeometry);
  const shrubMaterial = kit.wind(new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.94, metalness: 0,
  }), { height: 2.6, strength: 0.3 });
  const shrubPlacements = scatter({
    count: scaleForTier(tier, 'vegetationScale', 230),
    minRadius: 14.8,
    maxRadius: 48,
    float,
    heightAt,
    accept: ({ x, z, h }) => !insideTheaterFootprint(x, z) && h > POOL_WATER_Y + 0.3,
    minSpacing: 1.4,
  }).map((p) => ({
    x: p.x,
    z: p.z,
    y: p.h - 0.1,
    rot: float() * Math.PI * 2,
    scale: range(0.35, 0.75),
    color: pick(shrubTints),
  }));
  root.add(instanceVegetation({
    geometry: shrubGeometry,
    material: shrubMaterial,
    placements: shrubPlacements,
    name: 'rainforest-shrubs',
    castShadow: false,
  }));

  const fernTints = [new THREE.Color('#ffffff'), new THREE.Color('#d9ead0'), new THREE.Color('#c8e0be')];
  const fernGeometry = createFernGeometry({ radius: 1.35, fronds: 9, color: '#3c6b3a', rng: float });
  track(fernGeometry);
  const fernMaterial = kit.wind(new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.92, metalness: 0, side: THREE.DoubleSide,
  }), { height: 1.4, strength: 0.26 });
  const fernPlacements = scatter({
    count: scaleForTier(tier, 'vegetationScale', 380),
    minRadius: 14.6,
    maxRadius: 42,
    float,
    heightAt,
    accept: ({ x, z, h }) => !insideTheaterFootprint(x, z) && h > POOL_WATER_Y + 0.2,
    minSpacing: 0.95,
  }).map((p) => ({
    x: p.x,
    z: p.z,
    y: p.h,
    rot: float() * Math.PI * 2,
    scale: range(0.6, 1.5),
    color: pick(fernTints),
  }));
  root.add(instanceVegetation({
    geometry: fernGeometry,
    material: fernMaterial,
    placements: fernPlacements,
    name: 'rainforest-ferns',
    castShadow: false,
  }));

  const grassTints = [new THREE.Color('#ffffff'), new THREE.Color('#e2eec8'), new THREE.Color('#d0e4b4')];
  const grassGeometry = createGrassTuftGeometry({
    blades: 6, height: 0.72, width: 0.055, rng: float, tipColor: '#7d9b48', baseColor: '#3f5c2e',
  });
  track(grassGeometry);
  const grassMaterial = kit.wind(new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.95, metalness: 0, side: THREE.DoubleSide,
  }), { height: 0.8, strength: 0.22 });
  const grassPlacements = scatter({
    count: scaleForTier(tier, 'grassScale', 3000),
    minRadius: 14.4,
    maxRadius: 40,
    float,
    heightAt,
    accept: ({ x, z, h }) => !insideTheaterFootprint(x, z) && h > POOL_WATER_Y + 0.1,
    minSpacing: 0.5,
  }).map((p) => ({
    x: p.x,
    z: p.z,
    y: p.h,
    rot: float() * Math.PI * 2,
    scale: range(0.7, 1.45),
    color: pick(grassTints),
  }));
  root.add(instanceVegetation({
    geometry: grassGeometry,
    material: grassMaterial,
    placements: grassPlacements,
    name: 'rainforest-grass',
    castShadow: false,
  }));

  const mossGeometry = createBroadleafGeometry({
    height: 1.15, radius: 1.75, blobs: 3, color: '#3c5b2f', trunkColor: '#31402a', rng: float,
  });
  track(mossGeometry);
  const mossMaterial = kit.track(new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.98, metalness: 0,
  }));
  const mossPlacements = scatter({
    count: scaleForTier(tier, 'grassScale', 320),
    minRadius: 15.2,
    maxRadius: 38,
    float,
    heightAt,
    accept: ({ x, z, h }) => !insideTheaterFootprint(x, z) && h > POOL_WATER_Y + 0.2,
    minSpacing: 1.0,
  }).map((p) => ({
    x: p.x,
    z: p.z,
    y: p.h - 0.15,
    rot: float() * Math.PI * 2,
    scale: range(0.45, 1.05),
  }));
  root.add(instanceVegetation({
    geometry: mossGeometry,
    material: mossMaterial,
    placements: mossPlacements,
    name: 'rainforest-moss',
    castShadow: false,
  }));

  // Vines hang from the emergent trunks, out of the static wind sway.
  const vineGeometry = new THREE.CylinderGeometry(0.055, 0.11, 1, 5, 4, true);
  vineGeometry.translate(0, 0.5, 0);
  {
    const position = vineGeometry.attributes.position;
    for (let i = 0; i < position.count; i++) {
      position.setX(i, position.getX(i) + Math.sin(position.getY(i) * Math.PI * 2.2) * 0.12);
    }
    position.needsUpdate = true;
    vineGeometry.computeVertexNormals();
  }
  track(vineGeometry);
  const vineMaterial = kit.track(new THREE.MeshStandardMaterial({
    color: '#3c5c33', roughness: 0.9, metalness: 0, side: THREE.DoubleSide,
  }));
  const vinePlacements = [];
  for (const p of giantPlacements) {
    const count = int(1, 2);
    for (let i = 0; i < count; i++) {
      const angle = float() * Math.PI * 2;
      const offset = range(1.0, 2.4) * p.scale;
      const length = range(3.6, 8.5);
      const top = p.y + range(9, 14) * p.scale;
      vinePlacements.push({
        x: p.x + Math.cos(angle) * offset,
        z: p.z + Math.sin(angle) * offset,
        y: top - length,
        rot: float() * Math.PI * 2,
        sx: range(0.8, 1.4),
        sy: length,
        sz: range(0.8, 1.4),
      });
    }
  }
  root.add(instanceVegetation({
    geometry: vineGeometry,
    material: vineMaterial,
    placements: vinePlacements,
    name: 'rainforest-vines',
    castShadow: false,
  }));

  // --- Atmosphere: spores, mist, fireflies, leaf drift, birds, shafts -------
  const spores = createParticleField({
    count: scaleForTier(tier, 'particleScale', 380),
    kind: 'spore',
    area: [150, 30, 150],
    origin: [0, 10, 0],
    size: 5.5,
    color: '#e9f2b8',
    opacity: 0.12,
    fall: 0.5,
    glow: 0.4,
    float,
    track,
    name: 'rainforest-spores',
  });
  mesh(spores.points);

  const groundMist = createParticleField({
    count: scaleForTier(tier, 'particleScale', 240),
    kind: 'mist',
    area: [150, 14, 150],
    origin: [0, 3, 0],
    size: 30,
    color: '#dce9dc',
    opacity: 0.06,
    fall: 0.35,
    float,
    track,
    name: 'rainforest-ground-mist',
  });
  mesh(groundMist.points);

  const leafDrift = createParticleField({
    count: scaleForTier(tier, 'particleScale', 160),
    kind: 'dust',
    area: [140, 20, 140],
    origin: [0, 8, 0],
    size: 7,
    color: '#6d5a35',
    opacity: 0.02,
    fall: 1.6,
    float,
    track,
    name: 'rainforest-leaf-drift',
  });
  mesh(leafDrift.points);

  const fireflies = createParticleField({
    count: scaleForTier(tier, 'particleScale', 70),
    kind: 'firefly',
    area: [70, 6, 70],
    origin: [0, 2.6, 0],
    size: 7,
    color: '#dff29a',
    opacity: 0.4,
    fall: 0.2,
    glow: 0.85,
    additive: true,
    float,
    track,
    name: 'rainforest-fireflies',
  });
  fireflies.points.visible = false;
  mesh(fireflies.points);

  const fallCore = createParticleField({
    count: scaleForTier(tier, 'particleScale', 150),
    kind: 'mist',
    area: [12, 12, 12],
    origin: [WATERFALL_X, POOL_WATER_Y + 3.5, WATERFALL_Z],
    size: 16,
    color: '#eaf4ec',
    opacity: 0.18,
    fall: 1.3,
    float,
    track,
    name: 'rainforest-fall-core',
  });
  mesh(fallCore.points);

  const fallVeil = createParticleField({
    count: scaleForTier(tier, 'particleScale', 150),
    kind: 'mist',
    area: [34, 20, 34],
    origin: [WATERFALL_X, POOL_WATER_Y + 7, WATERFALL_Z],
    size: 30,
    color: '#e2eee6',
    opacity: 0.09,
    fall: 0.5,
    float,
    track,
    name: 'rainforest-fall-veil',
  });
  mesh(fallVeil.points);

  // Pre-built even when the first variant is stormy: setVariant may switch
  // back to mist later and must never rebuild geometry. Visibility follows
  // features.birds > 0.2.
  const birdPresence = clamp(row?.features?.birds ?? 0, 0, 1);
  const flock = createFlock({
    count: Math.max(2, Math.round(budget.birdCount * Math.max(0.4, birdPresence))),
    radius: [44, 96],
    height: [24, 44],
    color: '#232b26',
    speed: 0.045,
    float,
    track,
    name: 'rainforest-birds',
  });
  flock.mesh.visible = birdPresence > 0.2;
  root.add(flock.mesh);

  const cloudBank = createCloudBank({
    float,
    count: Math.max(1, Math.round(budget.cloudPuffs)),
    radius: [scatterRadius * 0.6, scatterRadius * 0.75],
    height: [34, 62],
    scale: [8, 18],
    color: '#cfe0d4',
    opacity: 0.6,
    track,
    name: 'rainforest-cloud-bank',
  });
  root.add(cloudBank.mesh);

  const shafts = createLightShafts({
    float,
    count: 7,
    ring: [17, 30],
    origin: [0, 8.5, 0],
    color: '#ffe7b3',
    opacity: 0.05,
    width: [1.2, 3],
    length: [10, 18],
    track,
    name: 'rainforest-shafts',
  });
  root.add(shafts.group);
  const shaftMaterial = shafts.group.children[0]?.material ?? null;

  mesh(root);

  // --- Variant response -----------------------------------------------------
  const variantFeatures = { ...(row?.features ?? {}) };
  let waterGlow = 0;
  let chop = 0.06;
  let shaftScale = 1;

  function applyWaterSky(visuals = row?.visuals ?? {}) {
    const elevation = Number.isFinite(visuals.sunElevation) ? visuals.sunElevation : 0.5;
    const azimuth = Number.isFinite(visuals.sunAzimuth) ? visuals.sunAzimuth : 0.4;
    const ce = Math.cos(elevation);
    pool.setSky({
      skyColor: visuals.skyColor,
      horizonColor: visuals.horizonGlowColor ?? visuals.fogColor,
      sunColor: visuals.sunColor,
      sunDir: [ce * Math.cos(azimuth), Math.max(0.05, Math.sin(elevation)), ce * Math.sin(azimuth)],
      sunIntensity: visuals.sunIntensity,
    });
  }

  // Far silhouettes and the fall are fog-exempt so they survive the dense
  // rainforest haze; their color therefore tracks the preset's fog color
  // directly, standing in for atmospheric perspective.
  function applyAtmosphereTint(visuals = row?.visuals ?? {}) {
    const fog = visuals.fogColor ?? '#7fa083';
    massifMaterial.color.set(fog).multiplyScalar(0.56);
    distantMaterial.color.set(fog).multiplyScalar(0.74);
    waterfallMaterial.uniforms.uColor.value.set(fog).lerp(FALL_WHITE, 0.55);
    waterfallMaterial.uniforms.uFoam.value.set(fog).lerp(FALL_WHITE, 0.9);
    fallCore.uniforms.uColor.value.set(fog).lerp(FALL_WHITE, 0.5);
    fallVeil.uniforms.uColor.value.set(fog).lerp(FALL_WHITE, 0.3);
    applyWaterSky(visuals);
  }

  function applyVariant() {
    const mist = variantFeatures.mist ?? 0.3;
    const sporesLevel = variantFeatures.spores ?? 0.2;
    const rain = clamp(variantFeatures.rainParticles ?? 0, 0, 1);
    const leafFall = variantFeatures.leafFall ?? 0;
    const fireflyLevel = variantFeatures.fireflies ?? 0;
    const cloudDeck = clamp(variantFeatures.cloudDeck ?? 0.3, 0, 1);

    waterGlow = variantFeatures.waterGlow ? 0.5 : 0;
    chop = variantId === 'thunderstorm' ? 0.8 : variantId === 'afternoon' ? 0.3 : 0.06;
    pool.uniforms.uChop.value = chop;
    pool.uniforms.uGlow.value = waterGlow;
    pool.uniforms.uWaveHeight.value = clamp(0.1 + chop * 0.4, 0.1, 0.55);

    spores.setOpacity(0.02 + sporesLevel * 0.16);
    groundMist.setOpacity(0.02 + mist * 0.06 + rain * 0.02);
    leafDrift.setOpacity(0.008 + leafFall * 0.06);
    fallCore.setOpacity(0.08 + Math.max(mist, rain) * 0.16);
    fallVeil.setOpacity(0.04 + Math.max(mist, rain) * 0.11);
    waterfallMaterial.uniforms.uOpacity.value = 0.42 + Math.max(mist, rain) * 0.2;

    fireflies.points.visible = fireflyLevel > 0.05;
    fireflies.setOpacity(0.15 + fireflyLevel * 0.65);
    flock.mesh.visible = (variantFeatures.birds ?? 0) > 0.2;

    cloudBank.mesh.visible = cloudDeck > 0.05;
    cloudBank.mesh.material.opacity = 0.25 + cloudDeck * 0.45;

    shaftScale = variantId === 'thunderstorm' ? 0 : 0.3 + mist * 0.7;
    shafts.group.visible = shaftScale > 0.01;
  }

  applyVariant();
  applyAtmosphereTint(row?.visuals);

  function update(time, dt, state = {}) {
    pool.update(time, dt, state);
    spores.update(time, dt, state);
    groundMist.update(time, dt, state);
    leafDrift.update(time, dt, state);
    fireflies.update(time, dt, state);
    fallCore.update(time, dt, state);
    fallVeil.update(time, dt, state);
    flock.update(time, dt, state);
    cloudBank.update(time, dt, state);
    shafts.update(time);
    if (shaftMaterial) shaftMaterial.opacity *= shaftScale;
    waterfallMaterial.uniforms.uTime.value = time;
    waterfallMaterial.uniforms.uFlow.value = 0.85 + clamp(state.rain ?? 0, 0, 1) * 0.55;
  }

  function setVariant(next) {
    const features = next?.features ?? {};
    Object.assign(variantFeatures, features);
    variantId = next?.variantId ?? variantId;
    applyVariant();
    applyAtmosphereTint(next?.visuals);
  }

  // --- Wet-world hooks and readouts -----------------------------------------
  const puddleSpots = [
    { id: 'rainforest-puddle-east', x: 15.1, z: 1.6, w: 2.4, d: 1.5 },
    { id: 'rainforest-puddle-west', x: -15.3, z: -3.2, w: 2.0, d: 1.4 },
    { id: 'rainforest-puddle-south', x: -8.5, z: 14.4, w: 2.6, d: 1.6 },
    { id: 'rainforest-puddle-south-east', x: 9.0, z: 14.2, w: 2.2, d: 1.3 },
    { id: 'rainforest-puddle-north', x: -3.0, z: -15.0, w: 2.0, d: 1.2 },
    { id: 'rainforest-puddle-north-west', x: 4.5, z: -15.3, w: 1.8, d: 1.2 },
  ];
  const puddleAnchors = puddleSpots.map((p) => ({ ...p, kind: 'puddle', y: heightAt(p.x, p.z) + 0.06 }));
  const dripAnchors = [];
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 + 0.4;
    const radius = range(16.5, 22);
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    dripAnchors.push({ id: `rainforest-drip-${i}`, kind: 'drip', x, z, y: heightAt(x, z) + range(9, 13) });
  }

  const triangles =
    trianglesOf(giantGeometry, giantPlacements.length) +
    trianglesOf(canopyGeometry, canopyPlacements.length) +
    trianglesOf(shrubGeometry, shrubPlacements.length) +
    trianglesOf(fernGeometry, fernPlacements.length) +
    trianglesOf(grassGeometry, grassPlacements.length) +
    trianglesOf(mossGeometry, mossPlacements.length) +
    trianglesOf(vineGeometry, vinePlacements.length) +
    trianglesOf(rockGeometry, boulderPlacements.length) +
    trianglesOf(farRockGeometry, massifPlacements.length + cliffPlacements.length) +
    trianglesOf(terrain.geometry) +
    trianglesOf(pool.geometry) +
    trianglesOf(waterfall.children[0]?.geometry) +
    trianglesOf(waterfall.children[1]?.geometry);

  return {
    update,
    setVariant,
    dispose() { kit.disposeAll(); },
    environment: {
      materialFamilies: [
        { key: 'rainforest-terrain', material: terrain.material, sheltered: false, dry: Object.freeze({ color: terrain.material.color.getHex(), roughness: 0.93, metalness: 0.02 }) },
        { key: 'rainforest-rock', material: rockMaterial, sheltered: false, dry: Object.freeze({ color: rockMaterial.color.getHex(), roughness: 0.96, metalness: 0.02 }) },
        { key: 'rainforest-bark', material: giantMaterial, sheltered: false, dry: Object.freeze({ color: giantMaterial.color.getHex(), roughness: 0.9, metalness: 0 }) },
      ],
      zones: [],
      emitterAnchors: [...puddleAnchors, ...dripAnchors],
    },
    counts: {
      emergentTrees: giantPlacements.length,
      canopyTrees: canopyPlacements.length,
      shrubs: shrubPlacements.length,
      ferns: fernPlacements.length,
      grass: grassPlacements.length,
      moss: mossPlacements.length,
      vines: vinePlacements.length,
      boulders: boulderPlacements.length,
      massifRocks: massifPlacements.length,
      distantCliffs: cliffPlacements.length,
      waterfallSheets: waterfall.children.length,
      pool: 1,
      birds: flock.mesh.count,
      particles: spores.points.geometry.attributes.aSeed.count
        + groundMist.points.geometry.attributes.aSeed.count
        + leafDrift.points.geometry.attributes.aSeed.count
        + fireflies.points.geometry.attributes.aSeed.count
        + fallCore.points.geometry.attributes.aSeed.count
        + fallVeil.points.geometry.attributes.aSeed.count,
      triangles,
    },
  };
}
