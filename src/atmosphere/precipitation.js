/**
 * Batched precipitation (add-atmosphere-weather-system task 3.2, design
 * D4/D5): at most THREE render batches for the whole effect — one rain
 * LineSegments field, one instanced splash batch, one roof-runoff batch —
 * and no per-drop Mesh/DOM/raycast/network anything.
 *
 * Allocation rules this module keeps:
 *   - every typed array is preallocated once per tier; `update` writes
 *     uniforms (and a bounded ring of splash spawn records), never grows
 *     buffers, and never touches instanceColor;
 *   - drop motion, streak bending and roof masking run in the vertex
 *     shader from retained seeds and uniforms — the CPU never iterates
 *     drops;
 *   - roof masking clips the SEGMENT (both vertices) below the winning
 *     cover roof, not just the streak head, so nothing pokes through a
 *     roof; rain OUTSIDE every cover rectangle is never masked, so
 *     outdoor rain stays visible from under a shelter;
 *   - splashes spawn into a fixed ring buffer and skip covered ground;
 *   - a same-tier `setTier` call reallocates nothing; a real tier change
 *     rebuilds the buffers exactly once;
 *   - `setVisible(false)` / rain 0 stop every uniform write and spawn, so
 *     a hidden world performs no GPU uploads at all.
 *
 * Tier ceilings (design D8): normal 4096 drops / 128 splashes / 64 runoff
 * anchors, reduced 1024 / 32 / 32. Three batches fit both caps (6 and 3).
 */

import * as THREE from 'three';
import { createLcg, lcgFloat } from '../../shared/atmosphereModel.js';
import { MAX_EXPOSURE_ZONES, coverUniforms } from './exposure.js';

export const PRECIPITATION_TIERS = Object.freeze({
  normal: Object.freeze({ drops: 4096, splashes: 128, runoff: 64, spawnRate: 140, splashRate: 90 }),
  reduced: Object.freeze({ drops: 1024, splashes: 32, runoff: 32, spawnRate: 35, splashRate: 22 }),
});

/** Rain fall volume height in world units. */
export const RAIN_HEIGHT = 9;

/** Splash ring lifetime in seconds (must match the shader's uLife default). */
export const SPLASH_LIFE_S = 0.55;

const vertexShader = /* glsl */ `
uniform float uTime;
uniform float uDensity;
uniform vec2 uWind;
uniform vec4 uCovers[${MAX_EXPOSURE_ZONES}];
uniform float uRoofY[${MAX_EXPOSURE_ZONES}];
uniform int uCoverCount;
attribute vec4 aSeed;   // x: baseX, y: baseZ, z: fall speed, w: phase seed
attribute float aTip;   // 0 = streak head, 1 = streak tail
varying float vAlpha;

// The roof plane covering this point, or -1.0 when the point is in the
// open. Mirrors coverRoofAt() in exposure.js exactly.
float coverRoof(vec3 p) {
  for (int i = 0; i < ${MAX_EXPOSURE_ZONES}; i++) {
    if (i >= uCoverCount) break;
    vec4 c = uCovers[i];
    if (p.x >= c.x && p.x <= c.z && p.z >= c.y && p.z <= c.w && p.y <= uRoofY[i]) {
      return uRoofY[i];
    }
  }
  return -1.0;
}

void main() {
  // Deterministic fall: the seed phase scrolls with time and speed, so the
  // CPU never advances a drop.
  float cycle = RAIN_HEIGHT_VALUE / aSeed.z;
  float y = mod(aSeed.w * RAIN_HEIGHT_VALUE + uTime * aSeed.z, RAIN_HEIGHT_VALUE);
  // Wind bends the column: drops drift horizontally as they descend, and
  // the streak aligns with the fall velocity so rain reads slanted.
  float fall = 1.0 - y / RAIN_HEIGHT_VALUE;
  vec3 head = vec3(aSeed.x + uWind.x * fall * 2.2, y, aSeed.y + uWind.y * fall * 2.2);
  float lengthJitter = 0.55 + fract(aSeed.w * 7.31) * 0.5;
  vec3 streakDir = normalize(vec3(uWind.x * 0.6, -aSeed.z, uWind.y * 0.6));
  vec3 tail = head + streakDir * lengthJitter * (aSeed.z * 0.055);

  // Segment masking: clip the tail at the roof plane when it falls under a
  // cover; if the head is under as well the segment degenerates away.
  float roofTail = coverRoof(tail);
  if (roofTail >= 0.0) {
    float denom = head.y - tail.y;
    float t = denom > 0.0001 ? clamp((roofTail - tail.y) / denom, 0.0, 1.0) : 0.0;
    vec3 clipPoint = mix(tail, head, t);
    tail = clipPoint;
    if (coverRoof(head) >= 0.0) head = clipPoint;
  }

  // Intensity gates which seeds are alive at all; alpha softens toward the
  // ground and very near the camera (first person stays usable).
  float gate = step(fract(aSeed.w * 13.7), uDensity);
  vec3 pos = aTip < 0.5 ? head : tail;
  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  float nearFade = smoothstep(0.7, 2.4, -mv.z);
  vAlpha = gate * uDensity * nearFade * clamp(head.y / 2.5, 0.22, 1.0);
  gl_Position = projectionMatrix * mv;
}
`;

