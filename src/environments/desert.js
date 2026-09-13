/**
 * Desert Oasis — monumental geology for the Theater.
 *
 * The Orpheum rests on the floor of a shallow canyon: wind-scoured sand at
 * y≈-1.05 inside the theater footprint, rising through rippled dunes and
 * rounded sandstone benches to layered mesas 55-130 units out, while a
 * palm-lined spring pool glints from the canyon's screen-left shoulder.
 * Sparse dry grass, shrubs and a few saguaro forms keep the dunes alive
 * without crowding the route; dust motes, a sand sheet, horizon haze and
 * night fireflies carry the variant identities.
 *
 * Spatial layers (per the campaign brief):
 *   NEAR  — canyon floor gravel, scattered stones, the theater apron
 *   MID   — rippled dunes, rock benches, desert scrub, oasis palms
 *   FAR   — layered mesas, horizon haze, birds, dust
 *
 * Everything is generated deterministically from the environment seed and
 * scaled by the environment quality tier. No collision (actors stay on the
 * theater floor); no shared scene, Theater resource or light is touched.
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { fbm, clamp, smoothstep, createTerrain } from './lib/terrain.js';
import { scatter } from './lib/scatter.js';
import { createRockGeometry, createRockField, createMesaGeometry } from './lib/rocks.js';
import { createPalmGeometry, createGrassTuftGeometry, instanceVegetation } from './lib/vegetation.js';
import { createWater } from './lib/water.js';
import { createParticleField, createFlock } from './lib/particles.js';
import { scaleForTier, budgetForEnvironmentTier } from './quality.js';

// The canyon floor stays below the theater slab (floor y=0) everywhere inside
// the authored rectangle; FLOOR_Y plus the floor noise stays under y=-0.6.
const FLOOR_Y = -1.05;
const WATER_Y = -2.0;
const CANYON_HALF_X = 14.5;
const CANYON_MIN_Z = -17;
const CANYON_MAX_Z = 13.5;
const OASIS = Object.freeze({ x: -21, z: 15.5, radius: 5.4 });

/** Rounded-rectangle SDF: negative inside the canyon floor, positive outside. */
function canyonDistance(x, z) {
  const dx = Math.abs(x) - CANYON_HALF_X;
  const dz = Math.max(CANYON_MIN_Z - z, z - CANYON_MAX_Z);
  const outside = Math.hypot(Math.max(dx, 0), Math.max(dz, 0));
  const inside = Math.min(0, Math.max(dx, dz));
  return outside + inside;
}

