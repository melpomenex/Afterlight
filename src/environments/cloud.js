/**
 * Cloud Garden — the floating-island showcase environment.
 *
 * The Orpheum stands on a grassy plateau on a small island high above an
 * endless cloud sea. Height is the whole point: the plateau top sits at
 * y≈-0.9, the island edge drops away into a jagged dark underside around
 * radius 40–70, and below that a stack of shader cloud layers (y -30 … -80)
 * reaches every horizon. Distant floating islands and cloud banks stage the
 * depth; a waterfall pours off the far rim into the mist; wind, grass,
 * flowers, pollen and a bird flock keep the air moving.
 *
 * Spatial layers (per the campaign brief):
 *   NEAR  — theater plateau, grass, flowers, trees, rim rocks
 *   MID   — the island edge and its dark rock underside, waterfall
 *   FAR   — floating islands, cloud banks, the cloud sea, birds
 *
 * Everything is generated deterministically from the environment seed and
 * scaled by the environment quality tier. No collision (actors stay inside
 * the Theater bounds); no shared scene or Theater resource is touched.
 */

import * as THREE from 'three';
import { fbm, clamp, smoothstep, createTerrain } from './lib/terrain.js';
import { scatter } from './lib/scatter.js';
import { createRockGeometry, createRockField, createFloatingIslandGeometry } from './lib/rocks.js';
import { createGrassTuftGeometry, createFlowerGeometry, createBroadleafGeometry, instanceVegetation } from './lib/vegetation.js';
import { createParticleField, createFlock } from './lib/particles.js';
import { createCloudSea, createCloudBank } from './lib/skyFx.js';
import { scaleForTier, budgetForEnvironmentTier } from './quality.js';
import { createCloudSurfaceTextures } from './lib/cloudMaterials.js';

const PLATEAU_Y = -0.92;
const RIM_Y = -6.5;
const VOID_Y = -132;
const ISLAND_RADIUS = 28;
// The theater (~27×23 shell) must never be undercut by terrain: the plateau
// stays at/below y=-0.6 everywhere inside this rectangle.
const THEATER_RECT = Object.freeze({ minX: -14.5, maxX: 14.5, minZ: -17.0, maxZ: 13.5 });
const WATERFALL_ANGLE = 0.68;

function rectDistance(x, z) {
  const dx = Math.max(0, THEATER_RECT.minX - x, x - THEATER_RECT.maxX);
  const dz = Math.max(0, THEATER_RECT.minZ - z, z - THEATER_RECT.maxZ);
  return Math.hypot(dx, dz);
}

/** Jagged, angle-varying island rim radius (roughly 22–32 units). */
function islandEdgeAt(x, z) {
  const a = Math.atan2(z, x);
  const course = fbm(Math.cos(a) * 3.4, Math.sin(a) * 3.4, { octaves: 4, frequency: 1, seed: 911 });
  const fine = fbm(x, z, { octaves: 2, frequency: 0.09, seed: 917 });
  // NW corner (behind theater, z < -10): pull in to ~22.5 to clear the sky and cloud horizon
  const nwMask = smoothstep(-1.0, -2.2, a) * smoothstep(-3.14, -2.2, a);
  // SE corner (waterfall notch around angle 0.68): pull in to ~22.5
  const seMask = Math.exp(-Math.pow(a - 0.68, 2) / 0.25);
  const baseRadius = ISLAND_RADIUS - nwMask * 4.2 - seMask * 4.5;
  return baseRadius + (course - 0.5) * 5.0 + (fine - 0.5) * 2.0;
}

/** Plateau → grass shelf → cliff → void, with the rim noise folded in. */
function heightAt(x, z) {
  const dRect = rectDistance(x, z);
  const plateauMask = smoothstep(6.5, 0.0, dRect);
  const micro = (fbm(x, z, { octaves: 3, frequency: 0.16, seed: 823 }) - 0.5) * 0.18;
  const roll = (fbm(x, z, { octaves: 4, frequency: 0.05, seed: 827 }) - 0.6) * 0.9;
  const top = PLATEAU_Y + micro * plateauMask + roll * (1 - plateauMask);

  const r = Math.hypot(x, z);
  const edge = islandEdgeAt(x, z);
  const drop = smoothstep(edge - 1.8, edge + 2.2, r);
  const abyss = smoothstep(edge + 0.5, edge + 24.0, r);
  const underside = RIM_Y - (RIM_Y - VOID_Y) * abyss;
  return top * (1 - drop) + underside * drop;
}

