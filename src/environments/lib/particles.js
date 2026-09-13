/**
 * GPU-animated particle fields for the Theater environments.
 *
 * Every field is ONE THREE.Points draw call whose motion is computed in the
 * vertex shader from per-particle seed attributes and a shared clock — the
 * CPU writes nothing per frame. Kinds cover snow, fireflies, drifting dust /
 * sand, spores and mist wisps. Rain and splashes remain the atmosphere
 * controller's job; these fields add the biome's own signature.
 *
 * Deterministic: seeds come from the environment build's seeded stream.
 */

import * as THREE from 'three';

const vertexShader = /* glsl */ `
uniform float uTime;
uniform vec3 uArea;
uniform vec3 uWind;
uniform float uFall;
uniform float uSize;
uniform float uPixelRatio;
uniform float uOpacity;
uniform int uKind;
attribute vec3 aSeed;
attribute float aScale;
varying float vAlpha;

float hash(float n) { return fract(sin(n) * 43758.5453123); }

void main() {
  vec3 p = aSeed * uArea;
  float t = uTime;
  float scale = aScale;
  float alpha = 1.0;

  if (uKind == 0) {
    // Snow: slow fall, wind push, sinusoidal sway.
    float fall = mod(p.y - t * uFall * (0.6 + scale * 0.6), uArea.y);
    p.y = fall;
    p.x = mod(p.x + uWind.x * t * uFall * 0.32 + sin(t * 0.7 + aSeed.y * 40.0) * 0.6, uArea.x);
    p.z = mod(p.z + uWind.z * t * uFall * 0.32 + cos(t * 0.6 + aSeed.x * 30.0) * 0.6, uArea.z);
  } else if (uKind == 1) {
    // Fireflies: loose wander around the anchor, pulsing glow.
    p.x += sin(t * (0.16 + scale * 0.2) + aSeed.x * 60.0) * 3.4;
    p.z += cos(t * (0.13 + scale * 0.17) + aSeed.z * 55.0) * 3.4;
    p.y += sin(t * (0.21 + scale * 0.13) + aSeed.y * 70.0) * 1.5;
    float blink = pow(max(0.0, sin(t * (0.7 + scale * 0.9) + aSeed.x * 90.0)), 6.0);
    alpha = 0.08 + blink;
  } else if (uKind == 2) {
    // Dust / sand: horizontal drift with a low-altitude bias.
    p.x = mod(p.x + uWind.x * t * uFall * 0.5 + t * 0.4, uArea.x);
    p.z = mod(p.z + uWind.z * t * uFall * 0.5, uArea.z);
    p.y += sin(t * 0.9 + aSeed.y * 50.0) * 0.5;
    alpha = 0.35 + 0.65 * hash(aSeed.z * 91.0);
  } else if (uKind == 3) {
    // Spores / pollen: gentle rise and drift.
    float rise = mod(p.y + t * uFall * 0.28, uArea.y);
    p.y = rise;
    p.x = mod(p.x + sin(t * 0.3 + aSeed.z * 44.0) * 1.8 + uWind.x * t * 0.12, uArea.x);
    p.z = mod(p.z + cos(t * 0.26 + aSeed.x * 38.0) * 1.8 + uWind.z * t * 0.12, uArea.z);
    alpha = 0.25 + 0.6 * hash(aSeed.x * 77.0);
  } else {
    // Mist: large soft wisps sliding slowly with the wind.
    p.x = mod(p.x + uWind.x * t * uFall * 0.25, uArea.x);
    p.z = mod(p.z + uWind.z * t * uFall * 0.25, uArea.z);
    p.y += sin(t * 0.12 + aSeed.y * 20.0) * 0.8;
    alpha = 0.2 + 0.5 * hash(aSeed.z * 31.0);
  }

  vec4 mv = modelViewMatrix * vec4(p - uArea * 0.5, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize * scale * uPixelRatio * (14.0 / max(1.0, -mv.z));
  vAlpha = alpha * uOpacity;
}
`;

const fragmentShader = /* glsl */ `
uniform vec3 uColor;
uniform float uGlow;
varying float vAlpha;
void main() {
  vec2 d = gl_PointCoord - vec2(0.5);
  float r = length(d);
  float core = smoothstep(0.5, 0.0, r);
  float glow = smoothstep(0.5, 0.12, r);
  float alpha = vAlpha * mix(core, glow, uGlow);
  if (alpha < 0.01) discard;
  gl_FragColor = vec4(uColor, alpha);
}
`;

export const PARTICLE_KINDS = Object.freeze({ snow: 0, firefly: 1, dust: 2, spore: 3, mist: 4 });

