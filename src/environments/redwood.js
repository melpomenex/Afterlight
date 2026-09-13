/**
 * Ancient Redwood Forest — the vertical, quiet Theater environment.
 *
 * The Orpheum rests on a mossy forest floor inside a shallow clearing: the
 * terrain stays well below the Theater floor everywhere under and around the
 * shell, then undulates with humus mounds, buttressed roots and a shallow
 * stream to the west. Ancient trunks (28–44 units tall, 3–6 unit radii) stand
 * from radius 18–45 and rise far above the camera frame — the canopy is never
 * visible, only occasional high branches and silhouette hints. The point of
 * the place is scale: the cinema is small between giants.
 *
 * Spatial layers:
 *   NEAR  — moss floor, undergrowth, fern pockets, glowing fungi
 *   MID   — root arches crossing the middle distance, logs, the stream,
 *           fallen moss mounds, fireflies / spores / mist
 *   FAR   — more trunks receding into layered fog, high branches, flock
 *
 * Everything is generated deterministically from the environment seed and
 * scaled by the environment quality tier. No collision (actors stay inside
 * the Theater bounds); no shared scene or Theater resource is touched.
 */

import * as THREE from 'three';
import { fbm, clamp, smoothstep, createTerrain } from './lib/terrain.js';
import { scatter } from './lib/scatter.js';
import { createRockGeometry, createRockField } from './lib/rocks.js';
import {
  createAncientTrunkGeometry,
  createFernGeometry,
  createGrassTuftGeometry,
  instanceVegetation,
} from './lib/vegetation.js';
import { createWater } from './lib/water.js';
import { createParticleField, createFlock } from './lib/particles.js';
import { createLightShafts } from './lib/skyFx.js';
import { scaleForTier, budgetForEnvironmentTier } from './quality.js';

// The clearing floor is authored below the Theater slab: the whole required
// footprint stays under -0.73 even at the noisiest corner.
const BASIN_Y = -0.98;
const WATER_Y = -1.5;
const STREAM_DEPTH = 0.9;
const CLEARING_HALF_X = 15.4;
const CLEARING_SOUTH = 14.4;
const CLEARING_NORTH = -18.0;
const CLEARING_FADE = 5.5;

/** Point-to-rectangle distance for the flat clearing core (0 inside). */
function clearingDistance(x, z) {
  const dx = Math.max(0, Math.abs(x) - CLEARING_HALF_X);
  const dz = z > CLEARING_SOUTH ? z - CLEARING_SOUTH : z < CLEARING_NORTH ? CLEARING_NORTH - z : 0;
  return Math.hypot(dx, dz);
}

function clearingMask(x, z) {
  return 1 - smoothstep(0, CLEARING_FADE, clearingDistance(x, z));
}

/** The stream runs north–south just outside the clearing's west edge. */
function streamCenterX(z) {
  return -21.2 + Math.sin(z * 0.14) * 1.9 + Math.sin(z * 0.045 + 2.1) * 1.2;
}

function streamDistance(x, z) {
  return Math.abs(x - streamCenterX(z));
}

/** Distance from the Theater shell rectangle (the building keeps its air). */
function shellClearance(x, z) {
  const dx = Math.max(Math.abs(x) - 13.0, 0);
  const dz = z > 12.5 ? z - 12.5 : z < -14.0 ? -14.0 - z : 0;
  return Math.hypot(dx, dz);
}

