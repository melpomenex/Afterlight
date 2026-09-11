/**
 * Downhill Mayhem procedural terrain textures (visual overhaul pass).
 *
 * One macro albedo + normal pair covers the whole course in the course's own
 * (s, lat) space, so tyre ruts, wind-rippled snow, trail berms and rock strata
 * are painted exactly where the racer rides them. Everything is generated from
 * the canonical course document at load time on a canvas — no external assets —
 * and the detail is baked into the map rather than the mesh so the terrain
 * stays one material and a handful of draw calls.
 *
 * The albedo is authored around a mean of ~1.0 because it multiplies the
 * terrain's biome vertex colours; the normal map is derived from the same
 * height field so ruts and whoops genuinely catch the low sun.
 */

import * as THREE from 'three';
import {
  clamp, lerp, smoothstep, vnoise2, S_MIN, S_MAX,
} from './course.js';

export const MACRO_W = 768;
export const MACRO_H = 3072;

/**
 * Non-linear lateral mapping: the ride corridor gets most of the texture
 * width (12 m either side of centre owns 40% of the texels) so ruts and trail
 * detail stay crisp, while the far valley walls share the rest.
 */
export function latToU(lat) {
  const a = Math.min(Math.abs(lat), 80);
  const sign = lat < 0 ? -1 : 1;
  let t;
  if (a <= 12) t = (a / 12) * 0.4;
  else if (a <= 40) t = 0.4 + ((a - 12) / 28) * 0.35;
  else t = 0.75 + ((a - 40) / 40) * 0.25;
  return 0.5 + sign * t * 0.5;
}

export function uToLat(u) {
  const sign = u < 0.5 ? -1 : 1;
  const t = Math.abs(u - 0.5) * 2;
  let a;
  if (t <= 0.4) a = (t / 0.4) * 12;
  else if (t <= 0.75) a = 12 + ((t - 0.4) / 0.35) * 28;
  else a = 40 + ((t - 0.75) / 0.25) * 40;
  return sign * a;
}

function hasDocument() {
  return typeof document !== 'undefined' && !!document.createElement;
}

