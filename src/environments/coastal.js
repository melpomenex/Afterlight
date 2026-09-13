/**
 * Coastal Dusk — the reference Theater environment.
 *
 * The Orpheum stands on a rocky headland: stone terrace at y≈0, cliffs and
 * boulder fields dropping to a moving sea at y=-7.5, a sand cove to the
 * south-west, sea stacks and a distant island silhouette on the horizon, wind
 * shaped trees and sea grass on the plateau, shore foam, drifting mist and a
 * low sun with a glint path across the water.
 *
 * Spatial layers (per the campaign brief):
 *   NEAR  — plateau rock, terrace parapet, grass, tide pools
 *   MID   — cliff slopes, boulder fields, coves, breaking shore
 *   FAR   — sea stacks, island silhouettes, haze, birds, sun
 *
 * Everything is generated deterministically from the environment seed and
 * scaled by the environment quality tier. No collision (actors stay inside
 * the Theater bounds); no shared scene or Theater resource is touched.
 */

import * as THREE from 'three';
import { fbm, clamp, smoothstep, createTerrain } from './lib/terrain.js';
import { scatter } from './lib/scatter.js';
import { createRockGeometry, createRockField, createSeaStackGeometry } from './lib/rocks.js';
import { createConiferGeometry, createGrassTuftGeometry, createWindTreeGeometry, instanceVegetation } from './lib/vegetation.js';
import { createWater } from './lib/water.js';
import { createParticleField, createFlock } from './lib/particles.js';
import { scaleForTier } from './quality.js';

const WATER_Y = -2.6;
const PLATEAU_Y = -0.85;
// The worked stone terrace ends just outside the theater floor; the headland
// then drops to the sea within a few units so the water is visible in the
// isometric frame instead of only at the horizon.
// The plateau must cover the Theater's own legacy shell (floor ±12.5, paving
// to ±12, the north backdrop row at z=-13) before it drops to the sea.
const TERRACE_X = 14.2;
const TERRACE_N = 16.5;
const TERRACE_S = 11.8;
const CLIFF_RADIUS = 15.4;

// Sea distance: the headland is NOT an island. Water opens only to the west
// (screen left) and south; land continues beyond the north and east frame
// edges, so the theater reads as perched on a coast rather than a floating
// diorama. Returns the distance past the western/southern terrace edge.
function terraceDistance(x, z) {
  const dx = Math.max(0, -x - TERRACE_X);
  const dz = Math.max(0, z - TERRACE_S);
  return Math.hypot(dx, dz);
}

// Distance from the worked terrace rectangle itself, used for the apron and
// grass zoning so the inland plain is not painted as terrace stone.
function rectDistance(x, z) {
  const dx = Math.max(0, Math.abs(x) - TERRACE_X);
  const dz = z > 0 ? Math.max(0, z - TERRACE_S) : Math.max(0, -z - TERRACE_N);
  return Math.hypot(dx, dz);
}

function sectorMask(x, z, centerAngle, halfWidth, softness = 0.35) {
  const angle = Math.atan2(z, x);
  let delta = Math.abs(angle - centerAngle);
  if (delta > Math.PI) delta = Math.PI * 2 - delta;
  return 1 - smoothstep(halfWidth - softness, halfWidth + softness, delta);
}

