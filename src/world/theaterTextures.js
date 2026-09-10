import * as THREE from 'three';

// Procedural interior materials for The Orpheum. Everything here is generated
// once per process into canvas textures and reused; builders must never call
// this per frame. In headless Node (tests) there is no DOM canvas, so the
// factory returns null and the builder falls back to flat colours — the world
// still builds, only its skin is plainer.

const CACHE = { materials: null };

function prng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function canvas(size) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return c;
}

function textureFrom(c, { repeat = 1, aniso = 4 } = {}) {
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = aniso;
  tex.repeat.set(repeat, repeat);
  tex.needsUpdate = true;
  return tex;
}

function speckle(ctx, size, count, rand, alpha, light) {
  for (let i = 0; i < count; i++) {
    const x = rand() * size, y = rand() * size;
    const a = alpha * (0.4 + rand() * 0.6);
    ctx.fillStyle = light ? `rgba(255,238,210,${a})` : `rgba(0,0,0,${a})`;
    ctx.fillRect(x, y, 1 + rand() * 1.6, 1 + rand() * 1.6);
  }
}

function carpetTexture(size = 512) {
  const c = canvas(size), ctx = c.getContext('2d'), rand = prng(0xc0ffee);
  ctx.fillStyle = '#4b1a23';
  ctx.fillRect(0, 0, size, size);
  // Woven shadow lines.
  for (let i = 0; i < size; i += 4) {
    ctx.fillStyle = `rgba(0,0,0,${0.04 + (i % 8 === 0 ? 0.04 : 0)})`;
    ctx.fillRect(0, i, size, 2);
    ctx.fillRect(i, 0, 2, size);
  }
  // Diagonal guard lattice in muted gold.
  ctx.strokeStyle = 'rgba(158,114,63,0.30)';
  ctx.lineWidth = 4;
  for (let i = -size; i <= size * 2; i += 128) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + size, size); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(i + size, 0); ctx.lineTo(i, size); ctx.stroke();
  }
  // Medallion rosette at each lattice crossing.
  for (let y = 0; y <= size; y += 128) {
    for (let x = 0; x <= size; x += 128) {
      const petals = 8, r = 34;
      ctx.strokeStyle = 'rgba(186,140,79,0.50)';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,222,170,0.22)';
      ctx.lineWidth = 2;
      for (let p = 0; p < petals; p++) {
        const a = (p / petals) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(a) * 5, y + Math.sin(a) * 5);
        ctx.quadraticCurveTo(
          x + Math.cos(a + 0.35) * r * 0.85, y + Math.sin(a + 0.35) * r * 0.85,
          x + Math.cos(a) * r, y + Math.sin(a) * r,
        );
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(126,78,44,0.55)';
      ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(158,114,63,0.28)';
      ctx.lineWidth = 2;
      ctx.strokeRect(x - 60, y - 60, 120, 120);
    }
  }
  speckle(ctx, size, 2600, rand, 0.10, false);
  speckle(ctx, size, 1600, rand, 0.05, true);
  return c;
}

