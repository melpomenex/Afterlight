/**
 * The local sky backdrop (add-atmosphere-weather-system task 3.1, design
 * D4; rebuilt for the Theater Environment campaign). ONE retained
 * full-screen quad with a gradient + cloud + sun/moon + aurora shader.
 * No raymarched atmosphere, no per-frame allocations — `setState` only
 * writes uniforms, and every geometry/material here is created once at
 * module or construction time and disposed on controller exit.
 *
 * Why a screen-space backdrop and not a dome: the game renders through an
 * orthographic isometric camera, whose rays are parallel — a dome shader
 * would sample every pixel with a different direction, so the sun, aurora
 * and stars could never appear in the iso views (only in first person).
 * This quad computes a direction per pixel instead:
 *   - first person (perspective): the real camera basis, so the sky moves
 *     correctly with pitch and yaw;
 *   - isometric (orthographic): a painted backdrop keyed to the camera's
 *     horizontal azimuth with a fixed elevation sweep, so the sunset band,
 *     sun disc, aurora and stars sit in the sky strip the iso frame shows.
 *
 * The quad is drawn first (renderOrder -1, depthTest/Write off), so all
 * world geometry composites over it.
 *
 * Extended features are gated by uniforms that default to off, so every
 * pre-existing atmosphere preset renders exactly as before:
 *   uSunDisc/uSunDir  — sunset/sunrise sun with glow and horizon path
 *   uMoonDisc         — night moon disc at the same direction
 *   uAurora           — animated aurora curtains (alpine)
 *   uHorizonGlow      — colored light band above the horizon
 *   uCloudSharpness   — cloud edge definition
 *   uCloudDrift       — cloud motion scale (0 freezes for reduced comfort)
 */

import * as THREE from 'three';

export const SKY_RADIUS = 90;

const vertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 1.0, 1.0);
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
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform float uSunDisc;
uniform float uMoonDisc;
uniform float uAurora;
uniform vec3 uAuroraColor;
uniform float uHorizonGlow;
uniform vec3 uHorizonGlowColor;
uniform float uCloudSharpness;
// Camera-aware backdrop controls.
uniform float uCameraMode;   // 0 = isometric backdrop, 1 = perspective
uniform vec3 uCamForward;
uniform vec3 uCamRight;
uniform vec3 uCamUp;
uniform vec2 uSpread;        // perspective: tan(fov/2) * (aspect, 1)
uniform float uForwardAz;    // isometric: horizontal azimuth of the view
uniform float uAzSpread;     // isometric: azimuth half-range shown
uniform vec2 uElevRange;     // isometric: elevation at the frame bottom/top
varying vec2 vUv;

// Deterministic value noise (hash-based, no textures).
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
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) { v += valueNoise(p) * a; p = p * 2.07 + 13.7; a *= 0.5; }
  return v;
}
float clouds(vec2 p, float sharpness) {
  float n = fbm(p) * 0.7 + valueNoise(p * 3.1 + 11.3) * 0.3;
  float edge0 = mix(0.52, 0.34, sharpness);
  float edge1 = mix(0.86, 0.72, sharpness);
  return smoothstep(edge0, edge1, n);
}

