import * as THREE from 'three';
import { fbm, clamp, hash2 } from './terrain.js';

// Small deterministic surface maps, shared by every instance in this forest.
// Geometry supplies the broad bark furrows; this map supplies fibrous grain.
function surfaceTexture(width, height, sample) {
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const s = sample(x, y);
      const offset = (y * width + x) * 4;
      if (Array.isArray(s)) {
        data[offset] = clamp(s[0] > 1 ? s[0] : s[0] * 255, 0, 255);
        data[offset + 1] = clamp(s[1] > 1 ? s[1] : s[1] * 255, 0, 255);
        data[offset + 2] = clamp(s[2] > 1 ? s[2] : s[2] * 255, 0, 255);
        data[offset + 3] = 255;
      } else if (typeof s === 'object' && s !== null) {
        data[offset] = clamp(s.r > 1 ? s.r : s.r * 255, 0, 255);
        data[offset + 1] = clamp(s.g > 1 ? s.g : s.g * 255, 0, 255);
        data[offset + 2] = clamp(s.b > 1 ? s.b : s.b * 255, 0, 255);
        data[offset + 3] = 255;
      } else {
        const value = clamp(s, 0, 1) * 255;
        data[offset] = value;
        data[offset + 1] = value;
        data[offset + 2] = value;
        data[offset + 3] = 255;
      }
    }
  }
  const texture = new THREE.DataTexture(data, width, height);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