function ceilingTexture(size = 512) {
  const c = canvas(size), ctx = c.getContext('2d'), rand = prng(0xce11);
  ctx.fillStyle = '#4a3826';
  ctx.fillRect(0, 0, size, size);
  // Coffer panels with gilded beading on a 128 grid.
  for (let y = 0; y < size; y += 128) {
    for (let x = 0; x < size; x += 128) {
      const g = ctx.createLinearGradient(x, y, x + 128, y + 128);
      g.addColorStop(0, 'rgba(255,225,180,0.10)');
      g.addColorStop(1, 'rgba(10,6,3,0.35)');
      ctx.fillStyle = g;
      ctx.fillRect(x + 10, y + 10, 108, 108);
      ctx.strokeStyle = 'rgba(196,150,84,0.85)';
      ctx.lineWidth = 5;
      ctx.strokeRect(x + 10, y + 10, 108, 108);
      ctx.strokeStyle = 'rgba(255,224,170,0.28)';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 16, y + 16, 96, 96);
      // Central rosette.
      ctx.strokeStyle = 'rgba(205,160,95,0.7)';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(x + 64, y + 64, 22, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = 'rgba(214,172,108,0.75)';
      ctx.beginPath(); ctx.arc(x + 64, y + 64, 7, 0, Math.PI * 2); ctx.fill();
      for (let p = 0; p < 8; p++) {
        const a = (p / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(x + 64, y + 64);
        ctx.lineTo(x + 64 + Math.cos(a) * 22, y + 64 + Math.sin(a) * 22);
        ctx.stroke();
      }
    }
  }
  speckle(ctx, size, 1500, rand, 0.08, false);
  speckle(ctx, size, 700, rand, 0.05, true);
  return c;
}

// Soft-edged vertical beam used as an additive alpha map for god-rays.
function shaftTexture(size = 256) {
  const c = canvas(size), ctx = c.getContext('2d');
  const across = ctx.createLinearGradient(0, 0, size, 0);
  across.addColorStop(0, 'rgba(255,255,255,0)');
  across.addColorStop(0.5, 'rgba(255,255,255,1)');
  across.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = across;
  ctx.fillRect(0, 0, size, size);
  ctx.globalCompositeOperation = 'destination-in';
  const along = ctx.createLinearGradient(0, 0, 0, size);
  along.addColorStop(0, 'rgba(255,255,255,0)');
  along.addColorStop(0.4, 'rgba(255,255,255,1)');
  along.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = along;
  ctx.fillRect(0, 0, size, size);
  ctx.globalCompositeOperation = 'source-over';
  return c;
}

// Small framed landscapes for the wall niches: parchment sky, dark hills,
// a low sun and a vignette, so a picture light has something warm to catch.
function paintingTexture(variant = 0, size = 256) {
  const c = canvas(size), ctx = c.getContext('2d'), rand = prng(0xa17 + variant * 7919);
  const sky = ctx.createLinearGradient(0, 0, 0, size * 0.62);
  sky.addColorStop(0, variant ? '#d8b478' : '#c9a368');
  sky.addColorStop(1, variant ? '#9a6b47' : '#8a5f45');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, size, size * 0.62);
  ctx.fillStyle = 'rgba(255,236,190,0.9)';
  ctx.beginPath(); ctx.arc(size * (variant ? 0.66 : 0.36), size * 0.3, size * 0.07, 0, Math.PI * 2); ctx.fill();
  const ground = ctx.createLinearGradient(0, size * 0.55, 0, size);
  ground.addColorStop(0, variant ? '#4a3527' : '#3c2c22');
  ground.addColorStop(1, '#1e140f');
  ctx.fillStyle = ground;
  ctx.fillRect(0, size * 0.55, size, size * 0.45);
  for (let i = 0; i < 4; i++) {
    const y = size * (0.56 + i * 0.1);
    ctx.fillStyle = `rgba(14,9,6,${0.35 + i * 0.12})`;
    ctx.beginPath();
    ctx.moveTo(0, y + 20);
    for (let x = 0; x <= size; x += 32) ctx.lineTo(x, y + Math.sin(x * 0.02 + i * 2 + variant) * 9);
    ctx.lineTo(size, size); ctx.lineTo(0, size);
    ctx.fill();
  }
  for (let i = 0; i < 260; i++) {
    ctx.fillStyle = `rgba(0,0,0,${rand() * 0.05})`;
    ctx.fillRect(rand() * size, rand() * size, 2, 2);
  }
  const vign = ctx.createRadialGradient(size / 2, size / 2, size * 0.3, size / 2, size / 2, size * 0.72);
  vign.addColorStop(0, 'rgba(0,0,0,0)');
  vign.addColorStop(1, 'rgba(10,5,2,0.75)');
  ctx.fillStyle = vign;
  ctx.fillRect(0, 0, size, size);
  return c;
}

