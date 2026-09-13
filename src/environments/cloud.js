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

const PLATEAU_Y = -0.92;
const RIM_Y = -6.5;
const VOID_Y = -132;
const ISLAND_RADIUS = 28;
// The theater (~27×23 shell) must never be undercut by terrain: the plateau
// stays at/below y=-0.6 everywhere inside this rectangle.
const THEATER_RECT = Object.freeze({ minX: -14.5, maxX: 14.5, minZ: -17.0, maxZ: 13.5 });
const WATERFALL_ANGLE = 3.55;

function rectDistance(x, z) {
  const dx = Math.max(0, THEATER_RECT.minX - x, x - THEATER_RECT.maxX);
  const dz = Math.max(0, THEATER_RECT.minZ - z, z - THEATER_RECT.maxZ);
  return Math.hypot(dx, dz);
}

/** Jagged, angle-varying island rim radius (roughly 40–64 units). */
function islandEdgeAt(x, z) {
  const a = Math.atan2(z, x);
  const course = fbm(Math.cos(a) * 3.4, Math.sin(a) * 3.4, { octaves: 4, frequency: 1, seed: 911 });
  const fine = fbm(x, z, { octaves: 2, frequency: 0.09, seed: 917 });
  return ISLAND_RADIUS + (course - 0.5) * 7 + (fine - 0.5) * 2.5;
}

/** Plateau → grass shelf → cliff → void, with the rim noise folded in. */
function heightAt(x, z) {
  const dRect = rectDistance(x, z);
  const plateauMask = smoothstep(8.0, 0.0, dRect);
  const micro = (fbm(x, z, { octaves: 3, frequency: 0.16, seed: 823 }) - 0.5) * 0.2;
  const roll = (fbm(x, z, { octaves: 4, frequency: 0.05, seed: 827 }) - 0.5) * 1.8;
  const top = PLATEAU_Y + micro * plateauMask + roll * (1 - plateauMask);

  const r = Math.hypot(x, z);
  const edge = islandEdgeAt(x, z);
  const drop = smoothstep(edge - 1.5, edge + 3.0, r);
  const abyss = smoothstep(edge + 1.0, edge + 30.0, r);
  const underside = RIM_Y - (RIM_Y - VOID_Y) * abyss;
  return top * (1 - drop) + underside * drop;
}

const CLOUD_LAYER_PALETTES = Object.freeze({
  sunrise: Object.freeze([
    Object.freeze({ y: -30, color: '#ffe6cf', shadow: '#c98f8f', opacity: 0.66, scale: 0.0085, speed: 0.34, contrast: 0.72 }),
    Object.freeze({ y: -47, color: '#ffc9d8', shadow: '#9c7096', opacity: 0.58, scale: 0.013, speed: 0.46, contrast: 0.66 }),
    Object.freeze({ y: -64, color: '#d7a8dd', shadow: '#6b5a90', opacity: 0.5, scale: 0.019, speed: 0.62, contrast: 0.6 }),
    Object.freeze({ y: -82, color: '#9d8fd4', shadow: '#474070', opacity: 0.42, scale: 0.027, speed: 0.82, contrast: 0.55 }),
  ]),
  day: Object.freeze([
    Object.freeze({ y: -30, color: '#ffffff', shadow: '#b7c8da', opacity: 0.82, scale: 0.008, speed: 0.3, contrast: 0.7 }),
    Object.freeze({ y: -47, color: '#f2f7fd', shadow: '#9db2c9', opacity: 0.72, scale: 0.0125, speed: 0.42, contrast: 0.65 }),
    Object.freeze({ y: -64, color: '#e2ecf7', shadow: '#8399b3', opacity: 0.62, scale: 0.018, speed: 0.56, contrast: 0.6 }),
    Object.freeze({ y: -82, color: '#cfdcec', shadow: '#6b819d', opacity: 0.52, scale: 0.025, speed: 0.74, contrast: 0.55 }),
  ]),
  storm: Object.freeze([
    Object.freeze({ y: -30, color: '#727b8c', shadow: '#20242f', opacity: 0.88, scale: 0.009, speed: 0.72, contrast: 0.82 }),
    Object.freeze({ y: -46, color: '#5b6474', shadow: '#191d27', opacity: 0.84, scale: 0.014, speed: 0.95, contrast: 0.86 }),
    Object.freeze({ y: -62, color: '#474f60', shadow: '#12151d', opacity: 0.8, scale: 0.02, speed: 1.2, contrast: 0.88 }),
    Object.freeze({ y: -80, color: '#343a48', shadow: '#0c0f16', opacity: 0.76, scale: 0.028, speed: 1.5, contrast: 0.9 }),
  ]),
});