const CLOUD_LAYER_PALETTES = Object.freeze({
  sunrise: Object.freeze([
    Object.freeze({ y: -16, color: '#ffdeb8', shadow: '#c88484', opacity: 0.82, scale: 0.009, speed: 0.30, contrast: 0.76 }),
    Object.freeze({ y: -28, color: '#ffd0c4', shadow: '#b2728c', opacity: 0.72, scale: 0.013, speed: 0.42, contrast: 0.70 }),
    Object.freeze({ y: -44, color: '#e8b8da', shadow: '#865a94', opacity: 0.60, scale: 0.018, speed: 0.55, contrast: 0.65 }),
    Object.freeze({ y: -64, color: '#af9fdc', shadow: '#50447a', opacity: 0.48, scale: 0.026, speed: 0.72, contrast: 0.58 }),
  ]),
  day: Object.freeze([
    Object.freeze({ y: -16, color: '#ffffff', shadow: '#b7c8da', opacity: 0.85, scale: 0.008, speed: 0.3, contrast: 0.72 }),
    Object.freeze({ y: -28, color: '#f2f7fd', shadow: '#9db2c9', opacity: 0.75, scale: 0.0125, speed: 0.42, contrast: 0.68 }),
    Object.freeze({ y: -44, color: '#e2ecf7', shadow: '#8399b3', opacity: 0.65, scale: 0.018, speed: 0.56, contrast: 0.62 }),
    Object.freeze({ y: -64, color: '#cfdcec', shadow: '#6b819d', opacity: 0.55, scale: 0.025, speed: 0.74, contrast: 0.58 }),
  ]),
  storm: Object.freeze([
    Object.freeze({ y: -16, color: '#727b8c', shadow: '#20242f', opacity: 0.90, scale: 0.009, speed: 0.72, contrast: 0.84 }),
    Object.freeze({ y: -28, color: '#5b6474', shadow: '#191d27', opacity: 0.86, scale: 0.014, speed: 0.95, contrast: 0.88 }),
    Object.freeze({ y: -44, color: '#474f60', shadow: '#12151d', opacity: 0.82, scale: 0.02, speed: 1.2, contrast: 0.90 }),
    Object.freeze({ y: -64, color: '#343a48', shadow: '#0c0f16', opacity: 0.78, scale: 0.028, speed: 1.5, contrast: 0.92 }),
  ]),
});

const BANK_COLORS = Object.freeze({
  sunrise: Object.freeze({ near: '#f8dfcb', mid: '#f4cbdc', far: '#d8c4ec' }),
  day: Object.freeze({ near: '#ffffff', mid: '#eef5fc', far: '#cdddec' }),
  storm: Object.freeze({ near: '#6d7686', mid: '#515a6a', far: '#3a4250' }),
});

const waterfallVertexShader = /* glsl */ `
#include <fog_pars_vertex>
varying vec2 vUv;
void main() {
  vUv = uv;
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vec4 mvPosition = viewMatrix * worldPosition;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

const waterfallFragmentShader = /* glsl */ `
#include <fog_pars_fragment>
uniform float uTime;
uniform vec3 uColor;
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
  return mix(mix(hash(i), hash(i + vec2(1,0)), u.x), mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x), u.y);
}

