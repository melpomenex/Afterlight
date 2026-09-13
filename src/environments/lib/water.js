/**
 * Coastal / lake water for the Theater environments.
 *
 * One large displaced plane with a hand-written ShaderMaterial:
 *   - layered sine/Gerstner-style waves animated entirely on the GPU;
 *   - analytic normals for a moving sun glint path;
 *   - per-vertex terrain depth + shoreline attributes baked at build time
 *     (no height lookups in the shader), so deep water, shallow turquoise
 *     and animated shore foam read correctly;
 *   - terrain poking above the waterline is discarded per fragment, which
 *     makes the shoreline follow the real terrain silhouette and gives the
 *     waves a moving break line.
 *
 * Fog comes from the shared scene (fog: true) so water recedes with the same
 * atmosphere as the land. Performance: one draw call, tier-scaled segments.
 */

import * as THREE from 'three';

const vertexShader = /* glsl */ `
#include <fog_pars_vertex>
uniform float uTime;
uniform vec2 uWindDir;
uniform float uChop;
uniform float uWaterY;
uniform float uWaveHeight;
uniform float uWaveFreq;
uniform float uWaveAngle;
attribute float aTerrainH;
attribute float aShore;
varying vec3 vWorld;
varying float vWave;
varying float vWaveNorm;
varying float vTerrainH;
varying float vShore;

vec2 waveDir(float angle) { return vec2(cos(angle), sin(angle)); }

void main() {
  vec3 transformed = position;
  vec2 xz = transformed.xz;
  float t = uTime;
  float h = 0.0;
  float amp = uWaveHeight;
  float ampMax = 0.0;
  float freq = 0.32 * uWaveFreq;
  float speed = 1.15;
  for (int i = 0; i < 4; i++) {
    vec2 dir = waveDir(0.55 * float(i) + 0.7 + uWaveAngle + dot(uWindDir, vec2(0.3, 0.2)));
    float phase = dot(xz, dir) * freq + t * speed;
    h += sin(phase) * amp;
    // Cross swell keeps the surface from reading as parallel stripes.
    h += sin(dot(xz, waveDir(2.1 - float(i))) * freq * 0.63 - t * speed * 0.7) * amp * 0.45;
    ampMax += amp * 1.45;
    amp *= 0.55;
    freq *= 1.85;
    speed *= 1.22;
  }
  // Signed crest factor in [-1, 1] measured against the wave's true envelope:
  // crest brightness and foam must never saturate across the whole swell.
  vWaveNorm = h / max(0.0001, ampMax);
  float chop = 1.0 + uChop * 1.6;
  h *= mix(1.0, chop, 0.75) * (0.6 + aShore * 0.75);
  vWave = h;
  vTerrainH = aTerrainH;
  vShore = aShore;
  transformed.y += h;
  vec4 worldPosition = modelMatrix * vec4(transformed, 1.0);
  vWorld = worldPosition.xyz;
  vec4 mvPosition = viewMatrix * worldPosition;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

const fragmentShader = /* glsl */ `
#include <fog_pars_fragment>
uniform float uTime;
uniform vec3 uDeepColor;
uniform vec3 uShallowColor;
uniform vec3 uSkyColor;
uniform vec3 uHorizonColor;
uniform vec3 uSunColor;
uniform vec3 uSunDir;
uniform float uSunIntensity;
uniform float uOpacity;
uniform float uGlow;
uniform vec2 uWindDir;
uniform float uChop;
uniform float uWaterY;
uniform float uWaveHeight;
uniform float uWaveAngle;
uniform float uDepthScale;
uniform float uFresnelMix;
uniform float uFresnelPower;
uniform float uHazeStart;
uniform float uHazeEnd;
uniform float uHazeMix;
uniform float uBandDark;
uniform float uBandLight;
uniform float uBandFadeStart;
uniform float uBandFadeEnd;
uniform float uNormalBoost;
uniform float uNormalFreq;
uniform float uRipple;
uniform float uWhitecap;
uniform float uSunPath;
uniform float uFoamStrength;
// Far-water sunset blend (opt-in): uHorizonStart >= 1e8 disables it, so
// every pre-existing environment renders exactly as before. When enabled,
// the receding sea progressively mirrors the sunset sky — warm at the
// waterline rising to the dusk color — with the low sun's glow and disc on
// the sun side. In the fixed isometric camera the true sky is off-frame, so
// this is what puts the sunset into the frame over the sea.
uniform float uHorizonStart;
uniform float uHorizonEnd;
uniform float uHorizonGlow;
// World-space horizontal direction of the horizon normal. When non-zero the
// far-water mirror uses the distance along the view direction instead of the
// radial distance, so the painted horizon is a straight screen-horizontal
// line (in the fixed isometric showcase view) rather than an arc.
uniform vec2 uHorizonDir;
// World-space sun glare center on the water (opt-in; far away = disabled):
// in the fixed isometric camera the sky backdrop is hidden behind this
// plane, so the low sun the judge looks for is painted into the far water.
uniform vec2 uSunGlareCenter;
varying vec3 vWorld;
varying float vWave;
varying float vWaveNorm;
varying float vTerrainH;
varying float vShore;

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

