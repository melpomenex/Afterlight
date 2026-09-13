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
  createGrassTuftGeometry,
  instanceVegetation,
} from './lib/vegetation.js';
import { createWater } from './lib/water.js';
import { createParticleField, createFlock } from './lib/particles.js';
import { createLightShafts } from './lib/skyFx.js';
import { scaleForTier, budgetForEnvironmentTier } from './quality.js';
import { createRedwoodTrunkGeometry, createSwordFernGeometry } from './lib/redwoodGeometry.js';
import { createRedwoodSurfaceTextures } from './lib/redwoodMaterials.js';

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

/** The stream runs north–south along the west edge, then sweeps across the south-west foreground. */
function streamCenterX(z) {
  if (z < 4) {
    return -21.0 + Math.sin(z * 0.14) * 1.5;
  }
  // Sweeps south-west across foreground: -21 at z=4, -14.1 at z=10, -9.5 at z=14, -4.9 at z=18, -0.3 at z=22
  return -21.0 + (z - 4) * 1.15;
}

function streamDistance(x, z) {
  const cx = streamCenterX(z);
  return x - cx; // Positive = towards east (bank side)
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
  const surfaces = createRedwoodSurfaceTextures(track, budget.terrainSize);

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

    // Stream & foreground creek carving:
    // Smoothly avoid theater shell footprint
    const shellSafe = smoothstep(1.5, 3.5, shellClearance(x, z));
    const cx = streamCenterX(z);
    const eastDist = x - cx;

    // Channel bed is carved to -2.05 (depth 0.55 below WATER_Y = -1.5)
    // Bank slopes smoothly from eastDist = 0.5 to eastDist = 3.6
    if (eastDist < 3.8 && shellSafe > 0) {
      const bankU = smoothstep(0.4, 3.6, eastDist);
      const bedDepth = -2.05 + (fbm(x * 0.35, z * 0.35, { octaves: 3, frequency: 1, seed: 523 }) - 0.5) * 0.15;
      const carved = bedDepth * (1 - bankU) + h * bankU;
      h = h * (1 - shellSafe) + Math.min(h, carved) * shellSafe;
    }

    return h;
  }

  const dampDuff = new THREE.Color('#382e26');    // Rich dark organic duff
  const warmNeedles = new THREE.Color('#4e3e32'); // Muted needle duff mounds
  const moss = new THREE.Color('#345c24');        // vibrant forest moss along creek bank
  const mossDark = new THREE.Color('#203a16');    // deep forest shadow moss
  const streamBed = new THREE.Color('#101e22');   // dark river silt
  const streamGravel = new THREE.Color('#263438'); // wet slate river gravel
  const clearingFloor = new THREE.Color('#3c342c'); // trampled clearing floor tint
  const forestRock = new THREE.Color('#3e443c');  // weathered granite
  const colorScratch = new THREE.Color();

  const terrain = createTerrain({
    size: budget.terrainSize,
    segments: budget.terrainSegments,
    height: heightAt,
    colorAt: ({ x, z, h, slope }) => {
      const macroNoise = fbm(x, z, { octaves: 3, frequency: 0.05, seed: 443 });
      const mossNoise = fbm(x, z, { octaves: 4, frequency: 0.12, seed: 601 });
      colorScratch.copy(dampDuff).lerp(warmNeedles, macroNoise);

      // Moss prefers shaded pockets and flat hollows
      if (mossNoise > 0.62 && slope < 0.4) {
        const mossiness = clamp((mossNoise - 0.62) * 3.5, 0, 1);
        colorScratch.lerp(mossNoise > 0.82 ? mossDark : moss, mossiness * 0.7);
      }

      // Creek bank: lush mossy lip and wet waterline gravel
      if (h < WATER_Y + 0.42) {
        // Lush green bank sloping into the creek
        colorScratch.lerp(moss, smoothstep(WATER_Y + 0.42, WATER_Y + 0.08, h) * 0.85);
        // Wet slate pebble / silt band at waterline
        colorScratch.lerp(streamBed, smoothstep(WATER_Y + 0.1, WATER_Y - 0.25, h));
        colorScratch.lerp(streamGravel, smoothstep(WATER_Y + 0.05, WATER_Y - 0.7, h) * 0.7);
      }

      const clearing = clearingMask(x, z);
      if (clearing > 0.05) colorScratch.lerp(clearingFloor, clearing * 0.35);
      if (slope > 0.5) colorScratch.lerp(forestRock, smoothstep(0.5, 1.4, slope) * 0.5);
      return colorScratch;
    },
    y: 0,
    roughness: 0.95,
    metalness: 0,
  });
  // Peat shadow lift keeps night readable without crushing to black
  terrain.material.emissive.set('#0a0806');
  terrain.material.emissiveIntensity = 0.08;
  terrain.material.map = surfaces.floor;
  terrain.material.bumpMap = surfaces.floor;
  terrain.material.bumpScale = 0.32;
  root.add(terrain.mesh);
  track(terrain);

  // --- The stream: a shallow carved channel west of the clearing -----------
  const water = createWater({
    size: 140,
    segments: budget.waterSegments,
    waterY: WATER_Y,
    terrainHeight: heightAt,
    shoreRange: 0.65,
    waveHeight: 0.022,
    chop: 0.015,
    deepColor: '#0a161a',      // deep dark jade/slate river pool
    shallowColor: '#1a363c',   // translucent blue-tinted creek water
    opacity: 0.84,             // translucent so creek bed and river stones show through
    depthScale: 0.65,          // accurate depth gradient for 0.55m carved bed
    fresnelMix: 0.88,          // reflective blue sky sheen at grazing angles
    fresnelPower: 1.8,
    foamStrength: 0.03,
    normalFreq: 1.8,
    normalBoost: 2.8,
    ripple: 0.35,
  });
  root.add(water.mesh);
  track(water);

  // --- Ancient trunks: the vertical scale of the place ---------------------
  const trunkDefs = [
    { height: 38, radius: 1.65, color: '#7a8492', ridgeColor: '#242830', buttresses: 6 },
    { height: 46, radius: 2.1, color: '#727c8a', ridgeColor: '#22262c', buttresses: 7 },
    { height: 54, radius: 2.7, color: '#6a7482', ridgeColor: '#20242a', buttresses: 8 },
  ];
  const trunkMaterial = kit.track(new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.88, metalness: 0.02,
    emissive: new THREE.Color('#0a0e12'), emissiveIntensity: 0.08,
    map: surfaces.bark, bumpMap: surfaces.bark, bumpScale: 0.44,
    normalMap: surfaces.barkNormal,
    normalScale: new THREE.Vector2(2.4, 2.4),
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
    { variant: 0, x: -12.2, z: 16.2 },
    { variant: 0, x: 16.7, z: -10.8 },
    { variant: 0, x: -18.8, z: 0.4 },
    { variant: 0, x: -25.0, z: -5.0 },
    { variant: 0, x: -14.0, z: -24.0 },
  ].slice(0, trunkCounts[0])) {
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
    const geometry = createRedwoodTrunkGeometry({
      height: def.height,
      radius: def.radius,
      color: def.color,
      ridgeColor: def.ridgeColor,
      buttresses: def.buttresses,
      rng: float,
      segments: tier === 'low' ? 32 : 48,
    });
    track(geometry);
    // Keep the giants behind the clearing. The front is a fern-and-root
    // apron, so tall foreground columns cannot erase the playable theater.
    const clearance = 5 + def.radius * 1.65;
    const scattered = scatter({
      count: Math.max(0, trunkCounts[v] - gatewayByVariant[v].length),
      minRadius: 18,
      maxRadius: 65,
      float,
      heightAt,
      accept: ({ x, z, h }) => {
        if (z > 4 || x + z > 9) return false;
        if (shellClearance(x, z) < clearance) return false;
        if (streamDistance(x, z) < 6.5) return false;
        if (h < WATER_Y + 0.2) return false;
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

  // High branches: keep empty so thin lines don't cross the upper sky in the camera frame
  const branchGeometry = track(new THREE.BufferGeometry());
  const branchMaterial = kit.track(new THREE.MeshStandardMaterial({
    color: '#2c2118', roughness: 0.95, metalness: 0.02,
  }));
  const branchPlacements = [];
  root.add(instanceVegetation({
    geometry: branchGeometry,
    material: branchMaterial,
    placements: branchPlacements,
    name: 'redwood-high-branches',
    build: (dummy, p) => dummy.rotation.set(p.rx ?? 0, p.rot ?? 0, p.rz ?? 0),
  }));

  // --- Buttressed roots crossing the middle distance -----------------------
  const rootGeometry = new THREE.CylinderGeometry(0.08, 0.5, 4.5, 8, 8);
  const rootPosition = rootGeometry.attributes.position;
  for (let i = 0; i < rootPosition.count; i++) {
    const t = (rootPosition.getY(i) + 2.25) / 4.5;
    const cross = rootPosition.getX(i);
    rootPosition.setXYZ(i, t * 4.5, cross + 0.15 + Math.sin(t * Math.PI) * 0.3,
      rootPosition.getZ(i) + Math.sin(t * Math.PI * 1.6) * 0.25);
  }
  rootGeometry.computeVertexNormals();
  track(rootGeometry);
  const rootMaterial = kit.track(new THREE.MeshStandardMaterial({
    color: '#66503b', roughness: 0.96, metalness: 0.02,
    map: surfaces.bark, bumpMap: surfaces.bark, bumpScale: 0.12,
  }));
  const rootPlacements = [];
  const rootTarget = scaleForTier(tier, 'vegetationScale', 12);
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
      sx: range(0.6, 1.3),
      sy: range(0.7, 1.2),
      sz: range(0.7, 1.2),
    });
  }
  root.add(instanceVegetation({
    geometry: rootGeometry,
    material: rootMaterial,
    placements: rootPlacements,
    name: 'redwood-roots',
  }));

  // --- Rocks: boulders in the moss, half-sunk stones in the stream ---------
  const rockGeometry = createRockGeometry({ float, detail: 3, jaggedness: 0.08, color: '#3a3e38', squash: [1.18, 0.76, 1.15] });
  const rockPos = rockGeometry.attributes.position;
  const rockCols = rockGeometry.attributes.color;
  const mossCap = new THREE.Color('#445232');
  const rockBase = new THREE.Color('#383c36');
  for (let i = 0; i < rockPos.count; i++) {
    const py = rockPos.getY(i);
    const mossU = smoothstep(-0.05, 0.38, py);
    const rc = rockBase.clone().lerp(mossCap, mossU * 0.55);
    rockCols.setXYZ(i, rc.r, rc.g, rc.b);
  }
  rockCols.needsUpdate = true;
  track(rockGeometry);
  const rockMaterial = kit.track(new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.90, metalness: 0.02,
    emissive: new THREE.Color('#060a08'), emissiveIntensity: 0.12,
  }));

  // Dedicated rounded mossy gray boulders matching the target
  const foregroundBoulders = [
    // Primary large mossy boulder in bot3 (south-east porch corner)
    { x: 15.0, z: 7.3, rot: 0.8, scale: 2.2, scaleY: 1.3 },
    // Secondary boulder in bot3
    { x: 16.1, z: 4.6, rot: 2.1, scale: 1.25, scaleY: 0.85 },
    // Bank boulder in bot2 (north bank of foreground creek, past the fallen log)
    { x: 2.5, z: 14.8, rot: 1.4, scale: 1.5, scaleY: 0.95 },
    // West bank boulder in bot1
    { x: -14.5, z: 15.0, rot: 0.9, scale: 1.3, scaleY: 0.85 },
  ].map((p) => ({
    ...p,
    h: heightAt(p.x, p.z),
    y: heightAt(p.x, p.z) - 0.18,
    rx: 0.05,
    rz: -0.05,
  }));

  const scatteredBoulders = scatter({
    count: Math.max(0, scaleForTier(tier, 'rockScale', 56) - foregroundBoulders.length),
    minRadius: 9,
    maxRadius: 42,
    float,
    heightAt,
    accept: ({ x, z, h }) => h > WATER_Y + 0.25 && shellClearance(x, z) > 1.8,
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

  const boulderPlacements = [...foregroundBoulders, ...scatteredBoulders];
  root.add(createRockField({
    kit, geometry: rockGeometry, placements: boulderPlacements, material: rockMaterial,
    name: 'redwood-boulders',
  }));

  const streamStoneGeometry = createRockGeometry({
    float, detail: 0, jaggedness: 0.45, color: '#3e4640', squash: [1.3, 0.5, 1.3],
  });
  track(streamStoneGeometry);
  const streamStonePlacements = [];
  const streamStoneCount = Math.max(6, Math.round(18 * budget.rockScale));
  for (let i = 0; i < streamStoneCount * 2 && streamStonePlacements.length < streamStoneCount; i++) {
    const z = range(-24, 24);
    const cx = streamCenterX(z);
    const x = cx + range(-2.8, 2.8);
    const h = heightAt(x, z);
    if (h > WATER_Y + 0.15) continue;
    streamStonePlacements.push({
      x,
      z,
      y: Math.max(h, WATER_Y - 0.22) + 0.08,
      rot: float() * Math.PI * 2,
      scale: range(0.6, 1.6),
      scaleY: range(0.5, 1.0),
    });
  }
  root.add(createRockField({
    kit, geometry: streamStoneGeometry, placements: streamStonePlacements, material: rockMaterial,
    name: 'redwood-stream-stones',
  }));

  // --- Fallen logs: prominent weathered log across foreground bank, floating log in creek ---
  const logGeometry = new THREE.CylinderGeometry(0.44, 0.52, 6.2, 16, 4);
  logGeometry.rotateZ(Math.PI / 2);
  const logPos = logGeometry.attributes.position;
  const logColors = new Float32Array(logPos.count * 3);
  const barkCol = new THREE.Color('#78685c');
  const woodCol = new THREE.Color('#d4c2a0');
  for (let i = 0; i < logPos.count; i++) {
    const px = Math.abs(logPos.getX(i));
    const isEnd = px > 2.85;
    const c = isEnd ? woodCol : barkCol;
    logColors[i * 3] = c.r;
    logColors[i * 3 + 1] = c.g;
    logColors[i * 3 + 2] = c.b;
  }
  logGeometry.setAttribute('color', new THREE.BufferAttribute(logColors, 3));
  track(logGeometry);

  const logMaterial = kit.track(new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.92, metalness: 0.02,
    map: surfaces.bark, bumpMap: surfaces.bark, bumpScale: 0.24,
    normalMap: surfaces.barkNormal,
    normalScale: new THREE.Vector2(1.2, 1.2),
  }));
  const logDefs = [
    // Fallen log on the needle bank in bot2
    { x: -4.0, z: 14.5, rot: 0.45, length: 1.1 },
    // Floating log in the creek in bot1
    { x: -14.2, z: 12.0, rot: 0.25, length: 0.8 },
    // Prominent log across north-west needle bank
    { x: -16.0, z: -5.5, rot: 2.3, length: 1.1 },
    { x: 15.6, z: -12.0, rot: 0.7, length: 1.0 },
    { x: -15.6, z: 10.5, rot: 0.4, length: 1.0 },
  ];
  const logPlacements = [];
  for (const def of logDefs) {
    if (shellClearance(def.x, def.z) < 0.6) continue;
    const h = heightAt(def.x, def.z);
    logPlacements.push({
      x: def.x,
      z: def.z,
      y: Math.max(h, WATER_Y - 0.06) + 0.26,
      rot: def.rot,
      rx: range(-0.03, 0.03),
      rz: range(-0.04, 0.04),
      sx: def.length,
      sy: range(0.85, 1.15),
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
    float, detail: 2, jaggedness: 0.13, color: '#526645', squash: [1.25, 0.36, 1.25],
  });
  track(mossGeometry);
  const mossMaterial = kit.track(new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.92, metalness: 0,
  }));
  const mossPlacements = scatter({
    count: scaleForTier(tier, 'grassScale', 90),
    minRadius: 8.5,
    maxRadius: 40,
    float,
    heightAt,
    accept: ({ x, z, h }) => h > WATER_Y + 0.2 && shellClearance(x, z) > 1.5,
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
  const fernGeometry = createSwordFernGeometry({ radius: 1.4, fronds: 7, color: '#567c48', rng: float });
  track(fernGeometry);
  const fernMaterial = kit.wind(new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.9, metalness: 0, side: THREE.DoubleSide,
  }), { height: 1.1, strength: 0.11 });
  const shadeCenters = [];
  for (const trunk of trunkPlacements) {
    shadeCenters.push({ x: trunk.x + range(-3, 3), z: trunk.z + range(-3, 3) });
    if (shadeCenters.length >= 4) break;
  }
  shadeCenters.push(
    { x: -11.5, z: 14.0 }, { x: -15.8, z: 14.8 }, { x: -16.5, z: 7 },
    { x: -4.5, z: 13.5 },
    { x: -17, z: -8 }, { x: 17, z: -5 }, { x: 17, z: 9 },
  );
  const fernTarget = scaleForTier(tier, 'vegetationScale', 90);
  const fernPlacements = [];
  for (let i = 0; i < fernTarget * 6 && fernPlacements.length < fernTarget; i++) {
    const center = shadeCenters[Math.floor(float() * shadeCenters.length) % shadeCenters.length];
    const angle = float() * Math.PI * 2;
    const r = range(0.3, 2.5);
    const x = center.x + Math.cos(angle) * r;
    const z = center.z + Math.sin(angle) * r;
    if (shellClearance(x, z) < 1.4) continue;
    // Don't smother the needle bank in front of the theater:
    if (z > 13.8 && x > -3.0 && x < 12.0) continue;
    const h = heightAt(x, z);
    if (h < WATER_Y + 0.38) continue;
    fernPlacements.push({ x, z, y: h, rot: float() * Math.PI * 2, scale: range(0.55, 1.05) });
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
    color: '#ffe8a0',
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
      skyColor: '#5a7c8e',
      horizonColor: '#34464c',
      sunColor: visuals.sunColor ?? '#c4d8da',
      sunDir: [ce * Math.cos(azimuth), Math.max(0.05, Math.sin(elevation)), ce * Math.sin(azimuth)],
      sunIntensity: visuals.sunIntensity ?? 1.0,
    });
  }

  function applyVariant() {
    const features = variantFeatures;
    const fireflyNight = variantVisualId === 'firefly';
    const morningFog = variantVisualId === 'fog';
    const afternoon = variantVisualId === 'sunshafts';

    water.mesh.visible = (features.water ?? 0) > 0.05;
    water.uniforms.uChop.value = morningFog ? 0.06 : 0.022;
    water.uniforms.uGlow.value = fireflyNight ? 0.035 : 0;
    water.uniforms.uWaveHeight.value = morningFog ? 0.07 : 0.04;

    // Layered ground mist: visible cool atmospheric veil in firefly night and fog morning
    const mistPresence = features.mist ?? 0.5;
    mistGround.setOpacity(morningFog ? 0.14 : fireflyNight ? 0.13 : 0.045 + mistPresence * 0.035);
    mistMid.setOpacity(morningFog ? 0.09 : fireflyNight ? 0.085 : 0.02 + mistPresence * 0.018);
    mistHigh.setOpacity(morningFog ? 0.06 : fireflyNight ? 0.055 : 0);
    const mistColor = morningFog ? '#cfd8c6' : fireflyNight ? '#7e9e98' : '#d8dcc2';
    mistGround.uniforms.uColor.value.set(mistColor);
    mistMid.uniforms.uColor.value.set(mistColor);
    mistHigh.uniforms.uColor.value.set(mistColor);

    fireflies.setOpacity(0.9 * (features.fireflies ?? 0));

    const sporeAmount = features.spores ?? 0;
    spores.uniforms.uColor.value.set(afternoon ? '#ffe8b2' : morningFog ? '#dbe4cc' : '#b6d2c4');
    spores.setOpacity(sporeAmount * 0.35);

    leafFall.uniforms.uColor.value.set(afternoon ? '#c08a4a' : '#a8763f');
    leafFall.setOpacity((features.leafFall ?? 0) * 0.7);

    sunShafts.group.visible = afternoon;
    fogShafts.group.visible = morningFog;
    flock.mesh.visible = (features.birds ?? 0) > 0.05;

    fungiGlow = fireflyNight ? 1.5 : morningFog ? 0.4 : 0.32;
    fungiMaterial.emissiveIntensity = fungiGlow;

    // Keep ambient material colors slightly lifted so the night never
    // crushes to black, but low enough to preserve deep rich textures and bumps.
    const lift = fireflyNight ? 1 : morningFog ? 0.45 : 0.3;
    terrain.material.emissiveIntensity = lift * 0.08;
    trunkMaterial.emissiveIntensity = lift * 0.08;
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
    for (const key of Object.keys(variantFeatures)) delete variantFeatures[key];
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