void main() {
  vec3 dir;
  if (uCameraMode > 0.5) {
    vec2 ndc = vUv * 2.0 - 1.0;
    dir = normalize(uCamForward + uCamRight * ndc.x * uSpread.x + uCamUp * ndc.y * uSpread.y);
  } else {
    float az = uForwardAz + (vUv.x * 2.0 - 1.0) * uAzSpread;
    float el = mix(uElevRange.x, uElevRange.y, pow(vUv.y, 1.08));
    dir = normalize(vec3(cos(el) * cos(az), sin(el), cos(el) * sin(az)));
  }
  float height = clamp(dir.y, 0.0, 1.0);
  vec3 sky = mix(uHorizonColor, uTopColor, pow(height, 0.62));

  // Horizon glow band: warm light pooling above the fog line.
  float band = pow(1.0 - height, 5.0);
  sky = mix(sky, uHorizonGlowColor, band * uHorizonGlow);

  // Sun / moon: a bright core, a wide glow and a horizon path.
  vec3 sunDir = normalize(uSunDir);
  float sunDot = max(dot(dir, sunDir), 0.0);
  float sunCore = smoothstep(0.9994, 0.9998, sunDot);
  float sunGlow = pow(sunDot, 24.0) * 0.5 + pow(sunDot, 6.0) * 0.22;
  sky += uSunColor * (sunGlow * uSunDisc + sunCore * 1.4 * uSunDisc);
  float moonCore = smoothstep(0.9992, 0.99985, sunDot);
  float moonHalo = pow(sunDot, 60.0) * 0.25;
  vec3 moonColor = vec3(0.82, 0.88, 1.0);
  sky = mix(sky, sky + moonColor * 0.65, moonHalo * uMoonDisc);
  sky += moonColor * moonCore * 1.6 * uMoonDisc;

  // Aurora: vertical curtains driven by 3D-ish noise in azimuth/height.
  if (uAurora > 0.001) {
    float az = atan(dir.z, dir.x);
    vec2 q = vec2(az * 2.4 + uTime * 0.012 * uDrift, dir.y * 3.2 - uTime * 0.02 * uDrift);
    float curtain = fbm(q * 1.7);
    float fine = fbm(q * 5.3 + 21.0);
    float mask = smoothstep(0.06, 0.32, dir.y) * (1.0 - smoothstep(0.55, 0.95, dir.y));
    float ribbon = smoothstep(0.52, 0.86, curtain * 0.75 + fine * 0.35) * mask;
    vec3 auroraColor = mix(uAuroraColor, vec3(0.45, 0.35, 0.95), smoothstep(0.25, 0.75, dir.y));
    sky += auroraColor * ribbon * uAurora * 0.85;
    sky += uAuroraColor * pow(max(0.0, curtain - 0.65), 2.0) * mask * uAurora * 1.2;
  }

  // Clouds: project the upper hemisphere onto a plane and drift it.
  float angle = uPhase * 6.2831853;
  mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
  vec2 domain = rot * dir.xz / max(dir.y, 0.24);
  float cloudMask = smoothstep(0.02, 0.24, dir.y);
  float cloud = clouds(domain * 1.35 + vec2(uTime * 0.012 * uDrift, uTime * 0.007 * uDrift), uCloudSharpness);
  // Light the cloud tops toward the sun for a believable terminator.
  float cloudLit = 0.65 + 0.35 * clamp(dot(dir, sunDir), 0.0, 1.0);
  vec3 cloudColor = mix(uCloudColor, uSunColor, (1.0 - cloudLit) * 0.5);
  vec3 color = mix(sky, cloudColor, cloud * uCloudOpacity * cloudMask);

  if (uStarGrid.x > 0.0) {
    vec2 uv = vec2(atan(dir.z, dir.x) / 6.2831853 + 0.5, asin(dir.y) / 3.14159265 + 0.5);
    vec2 cell = uv * uStarGrid;
    vec2 seed = floor(cell);
    vec2 center = vec2(0.2 + 0.6 * hash(seed), 0.2 + 0.6 * hash(seed + 19.0));
    float star = 1.0 - smoothstep(0.004, 0.022, length(fract(cell) - center));
    float twinkle = 0.95 + 0.05 * sin(uTime * 0.5 * uDrift + hash(seed) * 30.0);
    // Stars fade toward the horizon and under cloud cover.
    float starFade = smoothstep(0.02, 0.35, dir.y) * (1.0 - cloud * uCloudOpacity * cloudMask);
    color += vec3(0.7, 0.79, 1.0) * star * twinkle * 0.9 * starFade;
    float milky = exp(-pow((dir.y - dir.x * 0.38 - 0.25) * 5.0, 2.0));
    color += vec3(0.07, 0.07, 0.11) * milky * uMilkyWay * (0.5 + 0.5 * valueNoise(uv * 35.0)) * starFade;
  }
  gl_FragColor = vec4(color, 1.0);
}
`;

let sharedGeometry = null;
function skyGeometry() {
  if (!sharedGeometry) {
    sharedGeometry = new THREE.PlaneGeometry(2, 2);
  }
  return sharedGeometry;
}

/**
 * Create the retained sky backdrop. `setState` writes uniforms only; nothing
 * here allocates after construction. `drift` false (reduced comfort tier)
 * freezes the cloud/aurora motion while keeping fog/light identities.
 */
export function createSky({ drift = true, stars = 0, milkyWay = false, tier = 'normal' } = {}) {
  const geometry = skyGeometry(); // shared module resource, never disposed here
  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    side: THREE.FrontSide,
    depthWrite: false,
    depthTest: false,
    fog: false,
    uniforms: {
      uTopColor: { value: new THREE.Color('#9db6bd') },
      uHorizonColor: { value: new THREE.Color('#8fa3a8') },
      uCloudColor: { value: new THREE.Color('#77878c') },
      uCloudOpacity: { value: 0.2 },
      uPhase: { value: 0 },
      uTime: { value: 0 },
      uDrift: { value: drift ? 1 : 0 },
      uStarGrid: { value: new THREE.Vector2(stars ? (tier === 'reduced' ? 25 : 60) : 0, tier === 'reduced' ? 20 : 25) },
      uMilkyWay: { value: milkyWay ? 1 : 0 },
      uSunDir: { value: new THREE.Vector3(0.4, 0.35, 0.6).normalize() },
      uSunColor: { value: new THREE.Color('#ffd9a0') },
      uSunDisc: { value: 0 },
      uMoonDisc: { value: 0 },
      uAurora: { value: 0 },
      uAuroraColor: { value: new THREE.Color('#4be0a6') },
      uHorizonGlow: { value: 0 },
      uHorizonGlowColor: { value: new THREE.Color('#ffb46a') },
      uCloudSharpness: { value: 0.5 },
      uCameraMode: { value: 0 },
      uCamForward: { value: new THREE.Vector3(0.5, -0.4, 0.5).normalize() },
      uCamRight: { value: new THREE.Vector3(0.707, 0, -0.707) },
      uCamUp: { value: new THREE.Vector3(0.3, 0.85, 0.3).normalize() },
      uSpread: { value: new THREE.Vector2(0.62, 0.62) },
      uForwardAz: { value: 0 },
      uAzSpread: { value: 0.62 },
      uElevRange: { value: new THREE.Vector2(-1.4, 0.6) },
    },
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'atmosphere-sky';
  mesh.renderOrder = -1;
  mesh.frustumCulled = false;
  mesh.position.set(0, 0, 0);

  function setState(options = {}) {
    const { topColor, horizonColor, cloudColor, cloudOpacity, phase, timeMs } = options;
    if (topColor) material.uniforms.uTopColor.value.copy(topColor);
    if (horizonColor) material.uniforms.uHorizonColor.value.copy(horizonColor);
    if (cloudColor) material.uniforms.uCloudColor.value.copy(cloudColor);
    if (cloudOpacity !== undefined) material.uniforms.uCloudOpacity.value = cloudOpacity;
    if (phase !== undefined) material.uniforms.uPhase.value = phase;
    if (timeMs !== undefined) material.uniforms.uTime.value = timeMs / 1000;
    if (options.sunDir) material.uniforms.uSunDir.value.copy(options.sunDir).normalize();
    if (options.sunColor) material.uniforms.uSunColor.value.set(options.sunColor);
    if (options.sunDisc !== undefined) material.uniforms.uSunDisc.value = options.sunDisc;
    if (options.moonDisc !== undefined) material.uniforms.uMoonDisc.value = options.moonDisc;
    if (options.aurora !== undefined) material.uniforms.uAurora.value = options.aurora;
    if (options.auroraColor) material.uniforms.uAuroraColor.value.set(options.auroraColor);
    if (options.horizonGlow !== undefined) material.uniforms.uHorizonGlow.value = options.horizonGlow;
    if (options.horizonGlowColor) material.uniforms.uHorizonGlowColor.value.set(options.horizonGlowColor);
    if (options.cloudSharpness !== undefined) material.uniforms.uCloudSharpness.value = options.cloudSharpness;
    if (options.cloudDrift !== undefined) material.uniforms.uDrift.value = (drift ? 1 : 0) * (options.cloudDrift ?? 1);
    if (options.starDensity !== undefined) {
      material.uniforms.uStarGrid.value.x = options.starDensity > 0.15 ? (tier === 'reduced' ? 25 : 60) : 0;
    }
    if (options.milkyWay !== undefined) material.uniforms.uMilkyWay.value = options.milkyWay > 0.1 ? 1 : 0;
  }

  /**
   * Point the backdrop at the active camera. `view` is a retained record:
   * { mode: 'perspective'|'iso', forward, right, up, spread:[x,y],
   *   azimuth, azimuthSpread, elevationRange:[bottom, top] }.
   * Optional so test doubles that only implement setState still work.
   */
  function setCamera(view = {}) {
    const u = material.uniforms;
    u.uCameraMode.value = view.mode === 'perspective' ? 1 : 0;
    if (view.forward) u.uCamForward.value.set(view.forward[0], view.forward[1], view.forward[2]).normalize();
    if (view.right) u.uCamRight.value.set(view.right[0], view.right[1], view.right[2]).normalize();
    if (view.up) u.uCamUp.value.set(view.up[0], view.up[1], view.up[2]).normalize();
    if (view.spread) u.uSpread.value.set(view.spread[0], view.spread[1]);
    if (Number.isFinite(view.azimuth)) u.uForwardAz.value = view.azimuth;
    if (Number.isFinite(view.azimuthSpread)) u.uAzSpread.value = view.azimuthSpread;
    if (view.elevationRange) u.uElevRange.value.set(view.elevationRange[0], view.elevationRange[1]);
  }

  function setDrift(driftEnabled) {
    material.uniforms.uDrift.value = driftEnabled ? 1 : 0;
  }

  function dispose() {
    // The geometry is shared module state owned by this module's lifetime,
    // not by one controller; only the material is per-controller.
    material.dispose();
  }

  return { mesh, setState, setCamera, setDrift, dispose };
}