const fragmentShader = /* glsl */ `
uniform vec3 uColor;
varying float vAlpha;
void main() {
  if (vAlpha <= 0.003) discard;
  gl_FragColor = vec4(uColor, vAlpha * 0.42);
}
`;

const splashVertex = /* glsl */ `
uniform float uTime;
uniform float uLife;
attribute vec3 aSplash; // x, z, startTime
varying float vFade;
void main() {
  float age = uTime - aSplash.z;
  float live = step(0.0, age) * step(age, uLife);
  float growth = clamp(age / uLife, 0.0, 1.0);
  vFade = live * (1.0 - growth);
  vec3 pos = position * (0.25 + growth * 1.75) * live;
  pos.x += aSplash.x;
  pos.z += aSplash.z;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

const splashFragment = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
varying float vFade;
void main() {
  if (vFade <= 0.003) discard;
  gl_FragColor = vec4(uColor, vFade * uOpacity);
}
`;

const runoffVertex = /* glsl */ `
uniform float uTime;
attribute vec3 aAnchor;  // roof-edge point the streak hangs from
attribute float aTip;    // 0 = top, 1 = bottom
attribute float aPhase;
varying float vAlpha;
void main() {
  // A short drip cycling down the anchor point; never below the ground.
  float cycle = fract(uTime * 0.45 + aPhase);
  vec3 top = aAnchor - vec3(0.0, cycle * 0.6, 0.0);
  top.y = max(top.y, 0.12);
  vec3 bottom = max(top - vec3(0.0, 0.55, 0.0), vec3(0.0, 0.05, 0.0));
  vec3 pos = aTip < 0.5 ? top : bottom;
  vAlpha = 0.5;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

const runoffFragment = /* glsl */ `
uniform vec3 uColor;
varying float vAlpha;
void main() {
  gl_FragColor = vec4(uColor, vAlpha);
}
`;

const identityMatrix = /* @__PURE__ */ (() => {
  const m = new THREE.Matrix4();
  return m;
})();

function fillRainSeeds(array, dropCount, bounds, draw) {
  const width = bounds.maxX - bounds.minX;
  const depth = bounds.maxZ - bounds.minZ;
  for (let i = 0; i < dropCount; i++) {
    const x = bounds.minX + lcgFloat(draw) * width;
    const z = bounds.minZ + lcgFloat(draw) * depth;
    const speed = 7.5 + lcgFloat(draw) * 5.5;
    const phase = lcgFloat(draw);
    for (let v = 0; v < 2; v++) {
      const o = (i * 2 + v) * 4;
      array[o] = x;
      array[o + 1] = z;
      array[o + 2] = speed;
      array[o + 3] = phase;
    }
  }
}

function buildRainLayer(dropCount, bounds, draw) {
  const positions = new Float32Array(dropCount * 2 * 3); // zeroed; shader computes real positions
  const seeds = new Float32Array(dropCount * 2 * 4);
  const tips = new Float32Array(dropCount * 2);
  fillRainSeeds(seeds, dropCount, bounds, draw);
  for (let i = 0; i < dropCount; i++) tips[i * 2] = 0;
  for (let i = 0; i < dropCount; i++) tips[i * 2 + 1] = 1;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
  geometry.setAttribute('aTip', new THREE.BufferAttribute(tips, 1));
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, RAIN_HEIGHT / 2, 0), Math.max(widthOf(bounds), RAIN_HEIGHT));
  const material = new THREE.ShaderMaterial({
    vertexShader: vertexShader.replaceAll('RAIN_HEIGHT_VALUE', RAIN_HEIGHT.toFixed(1)),
    fragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uDensity: { value: 0 },
      uWind: { value: new THREE.Vector2(0, 0) },
      uColor: { value: new THREE.Color('#9fb6bd') },
      uCovers: { value: Array.from({ length: MAX_EXPOSURE_ZONES }, () => new THREE.Vector4(0, 0, 0, 0)) },
      uRoofY: { value: new Float32Array(MAX_EXPOSURE_ZONES) },
      uCoverCount: { value: 0 },
    },
    transparent: true,
    depthWrite: false,
    fog: false,
  });
  const mesh = new THREE.LineSegments(geometry, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = 5;
  return { mesh, geometry, material };
}

function widthOf(bounds) {
  return Math.max(bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ);
}

function buildSplashLayer(cap) {
  const ring = new THREE.RingGeometry(0.55, 1, 10);
  ring.rotateX(-Math.PI / 2);
  const splashes = new Float32Array(cap * 3); // x, z, startTime (0 = never spawned)
  ring.setAttribute('aSplash', new THREE.InstancedBufferAttribute(splashes, 3));
  const material = new THREE.ShaderMaterial({
    vertexShader: splashVertex,
    fragmentShader: splashFragment,
    uniforms: {
      uTime: { value: 0 },
      uLife: { value: SPLASH_LIFE_S },
      uColor: { value: new THREE.Color('#aec6cc') },
      uOpacity: { value: 0.5 },
    },
    transparent: true,
    depthWrite: false,
    fog: false,
  });
  const mesh = new THREE.InstancedMesh(ring, material, cap);
  for (let i = 0; i < cap; i++) mesh.setMatrixAt(i, identityMatrix);
  mesh.instanceMatrix.needsUpdate = true;
  mesh.frustumCulled = false;
  mesh.renderOrder = 6;
  mesh.count = cap;
  return { mesh, geometry: ring, material, splashes };
}

function buildRunoffLayer(cap) {
  const positions = new Float32Array(cap * 2 * 3); // zeroed; shader computes
  const anchorsAttr = new Float32Array(cap * 2 * 3);
  const tips = new Float32Array(cap * 2);
  const phases = new Float32Array(cap * 2);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aAnchor', new THREE.BufferAttribute(anchorsAttr, 3));
  geometry.setAttribute('aTip', new THREE.BufferAttribute(tips, 1));
  geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
  const material = new THREE.ShaderMaterial({
    vertexShader: runoffVertex,
    fragmentShader: runoffFragment,
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color('#9fb6bd') },
    },
    transparent: true,
    depthWrite: false,
    fog: false,
  });
  const mesh = new THREE.LineSegments(geometry, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = 5;
  mesh.visible = false;
  return { mesh, geometry, material, anchorsAttr, tips, phases };
}

/**
 * Create the precipitation effect. `zones` are normalized exposure zones
 * (see exposure.js); `anchors` are authored emitter anchors
 * `{ x, y?, z }` (roof-edge runoff). All construction is deterministic
 * from `seed` (the shared LCG — zero seed valid).
 */
export function createPrecipitation({
  bounds = { minX: -12, maxX: 12, minZ: -10, maxZ: 10 },
  zones = [],
  anchors = [],
  tier = 'normal',
  seed = 0,
} = {}) {
  let currentTier = PRECIPITATION_TIERS[tier] ? tier : 'normal';
  let layers = null;
  let disposed = false;
  let visible = true;
  let splashCursor = 0;
  let lastUpdateVisible = true;
  let lastSplashSeconds = -Infinity;
  const stats = { reallocations: 0, spawnedSplashes: 0 };
  const group = new THREE.Group();
  group.name = 'atmosphere-precipitation';
  const draw = createLcg(seed >>> 0);

  function allocate() {
    if (layers) disposeLayers();
    const cap = PRECIPITATION_TIERS[currentTier];
    const rain = buildRainLayer(cap.drops, bounds, draw);
    const splash = buildSplashLayer(cap.splashes);
    const runoff = buildRunoffLayer(cap.runoff);
    group.add(rain.mesh, splash.mesh, runoff.mesh);
    layers = { rain, splash, runoff, cap };
    stats.reallocations += 1;
    applyZones(zones);
    applyAnchors(anchors);
    group.visible = visible;
    lastUpdateVisible = false; // force a uniform refresh on the next update
  }

  function disposeLayers() {
    group.remove(layers.rain.mesh, layers.splash.mesh, layers.runoff.mesh);
    layers.rain.geometry.dispose();
    layers.rain.material.dispose();
    layers.splash.geometry.dispose();
    layers.splash.material.dispose();
    layers.runoff.geometry.dispose();
    layers.runoff.material.dispose();
  }

  /** Push the normalized cover rectangles into the rain shader uniforms. */
  function applyZones(normalizedZones) {
    if (!layers) return;
    const vecs = layers.rain.material.uniforms.uCovers.value;
    const roofY = layers.rain.material.uniforms.uRoofY.value;
    // coverUniforms writes the flat layout; mirror it into the Vector4 slots.
    const flatCovers = new Float32Array(MAX_EXPOSURE_ZONES * 4);
    const count = coverUniforms(normalizedZones, flatCovers, roofY);
    for (let i = 0; i < MAX_EXPOSURE_ZONES; i++) {
      vecs[i].set(flatCovers[i * 4], flatCovers[i * 4 + 1], flatCovers[i * 4 + 2], flatCovers[i * 4 + 3]);
    }
    layers.rain.material.uniforms.uCoverCount.value = count;
  }

  /** Pool roof-edge runoff anchors, capped by the tier (≤64/32). Anchor
   * entries with kind 'puddle' belong to the surface-wetness pool instead. */
  function applyAnchors(list) {
    if (!layers) return;
    const { anchorsAttr, tips, phases } = layers.runoff;
    const cap = layers.cap.runoff;
    let count = 0;
    if (Array.isArray(list)) {
      for (const anchor of list) {
        if (count >= cap) break;
        if (!anchor || typeof anchor !== 'object') continue;
        if (anchor.kind === 'puddle') continue;
        const { x, z } = anchor;
        if (!Number.isFinite(x) || !Number.isFinite(z)) continue;
        const y = Number.isFinite(anchor.y) ? anchor.y : 3;
        const o = count * 2 * 3;
        for (let v = 0; v < 2; v++) {
          anchorsAttr[o + v * 3] = x;
          anchorsAttr[o + v * 3 + 1] = y + 0.02;
          anchorsAttr[o + v * 3 + 2] = z;
          tips[count * 2 + v] = v;
          phases[count * 2 + v] = lcgFloat(draw);
        }
        count += 1;
      }
    }
    for (let i = count; i < cap; i++) {
      const o = i * 2 * 3;
      anchorsAttr.fill(0, o, o + 6);
    }
    layers.runoff.geometry.attributes.aAnchor.needsUpdate = true;
    layers.runoff.geometry.attributes.aTip.needsUpdate = true;
    layers.runoff.geometry.attributes.aPhase.needsUpdate = true;
    layers.runoff.mesh.visible = visible && count > 0;
    layers.runoff.count = count;
  }

  allocate();

  let normalizedZones = zones;

  return {
    object3D: group,
    batchCount: 3,
    get tier() { return currentTier; },
    get counts() {
      return { drops: layers.cap.drops, splashes: layers.cap.splashes, runoff: layers.runoff.count };
    },
    get stats() { return stats; },

    setZones(zonesNext) {
      normalizedZones = zonesNext;
      applyZones(normalizedZones);
    },

    setAnchors(anchorsNext) {
      anchors = anchorsNext;
      applyAnchors(anchors);
    },

    /** Same tier: no-op. Different tier: exactly one reallocation. */
    setTier(tierNext) {
      if (disposed || !PRECIPITATION_TIERS[tierNext] || tierNext === currentTier) return false;
      currentTier = tierNext;
      allocate();
      return true;
    },

    setVisible(next) {
      visible = !!next;
      group.visible = visible;
      if (layers) layers.runoff.mesh.visible = visible && layers.runoff.count > 0;
    },

    /**
     * Advance uniforms. `state` = { timeMs, rain, windX, windZ, dtMs }.
     * When hidden or rainless this touches nothing beyond the single
     * uDensity=0 write that empties the field (no uploads, no spawns);
     * already-spawned splash rings finish fading, then uploads stop.
     */
    update({ timeMs, rain = 0, windX = 0, windZ = 0, dtMs = 0 }) {
      if (disposed || !layers) return;
      const active = visible && rain > 0.001;
      const seconds = timeMs / 1000;
      if (!active) {
        if (lastUpdateVisible) {
          // One final write drives density to zero, then uploads stop.
          layers.rain.material.uniforms.uDensity.value = 0;
          layers.runoff.mesh.visible = false;
          lastUpdateVisible = false;
        }
        // Let live splash rings run out (bounded by their own lifetime).
        if (seconds - lastSplashSeconds < SPLASH_LIFE_S + 1) {
          layers.splash.material.uniforms.uTime.value = seconds;
        }
        return;
      }
      lastUpdateVisible = true;
      layers.runoff.mesh.visible = visible && layers.runoff.count > 0;
      const cap = PRECIPITATION_TIERS[currentTier];
      const density = currentTier === 'reduced' ? rain * 0.25 : rain; // reduced quarters density (D8)
      const u = layers.rain.material.uniforms;
      u.uTime.value = seconds;
      u.uDensity.value = Math.min(1, density);
      u.uWind.value.set(windX, windZ);
      layers.splash.material.uniforms.uTime.value = seconds;

      // Splash spawning: bounded ring writes, never a new object.
      const spawn = Math.min(
        layers.cap.splashes,
        Math.floor((dtMs / 1000) * cap.splashRate * rain),
      );
      if (spawn > 0) {
        const attr = layers.splash.geometry.attributes.aSplash;
        const array = attr.array;
        const width = bounds.maxX - bounds.minX;
        const depth = bounds.maxZ - bounds.minZ;
        for (let i = 0; i < spawn; i++) {
          const x = bounds.minX + lcgFloat(draw) * width;
          const z = bounds.minZ + lcgFloat(draw) * depth;
          // Skip covered ground (clip splashes under cover, D5).
          let covered = false;
          for (const zone of normalizedZones) {
            const r = zone.rect;
            if (x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ) { covered = true; break; }
          }
          if (covered) continue;
          const o = splashCursor * 3;
          array[o] = x;
          array[o + 1] = z;
          array[o + 2] = seconds;
          splashCursor = (splashCursor + 1) % layers.cap.splashes;
          stats.spawnedSplashes += 1;
        }
        attr.needsUpdate = true;
        lastSplashSeconds = seconds;
      }
      layers.runoff.material.uniforms.uTime.value = seconds;
    },

    dispose() {
      if (disposed) return;
      disposed = true;
      if (layers) disposeLayers();
      group.removeFromParent();
    },
  };
}