export function buildRedwood({ kit, row, variantId = 'firefly', tier = 'high', quality }) {
  const { float, range, mesh, track } = kit;
  const budget = quality ?? budgetForEnvironmentTier(tier);
  const root = new THREE.Group();
  root.name = 'redwood-world';

  // --- Terrain: sunken clearing, rolling old-growth floor, stream ---------
  function heightAt(x, z) {
    const clearing = clearingMask(x, z);
    // Gentle humus undulation inside the clearing, rolling mounds outside.
    const basin = BASIN_Y
      + (fbm(x, z, { octaves: 4, frequency: 0.17, seed: 211 }) - 0.5) * 0.28
      + (fbm(x, z, { octaves: 3, frequency: 0.24, seed: 397 }) - 0.5) * 0.22;
    const rolling = (fbm(x, z, { octaves: 5, frequency: 0.052, seed: 179 }) - 0.5) * 4.0
      + smoothstep(18, 44, Math.hypot(x, z)) * 1.6;
    let h = basin * clearing + rolling * (1 - clearing);
    // The stream corridor ignores the rolling ground so the channel stays wet.
    const bank = 1 - smoothstep(3.6, 11.0, streamDistance(x, z));
    if (bank > 0.001) {
      const streamFloor = BASIN_Y - 0.05
        + (fbm(x, z, { octaves: 3, frequency: 0.35, seed: 523 }) - 0.5) * 0.3;
      h = h * (1 - bank) + streamFloor * bank;
    }
    const channel = 1 - smoothstep(2.0, 5.0, streamDistance(x, z));
    return h - channel * STREAM_DEPTH;
  }

  const humus = new THREE.Color('#4b3d2b');
  const needles = new THREE.Color('#5b4a31');
  const moss = new THREE.Color('#3a562f');
  const mossDark = new THREE.Color('#2c4326');
  const streamBed = new THREE.Color('#2b3226');
  const streamGravel = new THREE.Color('#4b4a40');
  const clearingFloor = new THREE.Color('#453a29');
  const forestRock = new THREE.Color('#565149');
  const colorScratch = new THREE.Color();

  const terrain = createTerrain({
    size: budget.terrainSize,
    segments: budget.terrainSegments,
    height: heightAt,
    colorAt: ({ x, z, h, slope }) => {
      const litterNoise = fbm(x, z, { octaves: 3, frequency: 0.06, seed: 613 });
      const mossNoise = fbm(x, z, { octaves: 4, frequency: 0.115, seed: 601 });
      colorScratch.copy(humus).lerp(needles, litterNoise);
      // Moss prefers the shaded, flatter pockets outside the trampled clearing.
      const bank = 1 - smoothstep(2.4, 5.6, streamDistance(x, z));
      const mossiness = clamp((mossNoise - 0.46) * 2.6, 0, 1) * smoothstep(0.6, 0.22, slope);
      const mossBlend = clamp(mossiness * 0.85 + bank * 0.15, 0, 1);
      colorScratch.lerp(mossNoise > 0.62 ? mossDark : moss, mossBlend);
      if (h < WATER_Y + 0.45) {
        colorScratch.lerp(streamBed, smoothstep(WATER_Y + 0.45, WATER_Y - 0.3, h));
        colorScratch.lerp(streamGravel, smoothstep(WATER_Y + 0.05, WATER_Y - 0.9, h) * 0.45);
      }
      const clearing = clearingMask(x, z);
      if (clearing > 0.05) colorScratch.lerp(clearingFloor, clearing * 0.35);
      if (slope > 0.5) colorScratch.lerp(forestRock, smoothstep(0.5, 1.4, slope) * 0.5);
      return colorScratch;
    },
    y: 0,
    roughness: 0.97,
    metalness: 0,
  });
  // A whisper of self-lit humus keeps the firefly night readable, never black.
  terrain.material.emissive.set('#0d1a13');
  terrain.material.emissiveIntensity = 0.3;
  root.add(terrain.mesh);
  track(terrain);

  // --- The stream: a shallow carved channel west of the clearing -----------
  const water = createWater({
    size: 140,
    segments: Math.max(48, Math.round(budget.waterSegments * 1.1)),
    waterY: WATER_Y,
    terrainHeight: heightAt,
    shoreRange: 0.55,
    waveHeight: 0.05,
    chop: 0.02,
    deepColor: '#14251d',
    shallowColor: '#3f6b52',
    opacity: 0.9,
  });
  root.add(water.mesh);
  track(water);

  // --- Ancient trunks: the vertical scale of the place ---------------------
  const trunkDefs = [
    { height: 30, radius: 3.1, color: '#4e3c2c', ridgeColor: '#33251a', buttresses: 6 },
    { height: 38, radius: 4.2, color: '#523e2d', ridgeColor: '#36271b', buttresses: 7 },
    { height: 44, radius: 5.2, color: '#483625', ridgeColor: '#2f2117', buttresses: 8 },
  ];
  const trunkMaterial = kit.track(new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.94, metalness: 0.02,
    emissive: new THREE.Color('#0a0f0c'), emissiveIntensity: 0.3,
  }));
  const trunkCounts = [5, 6, 6].map((n) => Math.min(8, scaleForTier(tier, 'vegetationScale', n)));
  const trunkPlacements = [];
  const tooCloseToTrunk = (x, z, minDist) => {
    for (const p of trunkPlacements) {
      const dx = p.x - x;
      const dz = p.z - z;
      if (dx * dx + dz * dz < minDist * minDist) return true;
    }
    return false;
  };
  // Hand-placed "gateway" giants just outside the shell: they frame the
  // Orpheum in every camera view instead of leaving the near field empty.
  const gatewayByVariant = [[], [], []];
  for (const def of [
    { variant: 0, x: 25.4, z: 0.6 },
    { variant: 0, x: -25.4, z: -0.8 },
    { variant: 0, x: 25.0, z: 18.0 },
    { variant: 0, x: -25.2, z: 17.5 },
    { variant: 0, x: -0.8, z: -26.6 },
    { variant: 0, x: 18.5, z: -25.5 },
  ]) {
    const h = heightAt(def.x, def.z);
    const placement = {
      x: def.x,
      z: def.z,
      h,
      y: h - 0.45,
      rot: float() * Math.PI * 2,
      scale: range(0.95, 1.12),
      radius: trunkDefs[def.variant].radius,
    };
    gatewayByVariant[def.variant].push(placement);
    trunkPlacements.push(placement);
  }
  for (let v = 0; v < trunkDefs.length; v++) {
    const def = trunkDefs[v];
    const geometry = createAncientTrunkGeometry({
      height: def.height,
      radius: def.radius,
      color: def.color,
      ridgeColor: def.ridgeColor,
      buttresses: def.buttresses,
      rng: float,
    });
    track(geometry);
    // Root flare reaches ~3.1x the trunk radius at the base; keep it clear of
    // the shell and of the other variant families.
    const clearance = 5 + def.radius * 2.3;
    const scattered = scatter({
      count: trunkCounts[v],
      minRadius: 18,
      maxRadius: 45,
      float,
      heightAt,
      accept: ({ x, z, h }) => {
        if (shellClearance(x, z) < clearance) return false;
        if (streamDistance(x, z) < 6.5) return false;
        if (h < WATER_Y + 1.2) return false;
        if (tooCloseToTrunk(x, z, 9.5 + def.radius)) return false;
        return true;
      },
      minSpacing: 11,
      maxTriesFactor: 40,
    }).map((p) => ({
      ...p,
      y: p.h - 0.45,
      rot: float() * Math.PI * 2,
      scale: range(0.92, 1.14),
      radius: def.radius,
    }));
    const placements = [...gatewayByVariant[v], ...scattered];
    for (const p of scattered) trunkPlacements.push(p);
    root.add(instanceVegetation({
      geometry,
      material: trunkMaterial,
      placements,
      name: `redwood-trunks-${v}`,
    }));
  }

  // High branches: occasional crowns beyond the frame, silhouette hints only.
  const branchGeometry = new THREE.CylinderGeometry(0.16, 0.62, 15, 5);
  branchGeometry.rotateZ(Math.PI / 2);
  branchGeometry.translate(7.5, 0, 0);
  track(branchGeometry);
  const branchMaterial = kit.track(new THREE.MeshStandardMaterial({
    color: '#2c2118', roughness: 0.95, metalness: 0.02,
  }));
  const branchPlacements = [];
  for (const trunk of trunkPlacements) {
    if (float() < 0.5) continue;
    const angle = float() * Math.PI * 2;
    const offset = (3.0 + (trunk.radius ?? 3)) * (trunk.scale ?? 1);
    branchPlacements.push({
      x: trunk.x + Math.cos(angle) * offset,
      z: trunk.z + Math.sin(angle) * offset,
      y: trunk.y + range(13, 21),
      rot: angle,
      rx: range(-0.2, 0.2),
      rz: range(-0.22, 0.06),
      scale: range(0.7, 1.25),
    });
    if (branchPlacements.length >= 12) break;
  }
  root.add(instanceVegetation({
    geometry: branchGeometry,
    material: branchMaterial,
    placements: branchPlacements,
    name: 'redwood-high-branches',
    build: (dummy, p) => dummy.rotation.set(p.rx ?? 0, p.rot ?? 0, p.rz ?? 0),
  }));

  // --- Buttressed roots crossing the middle distance -----------------------
  const rootGeometry = new THREE.TorusGeometry(1, 0.17, 5, 12, Math.PI * 1.3);
  rootGeometry.rotateX(-Math.PI / 2);
  track(rootGeometry);
  const rootMaterial = kit.track(new THREE.MeshStandardMaterial({
    color: '#3c2c1e', roughness: 0.96, metalness: 0.02, flatShading: true,
  }));
  const rootPlacements = [];
  const rootTarget = Math.max(5, Math.round(12 * Math.max(0.5, budget.vegetationScale)));
  for (let i = 0; i < rootTarget * 3 && rootPlacements.length < rootTarget; i++) {
    const angle = float() * Math.PI * 2;
    const radius = range(15.5, 31);
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    if (shellClearance(x, z) < 6.5) continue;
    if (streamDistance(x, z) < 3.2) continue;
    rootPlacements.push({
      x,
      z,
      y: heightAt(x, z) - 0.1,
      rot: float() * Math.PI * 2,
      sx: range(3.4, 8.2),
      sy: range(1.3, 2.6),
      sz: range(2.6, 6.4),
    });
  }
  root.add(instanceVegetation({
    geometry: rootGeometry,
    material: rootMaterial,
    placements: rootPlacements,
    name: 'redwood-roots',
  }));

  // --- Rocks: boulders in the moss, half-sunk stones in the stream ---------
  const rockGeometry = createRockGeometry({ float, detail: 1, jaggedness: 0.42, color: '#5a564c' });
  track(rockGeometry);
  const rockMaterial = kit.track(new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.97, metalness: 0.02, flatShading: true,
  }));
  const boulderPlacements = scatter({
    count: scaleForTier(tier, 'rockScale', 56),
    minRadius: 9,
    maxRadius: 42,
    float,
    heightAt,
    accept: ({ h }) => h > WATER_Y + 0.25,
    minSpacing: 1.5,
  }).map((p) => ({
    ...p,
    y: p.h - 0.25,
    rot: float() * Math.PI * 2,
    rx: (float() - 0.5) * 0.3,
    rz: (float() - 0.5) * 0.3,
    scale: range(0.4, 1.9),
    scaleY: range(0.4, 1.2),
  }));
  root.add(createRockField({
    kit, geometry: rockGeometry, placements: boulderPlacements, material: rockMaterial,
    name: 'redwood-boulders',
  }));
  const streamStoneGeometry = createRockGeometry({
    float, detail: 0, jaggedness: 0.5, color: '#4f4f47', squash: [1.3, 0.5, 1.3],
  });
  track(streamStoneGeometry);
  const streamStonePlacements = [];
  const streamStoneCount = Math.max(4, Math.round(14 * budget.rockScale));
  for (let i = 0; i < streamStoneCount * 2 && streamStonePlacements.length < streamStoneCount; i++) {
    const z = range(-26, 26);
    const x = streamCenterX(z) + range(-3.6, 3.6);
    const h = heightAt(x, z);
    streamStonePlacements.push({
      x,
      z,
      y: Math.max(h, WATER_Y - 0.25) + 0.1,
      rot: float() * Math.PI * 2,
      scale: range(0.5, 1.5),
      scaleY: range(0.5, 1.0),
    });
  }
  root.add(createRockField({
    kit, geometry: streamStoneGeometry, placements: streamStonePlacements, material: rockMaterial,
    name: 'redwood-stream-stones',
  }));

  // --- Fallen logs (simple kit cylinders, kept out of the shell) -----------
  const logGeometry = new THREE.CylinderGeometry(0.5, 0.58, 8.5, 7);
  logGeometry.rotateZ(Math.PI / 2);
  track(logGeometry);
  const logMaterial = kit.track(new THREE.MeshStandardMaterial({
    color: '#3f3020', roughness: 0.96, metalness: 0.02,
  }));
  const logDefs = [
    { x: 15.6, z: -12.0, rot: 0.7, length: 1.1 },
    { x: -15.8, z: -5.5, rot: 2.3, length: 1.3 },
    { x: 16.2, z: 6.5, rot: 1.6, length: 0.95 },
    { x: -15.6, z: 11.5, rot: 0.4, length: 1.2 },
    { x: -19.4, z: 3.0, rot: 0.12, length: 1.5, crossing: true },
    { x: 10.5, z: 15.0, rot: 2.8, length: 0.85 },
  ];
  const logPlacements = [];
  for (const def of logDefs) {
    if (shellClearance(def.x, def.z) < 2.2) continue;
    const h = heightAt(def.x, def.z);
    if (h < WATER_Y + 0.1 && !def.crossing) continue;
    logPlacements.push({
      x: def.x,
      z: def.z,
      y: Math.max(h, WATER_Y + 0.18) + 0.25,
      rot: def.rot,
      rx: range(-0.04, 0.04),
      rz: range(-0.05, 0.05),
      sx: def.length,
      sy: range(0.8, 1.15),
      sz: range(0.85, 1.2),
    });
  }
  root.add(instanceVegetation({
    geometry: logGeometry,
    material: logMaterial,
    placements: logPlacements,
    name: 'redwood-logs',
    build: (dummy, p) => dummy.rotation.set(p.rx ?? 0, p.rot ?? 0, p.rz ?? 0),
  }));

  // --- Moss cushions and shaded undergrowth --------------------------------
  const mossGeometry = createRockGeometry({
    float, detail: 1, jaggedness: 0.34, color: '#3c5a31', squash: [1.25, 0.36, 1.25],
  });
  track(mossGeometry);
  const mossMaterial = kit.track(new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.92, metalness: 0, flatShading: true,
  }));
  const mossPlacements = scatter({
    count: scaleForTier(tier, 'grassScale', 90),
    minRadius: 8.5,
    maxRadius: 40,
    float,
    heightAt,
    accept: ({ h }) => h > WATER_Y + 0.2,
    minSpacing: 1.1,
  }).map((p) => ({
    ...p,
    y: p.h + 0.03,
    rot: float() * Math.PI * 2,
    scale: range(0.35, 1.5),
  }));
  root.add(createRockField({
    kit, geometry: mossGeometry, placements: mossPlacements, material: mossMaterial,
    name: 'redwood-moss',
  }));

  // --- Ferns, clustered in the shade of trunks and the clearing rim --------
  const fernGeometry = createFernGeometry({ radius: 1.15, fronds: 9, color: '#3e6a39', rng: float });
  track(fernGeometry);
  const fernMaterial = kit.wind(new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.9, metalness: 0, side: THREE.DoubleSide,
  }), { height: 1.1, strength: 0.11 });
  const shadeCenters = [];
  for (const trunk of trunkPlacements) {
    shadeCenters.push({ x: trunk.x + range(-3, 3), z: trunk.z + range(-3, 3) });
    if (shadeCenters.length >= 10) break;
  }
  for (const angle of [0.55, 1.05, 1.7, 3.85, 4.4, 5.1, 5.75]) {
    const r = range(14.5, 18);
    shadeCenters.push({ x: Math.cos(angle) * r, z: Math.sin(angle) * r });
  }
  const fernTarget = scaleForTier(tier, 'vegetationScale', 110);
  const fernPlacements = [];
  for (let i = 0; i < fernTarget * 6 && fernPlacements.length < fernTarget; i++) {
    const center = shadeCenters[Math.floor(float() * shadeCenters.length) % shadeCenters.length];
    const angle = float() * Math.PI * 2;
    const r = range(0.3, 2.8);
    const x = center.x + Math.cos(angle) * r;
    const z = center.z + Math.sin(angle) * r;
    if (shellClearance(x, z) < 1.4) continue;
    const h = heightAt(x, z);
    if (h < WATER_Y + 0.25) continue;
    fernPlacements.push({ x, z, y: h, rot: float() * Math.PI * 2, scale: range(0.55, 1.3) });
  }
  root.add(instanceVegetation({
    geometry: fernGeometry, material: fernMaterial, placements: fernPlacements, name: 'redwood-ferns',
  }));

  // --- Undergrowth grass tufts across the floor ----------------------------
  const grassGeometry = createGrassTuftGeometry({
    blades: 6, height: 0.58, width: 0.05, rng: float,
    tipColor: '#718049', baseColor: '#344a2c',
  });
  track(grassGeometry);
  const grassMaterial = kit.wind(new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.9, metalness: 0, side: THREE.DoubleSide,
  }), { height: 0.65, strength: 0.16 });
  const grassPlacements = scatter({
    count: scaleForTier(tier, 'grassScale', 1100),
    minRadius: 8,
    maxRadius: 44,
    float,
    heightAt,
    accept: ({ x, z, h }) => h > WATER_Y + 0.35 && shellClearance(x, z) > 0.7,
    minSpacing: 0.55,
  }).map((p) => ({ ...p, y: p.h, rot: float() * Math.PI * 2, scale: range(0.65, 1.45) }));
  root.add(instanceVegetation({
    geometry: grassGeometry, material: grassMaterial, placements: grassPlacements, name: 'redwood-grass',
  }));

  // --- Glowing fungi: the firefly-night signature, dormant by day ----------
  const stemGeometry = new THREE.CylinderGeometry(0.05, 0.075, 0.3, 5);
  stemGeometry.translate(0, 0.15, 0);
  const capGeometry = new THREE.SphereGeometry(0.17, 7, 5, 0, Math.PI * 2, 0, Math.PI * 0.5);
  capGeometry.translate(0, 0.29, 0);
  track(stemGeometry);
  track(capGeometry);
  const stemMaterial = kit.track(new THREE.MeshStandardMaterial({
    color: '#8d9a7d', roughness: 0.9, metalness: 0,
  }));
  const fungiMaterial = kit.track(new THREE.MeshStandardMaterial({
    color: '#8fb894', emissive: '#5ad39a', emissiveIntensity: 0.9, roughness: 0.7, metalness: 0,
  }));
  const fungiSpots = [];
  for (const trunk of trunkPlacements) {
    if (fungiSpots.length >= 6) break;
    const angle = float() * Math.PI * 2;
    const r = range(3.8, 6.8);
    const x = trunk.x + Math.cos(angle) * r;
    const z = trunk.z + Math.sin(angle) * r;
    fungiSpots.push({ x, z, y: heightAt(x, z) });
  }
  for (const spot of [
    { angle: 0.62, radius: 16.4 },
    { angle: 1.22, radius: 16.8 },
    { angle: 3.9, radius: 16.1 },
    { angle: 5.5, radius: 15.4 },
  ]) {
    const x = Math.cos(spot.angle) * spot.radius;
    const z = Math.sin(spot.angle) * spot.radius;
    if (shellClearance(x, z) < 1.2) continue;
    fungiSpots.push({ x, z, y: heightAt(x, z) });
  }
  const fungiPlacements = [];
  for (const spot of fungiSpots) {
    const n = 2 + Math.floor(float() * 3);
    for (let i = 0; i < n; i++) {
      const angle = float() * Math.PI * 2;
      const r = float() * 0.55;
      const x = spot.x + Math.cos(angle) * r;
      const z = spot.z + Math.sin(angle) * r;
      fungiPlacements.push({
        x, z, y: heightAt(x, z) + 0.02, rot: float() * Math.PI * 2, scale: range(0.7, 1.35),
      });
    }
  }
  root.add(instanceVegetation({
    geometry: stemGeometry, material: stemMaterial, placements: fungiPlacements,
    name: 'redwood-fungi-stems',
  }));
  root.add(instanceVegetation({
    geometry: capGeometry, material: fungiMaterial, placements: fungiPlacements,
    name: 'redwood-fungi-caps',
  }));

  // --- Atmosphere: layered ground mist, fireflies, spores, drifting leaves -
  const mistGround = createParticleField({
    count: scaleForTier(tier, 'particleScale', 80),
    kind: 'mist',
    area: [budget.terrainSize * 0.5, 2.4, budget.terrainSize * 0.5],
    origin: [0, 0.5, 0],
    size: 30,
    color: '#c6d0bd',
    opacity: 0.06,
    fall: 0.4,
    float,
    track,
    name: 'redwood-mist-ground',
  });
  mesh(mistGround.points);
  const mistMid = createParticleField({
    count: scaleForTier(tier, 'particleScale', 60),
    kind: 'mist',
    area: [budget.terrainSize * 0.48, 5.5, budget.terrainSize * 0.48],
    origin: [0, 3.6, 0],
    size: 42,
    color: '#c6d0bd',
    opacity: 0.035,
    fall: 0.3,
    float,
    track,
    name: 'redwood-mist-mid',
  });
  mesh(mistMid.points);
  const mistHigh = createParticleField({
    count: scaleForTier(tier, 'particleScale', 42),
    kind: 'mist',
    area: [budget.terrainSize * 0.44, 7, budget.terrainSize * 0.44],
    origin: [0, 9.5, 0],
    size: 58,
    color: '#c6d0bd',
    opacity: 0.02,
    fall: 0.22,
    float,
    track,
    name: 'redwood-mist-high',
  });
  mesh(mistHigh.points);

  const fireflyCount = scaleForTier(tier, 'particleScale', 260);
  const fireflies = createParticleField({
    count: fireflyCount,
    kind: 'firefly',
    area: [58, 7.5, 58],
    origin: [0, 2.6, 0],
    size: 7,
    color: '#eaf7a8',
    opacity: 0.9,
    fall: 0.3,
    glow: 1,
    additive: true,
    float,
    track,
    name: 'redwood-fireflies',
  });
  mesh(fireflies.points);

  const spores = createParticleField({
    count: scaleForTier(tier, 'particleScale', 120),
    kind: 'spore',
    area: [budget.terrainSize * 0.5, 12, budget.terrainSize * 0.5],
    origin: [0, 3.5, 0],
    size: 4,
    color: '#d5e0c4',
    opacity: 0.2,
    fall: 0.5,
    glow: 0.4,
    float,
    track,
    name: 'redwood-spores',
  });
  mesh(spores.points);

  const leafFall = createParticleField({
    count: scaleForTier(tier, 'particleScale', 70),
    kind: 'spore',
    area: [budget.terrainSize * 0.4, 9, budget.terrainSize * 0.4],
    origin: [0, 4.5, 0],
    size: 6,
    color: '#b07a3e',
    opacity: 0.25,
    fall: 0.85,
    glow: 0.3,
    float,
    track,
    name: 'redwood-leaf-fall',
  });
  mesh(leafFall.points);

  // --- Shafts and the quiet flock ------------------------------------------
  const sunShafts = createLightShafts({
    float,
    count: Math.max(3, Math.round(6 * budget.particleScale)),
    ring: [20, 36],
    origin: [0, 9, 0],
    color: '#ffe3ac',
    opacity: 0.055,
    width: [1.2, 3],
    length: [12, 20],
    track,
    name: 'redwood-sunshafts',
  });
  mesh(sunShafts.group);
  const fogShafts = createLightShafts({
    float,
    count: Math.max(2, Math.round(4 * budget.particleScale)),
    ring: [20, 36],
    origin: [0, 7, 0],
    color: '#e6e9d6',
    opacity: 0.03,
    width: [1.5, 3.5],
    length: [10, 18],
    track,
    name: 'redwood-haze-shafts',
  });
  mesh(fogShafts.group);

  const flock = createFlock({
    count: Math.max(2, Math.round(6 * budget.shoreDetail)),
    radius: [30, 58],
    height: [24, 36],
    color: '#1e2924',
    speed: 0.035,
    float,
    track,
    name: 'redwood-birds',
  });
  mesh(flock.mesh);

  mesh(root);

  // --- Variant response ----------------------------------------------------
  const variantFeatures = { ...(row?.features ?? {}) };
  let variantVisualId = variantId;
  let fungiGlow = 0.9;

  function applyWaterSky(visuals = row?.visuals ?? {}) {
    const elevation = Number.isFinite(visuals.sunElevation) ? visuals.sunElevation : 0.4;
    const azimuth = Number.isFinite(visuals.sunAzimuth) ? visuals.sunAzimuth : 0.4;
    const ce = Math.cos(elevation);
    water.setSky({
      skyColor: visuals.skyColor,
      horizonColor: visuals.horizonGlowColor ?? visuals.fogColor,
      sunColor: visuals.sunColor,
      sunDir: [ce * Math.cos(azimuth), Math.max(0.05, Math.sin(elevation)), ce * Math.sin(azimuth)],
      sunIntensity: visuals.sunIntensity,
    });
  }

  function applyVariant() {
    const features = variantFeatures;
    const fireflyNight = variantVisualId === 'firefly';
    const morningFog = variantVisualId === 'fog';
    const afternoon = variantVisualId === 'sunshafts';

    water.mesh.visible = (features.water ?? 0) > 0.05;
    water.uniforms.uChop.value = morningFog ? 0.06 : 0.025;
    water.uniforms.uGlow.value = fireflyNight ? 0.22 : 0;
    water.uniforms.uWaveHeight.value = morningFog ? 0.07 : 0.045;

    // Layered ground mist: the fog morning keeps all three, the other
    // variants keep fewer and fainter.
    const mistPresence = features.mist ?? 0.5;
    mistGround.setOpacity((morningFog ? 0.1 : 0.045) + mistPresence * 0.035);
    mistMid.setOpacity(morningFog ? 0.065 : 0.02 + mistPresence * 0.018);
    mistHigh.setOpacity(morningFog ? 0.04 : 0);
    const mistColor = morningFog ? '#cfd8c6' : fireflyNight ? '#7d9890' : '#d8dcc2';
    mistGround.uniforms.uColor.value.set(mistColor);
    mistMid.uniforms.uColor.value.set(mistColor);
    mistHigh.uniforms.uColor.value.set(mistColor);

    fireflies.setOpacity(0.9 * (features.fireflies ?? 0));

    const sporeAmount = features.spores ?? 0;
    spores.uniforms.uColor.value.set(afternoon ? '#ffe8b2' : morningFog ? '#dbe4cc' : '#c3d8b8');
    spores.setOpacity(sporeAmount * 0.32);

    leafFall.uniforms.uColor.value.set(afternoon ? '#c08a4a' : '#a8763f');
    leafFall.setOpacity((features.leafFall ?? 0) * 0.7);

    sunShafts.group.visible = afternoon;
    fogShafts.group.visible = morningFog;
    flock.mesh.visible = (features.birds ?? 0) > 0.05;

    fungiGlow = fireflyNight ? 1.5 : morningFog ? 0.4 : 0.32;
    fungiMaterial.emissiveIntensity = fungiGlow;

    // Keep ambient material colors slightly lifted so the night never
    // crushes to black (the theater stays the warm light source).
    const lift = fireflyNight ? 1 : morningFog ? 0.45 : 0.3;
    terrain.material.emissiveIntensity = lift;
    trunkMaterial.emissiveIntensity = lift * 0.7;
  }

  applyVariant();
  applyWaterSky();

  function update(time, dt, state = {}) {
    water.update(time, dt, state);
    if (Number.isFinite(state.wetness)) {
      water.uniforms.uOpacity.value = clamp(0.84 + state.wetness * 0.1, 0.84, 0.96);
    }
    mistGround.update(time, dt, state);
    mistMid.update(time, dt, state);
    mistHigh.update(time, dt, state);
    fireflies.update(time, dt, state);
    spores.update(time, dt, state);
    leafFall.update(time, dt, state);
    sunShafts.update(time);
    fogShafts.update(time);
    flock.update(time, dt, state);
    fungiMaterial.emissiveIntensity = fungiGlow * (0.82 + 0.18 * Math.sin(time * 1.6));
  }

  function setVariant(next) {
    Object.assign(variantFeatures, next?.features ?? {});
    if (typeof next?.variantId === 'string') variantVisualId = next.variantId;
    applyVariant();
    applyWaterSky(next?.visuals);
  }

  // --- Atmosphere hooks ----------------------------------------------------
  const canopyZones = [...trunkPlacements]
    .sort((a, b) => (b.radius ?? 0) - (a.radius ?? 0))
    .slice(0, 3)
    .map((trunk, i) => {
      const span = 7 + (trunk.radius ?? 3) * 1.6;
      return {
        id: `redwood-canopy-${i + 1}`,
        rect: {
          minX: trunk.x - span,
          maxX: trunk.x + span,
          minZ: trunk.z - span,
          maxZ: trunk.z + span,
        },
        roofY: 22,
        exposure: 0.4,
        priority: 1,
        feather: 3,
      };
    });

  const emitterAnchors = [
    { id: 'redwood-pool-1', kind: 'puddle', x: 14.5, z: 3.0, w: 1.4, d: 1.0, y: heightAt(14.5, 3.0) + 0.05 },
    { id: 'redwood-pool-2', kind: 'puddle', x: -14.8, z: -3.5, w: 1.6, d: 1.1, y: heightAt(-14.8, -3.5) + 0.05 },
    { id: 'redwood-pool-3', kind: 'puddle', x: 6.0, z: 14.2, w: 1.2, d: 0.9, y: heightAt(6.0, 14.2) + 0.05 },
  ];
  for (const trunk of [...trunkPlacements].sort((a, b) => (b.radius ?? 0) - (a.radius ?? 0)).slice(0, 3)) {
    emitterAnchors.push({
      id: `redwood-drip-${emitterAnchors.length}`,
      kind: 'runoff',
      x: trunk.x,
      z: trunk.z,
      y: 9,
    });
  }

  return {
    update,
    setVariant,
    dispose() { kit.disposeAll(); },
    environment: {
      materialFamilies: [
        { key: 'redwood-trunk', material: trunkMaterial, sheltered: false, dry: Object.freeze({ color: trunkMaterial.color.getHex(), roughness: 0.94, metalness: 0.02 }) },
        { key: 'redwood-terrain', material: terrain.material, sheltered: false, dry: Object.freeze({ color: terrain.material.color.getHex(), roughness: 0.97, metalness: 0 }) },
        { key: 'redwood-roots', material: rootMaterial, sheltered: false, dry: Object.freeze({ color: rootMaterial.color.getHex(), roughness: 0.96, metalness: 0.02 }) },
        { key: 'redwood-logs', material: logMaterial, sheltered: false, dry: Object.freeze({ color: logMaterial.color.getHex(), roughness: 0.96, metalness: 0.02 }) },
        { key: 'redwood-rocks', material: rockMaterial, sheltered: false, dry: Object.freeze({ color: rockMaterial.color.getHex(), roughness: 0.97, metalness: 0.02 }) },
      ],
      zones: canopyZones,
      emitterAnchors,
    },
    counts: {
      trunks: trunkPlacements.length,
      roots: rootPlacements.length,
      branches: branchPlacements.length,
      ferns: fernPlacements.length,
      grass: grassPlacements.length,
      rocks: boulderPlacements.length + streamStonePlacements.length,
      logs: logPlacements.length,
      moss: mossPlacements.length,
      mushrooms: fungiPlacements.length,
      fireflies: fireflyCount,
      mistLayers: 3,
    },
  };
}
