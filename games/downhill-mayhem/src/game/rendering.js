/**
 * Downhill Mayhem rendering (integrate-multiplayer-downhill-mayhem-arcade 5.4,
 * visual overhaul pass). Scene, perspective chase camera, fog, painted sky
 * dome with sun glow, snow-capped layered ridge backdrops and the descending
 * sun colour. Still owns no renderer, canvas, RAF or resize listener: the host
 * injects the renderer and drives `setViewport` from `resize(w, h)`.
 *
 * The backdrop ring is camera-following on purpose (zero parallax reads as
 * infinitely far) but its base now extends far below the horizon so peaks can
 * never float above the terrain, and each layer carries its own atmospheric
 * tint. Shadows are declared here; the runtime keeps the shadow frustum
 * centred on the reference rider.
 */

import * as THREE from 'three';
import { clamp, smoothstep, mulberry32, SEED, vnoise2 } from './course.js';

export const SUN_COLD = new THREE.Color(0xcfe3ff);
export const SUN_MID = new THREE.Color(0xffdcae);
export const SUN_WARM = new THREE.Color(0xffb257);

const SKY_TOP = '#6d87a4';
const SKY_MID = '#a9b8c6';
const SKY_HORIZON = '#f6d9ae';
const SUN_AZIMUTH = -0.23;
const SUN_ELEVATION = 0.14;
const SUN_DISTANCE = 420;

function aspectOf(viewport, fallback = 16 / 9) {
  try {
    const v = viewport ? viewport() : null;
    if (v && v.width > 0 && v.height > 0) return v.width / v.height;
  } catch { /* host viewport threw: fall back */ }
  return fallback;
}

export function sunDirection(out = new THREE.Vector3()) {
  const ce = Math.cos(SUN_ELEVATION);
  return out.set(Math.sin(SUN_AZIMUTH) * ce, Math.sin(SUN_ELEVATION), Math.cos(SUN_AZIMUTH) * ce).normalize();
}

function hasDocument() {
  return typeof document !== 'undefined' && !!document.createElement;
}

function makeSkyTexture() {
  if (!hasDocument()) return null;
  const W = 1024, H = 512;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  // Canvas top maps to the sphere top (uv.y = 1): zenith first, horizon at the
  // middle, ground haze below.
  const grad = g.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0.0, '#4f7396');
  grad.addColorStop(0.18, '#6d8dab');
  grad.addColorStop(0.32, '#96aabb');
  grad.addColorStop(0.42, '#bfc7cd');
  grad.addColorStop(0.475, '#f0d4a8');
  grad.addColorStop(0.51, '#e8cfa8');
  grad.addColorStop(0.6, '#b9b1a2');
  grad.addColorStop(1.0, '#8a8f94');
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);

  const sun = sunDirection();
  const sunU = ((Math.atan2(sun.z, -sun.x) / (Math.PI * 2)) % 1 + 1) % 1;

  // Warm directional glow around the sun azimuth (wraps horizontally).
  const glow = (u, v, radius, alpha, tint) => {
    const px = u * W, py = v * H, r = radius * W;
    for (const ox of [-W, 0, W]) {
      const grd = g.createRadialGradient(px + ox, py, 0, px + ox, py, r);
      grd.addColorStop(0, `rgba(${tint},${alpha})`);
      grd.addColorStop(1, `rgba(${tint},0)`);
      g.fillStyle = grd;
      g.fillRect(px + ox - r, py - r, r * 2, r * 2);
    }
  };
  glow(sunU, 0.452, 0.17, 0.5, '255,226,166');
  glow(sunU, 0.452, 0.36, 0.26, '255,204,140');
  glow(sunU, 0.462, 0.56, 0.14, '255,186,136');

  // Warm horizon band all around so the valley haze reads sunlit.
  const horizonBand = g.createLinearGradient(0, H * 0.4, 0, H * 0.52);
  horizonBand.addColorStop(0, 'rgba(255,216,172,0)');
  horizonBand.addColorStop(1, 'rgba(255,216,172,0.3)');
  g.fillStyle = horizonBand;
  g.fillRect(0, H * 0.4, W, H * 0.12);

  // Layered cloud masses plus backlit streaks.
  const rng = mulberry32(SEED + 991);
  const clump = (cx, cy, spread, thick, a, tint) => {
    for (let k = 0; k < 9; k++) {
      const x = cx + (rng() - 0.5) * spread * W * 0.25;
      const y = cy + (rng() - 0.5) * thick * 3.2;
      g.fillStyle = `rgba(${tint},${(a * (0.6 + rng() * 0.5)).toFixed(3)})`;
      g.beginPath();
      g.ellipse((x % W + W) % W, y, thick * (2.4 + rng() * 2.4), thick * (0.7 + rng() * 0.8), 0, 0, Math.PI * 2);
      g.fill();
    }
  };
  for (let i = 0; i < 7; i++) {
    const cx = rng() * W, cy = H * (0.3 + rng() * 0.15);
    const a = 0.2 + rng() * 0.2;
    clump(cx, cy, 0.35 + rng() * 0.3, 9 + rng() * 12, a, cy > H * 0.36 ? '248,220,200' : '212,218,228');
  }
  for (let i = 0; i < 18; i++) {
    const y = H * (0.28 + rng() * 0.17);
    const len = W * (0.14 + rng() * 0.34);
    const x0 = rng() * W;
    const thick = 5 + rng() * 11;
    const a = 0.14 + rng() * 0.16;
    const tint = y > H * 0.36 ? '246,214,192' : '206,214,226';
    for (let k = 0; k < 24; k++) {
      const t = k / 24;
      const x = x0 + t * len;
      const wob = Math.sin(t * Math.PI * 2 + i) * thick * 2;
      const alpha = a * Math.sin(Math.min(t * 1.4, 1) * Math.PI);
      g.fillStyle = `rgba(${tint},${alpha.toFixed(3)})`;
      g.beginPath();
      g.ellipse((x % W + W) % W, y + wob, thick * (3 + rng() * 2), thick * 1.5, 0, 0, Math.PI * 2);
      g.fill();
    }
  }
  // Cold low haze easing into the terrain fog colour, just above the horizon.
  const haze = g.createLinearGradient(0, H * 0.42, 0, H * 0.52);
  haze.addColorStop(0, 'rgba(236,219,195,0)');
  haze.addColorStop(1, 'rgba(236,219,195,0.55)');
  g.fillStyle = haze;
  g.fillRect(0, H * 0.42, W, H * 0.1);

  // 8-bit dithering: the large smooth gradient is otherwise visibly banded.
  const dither = mulberry32(SEED + 7717);
  const img = g.getImageData(0, 0, W, H);
  const px = img.data;
  for (let i = 0; i < px.length; i += 4) {
    const n = (dither() - 0.5) * 1.2;
    px[i] += n; px[i + 1] += n; px[i + 2] += n;
  }
  g.putImageData(img, 0, 0);

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