/**
 * @param {object} options
 * @param {number} options.count
 * @param {'snow'|'firefly'|'dust'|'spore'|'mist'} options.kind
 * @param {THREE.Vector3|number[]} options.area     spawn box centered on the field origin
 * @param {THREE.Vector3|number[]} [options.origin] world anchor
 * @param {number} [options.size]                   point size in pixels-ish
 * @param {string} [options.color]
 * @param {number} [options.opacity]
 * @param {number} [options.fall]                   fall/drift speed scalar
 * @param {boolean} [options.additive]
 * @param {() => number} options.float              seeded stream
 * @param {() => void} options.track
 */
export function createParticleField({
  count = 400,
  kind = 'snow',
  area = [60, 24, 60],
  origin = [0, 0, 0],
  size = 9,
  color = '#ffffff',
  opacity = 0.85,
  fall = 1.4,
  glow = 0.5,
  additive = false,
  float,
  track = () => {},
  name = 'environment-particles',
} = {}) {
  if (typeof float !== 'function') throw new Error('createParticleField requires a float() stream');
  const seeds = new Float32Array(count * 3);
  const scales = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    seeds[i * 3] = float();
    seeds[i * 3 + 1] = float();
    seeds[i * 3 + 2] = float();
    scales[i] = 0.5 + float() * 1.5;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(count * 3), 3));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 3));
  geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), Math.hypot(...area) * 0.7 + 4);

  const uniforms = {
    uTime: { value: 0 },
    uArea: { value: new THREE.Vector3(...area) },
    uWind: { value: new THREE.Vector3(1, 0, 0) },
    uFall: { value: fall },
    uSize: { value: size },
    uPixelRatio: { value: Math.min(typeof devicePixelRatio === 'number' ? devicePixelRatio : 1, 1.5) },
    uOpacity: { value: opacity },
    uKind: { value: PARTICLE_KINDS[kind] ?? 0 },
    uColor: { value: new THREE.Color(color) },
    uGlow: { value: glow },
  };
  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    fog: false,
  });
  const points = new THREE.Points(geometry, material);
  points.name = name;
  points.position.set(origin[0], origin[1], origin[2]);
  points.frustumCulled = true;
  track(geometry);
  track(material);

  function update(time, _dt, state = {}) {
    uniforms.uTime.value = time;
    const wx = state.windX ?? 0, wz = state.windZ ?? 0;
    const len = Math.hypot(wx, wz) || 1;
    uniforms.uWind.value.set(wx / len, 0, wz / len);
  }

  return { points, material, uniforms, update, setOpacity: (v) => { uniforms.uOpacity.value = v; } };
}

/**
 * Birds: a small flock of flapping instanced wedges circling far scenery.
 * CPU-updated matrices for a handful of birds only (one instance buffer),
 * which is far cheaper than one object per bird.
 */
export function createFlock({
  count = 9,
  radius = [46, 78],
  height = [14, 30],
  color = '#20262b',
  speed = 0.05,
  float,
  track = () => {},
  name = 'environment-birds',
} = {}) {
  if (typeof float !== 'function') throw new Error('createFlock requires a float() stream');
  const geometry = new THREE.BufferGeometry();
  const span = 0.9;
  const positions = new Float32Array([
    0, 0, -span * 0.6,
    -span, 0, span * 0.8,
    0, 0.18, span * 0.2,
    0, 0, -span * 0.6,
    0, 0.18, span * 0.2,
    span, 0, span * 0.8,
  ]);
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  const material = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, fog: true });
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.name = name;
  mesh.frustumCulled = false;
  const birds = [];
  for (let i = 0; i < count; i++) {
    birds.push({
      r: radius[0] + float() * (radius[1] - radius[0]),
      y: height[0] + float() * (height[1] - height[0]),
      phase: float() * Math.PI * 2,
      dir: float() > 0.5 ? 1 : -1,
      flap: 0.6 + float() * 0.5,
      scale: 0.7 + float() * 0.9,
    });
  }
  const dummy = new THREE.Object3D();
  track(geometry);
  track(material);

  function update(time) {
    for (let i = 0; i < birds.length; i++) {
      const b = birds[i];
      const a = b.phase + time * speed * b.dir;
      const x = Math.cos(a) * b.r;
      const z = Math.sin(a) * b.r;
      dummy.position.set(x, b.y + Math.sin(time * 0.4 + b.phase) * 1.2, z);
      dummy.rotation.set(0, -a + (b.dir > 0 ? -Math.PI / 2 : Math.PI / 2), Math.sin(time * b.flap * 4 + b.phase) * 0.45);
      dummy.scale.setScalar(b.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }

  return { mesh, update };
}