void main() {
  // Vertical falling streaks with the noise scrolling downward.
  vec2 p = vec2(vUv.x * 9.0, vUv.y * 5.0 + uTime * 1.6);
  float n = noise(p) * 0.6 + noise(p * 2.3 - uTime * 0.45) * 0.4;
  float side = smoothstep(0.0, 0.22, vUv.x) * smoothstep(1.0, 0.78, vUv.x);
  float body = smoothstep(0.0, 0.12, vUv.y) * smoothstep(1.0, 0.86, vUv.y);
  float alpha = uOpacity * side * body * (0.35 + 0.65 * n);
  float streak = smoothstep(0.55, 0.95, noise(vec2(vUv.x * 26.0, vUv.y * 3.0 + uTime * 2.4)));
  vec3 color = mix(uColor, vec3(1.0), streak * 0.5);
  if (alpha < 0.01) discard;
  gl_FragColor = vec4(color, alpha);
  #include <fog_fragment>
}
`;

function paletteKey(variantId, presetId) {
  const id = `${variantId ?? ''} ${presetId ?? ''}`.toLowerCase();
  if (id.includes('storm')) return 'storm';
  if (id.includes('day')) return 'day';
  return 'sunrise';
}

/** Deterministic double-pulse lightning: a pure function of elapsed time. */
function lightningFlash(time) {
  const a = Math.pow(Math.max(0, Math.sin(time * 0.43 + 1.3)), 36);
  const b = Math.pow(Math.max(0, Math.sin(time * 0.71 + 4.1)), 80);
  return Math.min(1, a * 0.8 + b * 0.9);
}

export function buildCloud({ kit, row, variantId = 'sunrise', tier = 'high', quality }) {
  const { float, range, mesh, track } = kit;
  const budget = quality ?? budgetForEnvironmentTier(tier);
  const root = new THREE.Group();
  root.name = 'cloud-garden-world';
  let currentVariantId = variantId;

  // --- Terrain: grassy plateau, shelves, cliff and dark underside ----------
  const surfaces = createCloudSurfaceTextures(track, budget.terrainSize);
  const colorScratch = new THREE.Color();
  const grassBase = new THREE.Color('#4f7536');
  const grassLush = new THREE.Color('#78a44c');
  const grassPale = new THREE.Color('#a4b868');
  const meadowEarth = new THREE.Color('#6b5a41');
  const rockTop = new THREE.Color('#5e5a52');
  const rockCliff = new THREE.Color('#38363c');
  const voidRock = new THREE.Color('#141822');

  const terrain = createTerrain({
    size: budget.terrainSize,
    segments: budget.terrainSegments,
    height: heightAt,
    colorAt: ({ x, z, h, slope }) => {
      const r = Math.hypot(x, z);
      const edge = islandEdgeAt(x, z);
      const dRect = rectDistance(x, z);
      const meadow = fbm(x, z, { octaves: 4, frequency: 0.085, seed: 977 });
      colorScratch.copy(grassBase);
      colorScratch.lerp(grassLush, clamp(meadow * 1.5 - 0.25, 0, 1));
      const pale = clamp((fbm(x, z, { octaves: 3, frequency: 0.05, seed: 991 }) - 0.52) * 2.4, 0, 1);
      colorScratch.lerp(grassPale, pale * 0.5);
      colorScratch.lerp(rockTop, smoothstep(0.35, 1.35, slope) * 0.8);
      // Exposed earth approaching the rim, then dark cliff rock below it.
      colorScratch.lerp(meadowEarth, smoothstep(edge - 7, edge - 0.5, r) * 0.6);
      const cliff = smoothstep(edge - 0.5, edge + 5, r);
      if (cliff > 0) colorScratch.lerp(rockCliff, cliff * 0.95);
      colorScratch.lerp(voidRock, smoothstep(-36, -120, h));
      const worn = smoothstep(3, 0, dRect);
      if (worn > 0) colorScratch.lerp(meadowEarth, worn * 0.7);
      return colorScratch;
    },
    roughness: 0.96,
    metalness: 0.02,
  });
  terrain.material.map = surfaces.turf;
  terrain.material.bumpMap = surfaces.turf;
  terrain.material.bumpScale = 0.04;
  root.add(terrain.mesh);
  track(terrain);

  // Single dark mass under the island: the jagged rock underside.
  const underIsland = createFloatingIslandGeometry({ float, radius: 27, depth: 24, grassColor: '#5f8a49', rockColor: '#332f2c' });
  underIsland.top.dispose();
  track(underIsland.rock);
  const undersideMaterial = kit.track(new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.98, metalness: 0.02, flatShading: true,
    map: surfaces.cliff, normalMap: surfaces.cliffNormal, normalScale: new THREE.Vector2(1.5, 1.5),
  }));
  const underside = new THREE.Mesh(underIsland.rock, undersideMaterial);
  underside.name = 'cloud-island-underside';
  underside.position.set(0, -3, 0);
  underside.receiveShadow = true;
  root.add(underside);

  // --- Rocks: rim crags and plateau boulders -------------------------------
  const rockMaterial = kit.track(new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.94, metalness: 0.02, flatShading: true,
    map: surfaces.cliff, normalMap: surfaces.cliffNormal, normalScale: new THREE.Vector2(1.2, 1.2),
  }));

  const rimGeometry = createRockGeometry({ float, detail: 1, jaggedness: 0.5, color: '#453f39', squash: [1.3, 0.75, 1.3] });
  track(rimGeometry);
  const rimPlacements = [];
  const rimCount = scaleForTier(tier, 'rockScale', 120);
  for (let i = 0; i < rimCount; i++) {
    const a = (i / rimCount) * Math.PI * 2 + float() * 0.08;
    const edge = islandEdgeAt(Math.cos(a) * ISLAND_RADIUS, Math.sin(a) * ISLAND_RADIUS);
    const rr = edge - range(1.5, 5.5);
    const x = Math.cos(a) * rr;
    const z = Math.sin(a) * rr;
    rimPlacements.push({
      x, z,
      y: heightAt(x, z) + range(-0.7, 0.3),
      rot: float() * Math.PI * 2,
      rx: (float() - 0.5) * 0.34,
      rz: (float() - 0.5) * 0.34,
      scale: range(1.2, 3.4),
      scaleY: range(0.6, 1.5),
    });
  }
  const rimField = createRockField({ kit, geometry: rimGeometry, placements: rimPlacements, material: rockMaterial, name: 'cloud-rim-crags' });
  root.add(rimField);

  const boulderGeometry = createRockGeometry({ float, detail: 1, jaggedness: 0.42, color: '#6b6257', squash: [1, 0.8, 1] });
  track(boulderGeometry);
  const boulderPlacements = scatter({
    count: scaleForTier(tier, 'rockScale', 46),
    minRadius: 6,
    maxRadius: 25,
    float,
    heightAt,
    accept: ({ x, z, h, radial }) => {
      if (rectDistance(x, z) < 2.2) return false;
      if (radial > islandEdgeAt(x, z) - 3.5) return false;
      return h > -3;
    },
    minSpacing: 3.2,
  }).map((p) => ({
    ...p,
    y: p.h - range(0.1, 0.4),
    rot: float() * Math.PI * 2,
    rx: (float() - 0.5) * 0.3,
    rz: (float() - 0.5) * 0.3,
    scale: range(0.5, 1.7),
    scaleY: range(0.4, 1.1),
  }));
  const boulderField = createRockField({ kit, geometry: boulderGeometry, placements: boulderPlacements, material: rockMaterial, name: 'cloud-boulders' });
  root.add(boulderField);

  // --- Limestone stepping stones in front meadow ---
  const stoneGeo = kit.track(new THREE.CylinderGeometry(0.85, 0.95, 0.16, 7));
  const stoneMat = kit.track(new THREE.MeshStandardMaterial({
    color: '#8e8b82',
    roughness: 0.92,
    metalness: 0.04,
    flatShading: true,
  }));
  const stepPositions = [
    [-6.5, 17.5],
    [-4.6, 16.0],
    [-2.8, 14.8],
    [-1.0, 13.8],
    [0.8, 12.8],
    [2.4, 12.2],
  ];
  const stoneGroup = new THREE.Group();
  stoneGroup.name = 'cloud-stepping-stones';
  for (let i = 0; i < stepPositions.length; i++) {
    const [sx, sz] = stepPositions[i];
    const sy = heightAt(sx, sz) + 0.06;
    const stoneMesh = new THREE.Mesh(stoneGeo, stoneMat);
    stoneMesh.position.set(sx, sy, sz);
    stoneMesh.rotation.y = float() * Math.PI;
    stoneMesh.scale.set(range(0.9, 1.25), 1, range(0.85, 1.15));
    stoneMesh.receiveShadow = true;
    stoneGroup.add(stoneMesh);
  }
  root.add(stoneGroup);

  // --- Additional floating islands (near / mid / far), grass-capped --------
  const floatIsland = createFloatingIslandGeometry({ float, radius: 1, depth: 1, grassColor: '#6f964c', rockColor: '#34302c' });
  track(floatIsland.top);
  track(floatIsland.rock);
  const islandMaterial = kit.track(new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.95, metalness: 0.02, flatShading: true,
    map: surfaces.cliff,
    normalMap: surfaces.cliffNormal,
  }));
  const islandPlacements = [
    { x: -36, z: -38, topY: 10, radius: 11, depth: 22, rot: 0.4, sx: 11, sy: 22, sz: 11, y: 10 - 22 * 0.11 },
    { x: 44, z: -24, topY: 16, radius: 13, depth: 28, rot: 1.2, sx: 13, sy: 28, sz: 13, y: 16 - 28 * 0.11 },
  ];
  const islandCount = Math.max(6, Math.round(12 * budget.rockScale));
  for (let i = 2; i < islandCount; i++) {
    const band = i % 3;
    const angle = float() * Math.PI * 2;
    const dist = band === 0 ? range(32, 56) : band === 1 ? range(64, 100) : range(110, 180);
    const radius = band === 0 ? range(5, 9.5) : band === 1 ? range(7.5, 15) : range(13, 24);
    const depth = radius * range(1.6, 2.6);
    const topY = band === 0 ? range(-15, -4) : band === 1 ? range(-8, 12) : range(8, 46);
    islandPlacements.push({
      x: Math.cos(angle) * dist,
      z: Math.sin(angle) * dist,
      y: topY - depth * 0.11,
      rot: float() * Math.PI * 2,
      sx: radius,
      sy: depth,
      sz: radius,
      topY,
      radius,
    });
  }
  const islandTops = instanceVegetation({ geometry: floatIsland.top, material: islandMaterial, placements: islandPlacements, name: 'cloud-floating-islands' });
  root.add(islandTops);
  const islandRocks = instanceVegetation({ geometry: floatIsland.rock, material: islandMaterial, placements: islandPlacements, name: 'cloud-floating-island-rocks' });
  root.add(islandRocks);

  // --- Vegetation: dense wind grass, flowers, broadleaf trees --------------
  const grassGeometry = createGrassTuftGeometry({ blades: 6, height: 0.8, width: 0.06, rng: float, tipColor: '#c8d472', baseColor: '#4f7836' });
  track(grassGeometry);
  const grassMaterial = kit.wind(new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.9, metalness: 0, side: THREE.DoubleSide,
  }), { height: 0.9, strength: 0.22 });
  const grassPlacements = scatter({
    count: scaleForTier(tier, 'grassScale', 2800),
    minRadius: 4.5,
    maxRadius: 25,
    float,
    heightAt,
    accept: ({ x, z, h, radial }) => {
      if (rectDistance(x, z) < 1.0) return false;
      if (radial > islandEdgeAt(x, z) - 1.6) return false;
      return h > -4;
    },
    minSpacing: 0.55,
  }).map((p) => ({ ...p, y: p.h, rot: float() * Math.PI * 2, scale: range(0.75, 1.55) }));
  const grassField = instanceVegetation({ geometry: grassGeometry, material: grassMaterial, placements: grassPlacements, name: 'cloud-grass' });
  root.add(grassField);

  const flowerPinkGeometry = createFlowerGeometry({ color: '#ea90b8', stemColor: '#527236', height: 0.55, rng: float });
  const flowerGoldGeometry = createFlowerGeometry({ color: '#f8d660', stemColor: '#547638', height: 0.48, rng: float });
  const flowerWhiteGeometry = createFlowerGeometry({ color: '#fcfcf6', stemColor: '#507034', height: 0.42, rng: float });
  track(flowerPinkGeometry);
  track(flowerGoldGeometry);
  track(flowerWhiteGeometry);
  const flowerMaterial = kit.wind(new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.85, metalness: 0, side: THREE.DoubleSide,
  }), { height: 0.7, strength: 0.05 });
  const flowerPlacements = scatter({
    count: scaleForTier(tier, 'vegetationScale', 480),
    minRadius: 4.5,
    maxRadius: 24,
    float,
    heightAt,
    accept: ({ x, z, h, radial }) => {
      if (rectDistance(x, z) < 1.0) return false;
      if (radial > islandEdgeAt(x, z) - 2.2) return false;
      return h > -3;
    },
    minSpacing: 0.75,
  }).map((p) => ({ ...p, y: p.h, rot: float() * Math.PI * 2, scale: range(0.75, 1.45) }));
  const flowerSplit1 = Math.floor(flowerPlacements.length / 3);
  const flowerSplit2 = Math.floor((flowerPlacements.length * 2) / 3);
  const pinkFlowers = instanceVegetation({ geometry: flowerPinkGeometry, material: flowerMaterial, placements: flowerPlacements.slice(0, flowerSplit1), name: 'cloud-flowers-pink' });
  root.add(pinkFlowers);
  const goldFlowers = instanceVegetation({ geometry: flowerGoldGeometry, material: flowerMaterial, placements: flowerPlacements.slice(flowerSplit1, flowerSplit2), name: 'cloud-flowers-gold' });
  root.add(goldFlowers);
  const whiteFlowers = instanceVegetation({ geometry: flowerWhiteGeometry, material: flowerMaterial, placements: flowerPlacements.slice(flowerSplit2), name: 'cloud-flowers-white' });
  root.add(whiteFlowers);

  const treeGeometry = createBroadleafGeometry({ height: 5.2, radius: 2.4, blobs: 4, color: '#4a7040', trunkColor: '#4d3826', rng: float });
  track(treeGeometry);
  const treeMaterial = kit.wind(new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.92, metalness: 0,
  }), { height: 4.6, strength: 0.12 });
  const treePlacements = scatter({
    count: scaleForTier(tier, 'vegetationScale', 9),
    minRadius: 16,
    maxRadius: 24,
    float,
    heightAt,
    accept: ({ x, z, radial }) => {
      if (rectDistance(x, z) < 3.0) return false;
      return radial < islandEdgeAt(x, z) - 4.5;
    },
    minSpacing: 5.5,
  }).map((p) => ({ ...p, y: p.h - 0.15, rot: float() * Math.PI * 2, scale: range(0.6, 1.05) }));
  // A few small trees on the nearer floating islands.
  for (const isl of islandPlacements) {
    if (isl.radius < 4.5 || Math.hypot(isl.x, isl.z) > 170) continue;
    const count = isl.radius > 10 ? 3 : 2;
    for (let k = 0; k < count; k++) {
      const a = float() * Math.PI * 2;
      const rr = range(0.15, 0.55) * isl.radius;
      treePlacements.push({
        x: isl.x + Math.cos(a) * rr,
        z: isl.z + Math.sin(a) * rr,
        y: isl.topY - 0.05,
        rot: float() * Math.PI * 2,
        scale: range(0.35, 0.7),
      });
    }
  }
  const treeField = instanceVegetation({ geometry: treeGeometry, material: treeMaterial, placements: treePlacements, name: 'cloud-trees', castShadow: false });
  root.add(treeField);

  // --- Waterfall off the south-east rim, with mist at its base -------------
  const waterfallAngle = WATERFALL_ANGLE;
  const waterfallEdge = islandEdgeAt(Math.cos(waterfallAngle) * ISLAND_RADIUS, Math.sin(waterfallAngle) * ISLAND_RADIUS);
  const waterfallX = Math.cos(waterfallAngle) * (waterfallEdge - 0.8);
  const waterfallZ = Math.sin(waterfallAngle) * (waterfallEdge - 0.8);
  const waterfallWidth = 7.5;
  const waterfallHeight = 65;
  const waterfallGeometry = new THREE.PlaneGeometry(waterfallWidth, waterfallHeight, 4, 16);
  waterfallGeometry.translate(0, -waterfallHeight / 2, 0);
  const pos = waterfallGeometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const py = pos.getY(i);
    if (py > -4.0) {
      const curl = Math.cos((py / -4.0) * Math.PI * 0.5);
      pos.setZ(i, pos.getZ(i) - curl * 0.9);
    }
  }
  waterfallGeometry.computeVertexNormals();
  track(waterfallGeometry);

  const waterfallMaterial = kit.track(new THREE.ShaderMaterial({
    vertexShader: waterfallVertexShader,
    fragmentShader: waterfallFragmentShader,
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color('#f6f8ff') },
        uOpacity: { value: 0.65 },
      },
    ]),
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: true,
  }));
  const waterfall = new THREE.Mesh(waterfallGeometry, waterfallMaterial);
  waterfall.name = 'cloud-waterfall';
  waterfall.position.set(waterfallX, heightAt(waterfallX, waterfallZ) - 0.2, waterfallZ);
  waterfall.rotation.y = waterfallAngle + Math.PI / 2;
  root.add(waterfall);

  const waterfallMist = createParticleField({
    count: scaleForTier(tier, 'particleScale', 220),
    kind: 'mist',
    area: [32, 28, 32],
    origin: [waterfallX, -28, waterfallZ],
    size: 26,
    color: '#ffeede',
    opacity: 0.18,
    fall: 0.45,
    float,
    track,
    name: 'cloud-waterfall-mist',
  });
  mesh(waterfallMist.points);

  // --- Atmosphere: cloud sea, banks, plateau mist, pollen, birds -----------
  const cloudSize = Math.max(760, budget.terrainSize * 2.8);
  const layerPalette = CLOUD_LAYER_PALETTES[paletteKey(variantId, row?.preset)];
  const layerCount = Math.max(1, Math.min(budget.cloudLayers, layerPalette.length));
  const layerDefs = layerPalette.slice(0, layerCount);
  const cloudSea = createCloudSea({
    layers: layerDefs,
    size: cloudSize,
    segments: 1,
    wind: [0.28, 0.08],
    sunDir: [0.3, 0.5, 0.4],
    sunColor: '#ffd9a0',
    track,
  });
  root.add(cloudSea.group);
  track(cloudSea);
  const cloudLayerMaterials = cloudSea.group.children
    .filter((child) => child.isMesh)
    .map((child) => child.material);

  const puffBudget = Math.max(3, budget.cloudPuffs);
  const nearPuffs = Math.max(1, Math.round(puffBudget * 0.45));
  const midPuffs = Math.max(1, Math.round(puffBudget * 0.35));
  const farPuffs = Math.max(1, puffBudget - nearPuffs - midPuffs);
  const nearBank = createCloudBank({ float, count: nearPuffs, radius: [48, 95], height: [-22, -6], scale: [14, 28], color: '#f6ddc8', opacity: 1, track, name: 'cloud-bank-near' });
  root.add(nearBank.mesh);
  const midBank = createCloudBank({ float, count: midPuffs, radius: [100, 190], height: [-16, 12], scale: [22, 44], color: '#f0c6d4', opacity: 1, track, name: 'cloud-bank-mid' });
  root.add(midBank.mesh);
  const farBank = createCloudBank({ float, count: farPuffs, radius: [200, 420], height: [-30, 70], scale: [36, 85], color: '#c6b2da', opacity: 1, track, name: 'cloud-bank-far' });
  root.add(farBank.mesh);

  const waterMist = createParticleField({
    count: scaleForTier(tier, 'particleScale', 200),
    kind: 'mist',
    area: [220, 42, 220],
    origin: [0, -22, 0],
    size: 42,
    color: '#ecdce8',
    opacity: 0.11,
    fall: 0.45,
    float,
    track,
    name: 'cloud-sea-mist',
  });
  mesh(waterMist.points);

  const pollen = createParticleField({
    count: scaleForTier(tier, 'particleScale', 300),
    kind: 'spore',
    area: [56, 10, 56],
    origin: [0, 2.4, 0],
    size: 5.5,
    color: '#f4e6b8',
    opacity: 0.3,
    fall: 0.6,
    float,
    track,
    name: 'cloud-pollen',
  });
  mesh(pollen.points);

  const birdCount = Math.max(1, Math.round(budget.birdCount));
  const flock = createFlock({ count: birdCount, radius: [26, 64], height: [4, 24], float, track });
  flock.mesh.material.transparent = true;
  flock.mesh.material.depthWrite = false;
  root.add(flock.mesh);

  // Distant lightning glow inside the storm deck.
  const lightningLight = new THREE.PointLight('#cfe0ff', 0, 340, 1.4);
  lightningLight.position.set(0, -34, 0);
  lightningLight.visible = false;
  root.add(lightningLight);

  mesh(root);

  // --- Variant response ----------------------------------------------------
  const variantFeatures = { ...(row?.features ?? {}) };
  const cloudSunColor = new THREE.Color('#ffd9a0');
  const cloudSunDir = new THREE.Vector3(0.3, 0.5, 0.4).normalize();
  const flashColor = new THREE.Color('#e8f0ff');
  let lightningEnabled = false;

  function applyCloudSky(visuals = row?.visuals ?? {}) {
    const elevation = Number.isFinite(visuals.sunElevation) ? visuals.sunElevation : 0.3;
    const azimuth = Number.isFinite(visuals.sunAzimuth) ? visuals.sunAzimuth : 0.4;
    const ce = Math.cos(elevation);
    cloudSunDir.set(ce * Math.cos(azimuth), Math.max(0.06, Math.sin(elevation)), ce * Math.sin(azimuth)).normalize();
    if (visuals.sunColor) cloudSunColor.set(visuals.sunColor);
    cloudSea.setSky({ sunColor: cloudSunColor, sunDir: cloudSunDir });
  }

  function applyVariantFeatures() {
    const key = paletteKey(currentVariantId, row?.preset);
    const palette = CLOUD_LAYER_PALETTES[key];
    const seaAmount = clamp(variantFeatures.cloudSea ?? 1, 0, 1);
    for (let i = 0; i < cloudLayerMaterials.length; i++) {
      const def = palette[Math.min(i, palette.length - 1)];
      const uniforms = cloudLayerMaterials[i].uniforms;
      uniforms.uColor.value.set(def.color);
      uniforms.uShadow.value.set(def.shadow);
      uniforms.uOpacity.value = def.opacity * (0.4 + 0.6 * seaAmount);
      uniforms.uSpeed.value = def.speed;
      uniforms.uContrast.value = def.contrast;
    }
    const banks = BANK_COLORS[key];
    nearBank.mesh.material.color.set(banks.near);
    nearBank.mesh.material.emissive.set(banks.near);
    midBank.mesh.material.color.set(banks.mid);
    midBank.mesh.material.emissive.set(banks.mid);
    farBank.mesh.material.color.set(banks.far);
    farBank.mesh.material.emissive.set(banks.far);

    const mistFeature = variantFeatures.mist ?? 0.4;
    const sporeFeature = variantFeatures.spores ?? 0.2;
    pollen.setOpacity(0.04 + sporeFeature * 0.16);
    waterMist.setOpacity(0.03 + mistFeature * 0.11);
    waterfallMist.setOpacity(0.05 + mistFeature * 0.1);

    const birds = variantFeatures.birds ?? 0.5;
    flock.mesh.visible = birds > 0.12;
    flock.mesh.material.opacity = clamp(0.3 + birds * 0.7, 0, 1);

    const stormBelow = (variantFeatures.stormBelow ?? 0) > 0.4;
    waterfallMaterial.uniforms.uColor.value.set(stormBelow ? '#c3ccd8' : '#eef6ff');
    waterfallMaterial.uniforms.uOpacity.value = stormBelow ? 0.4 : 0.55;

    lightningEnabled = stormBelow || (variantFeatures.lightningDistant ?? 0) > 0.4;
    lightningLight.visible = lightningEnabled;
    if (!lightningEnabled) lightningLight.intensity = 0;
  }

  applyVariantFeatures();
  applyCloudSky();

  function update(time, _dt, state = {}) {
    cloudSea.update(time, _dt, state);
    nearBank.update(time, _dt, state);
    midBank.update(time, _dt, state);
    farBank.update(time, _dt, state);
    waterMist.update(time, _dt, state);
    pollen.update(time, _dt, state);
    waterfallMist.update(time, _dt, state);
    flock.update(time);
    waterfallMaterial.uniforms.uTime.value = time;
    waterfall.scale.x = 1 + Math.sin(time * 0.7) * 0.05;
    waterfall.scale.y = 1 + Math.sin(time * 1.1 + 1.3) * 0.02;

    const flash = lightningEnabled ? lightningFlash(time) : 0;
    for (const material of cloudLayerMaterials) {
      material.uniforms.uSunColor.value.copy(cloudSunColor);
      if (flash > 0) material.uniforms.uSunColor.value.lerp(flashColor, flash * 0.85);
    }
    lightningLight.intensity = flash * 4.2;
  }

  function setVariant(next) {
    if (next?.variantId) currentVariantId = next.variantId;
    Object.assign(variantFeatures, next?.features ?? {});
    applyVariantFeatures();
    applyCloudSky(next?.visuals);
  }

  return {
    update,
    setVariant,
    dispose() { kit.disposeAll(); },
    environment: {
      materialFamilies: [
        { key: 'cloud-turf', material: terrain.material, sheltered: false, dry: Object.freeze({ color: terrain.material.color.getHex(), roughness: 0.96, metalness: 0.02 }) },
        { key: 'cloud-rock', material: rockMaterial, sheltered: false, dry: Object.freeze({ color: rockMaterial.color.getHex(), roughness: 0.96, metalness: 0.02 }) },
        { key: 'cloud-island', material: islandMaterial, sheltered: false, dry: Object.freeze({ color: islandMaterial.color.getHex(), roughness: 0.96, metalness: 0.02 }) },
      ],
      zones: [],
      emitterAnchors: [
        { id: 'cloud-pool-1', kind: 'puddle', x: 12.5, y: -0.78, z: 9.0, w: 1.6, d: 1.1 },
        { id: 'cloud-pool-2', kind: 'puddle', x: -11.5, y: -0.78, z: 8.5, w: 1.4, d: 1.0 },
        { id: 'cloud-pool-3', kind: 'puddle', x: 10.8, y: -0.78, z: -12.8, w: 1.3, d: 1.0 },
      ],
    },
    counts: {
      boulders: boulderPlacements.length + rimPlacements.length,
      grass: grassPlacements.length,
      flowers: flowerPlacements.length,
      trees: treePlacements.length,
      islands: islandPlacements.length,
      cloudLayers: layerDefs.length,
      cloudPuffs: nearPuffs + midPuffs + farPuffs,
      birds: birdCount,
      particles: pollen.uniforms.uOpacity.value,
    },
  };
}