function woodTexture(size = 512) {
  const c = canvas(size), ctx = c.getContext('2d'), rand = prng(0x5eed01);
  const grad = ctx.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0, '#45301f');
  grad.addColorStop(0.5, '#382616');
  grad.addColorStop(1, '#2e1e12');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  // Vertical grain.
  for (let x = 0; x < size; x += 3) {
    const a = 0.05 + rand() * 0.10;
    ctx.strokeStyle = rand() > 0.5 ? `rgba(90,62,42,${a})` : `rgba(12,7,4,${a})`;
    ctx.lineWidth = 1 + rand() * 2;
    ctx.beginPath();
    ctx.moveTo(x + rand() * 2, 0);
    for (let y = 0; y <= size; y += 32) ctx.lineTo(x + Math.sin((y + x) * 0.02) * 3, y);
    ctx.stroke();
  }
  // Raised panel with bevelled light.
  const m = 74, w = size - m * 2;
  ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = 6;
  ctx.strokeRect(m, m, w, w);
  ctx.strokeStyle = 'rgba(122,88,58,0.55)'; ctx.lineWidth = 3;
  ctx.strokeRect(m + 5, m + 5, w - 10, w - 10);
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 2;
  ctx.strokeRect(m + 12, m + 12, w - 24, w - 24);
  // Gold corner studs.
  for (const [sx, sy] of [[m + 5, m + 5], [size - m - 5, m + 5], [m + 5, size - m - 5], [size - m - 5, size - m - 5]]) {
    ctx.fillStyle = 'rgba(196,150,84,0.8)';
    ctx.beginPath(); ctx.arc(sx, sy, 4, 0, Math.PI * 2); ctx.fill();
  }
  speckle(ctx, size, 1200, rand, 0.06, false);
  return c;
}