function makeGlowTexture() {
  if (!hasDocument()) return null;
  const S = 256;
  const c = document.createElement('canvas'); c.width = S; c.height = S;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  grd.addColorStop(0, 'rgba(255,246,224,1)');
  grd.addColorStop(0.12, 'rgba(255,226,170,0.9)');
  grd.addColorStop(0.4, 'rgba(255,196,120,0.28)');
  grd.addColorStop(1, 'rgba(255,190,120,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, S, S);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/**
 * A camera-following ring of jagged snow-capped ridges. `layer` 0 is the
 * nearest/darkest band; higher layers are farther, taller and hazier.
 */
function buildRidgeRing({ radius, height, base, seed, colorRock, colorSnow, colorHaze, density = 1, snowline = 0.42 }) {
  const SEG = Math.round(220 * density);
  const positions = [], colors = [], indices = [];
  const cRock = new THREE.Color(colorRock), cSnow = new THREE.Color(colorSnow), cHaze = new THREE.Color(colorHaze);
  const tmp = new THREE.Color();
  const rng = mulberry32(seed);
  const phases = [rng() * 6.28, rng() * 6.28, rng() * 6.28];
  for (let i = 0; i <= SEG; i++) {
    const a = (i / SEG) * Math.PI * 2;
    const n1 = vnoise2(Math.cos(a) * 3.1 + phases[0], Math.sin(a) * 3.1 + phases[1]);
    const n2 = vnoise2(Math.cos(a) * 9.7 + phases[2], Math.sin(a) * 9.7);
    const n3 = vnoise2(Math.cos(a) * 23 + 3.5, Math.sin(a) * 23 + 1.7);
    const ridge = height * Math.max(0.1, 0.42 + n1 * 0.62 + n2 * 0.34 + n3 * 0.16);
    const x = Math.sin(a) * radius, z = Math.cos(a) * radius;
    positions.push(x, base, z);
    positions.push(x, ridge, z);
    const rockShade = 0.6 + n2 * 0.5;
    tmp.copy(cRock).multiplyScalar(rockShade);
    colors.push(tmp.r, tmp.g, tmp.b);
    const snow = 0.3 + 0.7 * smoothstep((ridge / height - 0.45) / 0.4 + n3 * 0.35);
    tmp.copy(cRock).multiplyScalar(rockShade).lerp(cSnow, snow).lerp(cHaze, 0.1 + 0.1 * snow);
    colors.push(tmp.r, tmp.g, tmp.b);
    if (i > 0) {
      const b = (i - 1) * 2;
      indices.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  const mat = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, side: THREE.DoubleSide, depthWrite: false });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = -9;
  return mesh;
}

export function createRendering({ viewport } = {}) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xd8dde2);
  scene.fog = new THREE.Fog(0xe2cfae, 35, 420);

  const camera = new THREE.PerspectiveCamera(74, aspectOf(viewport), 0.3, 900);

  const hemi = new THREE.HemisphereLight(0xbcd2ea, 0x6b6155, 0.95);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffcf94, 2.95);
  const sunDir = sunDirection();
  sun.position.copy(sunDir).multiplyScalar(120);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -62;
  sun.shadow.camera.right = 62;
  sun.shadow.camera.top = 62;
  sun.shadow.camera.bottom = -62;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 340;
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.12;
  sun.shadow.camera.updateProjectionMatrix();
  scene.add(sun);
  scene.add(sun.target);

  // Soft cool fill from behind the chase camera: stands in for snow bounce so
  // the backlit terrain never crushes to black. Never casts shadows.
  const fill = new THREE.DirectionalLight(0xaec8ea, 0.3);
  fill.position.set(30, 80, 100);
  scene.add(fill);
  scene.add(fill.target);

  const skyTex = makeSkyTexture();
  const skyGeo = new THREE.SphereGeometry(700, 48, 28);
  const skyDome = new THREE.Mesh(
    skyGeo,
    new THREE.MeshBasicMaterial({
      vertexColors: false, map: skyTex, side: THREE.BackSide, fog: false, depthWrite: false,
    }),
  );
  if (!skyTex) {
    const cols = [];
    const posA = skyGeo.attributes.position;
    const top = new THREE.Color(0x5894db), hor = new THREE.Color(0xe9d9bd);
    for (let i = 0; i < posA.count; i++) {
      const c = hor.clone().lerp(top, smoothstep((posA.getY(i) / 360) * 1.6 + 0.12));
      cols.push(c.r, c.g, c.b);
    }
    skyGeo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    skyDome.material = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false });
  }
  skyDome.frustumCulled = false;
  skyDome.renderOrder = -12;
  scene.add(skyDome);

  const glowTex = makeGlowTexture();
  const glow = glowTex ? new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }),
  ) : null;
  if (glow) {
    glow.material.color.setHex(0xffe3b8);
    glow.scale.set(190, 190, 1);
    glow.frustumCulled = false;
    glow.renderOrder = -11;
    scene.add(glow);
  }

  // Layered distant ridges: three atmospheric bands, all camera-following.
  const mountains = new THREE.Group();
  mountains.add(buildRidgeRing({
    radius: 380, height: 100, base: -700, seed: SEED + 401, colorRock: 0x4f5860, colorSnow: 0xe6eef5, colorHaze: 0xd9cbb4, density: 1.1, snowline: 0.52,
  }));
  mountains.add(buildRidgeRing({
    radius: 470, height: 155, base: -850, seed: SEED + 402, colorRock: 0x5d6873, colorSnow: 0xeff5fa, colorHaze: 0xcdbfae, density: 0.8, snowline: 0.38,
  }));
  mountains.add(buildRidgeRing({
    radius: 590, height: 215, base: -1000, seed: SEED + 403, colorRock: 0x707b86, colorSnow: 0xf5f9fc, colorHaze: 0xc9c0b4, density: 0.62, snowline: 0.3,
  }));
  scene.add(mountains);

  let disposed = false;
  const sunTargetScratch = new THREE.Vector3();

  return {
    scene,
    camera,
    sun,
    hemi,
    skyDome,
    skyTex,
    glow,
    mountains,
    sunDirection: sunDir.clone(),
    get disposed() { return disposed; },

    setViewport(width, height) {
      const w = Math.max(1, Math.floor(width) || 1);
      const h = Math.max(1, Math.floor(height) || 1);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    },

    setFov(fov) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    },

    /** Keep the shadow frustum centred on the reference position. */
    updateShadowFocus(position) {
      sunTargetScratch.copy(position);
      sun.position.copy(sunTargetScratch).addScaledVector(sunDir, 120);
      sun.target.position.copy(sunTargetScratch);
      sun.target.updateMatrixWorld();
    },

    /** Sun colour/intensity warms as the reference rider descends the mountain. */
    updateSun(alt, coldEdge, warmEdge) {
      const fAlt = clamp(alt, 0, 1);
      const cold = clamp((coldEdge - fAlt) / coldEdge, 0, 1);
      const warm = clamp((fAlt - warmEdge) / (1 - warmEdge), 0, 1);
      sun.color.copy(SUN_MID);
      if (cold > 0) sun.color.lerp(SUN_COLD, cold);
      if (warm > 0) sun.color.lerp(SUN_WARM, warm);
      sun.intensity = 3.05 + warm * 0.4 - cold * 0.2;
    },

    /** True when a renderer can present this scene without a GL error. */
    isReady() { return !disposed; },

    dispose() {
      if (disposed) return;
      disposed = true;
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        const m = o.material;
        if (m) (Array.isArray(m) ? m : [m]).forEach((mm) => {
          if (mm.map && mm.map.dispose) mm.map.dispose();
          mm.dispose();
        });
      });
      scene.clear();
    },
  };
}