/** Per-vertex paint for hand-merged primitive parts (cactus). */
function paintGeometry(geometry, colorHex, jitter = 0.12) {
  const color = new THREE.Color(colorHex);
  const position = geometry.attributes.position;
  const colors = new Float32Array(position.count * 3);
  for (let i = 0; i < position.count; i++) {
    const n = (Math.sin(position.getX(i) * 9.1 + position.getZ(i) * 5.7 + position.getY(i) * 3.1) + 1) * 0.5;
    const k = 1 + (n - 0.5) * jitter * 2;
    colors[i * 3] = Math.min(1, color.r * k);
    colors[i * 3 + 1] = Math.min(1, color.g * k);
    colors[i * 3 + 2] = Math.min(1, color.b * k);
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geometry;
}

/** Saguaro-like column: trunk, two elbows, a small bloom. Merged once. */
function createCactusGeometry() {
  const parts = [];
  const trunk = paintGeometry(new THREE.CylinderGeometry(0.2, 0.3, 2.4, 8, 3), '#5d7a4c');
  trunk.translate(0, 1.2, 0);
  parts.push(trunk);
  const armDefs = [
    { side: -1, y: 1.05, rise: 0.95 },
    { side: 1, y: 1.42, rise: 0.78 },
  ];
  for (const arm of armDefs) {
    const elbow = paintGeometry(new THREE.CylinderGeometry(0.12, 0.145, 0.62, 7, 1), '#577446');
    elbow.rotateZ(arm.side * Math.PI / 2);
    elbow.translate(arm.side * 0.4, arm.y, 0);
    parts.push(elbow);
    const forearm = paintGeometry(new THREE.CylinderGeometry(0.11, 0.13, arm.rise, 7, 1), '#618150');
    forearm.translate(arm.side * 0.71, arm.y + arm.rise / 2, 0);
    parts.push(forearm);
  }
  const bloom = paintGeometry(new THREE.ConeGeometry(0.09, 0.16, 6), '#c96a5a', 0.2);
  bloom.translate(0, 2.48, 0);
  parts.push(bloom);
  const merged = mergeGeometries(parts, false);
  for (const part of parts) part.dispose();
  merged.computeVertexNormals();
  return merged;
}

export function buildDesert({ kit, row, variantId = 'golden', tier = 'high', quality }) {
  const { float, range, mesh, track } = kit;
  const budget = quality ?? budgetForEnvironmentTier(tier);
  const root = new THREE.Group();
  root.name = 'desert-world';

  // --- Terrain: canyon floor, rippled dunes, benches, the oasis bowl ------
  function heightAt(x, z) {
    const d = canyonDistance(x, z);
    const rise = smoothstep(0, 28, d);

    // Canyon floor: wind-scoured sand and gravel. The noise stays inside
    // ±0.11 of FLOOR_Y so the whole rectangle remains below y=-0.6.
    const floorGrain = (fbm(x, z, { octaves: 3, frequency: 0.16, seed: 71 }) - 0.5) * 0.22;
    let h = FLOOR_Y + floorGrain;

    // Dunes: broad fbm swell at two scales, amplitude growing outward.
    const duneField = fbm(x, z, { octaves: 5, frequency: 0.017, seed: 11 });
    const duneScale = fbm(x, z, { octaves: 3, frequency: 0.006, seed: 23 });
    const dune = (4.2 + 13 * smoothstep(8, 95, d)) * duneField * (0.35 + duneScale * 0.9);
    h += rise * dune;

    // Wind ripples crossing the dune faces (fixed build-time wind axis).
    const ripple = Math.sin((x * 0.94 - z * 0.34) * 0.5 + duneField * 9.0);
    h += rise * ripple * 0.16 * smoothstep(0, 11, d);

    // Sandstone benches: broad rounded shelves ringing the canyon.
    const shelfNoise = fbm(x, z, { octaves: 3, frequency: 0.05, seed: 47 });
    const shelf = smoothstep(0.45, 0.58, shelfNoise) * smoothstep(13, 30, d) * (1 - smoothstep(58, 100, d));
    h += shelf * 2.6;

    // Oasis basin: a spring-fed bowl below the waterline. Blending only ever
    // lowers the terrain, so the canyon-floor guarantee is preserved.
    const od = Math.hypot(x - OASIS.x, z - OASIS.z);
    const basin = smoothstep(OASIS.radius + 2.6, OASIS.radius - 1.2, od);
    if (basin > 0) {
      const bed = WATER_Y - 0.75 - fbm(x, z, { octaves: 3, frequency: 0.22, seed: 53 }) * 0.55;
      h = h * (1 - basin) + bed * basin;
    }
    return h;
  }

  const sandBase = new THREE.Color('#cba671');
  const sandPale = new THREE.Color('#e4c691');
  const sandShadow = new THREE.Color('#a87f52');
  const gravel = new THREE.Color('#9b7c5c');
  const sandstone = new THREE.Color('#a86b42');
  const dampEarth = new THREE.Color('#75603f');
  const sedge = new THREE.Color('#6f7a43');
  const colorScratch = new THREE.Color();

  const terrain = createTerrain({
    size: budget.terrainSize,
    segments: budget.terrainSegments,
    height: heightAt,
    colorAt: ({ x, z, h, slope }) => {
      const d = canyonDistance(x, z);
      const rise = smoothstep(0, 28, d);
      const grain = fbm(x, z, { octaves: 3, frequency: 0.085, seed: 91 });
      const duneField = fbm(x, z, { octaves: 5, frequency: 0.017, seed: 11 });
      // Base sand with wind-ripple tonal variation.
      colorScratch.copy(sandBase);
      colorScratch.lerp(sandShadow, grain * 0.5);
      // Dune crests catch the low sun.
      colorScratch.lerp(sandPale, smoothstep(0.56, 0.86, duneField) * rise * 0.5);
      // Rocky ground variation band near the theater: gravel and slabs.
      const stony = smoothstep(0.5, 0.78, fbm(x, z, { octaves: 3, frequency: 0.34, seed: 113 }));
      colorScratch.lerp(gravel, stony * (1 - rise * 0.75) * 0.8);
      // Exposed sandstone on steep dune faces and shelf lips.
      colorScratch.lerp(sandstone, smoothstep(0.45, 1.1, slope) * 0.8);
      // Damp earth and sedge fringe around the oasis.
      const od = Math.hypot(x - OASIS.x, z - OASIS.z);
      const fringe = smoothstep(OASIS.radius + 3.0, OASIS.radius - 0.4, od);
      if (fringe > 0.02) {
        colorScratch.lerp(dampEarth, fringe * smoothstep(WATER_Y + 1.4, WATER_Y + 0.2, h) * 0.85);
        colorScratch.lerp(sedge, fringe * smoothstep(0.1, 0.5, fbm(x, z, { octaves: 3, frequency: 0.2, seed: 137 })) * 0.5);
      }
      return colorScratch;
    },
    y: 0,
    roughness: 0.97,
    metalness: 0.0,
  });
  root.add(terrain.mesh);
  track(terrain);

  // --- Oasis pool ----------------------------------------------------------
  // The water mesh is authored at the origin then translated; the baked
  // terrain heights come from a world-space wrapper so the shoreline follows
  // the real basin and every fragment outside it is discarded.
  const oasisHeight = (x, z) => heightAt(x + OASIS.x, z + OASIS.z);
  const water = createWater({
    size: 30,
    segments: Math.max(24, Math.round(budget.waterSegments * 0.45)),
    waterY: WATER_Y,
    terrainHeight: oasisHeight,
    shoreRange: 1.1,
    waveHeight: 0.1,
    chop: 0.04,
    deepColor: '#12454d',
    shallowColor: '#5aa79b',
    opacity: 0.88,
    name: 'desert-oasis-water',
  });
  water.mesh.position.set(OASIS.x, WATER_Y, OASIS.z);
  water.mesh.updateMatrix();
  root.add(water.mesh);
  track(water);

  // --- Hero mesas: layered silhouettes on the far and side horizons --------
  const mesaMaterial = kit.track(new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.97, metalness: 0.02, flatShading: true,
  }));
  const mesaDefs = [
    { angle: 2.42, radius: 54, height: 46, baseRadius: 16, topRadius: 8.5, tiers: 6, color: '#a3653c', bandColor: '#b97b4b', capColor: '#c09064' },
    { angle: 3.15, radius: 66, height: 54, baseRadius: 19, topRadius: 9.5, tiers: 7, color: '#9c5f3a', bandColor: '#b1744a', capColor: '#c08a5c' },
    { angle: 3.95, radius: 40, height: 38, baseRadius: 13, topRadius: 7, tiers: 5, color: '#a86e42', bandColor: '#bd8450', capColor: '#c99a6a' },
    { angle: 4.75, radius: 74, height: 56, baseRadius: 21, topRadius: 10.5, tiers: 7, color: '#95603c', bandColor: '#a96f47', capColor: '#bd8a5c' },
    { angle: 5.6, radius: 58, height: 44, baseRadius: 16, topRadius: 8.5, tiers: 6, color: '#a3653c', bandColor: '#b97b4b', capColor: '#c09064' },
  ];
  const mesas = new THREE.Group();
  mesas.name = 'desert-mesas';
  for (const def of mesaDefs) {
    // Keep the drum base on the budgeted terrain plane at every tier.
    const radius = Math.min(def.radius, budget.terrainSize * 0.4);
    const x = Math.cos(def.angle) * radius;
    const z = Math.sin(def.angle) * radius;
    const geometry = createMesaGeometry({ float, ...def });
    track(geometry);
    const mesa = new THREE.Mesh(geometry, mesaMaterial);
    // Sink the base a little so the drum seats into the dune even on a slope.
    mesa.position.set(x, heightAt(x, z) - def.height * 0.04 - 0.8, z);
    mesa.rotation.y = float() * Math.PI * 2;
    mesa.receiveShadow = true;
    mesas.add(mesa);
  }
  root.add(mesas);

  // --- Rock families: near stones, benches, standing spires ----------------
  const stoneMaterial = kit.track(new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.95, metalness: 0.02, flatShading: true,
  }));

  const nearStoneGeometry = createRockGeometry({ float, detail: 0, jaggedness: 0.5, color: '#a9865f', squash: [1.25, 0.5, 1.15] });
  track(nearStoneGeometry);
  const nearStonePlacements = scatter({
    count: scaleForTier(tier, 'rockScale', 120),
    minRadius: 12.8,
    maxRadius: 34,
    float,
    heightAt,
    accept: ({ x, z, h }) => {
      if (h <= WATER_Y + 0.4) return false;
      // Keep the theater slab and the oasis clear.
      if (Math.abs(x) < 15.4 && z > -13.2 && z < 13.1) return false;
      if (Math.hypot(x - OASIS.x, z - OASIS.z) < 9.5) return false;
      return true;
    },
    minSpacing: 1.1,
  }).map((p) => ({
    ...p,
    y: p.h - 0.1,
    rot: float() * Math.PI * 2,
    scale: range(0.24, 0.78),
    scaleY: range(0.16, 0.5),
  }));
  const nearStoneField = createRockField({ kit, geometry: nearStoneGeometry, placements: nearStonePlacements, material: stoneMaterial, name: 'desert-stones' });
  root.add(nearStoneField);

  const benchGeometry = createRockGeometry({ float, detail: 1, jaggedness: 0.38, color: '#ab7044', squash: [1.7, 0.5, 1.35] });
  track(benchGeometry);
  const benchPlacements = scatter({
    count: scaleForTier(tier, 'rockScale', 72),
    minRadius: 30,
    maxRadius: 118,
    float,
    heightAt,
    accept: ({ x, z, h }) => h > WATER_Y + 0.5 && Math.hypot(x - OASIS.x, z - OASIS.z) > 10,
    minSpacing: 2.4,
  }).map((p) => ({
    ...p,
    y: p.h - 0.4,
    rot: float() * Math.PI * 2,
    rx: (float() - 0.5) * 0.18,
    rz: (float() - 0.5) * 0.18,
    scale: range(1.1, 3.4),
    scaleY: range(0.5, 1.1),
  }));
  const benchField = createRockField({ kit, geometry: benchGeometry, placements: benchPlacements, material: stoneMaterial, name: 'desert-benches' });
  root.add(benchField);

  const spireGeometry = createRockGeometry({ float, detail: 1, jaggedness: 0.44, color: '#9d6840', squash: [0.75, 1.5, 0.85] });
  track(spireGeometry);
  const spirePlacements = scatter({
    count: scaleForTier(tier, 'rockScale', 22),
    minRadius: 26,
    maxRadius: 72,
    float,
    heightAt,
    accept: ({ x, z, h }) => h > WATER_Y + 0.5 && Math.hypot(x - OASIS.x, z - OASIS.z) > 10,
    minSpacing: 3.4,
  }).map((p) => ({
    ...p,
    y: p.h - 0.35,
    rot: float() * Math.PI * 2,
    rx: (float() - 0.5) * 0.14,
    rz: (float() - 0.5) * 0.14,
    scale: range(1.1, 2.5),
    scaleY: range(0.9, 1.8),
  }));
  const spireField = createRockField({ kit, geometry: spireGeometry, placements: spirePlacements, material: stoneMaterial, name: 'desert-spires' });
  root.add(spireField);

  // --- Vegetation: palms at the spring, dry scrub on the dunes -------------
  const palmGeometry = createPalmGeometry({ height: 7.2, color: '#55703c', trunkColor: '#7a6242', rng: float });
  track(palmGeometry);
  const palmMaterial = kit.wind(new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.9, metalness: 0, side: THREE.DoubleSide,
  }), { height: 7.4, strength: 0.22 });
  const palmPlacements = scatter({
    count: scaleForTier(tier, 'vegetationScale', 11),
    minRadius: 3.2,
    maxRadius: 8.2,
    float,
    heightAt: oasisHeight,
    accept: ({ h }) => h > WATER_Y - 0.05 && h < WATER_Y + 3.0,
    minSpacing: 1.7,
  }).map((p) => ({
    x: p.x + OASIS.x,
    z: p.z + OASIS.z,
    y: p.h - 0.06,
    rot: float() * Math.PI * 2,
    scale: range(0.7, 1.15),
  }));
  const palmField = instanceVegetation({ geometry: palmGeometry, material: palmMaterial, placements: palmPlacements, name: 'desert-palms' });
  root.add(palmField);

  const dryGrassGeometry = createGrassTuftGeometry({ blades: 6, height: 0.6, width: 0.05, rng: float, tipColor: '#d8b76a', baseColor: '#8a7a45' });
  track(dryGrassGeometry);
  const dryGrassMaterial = kit.wind(new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.92, metalness: 0, side: THREE.DoubleSide,
  }), { height: 0.65, strength: 0.2 });
  const dryGrassPlacements = scatter({
    count: scaleForTier(tier, 'grassScale', 1500),
    minRadius: 15.8,
    maxRadius: 100,
    float,
    heightAt,
    accept: ({ x, z, h }) => h > WATER_Y + 0.4 && Math.hypot(x - OASIS.x, z - OASIS.z) > 7.5,
    minSpacing: 0.8,
  }).map((p) => ({ ...p, y: p.h, rot: float() * Math.PI * 2, scale: range(0.7, 1.5) }));
  const dryGrassField = instanceVegetation({ geometry: dryGrassGeometry, material: dryGrassMaterial, placements: dryGrassPlacements, name: 'desert-grass' });
  root.add(dryGrassField);

  const sedgeGeometry = createGrassTuftGeometry({ blades: 8, height: 0.85, width: 0.06, rng: float, tipColor: '#9aa25a', baseColor: '#4c6234' });
  track(sedgeGeometry);
  const sedgeMaterial = kit.wind(new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.92, metalness: 0, side: THREE.DoubleSide,
  }), { height: 0.9, strength: 0.16 });
  const sedgePlacements = scatter({
    count: scaleForTier(tier, 'grassScale', 260),
    minRadius: 3.0,
    maxRadius: 9.5,
    float,
    heightAt: oasisHeight,
    accept: ({ h }) => h > WATER_Y + 0.15 && h < WATER_Y + 2.6,
    minSpacing: 0.5,
  }).map((p) => ({
    x: p.x + OASIS.x,
    z: p.z + OASIS.z,
    y: p.h,
    rot: float() * Math.PI * 2,
    scale: range(0.7, 1.4),
  }));
  const sedgeField = instanceVegetation({ geometry: sedgeGeometry, material: sedgeMaterial, placements: sedgePlacements, name: 'desert-sedge' });
  root.add(sedgeField);

  const shrubGeometry = createGrassTuftGeometry({ blades: 9, height: 0.95, width: 0.09, rng: float, tipColor: '#b7a05b', baseColor: '#6d6b3d' });
  track(shrubGeometry);
  const shrubMaterial = kit.wind(new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.93, metalness: 0, side: THREE.DoubleSide,
  }), { height: 1, strength: 0.24 });
  const shrubPlacements = scatter({
    count: scaleForTier(tier, 'grassScale', 240),
    minRadius: 16.5,
    maxRadius: 75,
    float,
    heightAt,
    accept: ({ x, z, h }) => h > WATER_Y + 0.5 && Math.hypot(x - OASIS.x, z - OASIS.z) > 8,
    minSpacing: 3.2,
  }).map((p) => ({ ...p, y: p.h, rot: float() * Math.PI * 2, scale: range(0.8, 1.7) }));
  const shrubField = instanceVegetation({ geometry: shrubGeometry, material: shrubMaterial, placements: shrubPlacements, name: 'desert-shrubs' });
  root.add(shrubField);

  const cactusGeometry = createCactusGeometry();
  track(cactusGeometry);
  const cactusMaterial = kit.track(new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.88, metalness: 0,
  }));
  const cactusPlacements = scatter({
    count: scaleForTier(tier, 'vegetationScale', 9),
    minRadius: 18,
    maxRadius: 62,
    float,
    heightAt,
    accept: ({ x, z, h }) => h > WATER_Y + 0.6 && Math.hypot(x - OASIS.x, z - OASIS.z) > 9,
    minSpacing: 4.5,
  }).map((p) => ({ ...p, y: p.h - 0.04, rot: float() * Math.PI * 2, scale: range(0.75, 1.25) }));
  const cactusField = instanceVegetation({ geometry: cactusGeometry, material: cactusMaterial, placements: cactusPlacements, name: 'desert-cacti' });
  root.add(cactusField);

  // --- Atmosphere details: dust, sand sheets, haze, fireflies, birds -------
  const dust = createParticleField({
    count: scaleForTier(tier, 'particleScale', 260),
    kind: 'dust',
    area: [budget.terrainSize * 0.55, 7, budget.terrainSize * 0.55],
    origin: [0, 3.4, 0],
    size: 5,
    color: '#e6c48f',
    opacity: 0.2,
    fall: 0.4,
    float,
    track,
    name: 'desert-dust',
  });
  root.add(dust.points);

  const sand = createParticleField({
    count: scaleForTier(tier, 'particleScale', 380),
    kind: 'dust',
    area: [budget.terrainSize * 0.8, 5, budget.terrainSize * 0.8],
    origin: [0, 2.0, 0],
    size: 10,
    color: '#d9a86a',
    opacity: 0,
    fall: 1.4,
    float,
    track,
    name: 'desert-sand-sheet',
  });
  sand.points.visible = false;
  root.add(sand.points);

  const haze = createParticleField({
    count: scaleForTier(tier, 'particleScale', 120),
    kind: 'mist',
    area: [budget.terrainSize * 0.9, 18, budget.terrainSize * 0.9],
    origin: [0, 6, 0],
    size: 34,
    color: '#e3bd8b',
    opacity: 0.04,
    fall: 0.3,
    float,
    track,
    name: 'desert-haze',
  });
  root.add(haze.points);

  const fireflies = createParticleField({
    count: scaleForTier(tier, 'particleScale', 56),
    kind: 'firefly',
    area: [16, 3, 16],
    origin: [OASIS.x, 0.8, OASIS.z],
    size: 3.2,
    color: '#d8f2a0',
    opacity: 0,
    fall: 0.3,
    glow: 0.9,
    additive: true,
    float,
    track,
    name: 'desert-fireflies',
  });
  fireflies.points.visible = false;
  root.add(fireflies.points);

  const flock = createFlock({
    count: budget.birdCount,
    radius: [55, 112],
    height: [16, 38],
    color: '#2c2620',
    float,
    track,
  });
  root.add(flock.mesh);

  mesh(root);

  // --- Variant response ----------------------------------------------------
  const variantFeatures = { ...(row?.features ?? {}) };

  function applyWaterSky(visuals = row?.visuals ?? {}) {
    const elevation = Number.isFinite(visuals.sunElevation) ? visuals.sunElevation : 0.12;
    const azimuth = Number.isFinite(visuals.sunAzimuth) ? visuals.sunAzimuth : 0.72;
    const ce = Math.cos(elevation);
    water.setSky({
      skyColor: visuals.skyColor,
      horizonColor: visuals.horizonGlowColor ?? visuals.fogColor,
      sunColor: visuals.sunColor,
      sunDir: [ce * Math.cos(azimuth), Math.max(0.05, Math.sin(elevation)), ce * Math.sin(azimuth)],
      sunIntensity: visuals.sunIntensity,
    });
  }

  function applyVariant(next = null) {
    const windStrength = variantFeatures.windStrength ?? 1;
    const dustAmount = variantFeatures.dust ?? 0.3;
    const storm = variantFeatures.sandstorm ?? 0;
    const birds = variantFeatures.birds ?? 0;
    const firefly = variantFeatures.fireflies ?? 0;
    const waterAmount = variantFeatures.water ?? 0.6;

    // Dust motes thicken with the feature flag; the sand sheet only appears
    // in the storm and stays a bounded two-field count.
    dust.setOpacity(clamp(0.08 + dustAmount * 0.32, 0, 0.55));
    dust.uniforms.uFall.value = 0.18 + windStrength * 0.22;
    sand.points.visible = storm > 0.05;
    sand.setOpacity(storm > 0.05 ? clamp(0.12 + storm * 0.32, 0, 0.5) : 0);
    sand.uniforms.uFall.value = 0.7 + windStrength * 1.15;
    haze.setOpacity(clamp(0.02 + storm * 0.16 + dustAmount * 0.03, 0, 0.22));
    haze.uniforms.uFall.value = 0.16 + windStrength * 0.22;

    fireflies.points.visible = firefly > 0.02;
    fireflies.setOpacity(firefly > 0.02 ? clamp(0.24 + firefly, 0, 0.55) : 0);
    flock.mesh.visible = birds > 0.05;

    water.mesh.visible = waterAmount > 0.03;
    water.uniforms.uOpacity.value = clamp(0.45 + waterAmount * 0.5, 0, 0.96) * (storm > 0.5 ? 0.78 : 1);
    water.uniforms.uWaveHeight.value = 0.08 + storm * 0.34;
    water.uniforms.uChop.value = 0.03 + storm * 0.32;

    // Variant palette: warm motes at golden hour, ochre in the storm, cool
    // blue under the stars.
    const variant = next?.variantId ?? variantId;
    dust.uniforms.uColor.value.set(variant === 'sandstorm' ? '#c79a5f' : variant === 'night' ? '#93a9c9' : '#e6c48f');
    haze.uniforms.uColor.value.set(variant === 'sandstorm' ? '#c08a4e' : variant === 'night' ? '#39496b' : '#e3bd8b');
    sand.uniforms.uColor.value.set('#c99a60');
  }

  applyVariant({ variantId });
  applyWaterSky(row?.visuals);

  function setVariant(next) {
    Object.assign(variantFeatures, next?.features ?? {});
    applyVariant(next);
    applyWaterSky(next?.visuals);
  }

  function update(time, dt, state = {}) {
    water.update(time, dt, state);
    dust.update(time, dt, state);
    sand.update(time, dt, state);
    haze.update(time, dt, state);
    fireflies.update(time, dt, state);
    if (flock.mesh.visible) flock.update(time, dt, state);
  }

  return {
    update,
    setVariant,
    dispose() { kit.disposeAll(); },
    environment: {
      materialFamilies: [
        { key: 'desert-sand', material: terrain.material, sheltered: false, dry: Object.freeze({ color: terrain.material.color.getHex(), roughness: 0.97, metalness: 0.0 }) },
        { key: 'desert-sandstone', material: mesaMaterial, sheltered: false, dry: Object.freeze({ color: mesaMaterial.color.getHex(), roughness: 0.97, metalness: 0.02 }) },
        { key: 'desert-stones', material: stoneMaterial, sheltered: false, dry: Object.freeze({ color: stoneMaterial.color.getHex(), roughness: 0.95, metalness: 0.02 }) },
      ],
      zones: [],
      emitterAnchors: [],
    },
    counts: {
      mesas: mesaDefs.length,
      stones: nearStonePlacements.length,
      benches: benchPlacements.length,
      spires: spirePlacements.length,
      palms: palmPlacements.length,
      cacti: cactusPlacements.length,
      grass: dryGrassPlacements.length,
      sedge: sedgePlacements.length,
      shrubs: shrubPlacements.length,
      dust: dust.points.geometry.attributes.aSeed.count,
      sand: sand.points.geometry.attributes.aSeed.count,
      fireflies: fireflies.points.geometry.attributes.aSeed.count,
      birds: budget.birdCount,
    },
  };
}