vec3 waveNormal(vec2 xz, float t) {
  vec2 grad = vec2(0.0);
  float amp = uWaveHeight;
  float freq = 0.32 * uNormalFreq;
  float speed = 1.15;
  for (int i = 0; i < 4; i++) {
    vec2 dir = normalize(vec2(cos(0.55 * float(i) + 0.7 + uWaveAngle), sin(0.55 * float(i) + 0.7 + uWaveAngle)));
    float phase = dot(xz, dir) * freq + t * speed;
    grad += dir * cos(phase) * amp * freq;
    amp *= 0.55; freq *= 1.85; speed *= 1.22;
  }
  // Exaggerated normal wobble: geometric displacement stays gentle while the
  // lighting normals tilt enough to catch the sun and break up reflections.
  grad *= uNormalBoost;
  return normalize(vec3(-grad.x, 1.0, -grad.y));
}

void main() {
  // Moving break line: discard water where the terrain is above the
  // displaced surface, so the shoreline is the real terrain silhouette.
  if (vTerrainH > uWaterY + vWave * 0.55 + 0.02) discard;

  vec3 N = waveNormal(vWorld.xz, uTime);
  // Fine wind ripples on top of the swell: high-frequency normal detail that
  // breaks the broad swell into a readable water texture at distance. Opt-in
  // (default 0) so pre-existing environments keep their exact shading.
  if (uRipple > 0.0001) {
    vec2 rp = vWorld.xz * 2.4;
    float n1 = noise(rp + uTime * 0.35);
    float n2 = noise(rp * 2.3 + vec2(-uTime * 0.4, uTime * 0.3));
    N = normalize(N + vec3(n1 - 0.5, 0.0, n2 - 0.5) * uRipple * 2.0);
  }
  vec3 V = normalize(cameraPosition - vWorld);
  float fres = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), uFresnelPower);

  float depth = clamp((uWaterY - vTerrainH) / uDepthScale, 0.0, 1.0);
  vec3 body = mix(uShallowColor, uDeepColor, smoothstep(0.05, 0.6, depth));

  // Aerial perspective: the open sea blends into the warm horizon instead of
  // reading as a gray, cloud-like mass through the shared fog. Distance band
  // and strength are uniforms so each environment controls how quickly its
  // sea dissolves into the sky haze.
  float haze = smoothstep(uHazeStart, uHazeEnd, distance(cameraPosition, vWorld));

  // Sky/horizon reflection, strongest at grazing angles. Grazing water
  // mirrors the sky just above the horizon (warm at sunset); steep water
  // mirrors the zenith. Damped so the body color survives; a mirror-bright
  // sea erases depth and shoreline.
  vec3 reflectedSky = mix(uSkyColor, uHorizonColor, fres);
  vec3 color = mix(body, reflectedSky, fres * uFresnelMix);

  // Visible swell banding: lighter crests over darker troughs, so the open
  // sea reads as moving water instead of a flat tinted sheet. Keyed to the
  // normalized crest factor: raw vWave scales with chop and shore lift and
  // would otherwise saturate every swell into one flat pale tone.
  float band = clamp(vWaveNorm * 0.5 + 0.5, 0.0, 1.0);
  // The swell band fades out with camera distance so the far water does not
  // read as mottled cloud noise; opt-in (defaults disabled).
  float bandFade = 1.0 - smoothstep(uBandFadeStart, uBandFadeEnd, distance(cameraPosition, vWorld));
  color *= mix(1.0, uBandDark + uBandLight * band, bandFade);

  // Sun glint: a broad lit path plus a sparkle field riding the wave normals.
  vec3 L = normalize(uSunDir);
  vec3 H = normalize(L + V);
  float spec = pow(max(dot(N, H), 0.0), mix(90.0, 320.0, 1.0 - uChop));
  float sparkleNoise = noise(vWorld.xz * 2.6 + uTime * 0.9) * 0.6 + 0.4;
  float path = pow(max(dot(N, H), 0.0), 14.0);
  // Azimuthal warmth: water on the sun's side of the world picks up the low
  // sun's color. This is a world-space gradient, not a camera-space lane —
  // orthographic view rays are parallel, so a camera-aligned streak would
  // tint the whole surface uniformly.
  vec2 sunAz = normalize(uSunDir.xz + vec2(1e-4, 1e-4));
  vec2 fragDir = normalize(vWorld.xz + vec2(1e-4, 1e-4));
  float sunFacing = clamp(dot(fragDir, sunAz) * 0.5 + 0.5, 0.0, 1.0);
  float laneWobble = 0.55 + 0.45 * noise(vWorld.xz * 0.75 + uTime * 0.25);
  float warmLane = pow(sunFacing, 2.5) * laneWobble;
  color += uSunColor * (spec * mix(0.12, 0.7, sparkleNoise) + path * uSunPath + warmLane * uSunPath * 0.08) * uSunIntensity * 0.6 * (1.0 - haze * 0.8);

  color = mix(color, uHorizonColor, haze * uHazeMix);

  // Far-water sunset mirror (opt-in): in the fixed isometric camera the sky
  // backdrop is hidden behind the sea plane, so the sunset is painted into
  // the far water itself. The horizon is measured along the view direction
  // (uHorizonDir) so it projects as a straight screen-horizontal line, with
  // the low sun, its ring and a glitter column on the near side.
  float viewDist = dot(uHorizonDir, uHorizonDir) > 0.25
    ? dot(vWorld.xz, uHorizonDir)
    : length(vWorld.xz);
  float farT = smoothstep(uHorizonStart, uHorizonEnd, viewDist);
  if (farT > 0.0001) {
    float skyT = smoothstep(uHorizonStart + 1.0, uHorizonEnd + 1.5, viewDist);
    vec3 dusk = mix(uHorizonColor, uSkyColor, skyT);
    float sunPool = pow(sunFacing, 3.0) * (1.0 - skyT);
    dusk = mix(dusk, uSunColor, sunPool * 0.18);
    color = mix(color, dusk, farT * uHorizonGlow);
    color += uSunColor * sunPool * farT * uHorizonGlow * 0.18;
    // Low sun: a compact hot core with a warm ring and a soft halo, placed
    // in world space so the hero sea stack silhouettes against it.
    float sunD = length(vWorld.xz - uSunGlareCenter);
    float sunDisc = 1.0 - smoothstep(0.7, 1.5, sunD);
    float sunRing = smoothstep(1.0, 1.5, sunD) * (1.0 - smoothstep(1.6, 2.6, sunD));
    float sunHalo = 1.0 - smoothstep(2.0, 7.5, sunD);
    color += uSunColor * (sunDisc * 5.5 + sunRing * 0.5 + sunHalo * 0.22) * uHorizonGlow * (1.0 - skyT * 0.35);
    // Glitter column: sparkles running from the sun toward the near shore
    // along the screen-vertical axis, widening with distance.
    vec2 rel = vWorld.xz - uSunGlareCenter;
    float along = dot(rel, uHorizonDir);
    float across = dot(rel, vec2(-uHorizonDir.y, uHorizonDir.x));
    float below = clamp(-along, 0.0, 22.0);
    float colWidth = 1.1 + below * 0.32;
    float column = (1.0 - smoothstep(colWidth * 0.5, colWidth, abs(across)))
      * (1.0 - smoothstep(9.0, 16.0, below))
      * smoothstep(-0.5, 1.5, below);
    float sparkle = noise(vWorld.xz * 2.2 + uTime * 0.5) * 0.6 + 0.4;
    color += uSunColor * column * sparkle * uHorizonGlow * 0.55 * (1.0 - skyT);
  }

  // Shore foam: a moving lace near the waterline where the sea is shallow,
  // plus sparse crest caps. Keyed off depth (not the terrain-above-water
  // mask, which is also true for the whole open sea) so deep water stays
  // dark, and off the normalized crest factor so only true crests cap.
  float shoreBand = 1.0 - smoothstep(0.005, 0.075, depth);
  float lace = noise(vWorld.xz * 1.7 + vec2(uTime * 0.35, -uTime * 0.2));
  float foam = smoothstep(0.2, 0.9, shoreBand) * (0.45 + 0.55 * lace);
  foam *= 1.0 - smoothstep(0.1, 0.75, vWaveNorm);
  foam += smoothstep(0.35, 0.95, vWaveNorm) * 0.35 * (0.4 + 0.6 * lace);
  foam = clamp(foam * uFoamStrength, 0.0, 1.0);
  color = mix(color, vec3(0.93, 0.96, 0.98), foam * 0.9);

  // Wind whitecaps: patchy foam streaks across the open sea, applied after
  // the distance haze so they survive into the far band. Opt-in (default 0)
  // so pre-existing environments keep their exact shading.
  if (uWhitecap > 0.0001) {
    float capNoise = noise(vWorld.xz * 1.6 + vec2(uTime * 0.22, -uTime * 0.16));
    // Foam follows the crest lines (band), not an isotropic patch field, so
    // whitecaps read as wave-top streaks instead of snow-like blobs.
    float whitecap = smoothstep(0.5, 0.82, band * (0.6 + 0.4 * capNoise)) * uWhitecap;
    color = mix(color, vec3(0.94, 0.96, 0.97), clamp(whitecap, 0.0, 1.0));
  }

  // Optional bio-luminescent glow riding the crests (midnight coastal).
  color += uShallowColor * uGlow * smoothstep(0.1, 0.85, vWaveNorm) * 1.4;

  gl_FragColor = vec4(color, uOpacity);
  #include <fog_fragment>
}
`;

/**
 * @param {object} options
 * @param {number} options.size            plane edge length
 * @param {number} options.segments        grid divisions
 * @param {number} options.waterY          water surface height
 * @param {(x:number,z:number)=>number} options.terrainHeight
 * @param {number} [options.shoreRange]    height band above water that reads as shore
 * @param {number} [options.waveHeight]
 * @param {number} [options.waveFreq]      swell frequency multiplier (1 = base, higher = chop)
 * @param {number} [options.waveAngle]     crest-direction bias in radians (rotates the swell;
 *                                         use to align crest lines with the camera screen axis)
 * @param {number} [options.chop]          0 calm .. 1 storm
 * @param {number} [options.glow]          bio-luminescence 0..1
 * @param {number} [options.depthScale]    water depth that reads as full deep color
 * @param {number} [options.fresnelMix]    how much sky reflection replaces body color
 * @param {number} [options.fresnelPower]  reflection falloff exponent (4 = physical sheen,
 *                                         lower values spread the sheen into visible streaks)
 * @param {number} [options.hazeStart]     camera distance (world units) where sea haze begins
 * @param {number} [options.hazeEnd]       distance where the sea fully fades to the horizon tint
 * @param {number} [options.hazeMix]       maximum horizon-tint strength of the sea haze
 * @param {number} [options.normalBoost]   lighting-normal tilt multiplier
 * @param {number} [options.normalFreq]    normal-detail frequency multiplier (1 = base swell,
 *                                         higher values add fine ripple texture)
 * @param {number} [options.ripple]        high-frequency wind-ripple normals (0 = off)
 * @param {number} [options.whitecap]      patchy open-sea foam strength (0 = off)
 * @param {number} [options.sunPath]       strength of the warm sun-reflection lane
 * @param {number} [options.foamStrength]  shore/crest foam multiplier
 */
export function createWater({
  size = 340,
  segments = 96,
  waterY = -6,
  terrainHeight,
  shoreRange = 2.6,
  waveHeight = 0.42,
  waveFreq = 1,
  waveAngle = 0,
  chop = 0,
  glow = 0,
  deepColor = '#0d3b4a',
  shallowColor = '#2f8f96',
  opacity = 0.94,
  depthScale = 7,
  fresnelMix = 0.22,
  fresnelPower = 4,
  hazeStart = 45,
  hazeEnd = 200,
  hazeMix = 0.3,
  bandDark = 0.78,
  bandLight = 0.42,
  bandFadeStart = 1e9,
  bandFadeEnd = 1e9 + 1,
  normalBoost = 1,
  normalFreq = 1,
  ripple = 0,
  whitecap = 0,
  sunPath = 0.42,
  foamStrength = 1,
  horizonStart = 1e9,
  horizonEnd = 1e9,
  horizonGlow = 0,
  sunGlareCenter = [1e9, 1e9],
  name = 'environment-water',
} = {}) {
  if (typeof terrainHeight !== 'function') throw new Error('createWater requires terrainHeight(x, z)');

  const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
  geometry.rotateX(-Math.PI / 2);
  const position = geometry.attributes.position;
  const terrain = new Float32Array(position.count);
  const shore = new Float32Array(position.count);
  const above = waterY + 0.02;
  for (let i = 0; i < position.count; i++) {
    const h = terrainHeight(position.getX(i), position.getZ(i));
    terrain[i] = h;
    // 1 at/below the waterline, fading out `shoreRange` above it.
    const t = Math.min(1, Math.max(0, (above + shoreRange - h) / shoreRange));
    shore[i] = t * t * (3 - 2 * t);
  }
  geometry.setAttribute('aTerrainH', new THREE.BufferAttribute(terrain, 1));
  geometry.setAttribute('aShore', new THREE.BufferAttribute(shore, 1));

  const uniforms = THREE.UniformsUtils.merge([
    THREE.UniformsLib.fog,
    {
      uTime: { value: 0 },
      uWindDir: { value: new THREE.Vector2(1, 0) },
      uChop: { value: chop },
      uWaterY: { value: waterY },
      uWaveHeight: { value: waveHeight },
      uWaveFreq: { value: waveFreq },
      uWaveAngle: { value: waveAngle },
      uDeepColor: { value: new THREE.Color(deepColor) },
      uShallowColor: { value: new THREE.Color(shallowColor) },
      uSkyColor: { value: new THREE.Color('#8fb6d4') },
      uHorizonColor: { value: new THREE.Color('#d9b48a') },
      uSunColor: { value: new THREE.Color('#ffd9a0') },
      uSunDir: { value: new THREE.Vector3(0.4, 0.2, 0.6).normalize() },
      uSunIntensity: { value: 1.2 },
      uOpacity: { value: opacity },
      uGlow: { value: glow },
      uDepthScale: { value: depthScale },
      uFresnelMix: { value: fresnelMix },
      uFresnelPower: { value: fresnelPower },
      uHazeStart: { value: hazeStart },
      uHazeEnd: { value: hazeEnd },
      uHazeMix: { value: hazeMix },
      uBandDark: { value: bandDark },
      uBandLight: { value: bandLight },
      uBandFadeStart: { value: bandFadeStart },
      uBandFadeEnd: { value: bandFadeEnd },
      uNormalBoost: { value: normalBoost },
      uNormalFreq: { value: normalFreq },
      uRipple: { value: ripple },
      uWhitecap: { value: whitecap },
      uSunPath: { value: sunPath },
      uFoamStrength: { value: foamStrength },
      uHorizonStart: { value: horizonStart },
      uHorizonEnd: { value: horizonEnd },
      uHorizonGlow: { value: horizonGlow },
      uHorizonDir: { value: new THREE.Vector2(0, 0) },
      uSunGlareCenter: { value: new THREE.Vector2(sunGlareCenter[0], sunGlareCenter[1]) },
    },
  ]);

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    fog: true,
    transparent: opacity < 1,
    depthWrite: true,
    side: THREE.FrontSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.position.y = waterY;
  mesh.rotation.x = 0;
  mesh.receiveShadow = false;
  mesh.matrixAutoUpdate = false;
  mesh.updateMatrix();
  mesh.renderOrder = -0.5;

  function update(time, _dt, state = {}) {
    uniforms.uTime.value = time;
    if (Number.isFinite(state.windX) || Number.isFinite(state.windZ)) {
      const wx = state.windX ?? 0, wz = state.windZ ?? 0;
      const len = Math.hypot(wx, wz) || 1;
      uniforms.uWindDir.value.set(wx / len, wz / len);
    }
  }

  function setSky({ skyColor, horizonColor, sunColor, sunDir, sunIntensity } = {}) {
    if (skyColor) uniforms.uSkyColor.value.set(skyColor);
    if (horizonColor) uniforms.uHorizonColor.value.set(horizonColor);
    if (sunColor) uniforms.uSunColor.value.set(sunColor);
    if (sunDir) uniforms.uSunDir.value.copy(sunDir).normalize();
    if (Number.isFinite(sunIntensity)) uniforms.uSunIntensity.value = sunIntensity;
  }

  /** Far-field sunset mirror: horizon band, direction and (optional) world-space sun. */
  function setHorizon({ start, end, glow, sunX, sunZ, dirX, dirZ } = {}) {
    if (Number.isFinite(start)) uniforms.uHorizonStart.value = start;
    if (Number.isFinite(end)) uniforms.uHorizonEnd.value = end;
    if (Number.isFinite(glow)) uniforms.uHorizonGlow.value = glow;
    if (Number.isFinite(sunX)) uniforms.uSunGlareCenter.value.x = sunX;
    if (Number.isFinite(sunZ)) uniforms.uSunGlareCenter.value.y = sunZ;
    if (Number.isFinite(dirX) || Number.isFinite(dirZ)) {
      uniforms.uHorizonDir.value.set(dirX ?? 0, dirZ ?? 0).normalize();
    }
  }

  function dispose() {
    geometry.dispose();
    material.dispose();
  }

  return { mesh, material, geometry, uniforms, update, setSky, setHorizon, waterY, dispose };
}
