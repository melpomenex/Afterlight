/**
 * Alpine Aurora — the snowy mountain basin Theater environment.
 *
 * The Orpheum stands on a level snowfield inside an immense alpine basin:
 * the ground stays below the theater floor across its whole protected
 * footprint, rolls out into wind-rippled drifts, climbs through a scattered
 * pine belt and rises to five distant snow peaks. A frozen lake sits in the
 * south-west. The aurora itself is the atmosphere sky shader's job; this
 * builder only adds a faint additive ground glow and a low emissive tint on
 * the snow for the aurora variant.
 *
 * Spatial layers (per the campaign brief):
 *   NEAR  — basin snow, wave ripples, snow-drift mounds, rock outcrops
 *   MID   — clustered pines, alpine grass, frozen lake, rolling foothills
 *   FAR   — five snow peaks on a second terrain shell, haze, birds
 *
 * The terrain never participates in collision (actors stay inside the
 * Theater bounds) and nothing shared with the Theater or another environment
 * is touched. Everything is deterministic from the environment seed and
 * scaled by the environment quality tier.
 */

import * as THREE from 'three';
import { fbm, ridged, clamp, smoothstep, createTerrain } from './lib/terrain.js';
import { scatter } from './lib/scatter.js';
import { createRockGeometry, createRockField } from './lib/rocks.js';
import { createConiferGeometry, createGrassTuftGeometry, instanceVegetation } from './lib/vegetation.js';
import { createWater } from './lib/water.js';
import { createParticleField, createFlock } from './lib/particles.js';
import { scaleForTier, budgetForEnvironmentTier } from './quality.js';

const BASIN_Y = -0.95;
const WATER_Y = -1.32;
// The Theater's protected footprint: the terrain must stay below y = -0.6
// everywhere inside this rectangle (the Theater floor is at y = 0) and only
// rises once it is outside.
const PROTECT_X = 14.5;
const PROTECT_NORTH = 17.0;
const PROTECT_SOUTH = 13.5;
const AURORA_GLOW_COLOR = '#4fe0b0';

/** Distance from the protected Theater rectangle (0 inside it). */
function basinDistance(x, z) {
  const dx = Math.max(0, Math.abs(x) - PROTECT_X);
  const dz = z > 0 ? Math.max(0, z - PROTECT_SOUTH) : Math.max(0, -z - PROTECT_NORTH);
  return Math.hypot(dx, dz);
}