export function buildCoastal({ kit, row, variantId = 'sunset', tier = 'high', quality }) {
  const { float, range, mesh, track } = kit;
  const budget = quality;
  const root = new THREE.Group();
  root.name = 'coastal-world';

  // --- Terrain: headland plateau, rock cliffs, a sand cove -----------------
  function heightAt(x, z) {
    const d = terraceDistance(x, z);
    // A short rocky shore drops only ~1.8 units to a shallow sea resting near
    // the terrace level. A shallow drop keeps the broad water surface visible
    // over the lip from the high isometric camera; a deep cliff hides the sea
    // behind its own edge.
    const fall = smoothstep(0.15, 2.4, d);
    let h = PLATEAU_Y - fall * (PLATEAU_Y - WATER_Y);
    // The sea floor falls away quickly so the water around the sea stacks and
    // the mid-band reads as deep color instead of a pale shallow shelf.
    h -= smoothstep(1.2, 10, d) * 11.0;
    // Rock shelves and rubble along the drop.
    const shelf = 4 * fall * (1 - fall);
    h += (fbm(x, z, { octaves: 4, frequency: 0.11, seed: 11 }) - 0.5) * 1.2 * shelf;
    h += (fbm(x, z, { octaves: 3, frequency: 0.27, seed: 23 }) - 0.5) * 0.4 * (0.25 + shelf);
    // Rolling inland hills beyond the terrace so the land side is not a
    // flat slab in frame.
    h += (fbm(x, z, { octaves: 4, frequency: 0.03, seed: 57 }) - 0.5) * 2.6
      * smoothstep(8, 26, rectDistance(x, z));
    // Sand cove to the south-west (screen-left in the showcase camera) with
    // tide pools just above the waterline. Kept narrow so the sea reaches the
    // headland's lower-left instead of a broad beach filling the frame.
    const cove = sectorMask(x, z, 2.25, 0.34) * smoothstep(1.0, 5, d);
    if (cove > 0) {
      const beach = WATER_Y + 0.15 - fbm(x, z, { octaves: 3, frequency: 0.1, seed: 31 }) * 0.35;
      h = h * (1 - cove) + beach * cove;
    }
    // Tide pools: gentle depressions in the sand just above the waterline.
    const poolNoise = fbm(x, z, { octaves: 3, frequency: 0.26, seed: 47 });
    if (cove > 0.3 && h > WATER_Y + 0.12 && h < WATER_Y + 0.9 && poolNoise > 0.55) {
      h -= 0.35;
    }
    return h;
  }

  const sand = new THREE.Color('#cdb28a');
  const wetSand = new THREE.Color('#8f7d5e');
  const rock = new THREE.Color('#8d8779');
  const wetRock = new THREE.Color('#4e4c45');
  const seaFloor = new THREE.Color('#2b3a3a');
  const grass = new THREE.Color('#6d8a4c');
  const rockDark = new THREE.Color('#6b6557');
  const apronStone = new THREE.Color('#7a7463');
  const colorScratch = new THREE.Color();

  // A local terrain size keeps the shoreline on a fine grid; the distant
  // world only needs fog, sea and island silhouettes beyond this.
  const terrainSize = Math.min(budget.terrainSize, 180);
  const terrain = createTerrain({
    size: terrainSize,
    segments: budget.terrainSegments,
    height: heightAt,
    colorAt: ({ x, z, h, slope }) => {
      const d = terraceDistance(x, z);
      const rd = rectDistance(x, z);
      const cove = sectorMask(x, z, 2.25, 0.38) * smoothstep(2, 10, d);
      const grassNoise = fbm(x, z, { octaves: 4, frequency: 0.07, seed: 71 });
      // Base rock with horizontal strata bands so the cliff wall reads as
      // layered stone instead of a single brown slab.
      colorScratch.copy(rock);
      const strata = fbm(x, z, { octaves: 3, frequency: 0.02, seed: 83 });
      colorScratch.lerp(rockDark, strata * 0.55);
      const bandTone = 0.5 + 0.5 * Math.sin(h * 2.6 + strata * 4.0);
      colorScratch.lerp(rockDark, bandTone * 0.42);
      if (h < WATER_Y + 0.3) colorScratch.lerp(seaFloor, smoothstep(WATER_Y + 0.3, WATER_Y - 2.5, h));
      else if (h < WATER_Y + 2.6) colorScratch.lerp(wetRock, smoothstep(WATER_Y + 2.6, WATER_Y + 0.2, h));
      // Sand cove takes over where authored, wet below the tide line.
      const sandBlend = cove * smoothstep(3.5, 0.4, Math.abs(h - WATER_Y - 0.6));
      if (sandBlend > 0) {
        colorScratch.lerp(h < WATER_Y + 0.8 ? wetSand : sand, sandBlend);
      }
      // Plateau grass patches: low slope, inland of the terrace apron and
      // away from the coastal drop, with brighter crowns over the rock.
      const onPlateau = smoothstep(9.5, 5, rd) * smoothstep(0.5, 0.22, slope);
      const patch = clamp((grassNoise - 0.38) * 3.4, 0, 1);
      if (onPlateau > 0.05) colorScratch.lerp(grass, onPlateau * patch);
      // Keep the Theater terrace footprint a worked stone apron.
      const apron = smoothstep(8, 3.5, rd);
      if (apron > 0.4) colorScratch.lerp(apronStone, apron * 0.7);
      return colorScratch;
    },
    y: 0,
    roughness: 0.95,
    metalness: 0.02,
  });
  root.add(terrain.mesh);
  track(terrain);

  // --- Sea -----------------------------------------------------------------
  const water = createWater({
    size: 300,
    segments: budget.openWaterSegments ?? budget.waterSegments,
    waterY: WATER_Y,
    terrainHeight: heightAt,
    shoreRange: 2.2,
    waveHeight: 0.42,
    waveFreq: 2.0,
    // Crest lines run perpendicular to the showcase view so they project as
    // horizontal lines in the isometric frame: the view forward maps to
    // ~0.89 rad in atan2(z, x) terms and the base wave angle is 0.7 rad.
    waveAngle: 0.19,
    chop: 0,
    deepColor: '#0f3542',
    shallowColor: '#17434e',
    opacity: 1.0,
    // The sea mirrors the sunset: grazing wave faces catch the bright sky
    // (low fresnel exponent so the sheen reads as moving streaks, not a flat
    // tint) while steep faces keep the body color. The horizon is measured
    // along the showcase view direction (set in applyWaterSky) so it projects
    // screen-horizontal; the low sun, its ring and glitter column sit on it.
    depthScale: 5,
    fresnelMix: 0.28,
    fresnelPower: 1.4,
    // The open sea fades into bright sunset haze within the showcase frame:
    // aircraft-distance haze is what makes the far water read as a glowing
    // sunset sea instead of a dark navy sheet.
    hazeStart: 30,
    hazeEnd: 80,
    hazeMix: 0.12,
    bandDark: 0.45,
    bandLight: 0.75,
    bandFadeStart: 60,
    bandFadeEnd: 95,
    normalBoost: 1.15,
    normalFreq: 2.0,
    ripple: 0.25,
    whitecap: 0.18,
    sunPath: 0.8,
    foamStrength: 1.1,
    horizonStart: 19,
    horizonEnd: 21.5,
    horizonGlow: 0.5,
  });
  root.add(water.mesh);
  track(water);

  // --- Boulders, cliff rubble and hero sea stacks --------------------------
  const rockGeometry = createRockGeometry({ float, detail: 1, jaggedness: 0.42, color: '#6c655a' });
  track(rockGeometry);
  const boulderCount = scaleForTier(tier, 'rockScale', 64);
  const boulders = scatter({
    count: boulderCount,
    minRadius: 15.8,
    maxRadius: 40,
    float,
    heightAt,
    accept: ({ h, x, z }) => {
      const cove = sectorMask(x, z, 2.25, 0.38);
      if (cove > 0.4 && h < WATER_Y + 1.2) return false; // keep the beach sandy
      return h > WATER_Y - 0.2;
    },
    minSpacing: 2.2,
  });
  const rockPlacements = boulders.map((p) => ({
    ...p,
    y: p.h - 0.25,
    rot: float() * Math.PI * 2,
    rx: (float() - 0.5) * 0.35,
    rz: (float() - 0.5) * 0.35,
    scale: range(0.35, 1.0),
    scaleY: range(0.55, 0.95),
  }));
  const rockMaterial = kit.track(new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.96, metalness: 0.02, flatShading: true,
  }));
  const rockField = createRockField({ kit, geometry: rockGeometry, placements: rockPlacements, material: rockMaterial, name: 'coastal-boulders' });
  root.add(rockField);

  // Platform rocks right at the headland lip sell the cliff edge.
  const lipGeometry = createRockGeometry({ float, detail: 0, jaggedness: 0.5, color: '#5f5a50', squash: [1.4, 0.6, 1.4] });
  track(lipGeometry);
  const lipPlacements = [];
  const lipCount = Math.round(18 * budget.rockScale);
  for (let i = 0; i < lipCount; i++) {
    const a = (i / lipCount) * Math.PI * 2 + float() * 0.2;
    const r = CLIFF_RADIUS - 1.4 + float() * 2.6;
    lipPlacements.push({
      x: Math.cos(a) * r,
      z: Math.sin(a) * r,
      y: heightAt(Math.cos(a) * r, Math.sin(a) * r) - 0.35,
      rot: float() * Math.PI * 2,
      scale: range(0.7, 1.5),
      scaleY: range(0.35, 0.7),
    });
  }
  const lipField = createRockField({ kit, geometry: lipGeometry, placements: lipPlacements, material: rockMaterial, name: 'coastal-lip' });
  root.add(lipField);

  // Hero sea stacks offshore: layered eroded columns, the landmark silhouette
  // the sunset glare sits behind. Each is built at its final size so the
  // erosion wobble stays proportional to the rock (scaling a normalized
  // column would amplify the wobble with the height).
  const seaStacks = new THREE.Group();
  seaStacks.name = 'coastal-sea-stacks';
  const stackDefs = [
    // Hero: rises mid-left of the sea band (screen x≈300-380) with a
    // wind-bent pine crown; a smaller column trails north-west and a low
    // one sits in the south-west water.
    { x: -18.6, z: 0.6, height: 6.8, radius: 1.3, lean: 0.02 },
    { x: -23.8, z: 4.2, height: 4.6, radius: 1.0, lean: -0.05 },
    { x: -15.6, z: 11.4, height: 3.6, radius: 0.9, lean: 0 },
  ];
  const stackMaterial = kit.track(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.98, metalness: 0.02 }));
  for (const def of stackDefs) {
    const geometry = createSeaStackGeometry({ float, height: def.height, radius: def.radius, color: '#3f3a34' });
    track(geometry);
    const stack = new THREE.Mesh(geometry, stackMaterial);
    stack.position.set(def.x, WATER_Y - 1.0, def.z);
    stack.rotation.z = def.lean;
    stack.rotation.y = def.x * 0.7 + def.z * 0.4;
    seaStacks.add(stack);
  }
  root.add(seaStacks);

  // Distant island silhouettes.
  const islandGeometry = createRockGeometry({ float, detail: 1, jaggedness: 0.5, color: '#4d4f4b', squash: [2.6, 0.8, 1.6] });
  track(islandGeometry);
  const islandMaterial = kit.track(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0, flatShading: true, color: '#8b8d88' }));
  const island = new THREE.Mesh(islandGeometry, islandMaterial);
  island.position.set(Math.cos(-2.62) * 96, WATER_Y + 2.2, Math.sin(-2.62) * 96);
  island.scale.set(3.6, 1.6, 2.4);
  island.rotation.y = 0.7;
  root.add(island);
  const island2 = island.clone();
  island2.position.set(Math.cos(0.55) * 124, WATER_Y + 1.0, Math.sin(0.55) * 124);
  island2.scale.set(2.4, 0.8, 1.7);
  root.add(island2);

  // Mid-water islets: small rocks breaking the open sea around the hero
  // stack, with foam collars from the shore-foam depth term.
  const isletGeometry = createRockGeometry({ float, detail: 0, jaggedness: 0.55, color: '#54504a', squash: [1.6, 0.7, 1.2] });
  track(isletGeometry);
  const isletDefs = [
    { x: -27.5, z: -3.5, s: 0.55 },
    { x: -30.5, z: 5.5, s: 0.45 },
    { x: -22.0, z: 10.5, s: 0.4 },
    { x: -31.5, z: -7.5, s: 0.35 },
  ];
  for (const def of isletDefs) {
    const islet = new THREE.Mesh(isletGeometry, islandMaterial);
    islet.position.set(def.x, WATER_Y - 0.55, def.z);
    islet.scale.set(def.s, def.s * 0.5, def.s);
    islet.rotation.y = def.x * 0.9;
    root.add(islet);
  }

  // --- Terrace parapet: a weathered stone lip around the plateau -----------
  const parapet = new THREE.Group();
  parapet.name = 'coastal-parapet';
  const parapetMaterial = kit.track(new THREE.MeshStandardMaterial({ color: '#6a6357', roughness: 0.94, metalness: 0.02 }));
  const blockGeometry = new THREE.BoxGeometry(1, 1, 1);
  track(blockGeometry);
  // Sea wall following the terrace rectangle (not a circle): it runs just
  // inside the headland edge on every side.
  const parapetCount = Math.round(76 * (0.7 + budget.rockScale * 0.3));
  const halfX = TERRACE_X - 0.45;
  const northEdge = TERRACE_N - 0.45;
  const southEdge = TERRACE_S - 0.45;
  const width = halfX * 2;
  const depth = northEdge + southEdge;
  const perimeter = 2 * (width + depth);
  const pointOnRect = (s) => {
    const p = ((s % perimeter) + perimeter) % perimeter;
    if (p < width) return { x: -halfX + p, z: -northEdge, rot: 0 };
    if (p < width + depth) return { x: halfX, z: -northEdge + (p - width), rot: Math.PI / 2 };
    if (p < width * 2 + depth) return { x: halfX - (p - width - depth), z: southEdge, rot: 0 };
    return { x: -halfX, z: southEdge - (p - width * 2 - depth), rot: Math.PI / 2 };
  };
  for (let i = 0; i < parapetCount; i++) {
    const s = (i / parapetCount) * perimeter + Math.sin(i * 2.7) * 0.18;
    const { x, z, rot } = pointOnRect(s);
    const block = new THREE.Mesh(blockGeometry, parapetMaterial);
    block.position.set(x, heightAt(x, z) + 0.55, z);
    block.rotation.y = rot;
    block.scale.set(range(1.0, 1.7), range(0.9, 1.35), range(0.55, 0.8));
    parapet.add(block);
  }
  root.add(parapet);

  // --- Vegetation: sea grass, wind trees -----------------------------------
  const grassGeometry = createGrassTuftGeometry({ blades: 9, height: 0.9, width: 0.12, rng: float, tipColor: '#a5ad60', baseColor: '#4f6a36' });
  track(grassGeometry);
  const grassMaterial = kit.wind(new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.9, metalness: 0, side: THREE.DoubleSide,
  }), { height: 1.0, strength: 0.18 });
  const grassCount = scaleForTier(tier, 'grassScale', 3200);
  const grassPlacements = scatter({
    count: grassCount,
    minRadius: 11.2,
    maxRadius: 28,
    float,
    heightAt,
    accept: ({ h, x, z }) => {
      const cove = sectorMask(x, z, 2.25, 0.38);
      if (cove > 0.35 && h < WATER_Y + 2) return false;
      return h > WATER_Y + 0.6;
    },
    minSpacing: 0.55,
  }).map((p) => ({ ...p, y: p.h, rot: float() * Math.PI * 2, scale: range(0.8, 1.7) }));
  const grassField = instanceVegetation({ geometry: grassGeometry, material: grassMaterial, placements: grassPlacements, name: 'coastal-grass' });
  root.add(grassField);

  const treeGeometry = createWindTreeGeometry({ height: 4.6, lean: 0.5, color: '#4a6046', trunkColor: '#4b3a2b', rng: float });
  track(treeGeometry);
  const treeMaterial = kit.wind(new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.92, metalness: 0,
  }), { height: 4.2, strength: 0.24 });
  const treePlacements = [];
  // Wind-shaped trees on the plateau rim where they read as silhouettes
  // against the sea (west, south-west and north-west of the showcase camera).
  const rimAngles = [3.28, 3.05, 2.78, 2.45, 2.15, -2.15, -2.55, -2.95];
  for (const a of rimAngles) {
    const r = 13.4 + float() * 2.8;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    const h = heightAt(x, z);
    if (h < WATER_Y + 1.6) continue;
    treePlacements.push({ x, z, y: h - 0.15, rot: float() * Math.PI * 2, scale: range(0.45, 0.72) });
  }
  // A few inland trees for depth on the land side.
  const inlandTrees = Math.round(4 * Math.max(0.5, budget.vegetationScale));
  for (let i = 0; i < inlandTrees; i++) {
    const a = float() * Math.PI * 2;
    const r = range(20, 30);
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    const h = heightAt(x, z);
    if (h < WATER_Y + 1.2) continue;
    treePlacements.push({ x, z, y: h - 0.15, rot: float() * Math.PI * 2, scale: range(0.4, 0.65) });
  }
  // The hero sea stack carries an erect pine crown, the landmark detail that
  // reads at showcase distance against the sunset sea.
  const heroTop = WATER_Y - 1.0 + stackDefs[0].height * 1.16;
  const heroTreeGeometry = createConiferGeometry({ height: 3.0, radius: 0.7, tiers: 4, color: '#2f4a34', trunkColor: '#3b2b22' });
  track(heroTreeGeometry);
  const heroTreeField = instanceVegetation({
    geometry: heroTreeGeometry,
    material: treeMaterial,
    placements: [
      { x: stackDefs[0].x, z: stackDefs[0].z, y: heroTop - 0.4, rot: 1.1, scale: 0.65 },
      { x: stackDefs[0].x + 0.4, z: stackDefs[0].z + 0.5, y: heroTop - 0.5, rot: 2.4, scale: 0.4 },
    ],
    name: 'coastal-hero-tree',
    castShadow: false,
  });
  root.add(heroTreeField);
  const treeField = instanceVegetation({ geometry: treeGeometry, material: treeMaterial, placements: treePlacements, name: 'coastal-trees', castShadow: false });
  root.add(treeField);

  // --- Atmosphere details: mist, spray, birds ------------------------------
  const mist = createParticleField({
    count: scaleForTier(tier, 'particleScale', 140),
    kind: 'mist',
    area: [70, 1.6, 70],
    origin: [-6, WATER_Y + 0.9, 2],
    size: 5,
    color: '#e7dccb',
    opacity: 0.03,
    fall: 0.35,
    float,
    track,
    name: 'coastal-mist',
  });
  mesh(mist.points);

  const spray = createParticleField({
    count: scaleForTier(tier, 'particleScale', 110),
    kind: 'mist',
    area: [26, 1.2, 26],
    origin: [stackDefs[0].x, WATER_Y + 0.35, stackDefs[0].z],
    size: 3.2,
    color: '#eef4f6',
    opacity: 0.05,
    fall: 0.9,
    float,
    track,
    name: 'coastal-spray',
  });
  mesh(spray.points);

  const flock = createFlock({ count: Math.round(6 * budget.shoreDetail), radius: [38, 65], height: [18, 30], speed: 0.035, float, track });
  root.add(flock.mesh);

  mesh(root);

  // --- Variant response ----------------------------------------------------
  const variantFeatures = { ...(row?.features ?? {}) };
  let waterGlow = variantFeatures.waterGlow ? 0.5 : 0;
  let chop = variantId === 'storm' || variantFeatures.rainParticles > 0.5 ? 0.85 : variantId === 'midnight' ? 0.14 : 0.22;

  function applyWaterSky(visuals = row?.visuals ?? {}) {
    const elevation = Number.isFinite(visuals.sunElevation) ? visuals.sunElevation : 0.24;
    const azimuth = Number.isFinite(visuals.sunAzimuth) ? visuals.sunAzimuth : 3.8;
    const ce = Math.cos(elevation);
    // Water-specific reflection tints: the sea mirrors the bright band of sky
    // near the sun, so the zenith sample is a lightened blue and the horizon
    // sample a pale glow. The raw preset zenith is near-black under the dusk
    // and produced no readable reflection at all.
    const waterSky = new THREE.Color(visuals.skyColor ?? '#8fb6d4').lerp(new THREE.Color('#dfe9f2'), 0.35);
    const glowColor = visuals.horizonGlowColor ?? visuals.fogColor ?? '#d9b48a';
    const waterHorizon = new THREE.Color(glowColor).lerp(new THREE.Color('#ffdfc4'), 0.45);
    // The painted sun and its glitter path read as the white-hot low sun, not
    // the saturated orange key light that colours the buildings.
    const waterSun = new THREE.Color(visuals.sunColor ?? '#ffd9a0').lerp(new THREE.Color('#fff4dc'), 0.6);
    water.setSky({
      skyColor: waterSky,
      horizonColor: waterHorizon,
      sunColor: waterSun,
      sunDir: [ce * Math.cos(azimuth), Math.max(0.05, Math.sin(elevation)), ce * Math.sin(azimuth)],
      sunIntensity: visuals.sunIntensity,
    });
    // Pin the far-water sun to the showcase composition: the left sea band
    // the isometric camera can actually see, above/right of the hero sea
    // stack and clear of the theater's west wall, which covers the
    // azimuth-derived position at the frame's top edge. The horizon direction
    // is the horizontal forward of the showcase camera (from (21,25,26)
    // toward the theater), so the painted horizon is a screen-horizontal line.
    water.setHorizon({
      glow: variantId === 'midnight' ? 0.35 : variantId === 'storm' ? 0.25 : 0.5,
      sunX: -23.4,
      sunZ: -8.7,
      dirX: -0.6286,
      dirZ: -0.7784,
    });
  }

  function applyVariantFeatures() {
    water.uniforms.uChop.value = chop;
    water.uniforms.uGlow.value = waterGlow;
    water.uniforms.uWaveHeight.value = clamp(0.45 + chop * 0.5, 0.25, 1.2);
    // Mist/spray stay a low, thin band over the water: big soft sprites at
    // this particle size read as cloud banks that hide the sea entirely.
    const mistPresence = variantFeatures.mist ?? 0.3;
    mist.setOpacity(0.012 + mistPresence * 0.02);
    spray.setOpacity(mistPresence > 0.7 ? 0.05 : 0.03);
  }

  applyVariantFeatures();
  applyWaterSky();

  function update(time, _dt, state = {}) {
    water.update(time, _dt, state);
    mist.update(time, _dt, state);
    spray.update(time, _dt, state);
    flock.update(time, _dt, state);
  }

  function setVariant(next) {
    const features = next?.features ?? {};
    Object.assign(variantFeatures, features);
    waterGlow = features.waterGlow ? 0.5 : 0;
    chop = next?.variantId === 'storm' || features.rainParticles > 0.5 ? 0.85
      : next?.variantId === 'midnight' ? 0.14 : 0.22;
    applyVariantFeatures();
    applyWaterSky(next?.visuals);
  }

  return {
    update,
    setVariant,
    dispose() { kit.disposeAll(); },
    environment: {
      materialFamilies: [
        { key: 'coastal-rock', material: rockMaterial, sheltered: false, dry: Object.freeze({ color: rockMaterial.color.getHex(), roughness: 0.96, metalness: 0.02 }) },
        { key: 'coastal-terrain', material: terrain.material, sheltered: false, dry: Object.freeze({ color: terrain.material.color.getHex(), roughness: 0.95, metalness: 0.02 }) },
        { key: 'coastal-parapet', material: parapetMaterial, sheltered: false, dry: Object.freeze({ color: parapetMaterial.color.getHex(), roughness: 0.94, metalness: 0.02 }) },
      ],
      zones: [],
      emitterAnchors: [
        { id: 'coastal-pool-1', kind: 'puddle', x: 6.5, z: 6.5, w: 1.8, d: 1.2 },
        { id: 'coastal-pool-2', kind: 'puddle', x: -5.8, z: 7.4, w: 1.4, d: 1.0 },
        { id: 'coastal-pool-3', kind: 'puddle', x: 7.8, z: -6.2, w: 1.5, d: 1.1 },
      ],
    },
    counts: {
      boulders: rockPlacements.length,
      grass: grassPlacements.length,
      trees: treePlacements.length,
      seaStacks: stackDefs.length,
      particles: mist.uniforms.uOpacity.value,
    },
  };
}