export function createRedwoodSurfaceTextures(track, terrainSize) {
  const furrowPitch = 256 / 14; // Exactly 14 furrows matching trunk geometry

  // Height generator for 14 vertical bark plates, deep fissures and fibrous grain:
  function barkHeight(x, y) {
    const fy = y / 512;
    const meander = Math.sin(fy * 12.0) * 2.2 + Math.sin(fy * 26.0) * 0.9 + Math.cos(fy * 6.0) * 1.5;
    const furrowU = (x + meander) / furrowPitch;
    const furrowCycle = furrowU - Math.floor(furrowU);
    // Sharp clefts and deep fissures between flat-topped plates
    const crevice = Math.pow(Math.sin(furrowCycle * Math.PI), 0.42);
    const fiber = fbm((x + meander) * 1.2, fy * 72.0, { octaves: 4, frequency: 1, seed: 103 });
    const crossGrain = (hash2(x, Math.floor(y / 4), 43) - 0.5) * 0.18;
    const split = Math.pow(Math.abs(Math.sin(furrowCycle * 2.0 * Math.PI)), 0.6) * 0.12;
    return crevice * (0.64 + fiber * 0.28 + crossGrain) - split * (1 - crevice * 0.5);
  }

  // Deeply fissured, weathered silver-slate outer plates over dark shadowed crevices
  const bark = track(surfaceTexture(256, 512, (x, y) => {
    const h = barkHeight(x, y);
    // Deep shadowed cool slate-umber crevice vs weathered silver-slate outer plate
    const creviceR = 24, creviceG = 28, creviceB = 36;
    const plateMidR = 56, plateMidG = 62, plateMidB = 72;
    const plateHighR = 76, plateHighG = 82, plateHighB = 96;

    const t = clamp(h * 1.25, 0, 1);
    const r = creviceR * (1 - t) + (t > 0.6 ? plateHighR : plateMidR) * t;
    const g = creviceG * (1 - t) + (t > 0.6 ? plateHighG : plateMidG) * t;
    const b = creviceB * (1 - t) + (t > 0.6 ? plateHighB : plateMidB) * t;
    return [Math.round(r), Math.round(g), Math.round(b)];
  }));
  bark.repeat.set(1, 1);

  // Normal map for deep 3D trunk fissures and tactile fibrous bark
  const barkNormal = track(surfaceTexture(256, 512, (x, y) => {
    const hL = barkHeight((x - 1 + 256) % 256, y);
    const hR = barkHeight((x + 1) % 256, y);
    const hD = barkHeight(x, (y - 1 + 512) % 512);
    const hU = barkHeight(x, (y + 1) % 512);
    const dx = (hR - hL) * 4.4;
    const dy = (hU - hD) * 1.6;
    const len = Math.hypot(dx, dy, 1.0);
    const nx = -dx / len;
    const ny = -dy / len;
    const nz = 1.0 / len;
    return [
      Math.round((nx * 0.5 + 0.5) * 255),
      Math.round((ny * 0.5 + 0.5) * 255),
      Math.round((nz * 0.5 + 0.5) * 255),
    ];
  }));
  barkNormal.repeat.set(1, 1);

  // High-resolution criss-cross pine needle duff matching the target forest floor:
  const floor = track(surfaceTexture(512, 512, (x, y) => {
    const humusNoise = fbm(x * 0.02, y * 0.02, { octaves: 4, frequency: 1, seed: 42 });
    const mossNoise = fbm(x * 0.015, y * 0.015, { octaves: 4, frequency: 1, seed: 601 });
    const fineSoil = (hash2(x, y, 26) - 0.5) * 6;

    // Dark organic humus bed under the needles (averaging [30, 26, 22])
    let r = 30 + humusNoise * 8 + fineSoil;
    let g = 26 + humusNoise * 6 + fineSoil * 0.5;
    let b = 22 + humusNoise * 4 + fineSoil * 0.4;

    // Soft velvety moss patches in shaded hollows (averaging [32, 54, 26])
    if (mossNoise > 0.58) {
      const mossBlend = clamp((mossNoise - 0.58) * 4.0, 0, 1);
      const mr = 32 + (hash2(x, y, 71) - 0.5) * 6;
      const mg = 58 + humusNoise * 14;
      const mb = 26 + humusNoise * 8;
      r = r * (1 - mossBlend) + mr * mossBlend;
      g = g * (1 - mossBlend) + mg * mossBlend;
      b = b * (1 - mossBlend) + mb * mossBlend;
    }
    return [Math.round(r), Math.round(g), Math.round(b)];
  }));

  // Layer 9500 thick, distinct criss-crossing redwood needles with realistic cast shadows
  const data = floor.image.data;
  for (let needle = 0; needle < 9500; needle++) {
    const nx = hash2(needle, 1, 62) * 512;
    const ny = hash2(needle, 2, 62) * 512;
    const angle = hash2(needle, 3, 62) * Math.PI * 2;
    const length = 12 + hash2(needle, 4, 62) * 22; // 12-34 px long
    const tone = hash2(needle, 5, 62);
    // Dark aged cedar needles: muted umber and brown, eliminating bright orange
    const isTwig = needle % 70 === 0;
    const strokeR = isTwig ? 38 : (46 + tone * 18);
    const strokeG = isTwig ? 32 : (36 + tone * 14);
    const strokeB = isTwig ? 26 : (26 + tone * 10);
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    for (let step = 0; step < length; step++) {
      for (let thick = 0; thick <= (isTwig ? 2 : 1); thick++) {
        const px = Math.floor(nx + cosA * step - sinA * thick + 512) % 512;
        const py = Math.floor(ny + sinA * step + cosA * thick + 512) % 512;
        const offset = (py * 512 + px) * 4;
        const currentG = data[offset + 1];
        const currentR = data[offset];
        if (currentG < currentR * 1.15 || hash2(needle, step, 89) < 0.12) {
          // Cast shadow on underside
          if (thick === 1) {
            const spx = (px + 1 + 512) % 512;
            const spy = (py + 1 + 512) % 512;
            const sOffset = (spy * 512 + spx) * 4;
            data[sOffset] = Math.max(6, Math.round(data[sOffset] * 0.32));
            data[sOffset + 1] = Math.max(4, Math.round(data[sOffset + 1] * 0.32));
            data[sOffset + 2] = Math.max(3, Math.round(data[sOffset + 2] * 0.32));
          }
          data[offset] = Math.min(255, Math.round(strokeR));
          data[offset + 1] = Math.min(255, Math.round(strokeG));
          data[offset + 2] = Math.min(255, Math.round(strokeB));
        }
      }
    }
  }

  // Scatter 90 small weathered pebbles across the needle mulch
  for (let pebble = 0; pebble < 90; pebble++) {
    const rx = hash2(pebble, 10, 83) * 512;
    const ry = hash2(pebble, 20, 83) * 512;
    const pr = 2 + hash2(pebble, 30, 83) * 3.5;
    for (let dy = -pr; dy <= pr; dy++) {
      for (let dx = -pr; dx <= pr; dx++) {
        if (dx * dx + dy * dy <= pr * pr) {
          const px = Math.floor(rx + dx + 512) % 512;
          const py = Math.floor(ry + dy + 512) % 512;
          const offset = (py * 512 + px) * 4;
          const shade = 0.65 + (dy < 0 ? 0.3 : -0.15);
          data[offset] = Math.round(48 * shade);
          data[offset + 1] = Math.round(52 * shade);
          data[offset + 2] = Math.round(46 * shade);
        }
      }
    }
  }

  floor.repeat.set(terrainSize / 15.0, terrainSize / 15.0);
  return { bark, barkNormal, floor };
}