export function buildAlpine({ kit, row, variantId = 'aurora', tier = 'high', quality }) {
  const { float, range, mesh, track } = kit;
  const budget = quality ?? budgetForEnvironmentTier(tier);
  const root = new THREE.Group();
  root.name = 'alpine-world';

  const terrainSize = budget.terrainSize;
  // Distant peaks keep their authored absolute distance at every tier (the
  // far shell is sized from this, not from the near shell).
  const peakReach = 175;

  // --- Height field ---------------------------------------------------------
  // Five mountain masses at radius ~102-143, spread ~41-58: broad enough to
  // read as one range from the isometric camera, distinct enough to silhouette.
  const peakDefs = [
    { angle: -2.55, radius: 0.30, height: 44, spread: 0.16, seed: 401 },
    { angle: -0.62, radius: 0.40, height: 62, spread: 0.15, seed: 409 },
    { angle: 0.34, radius: 0.22, height: 42, spread: 0.12, seed: 419 },
    { angle: 1.22, radius: 0.38, height: 56, spread: 0.15, seed: 431 },
    { angle: 2.72, radius: 0.34, height: 48, spread: 0.14, seed: 443 },
  ].map((def) => {
    const center = peakReach * def.radius;
    return {
      x: Math.cos(def.angle) * center,
      z: Math.sin(def.angle) * center,
      r: peakReach * def.spread,
      height: def.height,
      seed: def.seed,
    };
  });

  function peakField(x, z) {
    let field = 0;
    for (const peak of peakDefs) {
      const d = Math.hypot(x - peak.x, z - peak.z);
      if (d >= peak.r) continue;
      const t = 1 - d / peak.r;
      const crest = ridged(x, z, { octaves: 3, frequency: 0.02, seed: peak.seed });
      field = Math.max(field, peak.height * Math.pow(t, 1.55) * (0.82 + crest * 0.18));
    }
    return field;
  }

  function rollingField(x, z) {
    const reach = smoothstep(9, 46, Math.hypot(x, z));
    const base = (fbm(x, z, { octaves: 4, frequency: 0.018, seed: 307 }) - 0.5) * 2;
    const detail = (fbm(x, z, { octaves: 3, frequency: 0.06, seed: 313 }) - 0.5) * 2;
    return reach * (1.4 + base * 2.2 + detail * 0.9);
  }

  // Wind-packed drift ridges: low mounds plus a slow ripple pattern.
  function basinDrifts(x, z) {
    const drift = fbm(x, z, { octaves: 4, frequency: 0.045, seed: 211 });
    const ripple = Math.sin(x * 0.34 + drift * 5.2) + Math.sin(z * 0.29 - drift * 4.4);
    return Math.max(0, (drift - 0.44) * 3.2) + ripple * 0.1;
  }

  // Frozen lake in the south-west, fully clear of the protected rectangle.
  const lake = { x: -10, z: 28, radius: 12 };
  function lakeDepth(x, z) {
    const d = Math.hypot(x - lake.x, z - lake.z);
    if (d >= lake.radius) return 0;
    return 1 - d / lake.radius;
  }

  function heightAt(x, z) {
    const safety = smoothstep(1.1, 8.0, basinDistance(x, z));
    const floorNoise = (fbm(x, z, { octaves: 3, frequency: 0.05, seed: 101 }) - 0.5) * 0.24;
    const floor = BASIN_Y + floorNoise;
    const peaks = peakField(x, z);
    // Rolling relief fades under the mountains so summits stay authored.
    const rollDamp = 1 - 0.8 * clamp(peaks / 25, 0, 1);
    let h = floor + safety * (basinDrifts(x, z) + rollingField(x, z) * rollDamp + peaks);
    const depth = lakeDepth(x, z);
    if (depth > 0) {
      // Guaranteed ice bowl regardless of the surrounding relief.
      h = Math.min(h, BASIN_Y - 0.15 - Math.pow(depth, 0.85) * 3.4);
    } else {
      // Elsewhere the snow never dips into the water plane; one frozen lake only.
      h = Math.max(h, WATER_Y + 0.22);
    }
    return h;
  }

  // The far shell sinks under the near shell and re-joins it at the seam so
  // the two share the exact same silhouette height.
  function farHeightAt(x, z) {
    const normalized = Math.hypot(x, z) / (terrainSize * 0.5);
    return heightAt(x, z) - 0.75 * smoothstep(1.05, 0.85, normalized);
  }

  function slopeAt(x, z, step = 0.7) {
    const hx = heightAt(x + step, z) - heightAt(x - step, z);
    const hz = heightAt(x, z + step) - heightAt(x, z - step);
    return Math.hypot(hx, hz) / (2 * step);
  }

  // --- Vertex colors: bright snow, exposed rock on steep faces --------------
  const snow = new THREE.Color('#e9f1fa');
  const snowBright = new THREE.Color('#ffffff');
  const snowShadow = new THREE.Color('#c2d2e8');
  const rock = new THREE.Color('#3d4756');
  const rockLight = new THREE.Color('#657186');
  const ice = new THREE.Color('#9dbdd6');
  const colorScratch = new THREE.Color();
  const rockScratch = new THREE.Color();

  function colorAt({ x, z, h, slope }) {
    const grain = fbm(x, z, { octaves: 4, frequency: 0.05, seed: 503 });
    const patch = fbm(x, z, { octaves: 3, frequency: 0.13, seed: 509 });
    colorScratch.copy(snow).multiplyScalar(0.94 + patch * 0.08);
    // Blue wind-packed shadow in hollows, glare along the crests.
    colorScratch.lerp(snowShadow, clamp(0.4 - (h - BASIN_Y) * 0.35, 0, 0.4));
    colorScratch.lerp(snowBright, smoothstep(6, 34, h) * 0.45);
    // Dark rock on the steep faces; the summits keep their snowcap.
    const steep = smoothstep(0.62, 1.25, slope);
    const scree = clamp((grain - 0.42) * 2.6, 0, 1);
    const rocky = steep * (0.2 + 0.7 * scree) * (1 - smoothstep(34, 58, h) * 0.6);
    if (rocky > 0.01) {
      rockScratch.copy(rock).lerp(rockLight, grain);
      colorScratch.lerp(rockScratch, rocky);
    }
    // Pale ice under the lake surface.
    if (h < WATER_Y + 0.05) {
      colorScratch.lerp(ice, smoothstep(WATER_Y + 0.1, WATER_Y - 1.1, h) * 0.85);
    }
    return colorScratch;
  }

  // --- Terrain: near basin shell + far peak shell ---------------------------
  const terrain = createTerrain({
    size: terrainSize,
    segments: budget.terrainSegments,
    height: heightAt,
    colorAt,
    y: 0,
    roughness: 0.92,
    metalness: 0.01,
  });
  root.add(terrain.mesh);
  track(terrain);

  const farTerrain = createTerrain({
    size: terrainSize * 2.6,
    segments: Math.max(64, Math.round(budget.terrainSegments * 0.65)),
    height: farHeightAt,
    colorAt,
    y: 0,
    roughness: 0.95,
    metalness: 0,
    receiveShadow: false,
  });
  root.add(farTerrain.mesh);
  track(farTerrain);

  // --- Frozen lake ----------------------------------------------------------
  const water = createWater({
    size: terrainSize,
    segments: budget.waterSegments,
    waterY: WATER_Y,
    terrainHeight: heightAt,
    shoreRange: 1.1,
    waveHeight: 0.03,
    chop: 0,
    deepColor: '#8fb0c6',
    shallowColor: '#c3d8e6',
    opacity: 0.9,
  });
  root.add(water.mesh);
  track(water);

  // --- Aurora ground glow: one faint additive plane above the snow ----------
  const glowGeometry = new THREE.PlaneGeometry(terrainSize * 0.7, terrainSize * 0.7);
  glowGeometry.rotateX(-Math.PI / 2);
  track(glowGeometry);
  const glowMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(AURORA_GLOW_COLOR) },
      uOpacity: { value: 0 },
      uTime: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uOpacity;
      uniform float uTime;
      varying vec2 vUv;
      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float mask = smoothstep(1.0, 0.1, length(p));
        float band = 0.62 + 0.38 * sin(vUv.x * 7.0 + uTime * 0.12);
        gl_FragColor = vec4(uColor, mask * band * uOpacity);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    fog: false,
  });
  track(glowMaterial);
  const auroraGlow = new THREE.Mesh(glowGeometry, glowMaterial);
  auroraGlow.name = 'alpine-aurora-glow';
  auroraGlow.position.y = 1.2;
  auroraGlow.renderOrder = 1;
  root.add(auroraGlow);

  // --- Rock outcrops and drift mounds ---------------------------------------
  const boulderGeometry = createRockGeometry({ float, detail: 1, jaggedness: 0.48, color: '#48525f' });
  track(boulderGeometry);
  const boulderPlacements = scatter({
    count: scaleForTier(tier, 'rockScale', 110),
    minRadius: 17,
    maxRadius: 70,
    float,
    heightAt,
    accept: ({ x, z, h }) => {
      if (basinDistance(x, z) < 3) return false;
      const slope = slopeAt(x, z);
      return h > WATER_Y + 0.25 && (slope > 0.35 || h > 8);
    },
    minSpacing: 1.8,
  }).map((p) => ({
    ...p,
    y: p.h - 0.3,
    rot: float() * Math.PI * 2,
    rx: (float() - 0.5) * 0.3,
    rz: (float() - 0.5) * 0.3,
    scale: range(0.5, 2.1),
    scaleY: range(0.5, 1.4),
  }));
  const rockMaterial = kit.track(new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.95, metalness: 0.02, flatShading: true,
  }));
  const boulderField = createRockField({
    kit, geometry: boulderGeometry, placements: boulderPlacements, material: rockMaterial, name: 'alpine-rock-outcrops',
  });
  root.add(boulderField);

  const driftGeometry = createRockGeometry({ float, detail: 1, jaggedness: 0.3, color: '#e2ecf7', squash: [1.6, 0.5, 1.25] });
  track(driftGeometry);
  const driftPlacements = scatter({
    count: scaleForTier(tier, 'rockScale', 64),
    minRadius: 17,
    maxRadius: 48,
    float,
    heightAt,
    accept: ({ x, z, h }) => basinDistance(x, z) > 3 && h > WATER_Y + 0.4 && slopeAt(x, z) < 0.5,
    minSpacing: 3.4,
  }).map((p) => ({
    ...p,
    y: p.h - 0.32,
    rot: float() * Math.PI * 2,
    scale: range(1.1, 2.8),
    scaleY: range(0.45, 0.85),
  }));
  const driftMaterial = kit.track(new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.9, metalness: 0.01, flatShading: true,
  }));
  const driftField = createRockField({
    kit, geometry: driftGeometry, placements: driftPlacements, material: driftMaterial, name: 'alpine-snow-drifts',
  });
  root.add(driftField);

  // --- Pine forest: deterministic clusters, snow-laden conifers -------------
  const treeGeometry = createConiferGeometry({
    height: 9.5, radius: 2.3, tiers: 4, color: '#2c4736', trunkColor: '#3b2c22', snow: 0.85,
  });
  track(treeGeometry);
  const treeMaterial = kit.wind(new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.9, metalness: 0,
  }), { height: 9, strength: 0.15 });
  const treePlacements = [];
  const treeTarget = scaleForTier(tier, 'vegetationScale', 170);
  const clusterCount = Math.max(3, Math.round(7 * budget.vegetationScale));
  const perCluster = Math.max(1, Math.ceil(treeTarget / clusterCount));
  for (let c = 0; c < clusterCount; c++) {
    const angle = float() * Math.PI * 2;
    const distance = range(19, 44);
    const cx = Math.cos(angle) * distance;
    const cz = Math.sin(angle) * distance;
    const radius = range(5, 10);
    for (let i = 0; i < perCluster; i++) {
      const a = float() * Math.PI * 2;
      const rr = Math.sqrt(float()) * radius;
      const x = cx + Math.cos(a) * rr;
      const z = cz + Math.sin(a) * rr;
      if (basinDistance(x, z) < 2.5) continue;
      const h = heightAt(x, z);
      if (h < WATER_Y + 0.35 || h > 16) continue;
      if (slopeAt(x, z) > 0.6) continue;
      treePlacements.push({ x, z, y: h - 0.2, rot: float() * Math.PI * 2, scale: range(0.55, 1.2) });
    }
  }
  const treeField = instanceVegetation({
    geometry: treeGeometry, material: treeMaterial, placements: treePlacements, name: 'alpine-pines', castShadow: false,
  });
  root.add(treeField);

  // --- Alpine grass tufts poking through the snow ---------------------------
  const grassGeometry = createGrassTuftGeometry({
    blades: 6, height: 0.55, width: 0.05, rng: float, tipColor: '#c8d6c4', baseColor: '#4c5b49',
  });
  track(grassGeometry);
  const grassMaterial = kit.wind(new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.9, metalness: 0, side: THREE.DoubleSide,
  }), { height: 0.6, strength: 0.12 });
  const grassCount = scaleForTier(tier, 'grassScale', 1300);
  const grassPlacements = scatter({
    count: grassCount,
    minRadius: 16.5,
    maxRadius: 68,
    float,
    heightAt,
    accept: ({ x, z, h }) => basinDistance(x, z) > 1.5 && h > WATER_Y + 0.3 && h < 8 && slopeAt(x, z) < 0.55,
    minSpacing: 0.7,
  }).map((p) => ({ ...p, y: p.h, rot: float() * Math.PI * 2, scale: range(0.6, 1.3) }));
  const grassField = instanceVegetation({
    geometry: grassGeometry, material: grassMaterial, placements: grassPlacements, name: 'alpine-grass',
  });
  root.add(grassField);

  // --- Weather: snowfall, low wind-blown drift, birds -----------------------
  const snowCount = scaleForTier(tier, 'particleScale', 850);
  const snowfall = createParticleField({
    count: snowCount,
    kind: 'snow',
    area: [terrainSize * 0.5, 44, terrainSize * 0.5],
    origin: [0, 22, 0],
    size: 6.5,
    color: '#eef4fb',
    opacity: 0.55,
    fall: 0.85,
    glow: 0.35,
    float,
    track,
    name: 'alpine-snowfall',
  });
  mesh(snowfall.points);

  const driftMistCount = scaleForTier(tier, 'particleScale', 240);
  const driftMist = createParticleField({
    count: driftMistCount,
    kind: 'mist',
    area: [terrainSize * 0.42, 4.5, terrainSize * 0.42],
    origin: [0, 2.0, 0],
    size: 10,
    color: '#dbe6f5',
    opacity: 0.05,
    fall: 1.2,
    float,
    track,
    name: 'alpine-ground-drift',
  });
  mesh(driftMist.points);

  const birdCount = Math.max(2, Math.round(budget.birdCount));
  const flock = createFlock({
    count: birdCount,
    radius: [45, 100],
    height: [16, 34],
    color: '#1b2330',
    float,
    track,
  });
  root.add(flock.mesh);

  mesh(root);

  // --- Variant response -----------------------------------------------------
  const variantFeatures = { ...(row?.features ?? {}) };
  let activeVariant = variantId;
  let auroraBase = 0;

  function snowAmount() {
    if (Number.isFinite(variantFeatures.snow)) return clamp(variantFeatures.snow, 0, 1);
    return activeVariant === 'snowfall' ? 1 : activeVariant === 'aurora' ? 0.35 : 0.25;
  }

  function birdsOn() {
    const birds = Number.isFinite(variantFeatures.birds) ? variantFeatures.birds : 0;
    return birds > 0.05 || activeVariant === 'morning';
  }

  function applyAurora(visuals = row?.visuals ?? {}) {
    const aurora = Number.isFinite(variantFeatures.aurora)
      ? variantFeatures.aurora
      : (activeVariant === 'aurora' ? 1 : 0);
    const glowOn = aurora > 0.1 || (Number.isFinite(visuals?.aurora) && visuals.aurora > 0.1);
    auroraBase = glowOn ? 0.05 : 0;
    glowMaterial.uniforms.uOpacity.value = auroraBase;
    // A faint emissive breath on the snow keeps the aurora reading after dark.
    const tint = glowOn ? 0x0d241f : 0x000000;
    for (const family of [terrain.material, farTerrain.material]) {
      family.emissive.setHex(tint);
      family.emissiveIntensity = glowOn ? 0.14 : 0;
    }
    if (visuals?.auroraColor) glowMaterial.uniforms.uColor.value.set(visuals.auroraColor);
  }

  function applyWaterSky(visuals = row?.visuals ?? {}) {
    const elevation = Number.isFinite(visuals.sunElevation) ? visuals.sunElevation : 0.3;
    const azimuth = Number.isFinite(visuals.sunAzimuth) ? visuals.sunAzimuth : 0.3;
    const ce = Math.cos(elevation);
    water.setSky({
      skyColor: visuals.skyColor,
      horizonColor: visuals.horizonGlowColor ?? visuals.fogColor,
      sunColor: visuals.sunColor,
      sunDir: [ce * Math.cos(azimuth), Math.max(0.05, Math.sin(elevation)), ce * Math.sin(azimuth)],
      sunIntensity: visuals.sunIntensity,
    });
    if (visuals.auroraColor) glowMaterial.uniforms.uColor.value.set(visuals.auroraColor);
  }

  function applyVariantFeatures() {
    const amount = snowAmount();
    snowfall.setOpacity(0.08 + amount * 0.6);
    driftMist.setOpacity(0.03 + amount * 0.05);
    flock.mesh.visible = birdsOn();
    const grassWind = Number.isFinite(variantFeatures.grassWind) ? variantFeatures.grassWind : 0;
    grassMaterial.userData.windBaseStrength = 0.12 * (grassWind > 0 ? grassWind : 1);
  }

  applyVariantFeatures();
  applyAurora();
  applyWaterSky();

  function update(time, dt, state = {}) {
    water.update(time, dt, state);
    snowfall.update(time, dt, state);
    driftMist.update(time, dt, state);
    flock.update(time, dt, state);
    glowMaterial.uniforms.uTime.value = time;
    if (auroraBase > 0) {
      glowMaterial.uniforms.uOpacity.value = auroraBase * (0.82 + 0.18 * Math.sin(time * 0.21));
    }
  }

  function setVariant(next = {}) {
    if (next.variantId) activeVariant = next.variantId;
    Object.assign(variantFeatures, next.features ?? {});
    applyVariantFeatures();
    applyAurora(next.visuals ?? row?.visuals);
    applyWaterSky(next.visuals ?? row?.visuals);
  }

  return {
    update,
    setVariant,
    dispose() { kit.disposeAll(); },
    environment: {
      materialFamilies: [
        { key: 'alpine-snow', material: terrain.material, sheltered: true, dry: Object.freeze({ color: terrain.material.color.getHex(), roughness: 0.92, metalness: 0.01 }) },
        { key: 'alpine-far-snow', material: farTerrain.material, sheltered: true, dry: Object.freeze({ color: farTerrain.material.color.getHex(), roughness: 0.95, metalness: 0 }) },
        { key: 'alpine-rock', material: rockMaterial, sheltered: false, dry: Object.freeze({ color: rockMaterial.color.getHex(), roughness: 0.95, metalness: 0.02 }) },
        { key: 'alpine-pines', material: treeMaterial, sheltered: true, dry: Object.freeze({ color: treeMaterial.color.getHex(), roughness: 0.9, metalness: 0 }) },
      ],
      zones: [],
      emitterAnchors: [],
    },
    counts: {
      peaks: peakDefs.length,
      boulders: boulderPlacements.length,
      drifts: driftPlacements.length,
      trees: treePlacements.length,
      grass: grassPlacements.length,
      snowParticles: snowCount,
      driftParticles: driftMistCount,
      birds: birdCount,
    },
  };
}
