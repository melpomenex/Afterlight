/**
 * Layered cloud and light effects for the Theater environments:
 *   - `createCloudSea`: stacked shader planes that read as a vast cloud deck
 *     below (Cloud Garden) with subtle sun tinting and wind drift;
 *   - `createCloudBank`: instanced low-poly puffs for distant formations and
 *     horizon banks (cheap, fogged, silhouette-first);
 *   - `createLightShafts`: additive planes aligned to the sun for forest
 *     sunbeams and cathedral light.
 *
 * All animation is uniform- or matrix-based; one draw call per layer/bank.
 */

import * as THREE from 'three';

const cloudVertex = /* glsl */ `
#include <fog_pars_vertex>
varying vec2 vXZ;
void main() {
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vXZ = worldPosition.xz;
  vec4 mvPosition = viewMatrix * worldPosition;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

const cloudFragment = /* glsl */ `
#include <fog_pars_fragment>
uniform float uTime;
uniform vec3 uColor;
uniform vec3 uShadow;
uniform vec3 uSunColor;
uniform vec3 uSunDir;
uniform float uOpacity;
uniform float uScale;
uniform float uSpeed;
uniform vec2 uWind;
uniform float uContrast;
varying vec2 vXZ;

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
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += noise(p) * a; p = p * 2.03 + 17.3; a *= 0.5; }
  return v;
}