const BANK_COLORS = Object.freeze({
  sunrise: Object.freeze({ near: '#f6ddc8', mid: '#f0c6d4', far: '#c6b2da' }),
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
  const colorScratch = new THREE.Color();
  const grassBase = new THREE.Color('#4f7038');
  const grassLush = new THREE.Color('#6f9247');
  const grassPale = new THREE.Color('#93a35c');
  const meadowEarth = new THREE.Color('#6b5a41');
  const rockTop = new THREE.Color('#57544f');
  const rockCliff = new THREE.Color('#34333a');
  const voidRock = new THREE.Color('#10141d');

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
  root.add(terrain.mesh);
  track(terrain);

  // Single dark mass under the island: the jagged rock underside.
  const underIsland = createFloatingIslandGeometry({ float, radius: 27, depth: 24, grassColor: '#5f8a49', rockColor: '#332f2c' });
  underIsland.top.dispose();
  track(underIsland.rock);
  const undersideMaterial = kit.track(new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.98, metalness: 0.02, flatShading: true,
  }));
  const underside = new THREE.Mesh(underIsland.rock, undersideMaterial);
  underside.name = 'cloud-island-underside';
  underside.position.set(0, -3, 0);
  underside.receiveShadow = true;
  root.add(underside);

  // --- Rocks: rim crags and plateau boulders -------------------------------
  const rockMaterial = kit.track(new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.96, metalness: 0.02, flatShading: true,
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

  // --- Additional floating islands (near / mid / far), grass-capped --------
  const floatIsland = createFloatingIslandGeometry({ float, radius: 1, depth: 1, grassColor: '#5f8a49', rockColor: '#332f2c' });
  track(floatIsland.top);
  track(floatIsland.rock);
  const islandMaterial = kit.track(new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.96, metalness: 0.02, flatShading: true,
  }));
  const islandPlacements = [];
  const islandCount = Math.max(6, Math.round(12 * budget.rockScale));
  for (let i = 0; i < islandCount; i++) {
    const band = i % 3;
    const angle = float() * Math.PI * 2;
    const dist = band === 0 ? range(30, 54) : band === 1 ? range(60, 96) : range(104, 170);
    const radius = band === 0 ? range(4.5, 9) : band === 1 ? range(7, 14) : range(12, 22);
    const depth = radius * range(1.6, 2.6);
    const topY = band === 0 ? range(-17, -7) : band === 1 ? range(-10, 10) : range(6, 44);
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
  const grassGeometry = createGrassTuftGeometry({ blades: 6, height: 0.8, width: 0.06, rng: float, tipColor: '#b4bd6a', baseColor: '#4d6b34' });
  track(grassGeometry);
  const grassMaterial = kit.wind(new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.9, metalness: 0, side: THREE.DoubleSide,
  }), { height: 0.9, strength: 0.22 });
  const grassPlacements = scatter({
    count: scaleForTier(tier, 'grassScale', 2400),
    minRadius: 5,
    maxRadius: 25,
    float,
    heightAt,
    accept: ({ x, z, h, radial }) => {
      if (rectDistance(x, z) < 1.1) return false;
      if (radial > islandEdgeAt(x, z) - 1.6) return false;
      return h > -4;
    },
    minSpacing: 0.6,
  }).map((p) => ({ ...p, y: p.h, rot: float() * Math.PI * 2, scale: range(0.7, 1.5) }));
  const grassField = instanceVegetation({ geometry: grassGeometry, material: grassMaterial, placements: grassPlacements, name: 'cloud-grass' });
  root.add(grassField);

  const flowerPinkGeometry = createFlowerGeometry({ color: '#e8a0c0', stemColor: '#5d7a3e', height: 0.55, rng: float });
  const flowerGoldGeometry = createFlowerGeometry({ color: '#f2d27a', stemColor: '#5f7d40', height: 0.45, rng: float });
  track(flowerPinkGeometry);
  track(flowerGoldGeometry);
  const flowerMaterial = kit.wind(new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.85, metalness: 0, side: THREE.DoubleSide,
  }), { height: 0.7, strength: 0.05 });
  const flowerPlacements = scatter({
    count: scaleForTier(tier, 'vegetationScale', 260),
    minRadius: 5,
    maxRadius: 24,
    float,
    heightAt,
    accept: ({ x, z, h, radial }) => {
      if (rectDistance(x, z) < 1.1) return false;
      if (radial > islandEdgeAt(x, z) - 2.5) return false;
      return h > -3;
    },
    minSpacing: 1.1,
  }).map((p) => ({ ...p, y: p.h, rot: float() * Math.PI * 2, scale: range(0.7, 1.4) }));
  const flowerSplit = Math.ceil(flowerPlacements.length / 2);
  const pinkFlowers = instanceVegetation({ geometry: flowerPinkGeometry, material: flowerMaterial, placements: flowerPlacements.slice(0, flowerSplit), name: 'cloud-flowers-pink' });
  root.add(pinkFlowers);
  const goldFlowers = instanceVegetation({ geometry: flowerGoldGeometry, material: flowerMaterial, placements: flowerPlacements.slice(flowerSplit), name: 'cloud-flowers-gold' });
  root.add(goldFlowers);

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

  // --- Waterfall off the far rim, with mist at its base --------------------
  const waterfallAngle = WATERFALL_ANGLE;
  const waterfallEdge = islandEdgeAt(Math.cos(waterfallAngle) * ISLAND_RADIUS, Math.sin(waterfallAngle) * ISLAND_RADIUS);
  const waterfallX = Math.cos(waterfallAngle) * (waterfallEdge - 1.2);
  const waterfallZ = Math.sin(waterfallAngle) * (waterfallEdge - 1.2);
  const waterfallWidth = 9;
  const waterfallHeight = 74;
  const waterfallGeometry = new THREE.PlaneGeometry(waterfallWidth, waterfallHeight, 1, 8);
  waterfallGeometry.translate(0, -waterfallHeight / 2, 0);
  track(waterfallGeometry);
  const waterfallMaterial = kit.track(new THREE.ShaderMaterial({
    vertexShader: waterfallVertexShader,
    fragmentShader: waterfallFragmentShader,
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color('#eef6ff') },
        uOpacity: { value: 0.55 },
      },
    ]),
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: true,
  }));
  const waterfall = new THREE.Mesh(waterfallGeometry, waterfallMaterial);
  waterfall.name = 'cloud-waterfall';
  waterfall.position.set(waterfallX, heightAt(waterfallX, waterfallZ) - 0.35, waterfallZ);
  waterfall.rotation.y = waterfallAngle + 0.12;
  root.add(waterfall);

  const waterfallMist = createParticleField({
    count: scaleForTier(tier, 'particleScale', 130),
    kind: 'mist',
    area: [46, 24, 46],
    origin: [waterfallX, -62, waterfallZ],
    size: 20,
    color: '#e8f0f6',
    opacity: 0.12,
    fall: 0.5,
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
  const nearBank = createCloudBank({ float, count: nearPuffs, radius: [55, 105], height: [-42, -14], scale: [9, 20], color: '#f6ddc8', opacity: 1, track, name: 'cloud-bank-near' });
  root.add(nearBank.mesh);
  const midBank = createCloudBank({ float, count: midPuffs, radius: [115, 200], height: [-26, 10], scale: [16, 34], color: '#f0c6d4', opacity: 1, track, name: 'cloud-bank-mid' });
  root.add(midBank.mesh);
  const farBank = createCloudBank({ float, count: farPuffs, radius: [210, 420], height: [-60, 60], scale: [30, 70], color: '#c6b2da', opacity: 1, track, name: 'cloud-bank-far' });
  root.add(farBank.mesh);

  const waterMist = createParticleField({
    count: scaleForTier(tier, 'particleScale', 170),
    kind: 'mist',
    area: [200, 36, 200],
    origin: [0, -26, 0],
    size: 38,
    color: '#dfe9f2',
    opacity: 0.08,
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
