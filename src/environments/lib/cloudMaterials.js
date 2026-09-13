import * as THREE from 'three';
import { fbm, clamp, hash2 } from './terrain.js';

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

export function createCloudSurfaceTextures(track, terrainSize) {
  // Vibrant alpine wildflower meadow texture (512x512)
  const turf = track(surfaceTexture(512, 512, (x, y) => {
    const macro = fbm(x * 0.015, y * 0.015, { octaves: 4, frequency: 1, seed: 101 });
    const micro = fbm(x * 0.08, y * 0.08, { octaves: 3, frequency: 1, seed: 202 });
    const speckle = (hash2(x, y, 73) - 0.5) * 8;

    // Emerald base vs sun-drenched golden alpine turf
    const emeraldR = 64, emeraldG = 112, emeraldB = 46;
    const goldenR = 120, goldenG = 142, goldenB = 54;
    const deepMossR = 44, deepMossG = 82, deepMossB = 34;

    let r = emeraldR * (1 - macro) + goldenR * macro + speckle;
    let g = emeraldG * (1 - macro) + goldenG * macro + speckle;
    let b = emeraldB * (1 - macro) + goldenB * macro + speckle * 0.7;

    // Shaded hollows get richer deep moss
    if (micro < 0.35) {
      const u = (0.35 - micro) / 0.35;
      r = r * (1 - u) + deepMossR * u;
      g = g * (1 - u) + deepMossG * u;
      b = b * (1 - u) + deepMossB * u;
    }

    return [Math.round(r), Math.round(g), Math.round(b)];
  }));

  // Scatter tiny flower petals across the meadow texture
  const turfData = turf.image.data;
  for (let petal = 0; petal < 600; petal++) {
    const px = Math.floor(hash2(petal, 1, 91) * 512);
    const py = Math.floor(hash2(petal, 2, 91) * 512);
    const type = hash2(petal, 3, 91);
    // Pink alpine primrose, golden buttercup, white edelweiss
    const col = type < 0.45 ? [228, 108, 156] : type < 0.80 ? [242, 204, 62] : [246, 246, 238];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx * dx + dy * dy <= 2) {
          const x = (px + dx + 512) % 512;
          const y = (py + dy + 512) % 512;
          const off = (y * 512 + x) * 4;
          turfData[off] = col[0];
          turfData[off + 1] = col[1];
          turfData[off + 2] = col[2];
        }
      }
    }
  }
  turf.repeat.set(terrainSize / 14.0, terrainSize / 14.0);

  // Stratified cliff rock with horizontal bedding planes and dark clefts (256x512)
  function rockHeight(x, y) {
    const fy = y / 512;
    const layer = Math.sin(fy * 36.0 + fbm(x * 0.05, fy * 12.0, { octaves: 2, frequency: 1, seed: 33 })) * 0.5 + 0.5;
    const fracture = Math.pow(layer, 0.45);
    const crack = Math.pow(Math.abs(Math.sin((x / 256) * 16.0 * Math.PI)), 0.6) * 0.2;
    const grain = (hash2(x, Math.floor(y / 2), 55) - 0.5) * 0.12;
    return fracture * (0.7 + grain) - crack;
  }

  const cliff = track(surfaceTexture(256, 512, (x, y) => {
    const h = rockHeight(x, y);
    const darkR = 38, darkG = 34, darkB = 32;
    const buffR = 98, buffG = 92, buffB = 84;
    const highlightR = 132, highlightG = 126, highlightB = 114;

    const t = clamp(h, 0, 1);
    const r = darkR * (1 - t) + (t > 0.65 ? highlightR : buffR) * t;
    const g = darkG * (1 - t) + (t > 0.65 ? highlightG : buffG) * t;
    const b = darkB * (1 - t) + (t > 0.65 ? highlightB : buffB) * t;
    return [Math.round(r), Math.round(g), Math.round(b)];
  }));
  cliff.repeat.set(1, 4);

  const cliffNormal = track(surfaceTexture(256, 512, (x, y) => {
    const hL = rockHeight((x - 1 + 256) % 256, y);
    const hR = rockHeight((x + 1) % 256, y);
    const hD = rockHeight(x, (y - 1 + 512) % 512);
    const hU = rockHeight(x, (y + 1) % 512);
    const dx = (hR - hL) * 2.8;
    const dy = (hU - hD) * 4.2;
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
  cliffNormal.repeat.set(1, 4);

  return { turf, cliff, cliffNormal };
}