void main() {
  vec2 p = vXZ * uScale;
  vec2 drift = uWind * uTime * uSpeed;
  float n = fbm(p + drift);
  float detail = fbm(p * 2.7 - drift * 1.6) * 0.4;
  float density = n * 0.75 + detail;
  float alpha = smoothstep(0.5 - uContrast * 0.22, 0.86, density) * uOpacity;
  if (alpha < 0.01) discard;
  float lit = clamp(dot(normalize(vec3(0.0, 1.0, 0.0)), normalize(uSunDir)), 0.0, 1.0);
  vec3 color = mix(uShadow, uColor, smoothstep(0.35, 0.9, density));
  color = mix(color, uSunColor, lit * 0.35);
  gl_FragColor = vec4(color, alpha);
  #include <fog_fragment>
}
`;

/**
 * @param {object} options
 * @param {Array<{y:number, color:string, shadow:string, opacity:number, scale:number, speed:number, contrast:number}>} options.layers
 */
export function createCloudSea({ layers = [], size = 900, segments = 1, wind = [1, 0.2], sunDir = [0.3, 0.5, 0.4], sunColor = '#ffd9a0', track = () => {} } = {}) {
  const group = new THREE.Group();
  group.name = 'environment-cloud-sea';
  const materials = [];
  const geometries = [];
  for (const layer of layers) {
    const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
    geometry.rotateX(-Math.PI / 2);
    const material = new THREE.ShaderMaterial({
      vertexShader: cloudVertex,
      fragmentShader: cloudFragment,
      uniforms: THREE.UniformsUtils.merge([
        THREE.UniformsLib.fog,
        {
          uTime: { value: 0 },
          uColor: { value: new THREE.Color(layer.color ?? '#ffffff') },
          uShadow: { value: new THREE.Color(layer.shadow ?? '#8fa3b8') },
          uSunColor: { value: new THREE.Color(sunColor) },
          uSunDir: { value: new THREE.Vector3(...sunDir).normalize() },
          uOpacity: { value: layer.opacity ?? 0.5 },
          uScale: { value: layer.scale ?? 0.012 },
          uSpeed: { value: layer.speed ?? 0.4 },
          uWind: { value: new THREE.Vector2(wind[0], wind[1]) },
          uContrast: { value: layer.contrast ?? 0.6 },
        },
      ]),
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: true,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = layer.y ?? 0;
    mesh.renderOrder = -0.4;
    mesh.frustumCulled = false;
    group.add(mesh);
    materials.push(material);
    geometries.push(geometry);
    track(geometry);
    track(material);
  }

  function update(time, _dt, state = {}) {
    for (const material of materials) {
      material.uniforms.uTime.value = time;
      if (Number.isFinite(state.windX) || Number.isFinite(state.windZ)) {
        material.uniforms.uWind.value.set(state.windX ?? 0, state.windZ ?? 0);
      }
    }
  }

  function setSky({ sunColor: sc, sunDir: sd } = {}) {
    for (const material of materials) {
      if (sc) material.uniforms.uSunColor.value.set(sc);
      if (sd) material.uniforms.uSunDir.value.copy(sd).normalize();
    }
  }

  function dispose() {
    for (const g of geometries) g.dispose();
    for (const m of materials) m.dispose();
    group.clear();
  }

  return { group, update, setSky, dispose };
}

/** Instanced low-poly cloud puffs: distant banks and floating formations. */
export function createCloudBank({ float, count = 14, radius = [80, 160], height = [24, 60], scale = [10, 30], color = '#e9eef5', opacity = 1, track = () => {}, name = 'environment-cloud-bank' } = {}) {
  if (typeof float !== 'function') throw new Error('createCloudBank requires a float() stream');
  const geometry = new THREE.IcosahedronGeometry(1, 1);
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i++) {
    const s = 1 + (float() - 0.5) * 0.55;
    position.setXYZ(i, position.getX(i) * s * 1.4, position.getY(i) * s * 0.7, position.getZ(i) * s);
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  const material = new THREE.MeshStandardMaterial({
    color, roughness: 1, metalness: 0, transparent: opacity < 1, opacity,
    emissive: color, emissiveIntensity: 0.12, fog: true, flatShading: true,
  });
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.name = name;
  mesh.frustumCulled = false;
  const dummy = new THREE.Object3D();
  const puffs = [];
  for (let i = 0; i < count; i++) {
    const angle = float() * Math.PI * 2;
    const r = radius[0] + float() * (radius[1] - radius[0]);
    const size = scale[0] + float() * (scale[1] - scale[0]);
    puffs.push({
      x: Math.cos(angle) * r,
      z: Math.sin(angle) * r,
      y: height[0] + float() * (height[1] - height[0]),
      sx: size * (1.1 + float() * 0.9),
      sy: size * (0.45 + float() * 0.35),
      sz: size,
      drift: 0.35 + float() * 0.5,
      phase: float() * Math.PI * 2,
    });
  }
  track(geometry);
  track(material);

  function update(time, _dt, state = {}) {
    const windX = state.windX ?? 0.2, windZ = state.windZ ?? 0;
    for (let i = 0; i < puffs.length; i++) {
      const p = puffs[i];
      dummy.position.set(
        p.x + windX * time * p.drift * 0.6,
        p.y + Math.sin(time * 0.08 + p.phase) * 1.2,
        p.z + windZ * time * p.drift * 0.6,
      );
      dummy.scale.set(p.sx, p.sy, p.sz);
      dummy.rotation.y = time * 0.01 * p.drift;
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }
  update(0);

  return { mesh, update };
}

/**
 * Additive sun shafts. Each beam is a thin, tapered plane; shafts are placed
 * on a ring OUTSIDE the Theater footprint (`ring`) so they read as light
 * through distant trees instead of veiling the camera. Opacity is
 * deliberately low and pulses once for the whole set.
 */
export function createLightShafts({ float, count = 7, ring = [18, 30], origin = [0, 6, 0], color = '#ffe6b0', opacity = 0.14, width = [1.4, 3.2], length = [10, 20], track = () => {}, name = 'environment-shafts' } = {}) {
  if (typeof float !== 'function') throw new Error('createLightShafts requires a float() stream');
  const group = new THREE.Group();
  group.name = name;
  const material = new THREE.MeshBasicMaterial({
    color, transparent: true, opacity, blending: THREE.AdditiveBlending,
    depthWrite: false, side: THREE.DoubleSide, fog: false,
  });
  track(material);
  for (let i = 0; i < count; i++) {
    const w = width[0] + float() * (width[1] - width[0]);
    const l = length[0] + float() * (length[1] - length[0]);
    // Tapered beam: wide at the top, narrow at the bottom.
    const geometry = new THREE.BufferGeometry();
    const halfTop = w / 2, halfBottom = w * 0.16;
    const positions = new Float32Array([
      -halfBottom, -l / 2, 0, halfBottom, -l / 2, 0, halfTop, l / 2, 0,
      -halfBottom, -l / 2, 0, halfTop, l / 2, 0, -halfTop, l / 2, 0,
    ]);
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.computeVertexNormals();
    track(geometry);
    const mesh = new THREE.Mesh(geometry, material);
    const angle = float() * Math.PI * 2;
    const r = ring[0] + float() * Math.max(0, ring[1] - ring[0]);
    mesh.position.set(
      origin[0] + Math.cos(angle) * r,
      origin[1] + float() * 3.5,
      origin[2] + Math.sin(angle) * r,
    );
    mesh.rotation.set(-0.62 + (float() - 0.5) * 0.16, angle + 0.6, 0.3 + (float() - 0.5) * 0.2);
    mesh.renderOrder = 3;
    group.add(mesh);
  }
  const baseOpacity = opacity;

  function update(time) {
    // ONE shared material: a single soft breathing pulse for the whole set.
    material.opacity = baseOpacity * (0.85 + 0.15 * Math.sin(time * 0.35));
  }

  return { group, update };
}
