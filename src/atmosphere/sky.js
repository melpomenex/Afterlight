/**
 * The local sky backdrop (add-atmosphere-weather-system task 3.1, design
 * D4): ONE retained dome with a cheap gradient + cloud-alpha shader. No
 * raymarched atmosphere, no per-frame allocations — `setState` only writes
 * uniforms, and every geometry/material here is created once at module or
 * construction time and disposed on controller exit.
 *
 * The dome is a BackSide sphere centered on the place, rendered first
 * (renderOrder -1, depthWrite off) so all world geometry draws over it
 * while it still sits inside every camera's far plane (orthographic orbit
 * and first person both stay well inside radius 90 / far 150).
 */

import * as THREE from 'three';

export const SKY_RADIUS = 90;

const vertexShader = /* glsl */ `
varying vec3 vDirection;
void main() {
  vDirection = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = /* glsl */ `
uniform vec3 uTopColor;
uniform vec3 uHorizonColor;
uniform vec3 uCloudColor;
uniform float uCloudOpacity;
uniform float uPhase;
uniform float uTime;
uniform float uDrift;
uniform vec2 uStarGrid;
uniform float uMilkyWay;
varying vec3 vDirection;

// Deterministic value noise (hash-based, no textures): two octaves are
// plenty for a soft overcast impression at isometric distance.
float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float clouds(vec2 p) {
  float n = valueNoise(p) * 0.65 + valueNoise(p * 2.7 + 11.3) * 0.35;
  return smoothstep(0.42, 0.78, n);
}

void main() {
  float height = clamp(vDirection.y, 0.0, 1.0);
  vec3 sky = mix(uHorizonColor, uTopColor, pow(height, 0.62));
  // Cloud domain: project the upper hemisphere onto a plane and drift it
  // slowly with time (uDrift 0 stops all motion for reduced comfort tiers)
  // and rotate the domain by the shared time phase so scheduled places
  // agree on where the sky sits.
  float angle = uPhase * 6.2831853;
  mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
  vec2 domain = rot * vDirection.xz / max(vDirection.y, 0.24);
  float mask = smoothstep(0.02, 0.24, vDirection.y);
  float cloud = clouds(domain * 1.35 + vec2(uTime * 0.012 * uDrift, uTime * 0.007 * uDrift));
  vec3 color = mix(sky, uCloudColor, cloud * uCloudOpacity * mask);
  if (uStarGrid.x > 0.0) {
    vec3 direction = normalize(vDirection);
    vec2 uv = vec2(atan(direction.z,direction.x)/6.2831853+.5,asin(direction.y)/3.14159265+.5);
    vec2 cell = uv*uStarGrid;
    vec2 seed = floor(cell);
    vec2 center = vec2(.2+.6*hash(seed),.2+.6*hash(seed+19.));
    float star = 1.-smoothstep(.004,.022,length(fract(cell)-center));
    float twinkle = .95+.05*sin(uTime*.5*uDrift+hash(seed)*30.);
    color += vec3(.7,.79,1.)*star*twinkle*.9;
    float band = exp(-pow((direction.y-direction.x*.38-.25)*5.,2.));
    color += vec3(.07,.07,.11)*band*uMilkyWay*(.5+.5*valueNoise(uv*35.));
  }
  gl_FragColor = vec4(color, 1.0);
}
`;

let sharedGeometry = null;
function skyGeometry() {
  if (!sharedGeometry) {
    sharedGeometry = new THREE.SphereGeometry(SKY_RADIUS, 24, 12);
  }
  return sharedGeometry;
}

/**
 * Create the retained sky dome. `setState` writes uniforms only; nothing
 * here allocates after construction. `drift` false (reduced comfort tier)
 * freezes the cloud motion while keeping fog/light/wetness identities.
 */
export function createSky({ drift = true, stars = 0, milkyWay = false, tier = 'normal' } = {}) {
  const geometry = skyGeometry(); // shared module resource, never disposed here
  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uTopColor: { value: new THREE.Color('#9db6bd') },
      uHorizonColor: { value: new THREE.Color('#8fa3a8') },
      uCloudColor: { value: new THREE.Color('#77878c') },
      uCloudOpacity: { value: 0.2 },
      uPhase: { value: 0 },
      uTime: { value: 0 },
      uDrift: { value: drift ? 1 : 0 },
      uStarGrid: {value: new THREE.Vector2(stars ? (tier === 'reduced' ? 25 : 60) : 0, tier === 'reduced' ? 20 : 25)},
      uMilkyWay: {value: milkyWay ? 1 : 0},
    },
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'atmosphere-sky';
  mesh.renderOrder = -1;
  mesh.frustumCulled = false;
  // The dome stays centered where the action is; the game's places live
  // within a couple of units of the origin, so no per-frame follow is needed.
  mesh.position.set(0, 0, 0);

  function setState({ topColor, horizonColor, cloudColor, cloudOpacity, phase, timeMs }) {
    if (topColor) material.uniforms.uTopColor.value.copy(topColor);
    if (horizonColor) material.uniforms.uHorizonColor.value.copy(horizonColor);
    if (cloudColor) material.uniforms.uCloudColor.value.copy(cloudColor);
    if (cloudOpacity !== undefined) material.uniforms.uCloudOpacity.value = cloudOpacity;
    if (phase !== undefined) material.uniforms.uPhase.value = phase;
    if (timeMs !== undefined) material.uniforms.uTime.value = timeMs / 1000;
  }

  function setDrift(driftEnabled) {
    material.uniforms.uDrift.value = driftEnabled ? 1 : 0;
  }

  function dispose() {
    // The geometry is shared module state owned by this module's lifetime,
    // not by one controller; only the material is per-controller.
    material.dispose();
  }

  return { mesh, setState, setDrift, dispose };
}