function giltTexture(size = 512) {
  const c = canvas(size), ctx = c.getContext('2d'), rand = prng(0x901d);
  ctx.fillStyle = '#2b2015';
  ctx.fillRect(0, 0, size, size);
  // Scroll filigree in gold, tiled on a 128 grid.
  ctx.lineCap = 'round';
  for (let gy = 0; gy < size; gy += 128) {
    for (let gx = 0; gx < size; gx += 128) {
      ctx.strokeStyle = 'rgba(190,146,84,0.75)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(gx + 10, gy + 74);
      ctx.bezierCurveTo(gx + 34, gy + 20, gx + 94, gy + 20, gx + 118, gy + 74);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(226,186,120,0.55)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(gx + 64, gy + 58, 15, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(gx + 40, gy + 104, 9, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(gx + 88, gy + 104, 9, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
      ctx.fillStyle = 'rgba(205,158,92,0.8)';
      ctx.beginPath(); ctx.arc(gx + 64, gy + 26, 4, 0, Math.PI * 2); ctx.fill();
    }
  }
  speckle(ctx, size, 900, rand, 0.10, false);
  return c;
}

// Brushed-metal roughness variation for brass and gilding.
function brassRoughnessTexture(size = 256) {
  const c = canvas(size), ctx = c.getContext('2d'), rand = prng(0xb2a55);
  ctx.fillStyle = '#6a6a6a';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 900; i++) {
    const y = rand() * size, x = rand() * size, len = 8 + rand() * 40;
    const tone = Math.round(60 + rand() * 130);
    ctx.strokeStyle = `rgba(${tone},${tone},${tone},${0.12 + rand() * 0.2})`;
    ctx.lineWidth = 1 + rand() * 2;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + len, y + (rand() - 0.5) * 2); ctx.stroke();
  }
  return c;
}

function marbleTexture(size = 512) {
  const c = canvas(size), ctx = c.getContext('2d'), rand = prng(0x11a2);
  ctx.fillStyle = '#20242a';
  ctx.fillRect(0, 0, size, size);
  // Soft mineral blotches.
  for (let i = 0; i < 26; i++) {
    const x = rand() * size, y = rand() * size, r = 40 + rand() * 120;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const tone = rand() > 0.5 ? '255,255,255' : '10,12,16';
    g.addColorStop(0, `rgba(${tone},0.05)`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  // Veins: bounded random walks.
  for (let v = 0; v < 22; v++) {
    let x = rand() * size, y = rand() * size;
    let a = rand() * Math.PI * 2;
    const bright = rand() > 0.7;
    ctx.strokeStyle = bright ? 'rgba(222,216,200,0.14)' : 'rgba(170,178,186,0.07)';
    ctx.lineWidth = bright ? 1.6 : 2.6;
    ctx.beginPath(); ctx.moveTo(x, y);
    for (let s = 0; s < 26; s++) {
      a += (rand() - 0.5) * 0.7;
      x += Math.cos(a) * 18; y += Math.sin(a) * 14;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  speckle(ctx, size, 1400, rand, 0.05, false);
  speckle(ctx, size, 900, rand, 0.03, true);
  return c;
}

function velvetTexture(size = 256) {
  const c = canvas(size), ctx = c.getContext('2d'), rand = prng(0x7e17e7);
  ctx.fillStyle = '#f2ece8';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < size; i += 3) {
    ctx.fillStyle = 'rgba(60,30,36,0.10)';
    ctx.fillRect(i, 0, 1, size);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(0, i, size, 1);
  }
  speckle(ctx, size, 2400, rand, 0.06, false);
  return c;
}

function stageWoodTexture(size = 512) {
  const c = canvas(size), ctx = c.getContext('2d'), rand = prng(0xdeadb0);
  ctx.fillStyle = '#4a3524';
  ctx.fillRect(0, 0, size, size);
  const plank = 64;
  for (let y = 0; y < size; y += plank) {
    const tone = 0.5 + rand() * 0.5;
    ctx.fillStyle = `rgba(${Math.round(64 * tone)},${Math.round(45 * tone)},${Math.round(30 * tone)},0.55)`;
    ctx.fillRect(0, y, size, plank - 3);
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, y + plank - 3, size, 3);
    for (let i = 0; i < 26; i++) {
      ctx.strokeStyle = `rgba(28,18,10,${0.05 + rand() * 0.12})`;
      ctx.lineWidth = 1;
      const gy = y + rand() * (plank - 6);
      ctx.beginPath(); ctx.moveTo(0, gy);
      for (let x = 0; x <= size; x += 64) ctx.lineTo(x, gy + Math.sin(x * 0.02 + i) * 1.4);
      ctx.stroke();
    }
  }
  speckle(ctx, size, 900, rand, 0.06, false);
  return c;
}

function plasterTexture(size = 256) {
  const c = canvas(size), ctx = c.getContext('2d'), rand = prng(0x91a51e);
  ctx.fillStyle = '#6a5946';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 500; i++) {
    const a = rand() * 0.06;
    ctx.fillStyle = rand() > 0.5 ? `rgba(255,235,205,${a})` : `rgba(20,12,8,${a})`;
    ctx.beginPath(); ctx.arc(rand() * size, rand() * size, 4 + rand() * 26, 0, Math.PI * 2); ctx.fill();
  }
  speckle(ctx, size, 1500, rand, 0.07, false);
  return c;
}

function glowSpriteTexture(size = 128) {
  const c = canvas(size), ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,226,178,0.95)');
  g.addColorStop(0.35, 'rgba(255,206,140,0.35)');
  g.addColorStop(1, 'rgba(255,190,120,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return c;
}

// Tiny equirectangular "warm hall" environment. Three.js converts an
// equirectangular envMap to a prefiltered cube internally, so brass and gold
// pick up believable reflections without a PMREM pass or a network asset.
function envTexture(width = 256, height = 128) {
  const c = document.createElement('canvas');
  c.width = width; c.height = height;
  const ctx = c.getContext('2d');
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, '#6b5638');
  sky.addColorStop(0.45, '#3a2c1f');
  sky.addColorStop(0.55, '#241a12');
  sky.addColorStop(1, '#120c08');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);
  const spots = [
    [0.1, 0.32, 16, '255,214,150'], [0.32, 0.28, 22, '255,226,170'],
    [0.55, 0.34, 18, '255,208,140'], [0.78, 0.3, 20, '255,220,160'],
    [0.16, 0.6, 10, '255,180,110'], [0.62, 0.62, 12, '255,190,120'],
    [0.9, 0.58, 9, '190,210,230'],
  ];
  for (const [fx, fy, r, tone] of spots) {
    const g = ctx.createRadialGradient(fx * width, fy * height, 0, fx * width, fy * height, r);
    g.addColorStop(0, `rgba(${tone},0.95)`);
    g.addColorStop(1, `rgba(${tone},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);
  }
  return c;
}

export function theaterMaterials() {
  if (CACHE.materials) return CACHE.materials;
  if (typeof document === 'undefined' || typeof document.createElement !== 'function') return null;

  const std = (opts) => new THREE.MeshStandardMaterial(opts);
  const envCanvas = envTexture();
  const env = new THREE.CanvasTexture(envCanvas);
  env.mapping = THREE.EquirectangularReflectionMapping;
  env.colorSpace = THREE.SRGBColorSpace;
  env.needsUpdate = true;
  const metals = { envMap: env, envMapIntensity: 2.2 };
  const brushed = textureFrom(brassRoughnessTexture());
  brushed.colorSpace = THREE.NoColorSpace;
  const materials = {
    carpet: std({ map: (() => { const t = textureFrom(carpetTexture()); return t; })(), bumpMap: (() => { const t = textureFrom(carpetTexture()); t.colorSpace = THREE.NoColorSpace; return t; })(), bumpScale: 0.05, roughness: 0.86, metalness: 0.02 }),
    wood: std({ map: textureFrom(woodTexture()), roughness: 0.62, metalness: 0.08 }),
    gilt: std({ map: textureFrom(giltTexture()), roughness: 0.42, metalness: 0.55, color: '#d9c193' }),
    marble: std({ map: textureFrom(marbleTexture()), roughness: 0.17, metalness: 0.3, ...metals }),
    velvet: std({ map: textureFrom(velvetTexture()), roughness: 0.88, metalness: 0.0 }),
    stageWood: std({ map: textureFrom(stageWoodTexture()), roughness: 0.55, metalness: 0.05 }),
    plaster: std({ map: textureFrom(plasterTexture()), roughness: 0.8, metalness: 0.04 }),
    ceiling: std({ map: textureFrom(ceilingTexture()), roughness: 0.72, metalness: 0.1 }),
    velvetCurtain: new THREE.MeshPhysicalMaterial({ map: textureFrom(velvetTexture()), color: '#8a2330', roughness: 0.78, metalness: 0.0, sheen: 1.0, sheenColor: new THREE.Color('#ff9aa8'), sheenRoughness: 0.5 }),
    velvetSeat: new THREE.MeshPhysicalMaterial({ map: textureFrom(velvetTexture()), color: '#ffffff', roughness: 0.82, metalness: 0.0, sheen: 1.0, sheenColor: new THREE.Color('#ffb9c4'), sheenRoughness: 0.55 }),
    brassRich: std({ color: '#c69a58', roughness: 0.62, metalness: 0.9, roughnessMap: brushed, ...metals }),
    goldTrim: std({ color: '#d8b46c', roughness: 0.66, metalness: 0.85, roughnessMap: brushed, ...metals }),
    darkWood: std({ color: '#241812', roughness: 0.6, metalness: 0.08 }),
    crystal: std({ color: '#e8f0fa', roughness: 0.12, metalness: 0.2, transparent: true, opacity: 0.75, ...metals }),
  };
  materials.__glowSprite = textureFrom(glowSpriteTexture(), { repeat: 1 });
  materials.__glowSprite.wrapS = materials.__glowSprite.wrapT = THREE.ClampToEdgeWrapping;
  materials.__shaft = textureFrom(shaftTexture(), { repeat: 1 });
  materials.__shaft.wrapS = materials.__shaft.wrapT = THREE.ClampToEdgeWrapping;
  materials.paintingA = std({ map: textureFrom(paintingTexture(0)), roughness: 0.6, metalness: 0.05 });
  materials.paintingB = std({ map: textureFrom(paintingTexture(1)), roughness: 0.6, metalness: 0.05 });
  CACHE.materials = materials;
  return materials;
}

export function disposeTheaterMaterials() {
  if (!CACHE.materials) return;
  for (const value of Object.values(CACHE.materials)) {
    if (value && value.isTexture) value.dispose();
    else if (value && value.isMaterial) {
      value.map?.dispose();
      value.dispose();
    }
  }
  CACHE.materials = null;
}