function writeCanvasTexture(canvas, { srgb }) {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = THREE.ClampToEdgeWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.generateMipmaps = true;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

/**
 * Paint the course macro maps. Returns `{ map, normalMap }` or `null` when no
 * DOM is available (Node tests import the pure helpers only).
 */
export function createTerrainTextures(course, cfg) {
  if (!hasDocument()) return null;
  const W = MACRO_W, H = MACRO_H;
  const albedo = new ImageData(W, H);
  const height = new Float32Array(W * H);
  const rough = new Uint8ClampedArray(W * H);
  const a = albedo.data;
  const noff = cfg.noff;
  const finishS = course.finishS;
  const sMin = S_MIN, sSpan = S_MAX - S_MIN;

  const track = { x: 0, z: 0, y: 0, h: 0, curv: 0, grade: 0 };
  for (let y = 0; y < H; y++) {
    const s = sMin + ((y + 0.5) / H) * sSpan;
    course.sampleTrack(s, track);
    const fAlt = clamp(s / finishS, 0, 1);
    const cold = clamp((cfg.coldEdge - fAlt) / cfg.coldEdge, 0, 1);
    const warm = clamp((fAlt - cfg.warmEdge) / (1 - cfg.warmEdge), 0, 1);
    const row = y * W * 4;
    // The rut line wanders gently around the centre of the ride corridor.
    const rutWander = vnoise2(s * 0.012 + noff, 3.7) * 1.9;
    for (let x = 0; x < W; x++) {
      const lat = uToLat((x + 0.5) / W);
      const absLat = Math.abs(lat);
      const i = y * W + x;
      const p = row + x * 4;

      // --- height field (metres, small amplitude) -------------------------
      let hgt = 0;

      // Trail ruts: two worn lines plus a light centre crown.
      const rutBand = 1 - smoothstep((absLat - 6.8) / 1.1);
      const d1 = lat - (rutWander - 2.3), d2 = lat - (rutWander + 2.3);
      const rut1 = Math.exp(-(d1 * d1) / 0.09), rut2 = Math.exp(-(d2 * d2) / 0.09);
      const rut = Math.max(rut1, rut2) * rutBand;
      const whoop = Math.pow(Math.sin(s * 0.72 + vnoise2(s * 0.05, lat * 0.3 + noff) * 2.4) * 0.5 + 0.5, 2.2);
      const whoopBand = Math.exp(-(absLat * absLat) / 12.5) * rutBand;

      // Wind ripples on snow: strongly stretched along the fall line.
      const snowBand = smoothstep((absLat - 7.2) / 2.2) * (1 - smoothstep((absLat - 26) / 9));
      const ripple = vnoise2(s * 0.42 + noff, lat * 0.075) * 0.5 + 0.5;
      const ripple2 = vnoise2(s * 1.35 + 11.2, lat * 0.28) * 0.5 + 0.5;

      // Rock exposure: the valley walls, banded into strata.
      const rockBand = smoothstep((absLat - 20 - vnoise2(s * 0.045 + noff, 9.1) * 7) / 9);
      const strata = Math.sin(s * 0.055 + vnoise2(s * 0.02 + 1.3, lat * 0.09) * 4.2);
      const strata2 = Math.sin(s * 0.19 + vnoise2(s * 0.06, lat * 0.2) * 5.0);
      const scree = vnoise2(s * 0.85 + 4.4, lat * 0.9) * 0.5 + 0.5;

      // --- albedo ----------------------------------------------------------
      let r = 1.0, g = 1.0, b = 1.0;

      // Packed trail: slightly darker, with cool shadows in the ruts.
      const trailNoise = vnoise2(s * 0.5 + noff, lat * 0.6 + 2.2) * 0.5 + 0.5;
      const trailShade = 1 - rutBand * (0.1 - trailNoise * 0.06);
      r *= trailShade; g *= trailShade; b *= trailShade;
      const rutBreak = 0.55 + 0.45 * (vnoise2(s * 0.07 + noff, 7.7) * 0.5 + 0.5);
      const rutShade = 1 - rut * rutBreak * (0.3 + whoop * 0.05);
      r *= rutShade; g *= rutShade * (1 + rut * 0.02); b *= rutShade * (1 + rut * 0.05);
      hgt -= rut * (0.13 + whoop * 0.08);

      // Trail edges: pushed snow berms, bright and wind-whipped.
      const berm = Math.exp(-Math.pow((absLat - 8.4) / 1.5, 2));
      const bermShade = 1 + berm * (0.06 + ripple * 0.05);
      r *= bermShade; g *= bermShade; b *= bermShade;
      hgt += berm * 0.1;

      // Snow fields: bright, with fine sparkle and drift ripples.
      let snowApply = 0;
      if (snowBand > 0.01 && rockBand < 0.99) {
        const snowShade = 1.05 + ripple * 0.08 + ripple2 * 0.05;
        const speck = (vnoise2(s * 3.1 + 7.7, lat * 3.1 + 3.3) * 0.5 + 0.5) > 0.86 ? 1.06 : 1.0;
        const sb = snowBand * (1 - rockBand);
        snowApply = sb;
        r = lerp(r, r * snowShade * speck, sb);
        g = lerp(g, g * snowShade * speck, sb);
        b = lerp(b, b * snowShade * speck * 1.02, sb);
        hgt += sb * (ripple * 0.07 + ripple2 * 0.03);
      }

      // Exposed rock: darker strata with scree contrast.
      if (rockBand > 0.01) {
        const rockShade = 0.86 + strata * 0.05 + strata2 * 0.035 + scree * 0.06;
        r = lerp(r, r * rockShade * 1.04, rockBand);
        g = lerp(g, g * rockShade, rockBand);
        b = lerp(b, b * rockShade * 0.96, rockBand);
        hgt += rockBand * (strata2 * 0.045 + scree * 0.05);
      }

      // Loose stones near the trail shoulders.
      const stone = vnoise2(s * 2.3 + 9.9, lat * 2.3 + 1.1) * 0.5 + 0.5;
      if (stone > 0.88 && absLat > 4.5 && rockBand < 0.6) {
        const k = (stone - 0.88) / 0.12;
        r *= 1 - k * 0.16; g *= 1 - k * 0.15; b *= 1 - k * 0.13;
        hgt += k * 0.1;
      }

      // Biome response keeps the map consistent with the vertex-colour tint.
      if (cold > 0) { b *= 1 + cold * 0.02; g *= 1 - cold * 0.01; }
      if (warm > 0) { r *= 1 + warm * 0.03; b *= 1 - warm * 0.04; }

      // Roughness: snow is smoother (sheen toward the sun), wet ruts glossier,
      // rock and dry dirt stay matte.
      let rough01 = 0.93;
      rough01 = lerp(rough01, 0.87, rutBand);
      rough01 = lerp(rough01, 0.55, rut * 0.9);
      rough01 = lerp(rough01, 0.62, snowApply);
      rough01 = lerp(rough01, 0.97, rockBand);
      rough[i] = rough01 * 255;

      height[i] = hgt;
      a[p] = clamp(r, 0, 1) * 255 | 0;
      a[p + 1] = clamp(g, 0, 1) * 255 | 0;
      a[p + 2] = clamp(b, 0, 1) * 255 | 0;
      a[p + 3] = 255;
    }
  }

  // --- normal map from the height field ------------------------------------
  const normal = new ImageData(W, H);
  const n = normal.data;
  const strength = 2.1;
  for (let y = 0; y < H; y++) {
    const yUp = y > 0 ? y - 1 : y, yDn = y < H - 1 ? y + 1 : y;
    for (let x = 0; x < W; x++) {
      const xL = x > 0 ? x - 1 : x, xR = x < W - 1 ? x + 1 : x;
      const dx = (height[y * W + xL] - height[y * W + xR]) * strength;
      const dy = (height[yUp * W + x] - height[yDn * W + x]) * strength;
      const inv = 1 / Math.sqrt(dx * dx + dy * dy + 1);
      const p = (y * W + x) * 4;
      n[p] = (dx * inv * 0.5 + 0.5) * 255 | 0;
      n[p + 1] = (dy * inv * 0.5 + 0.5) * 255 | 0;
      n[p + 2] = (inv * 0.5 + 0.5) * 255 | 0;
      n[p + 3] = 255;
    }
  }

  const albedoCanvas = document.createElement('canvas');
  albedoCanvas.width = W; albedoCanvas.height = H;
  albedoCanvas.getContext('2d').putImageData(albedo, 0, 0);
  const normalCanvas = document.createElement('canvas');
  normalCanvas.width = W; normalCanvas.height = H;
  normalCanvas.getContext('2d').putImageData(normal, 0, 0);
  const roughImage = new ImageData(W, H);
  for (let i = 0, p = 0; i < rough.length; i++, p += 4) {
    roughImage.data[p] = rough[i];
    roughImage.data[p + 1] = rough[i];
    roughImage.data[p + 2] = rough[i];
    roughImage.data[p + 3] = 255;
  }
  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = W; roughCanvas.height = H;
  roughCanvas.getContext('2d').putImageData(roughImage, 0, 0);

  return {
    map: writeCanvasTexture(albedoCanvas, { srgb: true }),
    normalMap: writeCanvasTexture(normalCanvas, { srgb: false }),
    roughnessMap: writeCanvasTexture(roughCanvas, { srgb: false }),
    dispose() {
      this.map.dispose();
      this.normalMap.dispose();
      this.roughnessMap.dispose();
    },
  };
}

/** Small tiled micro-normal for close-range snow/dirt grain. */
export function createDetailNormal(size = 256, seed = 1234) {
  if (!hasDocument()) return null;
  const n = new ImageData(size, size);
  const d = n.data;
  const h = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size, v = y / size;
      h[y * size + x] = vnoise2(u * 14 + seed, v * 14 + seed) * 0.5
        + vnoise2(u * 38 + seed * 0.7, v * 38 + seed * 0.3) * 0.3;
    }
  }
  const wrap = (i) => ((i % size) + size) % size;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (h[y * size + wrap(x - 1)] - h[y * size + wrap(x + 1)]) * 2.2;
      const dy = (h[wrap(y - 1) * size + x] - h[wrap(y + 1) * size + x]) * 2.2;
      const inv = 1 / Math.sqrt(dx * dx + dy * dy + 1);
      const p = (y * size + x) * 4;
      d[p] = (dx * inv * 0.5 + 0.5) * 255 | 0;
      d[p + 1] = (dy * inv * 0.5 + 0.5) * 255 | 0;
      d[p + 2] = (inv * 0.5 + 0.5) * 255 | 0;
      d[p + 3] = 255;
    }
  }
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  c.getContext('2d').putImageData(n, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.NoColorSpace;
  return t;
}

/** Soft round particle sprite for snow and spray. */
export function createParticleSprite(size = 64) {
  if (!hasDocument()) return null;
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.45, 'rgba(255,255,255,0.75)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
