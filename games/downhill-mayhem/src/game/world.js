/**
 * Downhill Mayhem world (integrate-multiplayer-downhill-mayhem-arcade 5.2,
 * visual overhaul pass). Terrain mesh, instanced scenery and gates — built
 * against the canonical course document through `course.heightAt` /
 * `course.worldPosition` so render and contact agree exactly. In-corridor
 * obstacle trees and boulders sit at the document's `colliders`; hillside
 * scatter stays cosmetic.
 *
 * Fidelity levers kept inside a draw-call budget: the whole course is a handful
 * of texture-mapped terrain chunks sharing one material, vegetation/rock
 * families are merged then GPU-instanced per variant, casts/receives shadows,
 * and the macro terrain maps carry the surface story (ruts, drifts, strata).
 *
 * Owns a `THREE.Group`; the caller adds it to its own scene. No renderer, RAF
 * or resize ownership. `dispose()` frees this group's geometries/materials.
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createTerrainTextures, createDetailNormal, latToU } from './textures.js';
import {
  courseConfig, clamp, lerp, smoothstep, mulberry32, hash2, vnoise2,
  S_MIN, S_MAX, FINISH_S, RIDE_W,
} from './course.js';

const UV_S_SPAN = S_MAX - S_MIN;

function hasDocument() {
  return typeof document !== 'undefined' && !!document.createElement;
}

function terrainColor(cfg, s, lat, rampH, out) {
  const a = Math.abs(lat), n = vnoise2(s * 0.9 + cfg.noff, lat * 0.9 + cfg.noff);
  if (rampH > 0.04) { // wooden kicker: planks + pale stripe on the lip edge
    for (const r of cfg.ramps) {
      if (s >= r.s0 && s <= r.s0 + r.len + 0.1 && (r.s0 + r.len) - s < 1.6) { out.setRGB(0.74, 0.77, 0.82); return out; }
    }
    const plank = (Math.floor(s * 1.4) % 2 === 0) ? 1 : 0.9;
    out.setRGB(0.115 * plank + n * 0.018, 0.072 * plank + n * 0.014, 0.048 * plank);
    return out;
  }
  const dirt = { r: 0.13 + n * 0.028 + (1 - Math.min(a / 8, 1)) * 0.016, g: 0.085 + n * 0.02, b: 0.055 + n * 0.014 };
  const grass = { r: 0.19 + n * 0.045, g: 0.30 + n * 0.055, b: 0.15 + n * 0.035 };
  const rock = { r: 0.29 + n * 0.07, g: 0.28 + n * 0.065, b: 0.265 + n * 0.055 };
  let r, g, b;
  if (a < 8) { r = dirt.r; g = dirt.g; b = dirt.b; }
  else if (a < RIDE_W + 2) {
    const t = smoothstep((a - 8) / 2.2);
    const patch = smoothstep((vnoise2(s * 0.10, lat * 0.12) + 0.45) * 1.1) * 0.75;
    r = lerp(dirt.r, lerp(grass.r, dirt.r, patch), t);
    g = lerp(dirt.g, lerp(grass.g, dirt.g, patch), t);
    b = lerp(dirt.b, lerp(grass.b, dirt.b, patch), t);
  } else {
    const t = smoothstep((a - RIDE_W - 2) / 5);
    r = lerp(grass.r, rock.r, t); g = lerp(grass.g, rock.g, t); b = lerp(grass.b, rock.b, t);
  }
  const fAlt = clamp(s / FINISH_S, 0, 1);
  const cold = clamp((cfg.coldEdge - fAlt) / cfg.coldEdge, 0, 1);
  const warm = clamp((fAlt - cfg.warmEdge) / (1 - cfg.warmEdge), 0, 1);
  // Patchy snow lingers below the full-snow line, like a spring alpine thaw.
  const midSnow = warm > 0 ? 0 : clamp((0.62 - fAlt) / 0.62, 0, 1);
  const snowMix = Math.max(cold, midSnow * 0.85);
  if (snowMix > 0) {
    const snow = a > 6 ? clamp(vnoise2(s * 0.31 + cfg.noff, lat * 0.27) + 0.35, 0, 1) * cold : 0;
    const drift = a > 5.5 ? clamp(vnoise2(s * 0.16 + cfg.noff, lat * 0.13) + 0.08, 0, 1) * snowMix * 0.75 * smoothstep((a - 5.5) / 1.5) : 0;
    const patch = a > 6 ? clamp(vnoise2(s * 0.19 + cfg.noff, lat * 0.17) + 0.22, 0, 1) * midSnow * 0.7 * (1 - smoothstep((a - 26) / 16) * 0.8) : 0;
    const mix = Math.max(snow, drift, patch);
    r = lerp(r, 0.845, mix * 0.92); g = lerp(g, 0.87, mix * 0.92); b = lerp(b, 0.935, mix * 0.92);
    b = Math.min(1, b * (1 + 0.16 * snowMix)); g = g * (1 - 0.05 * snowMix);
  }
  if (warm > 0) { r = Math.min(1, r * (1 + 0.20 * warm) + 0.03 * warm); g = g * (1 - 0.04 * warm); b = b * (1 - 0.26 * warm); }
  out.setRGB(r, g, b);
  return out;
}

const LATS = [
  -70, -54, -44, -36, -30, -26.5, -23, -20, -17.5, -15, -12.5, -10.5, -9, -7.5, -6, -4.75,
  -3.5, -2.5, -1.6, -0.8, 0, 0.8, 1.6, 2.5, 3.5, 4.75, 6, 7.5, 9, 10.5, 12.5, 15, 17.5,
  20, 23, 26.5, 30, 36, 44, 54, 70,
];

function buildTerrain(group, course, cfg) {
  const rows = [];
  for (let s = S_MIN; s <= S_MAX; s += 2.5) rows.push(s);
  for (const r of cfg.ramps) rows.push(r.s0, r.s0 + r.len - 0.9, r.s0 + r.len, r.s0 + r.len + 0.08);
  for (const d of cfg.drops) rows.push(d.s0, d.s0 + 4.2);
  rows.sort((a, b) => a - b);

  const textures = createTerrainTextures(course, cfg);
  const detailNormal = createDetailNormal(256, 1234);
  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    map: textures ? textures.map : null,
    normalMap: textures ? textures.normalMap : null,
    normalScale: new THREE.Vector2(1.15, 1.15),
    roughnessMap: textures ? textures.roughnessMap : null,
    roughness: 1.0,
    metalness: 0.0,
  });
  if (detailNormal) {
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uDetailMap = { value: detailNormal };
      shader.uniforms.uDetailScale = { value: new THREE.Vector2(45, 2600) };
      shader.uniforms.uDetailStrength = { value: 0.55 };
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', [
          '#include <common>',
          'uniform sampler2D uDetailMap;',
          'uniform vec2 uDetailScale;',
          'uniform float uDetailStrength;',
        ].join('\n'))
        .replace('#include <normal_fragment_maps>', [
          '#include <normal_fragment_maps>',
          'vec3 dmDetail = texture2D(uDetailMap, vMapUv * uDetailScale).xyz * 2.0 - 1.0;',
          'normal = normalize(normal + vec3(dmDetail.xy * uDetailStrength, 0.0));',
        ].join('\n'));
    };
    mat.customProgramCacheKey = () => 'dm-terrain-detail';
  }

  const P = [], C = [], T = [], tmpC = new THREE.Color(), v = new THREE.Vector3();
  for (let ri = 0; ri < rows.length; ri++) {
    const s = rows[ri]; P.push([]); C.push([]); T.push([]);
    for (let ci = 0; ci < LATS.length; ci++) {
      let lat = LATS[ci];
      const far = Math.abs(lat) >= 36;
      if (far) lat += (hash2(ri, ci) - 0.5) * 6;
      const rampH = course.rampHeightAt(s, lat);
      course.worldPosition(s, lat, course.heightAt(s, lat), v);
      if (far) v.y += (hash2(ci, ri) - 0.5) * 2.2;
      P[ri].push([v.x, v.y, v.z]);
      terrainColor(cfg, s, lat, rampH, tmpC);
      C[ri].push([tmpC.r, tmpC.g, tmpC.b]);
      T[ri].push([latToU(lat), (s - S_MIN) / UV_S_SPAN]);
    }
  }

  const CHUNK = 48;
  for (let r0 = 0; r0 < rows.length - 1; r0 += CHUNK) {
    const r1 = Math.min(r0 + CHUNK, rows.length - 1);
    const pos = [], col = [], uv = [];
    for (let ri = r0; ri < r1; ri++) {
      for (let ci = 0; ci < LATS.length - 1; ci++) {
        const a = P[ri][ci], b = P[ri][ci + 1], c = P[ri + 1][ci], d = P[ri + 1][ci + 1];
        const ca = C[ri][ci], cb = C[ri][ci + 1], cc = C[ri + 1][ci], cd = C[ri + 1][ci + 1];
        const ta = T[ri][ci], tb = T[ri][ci + 1], tc = T[ri + 1][ci], td = T[ri + 1][ci + 1];
        pos.push(...a, ...b, ...c, ...c, ...b, ...d);
        col.push(...ca, ...cb, ...cc, ...cc, ...cb, ...cd);
        uv.push(...ta, ...tb, ...tc, ...tc, ...tb, ...td);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.computeVertexNormals();
    const mesh = new THREE.Mesh(g, mat);
    mesh.userData.dmTerrain = true;
    mesh.receiveShadow = true;
    mesh.castShadow = false;
    group.add(mesh);
  }
  return textures;
}

function makeBannerTex(main, sub, bg, checker) {
  if (!hasDocument()) return null;
  const c = document.createElement('canvas'); c.width = 512; c.height = 110;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, 512, 110);
  if (checker) {
    g.fillStyle = '#111';
    for (let x = 0; x < 512; x += 16) for (let y = 0; y < 110; y += 16) {
      if (((x + y) / 16) % 2 === 0) g.fillRect(x, y, 16, 16);
    }
    g.fillStyle = 'rgba(255,255,255,0.82)'; g.fillRect(26, 18, 460, 74);
  }
  g.fillStyle = checker ? '#111' : '#fff'; g.textAlign = 'center';
  let px = 96;
  do { g.font = `italic 900 ${px}px Arial Black, Arial`; px -= 4; }
  while (px > 44 && g.measureText(main).width > 480);
  g.fillText(main, 256, checker ? 74 : 68);
  if (sub) { g.font = 'italic 700 27px Arial'; g.fillText(sub, 256, 100); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function makeSignTex(label, accent) {
  if (!hasDocument()) return null;
  const c = document.createElement('canvas'); c.width = 256; c.height = 160;
  const g = c.getContext('2d');
  g.fillStyle = '#e9e2cf'; g.fillRect(0, 0, 256, 160);
  g.strokeStyle = '#2a2118'; g.lineWidth = 10; g.strokeRect(8, 8, 240, 144);
  g.fillStyle = accent; g.fillRect(8, 8, 240, 34);
  g.fillStyle = '#1c1712'; g.textAlign = 'center';
  g.font = '900 40px Arial'; g.fillText(label, 128, 100);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function buildGates(group, course, cfg) {
  const poleG = new THREE.CylinderGeometry(0.13, 0.16, 5.6, 8);
  const poleM = new THREE.MeshStandardMaterial({ color: 0xd8dde2, roughness: 0.5, metalness: 0.35 });
  const v = new THREE.Vector3();

  const mkArch = (s, tex, bannerH) => {
    const grp = new THREE.Group();
    for (const side of [-9.2, 9.2]) {
      const p = new THREE.Mesh(poleG, poleM);
      course.worldPosition(s, side, course.heightAt(s, side) + 2.8, v);
      p.position.copy(v);
      p.castShadow = true;
      grp.add(p);
    }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(18.8, 0.34, 0.34), poleM);
    course.worldPosition(s, 0, course.heightAt(s, 0) + 5.5, v);
    beam.position.copy(v);
    const h = course.sampleTrack(s).h + Math.PI;
    beam.rotation.y = h;
    beam.castShadow = true;
    grp.add(beam);
    if (tex) {
      const geo = new THREE.PlaneGeometry(18, bannerH);
      const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, side: THREE.DoubleSide, emissive: 0x2a241c, emissiveIntensity: 0.25 });
      course.worldPosition(s, 0, course.heightAt(s, 0) + 4.55, v);
      const banner = new THREE.Mesh(geo, mat);
      banner.position.copy(v);
      banner.rotation.y = h;
      banner.castShadow = true;
      grp.add(banner);
    }
    group.add(grp);
  };
  mkArch(0, makeBannerTex('START', 'DOWNHILL MAYHEM', '#224488', false), 2.1);
  mkArch(FINISH_S, makeBannerTex('FINISH', '', '#ffffff', true), 2.3);

  // Course flags every 130 m on alternating sides.
  const flagParts = (color) => {
    const pole = new THREE.CylinderGeometry(0.045, 0.05, 2.4, 5); pole.translate(0, 1.2, 0);
    const flag = new THREE.PlaneGeometry(0.75, 0.44); flag.translate(0.38, 2.05, 0);
    const c = new THREE.Color(color);
    const colorize = (geo) => {
      const n = geo.attributes.position.count, arr = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
      geo.setAttribute('color', new THREE.Float32BufferAttribute(arr, 3));
      return geo;
    };
    const merged = mergeGeometries([colorize(pole.toNonIndexed()), colorize(flag.toNonIndexed().scale(1, 1, 1))], false);
    return merged;
  };
  const flagMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, side: THREE.DoubleSide });
  const flagGeos = [flagParts(0xd23c2c), flagParts(0xf2c515)];
  const flagMats = [[], []];
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sv = new THREE.Vector3(1, 1, 1);
  let fi = 0;
  for (let s = 120; s < FINISH_S - 20; s += 130) {
    const side = (fi % 2 === 0) ? 1 : -1;
    const lat = side * 9.6;
    course.worldPosition(s, lat, course.heightAt(s, lat), v);
    const yaw = course.sampleTrack(s).h + (side > 0 ? 0 : Math.PI);
    q.setFromEuler(e.set(0, yaw, 0));
    m4.compose(v.clone().setY(v.y + 0.02), q, sv);
    flagMats[fi % 2].push(m4.clone());
    fi++;
  }
  for (let k = 0; k < 2; k++) {
    if (!flagMats[k].length) continue;
    const im = new THREE.InstancedMesh(flagGeos[k], flagMat, flagMats[k].length);
    flagMats[k].forEach((m, i) => im.setMatrixAt(i, m));
    im.instanceMatrix.needsUpdate = true;
    im.castShadow = true;
    im.frustumCulled = true;
    im.computeBoundingSphere();
    group.add(im);
  }

  // Feature signage: JUMP at the biggest kickers, DANGER before drops.
  if (hasDocument()) {
    const signGeo = new THREE.PlaneGeometry(1.5, 0.95);
    const postG = new THREE.CylinderGeometry(0.05, 0.06, 1.7, 5);
    const postM = new THREE.MeshStandardMaterial({ color: 0x6b5a45, roughness: 0.9 });
    const textures = { JUMP: makeSignTex('JUMP', '#f2b233'), DANGER: makeSignTex('DANGER', '#c8372b') };
    const place = (s, label) => {
      const tex = textures[label];
      if (!tex) return;
      const side = (Math.round(s) % 2 === 0) ? 1 : -1;
      const lat = side * 7.4;
      course.worldPosition(s, lat, course.heightAt(s, lat), v);
      const h = course.sampleTrack(s).h + (side > 0 ? 0 : Math.PI);
      const post = new THREE.Mesh(postG, postM);
      post.position.copy(v).setY(v.y + 0.85);
      post.rotation.y = h;
      post.castShadow = true;
      const face = new THREE.Mesh(signGeo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8, side: THREE.DoubleSide }));
      face.position.copy(v).setY(v.y + 1.85);
      face.rotation.y = h;
      face.castShadow = true;
      group.add(post, face);
    };
    const ramps = cfg.ramps.slice().sort((a, b) => b.h - a.h).slice(0, 4);
    for (const r of ramps) place(Math.max(r.s0 - 26, 40), 'JUMP');
    for (const d of cfg.drops.slice(0, 3)) place(Math.max(d.s0 - 24, 40), 'DANGER');
  }

  // PORKEN A-frames flanking the takeoff, as in the target frame.
  if (hasDocument()) {
    const legGeo = new THREE.CylinderGeometry(0.045, 0.06, 1.1, 5);
    const crestLegGeo = new THREE.CylinderGeometry(0.03, 0.045, 0.7, 5);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x6d5a45, roughness: 0.85 });
    const bannerGeo = new THREE.PlaneGeometry(2.1, 0.72);
    const crestGeo = new THREE.PlaneGeometry(1.6, 0.58);
    const tex = makeBannerTex('PORKEN', 'STATTESHANE ROGN', '#26365e', false);
    const bigRamps = cfg.ramps.slice().sort((a, b) => b.h - a.h).slice(0, 3);
    let near948 = cfg.ramps[0];
    for (const r of cfg.ramps) if (Math.abs(r.s0 - 948) < Math.abs(near948.s0 - 948)) near948 = r;
    const chosen = [...bigRamps, near948];
    const seen = new Set();
    for (const ramp of chosen) {
      const key = Math.round(ramp.s0);
      if (seen.has(key)) continue;
      seen.add(key);
      for (const side of [-1, 1]) {
        const s = Math.max(ramp.s0 + ramp.len - 1, 36);
        const lat = side * 13.8;
        course.worldPosition(s, lat, course.heightAt(s, lat), v);
        const yaw = course.sampleTrack(s).h + Math.PI + side * 0.22;
        const grp = new THREE.Group();
        const banner = new THREE.Mesh(bannerGeo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.75, side: THREE.DoubleSide }));
        banner.position.set(0, 0.85, 0);
        banner.castShadow = true;
        for (const off of [-0.78, 0.78]) {
          const leg = new THREE.Mesh(legGeo, legMat);
          leg.position.set(off, 0.5, off * 0.14);
          leg.rotation.z = off > 0 ? -0.12 : 0.12;
          leg.castShadow = true;
          grp.add(leg);
        }
        grp.add(banner);
        grp.position.copy(v);
        grp.rotation.y = yaw;
        group.add(grp);
      }
      if (key === Math.round(near948.s0)) {
        for (const side of [-1, 1]) {
          const s = ramp.s0 + ramp.len - 0.6;
          const lat = side * 4.8;
          course.worldPosition(s, lat, course.heightAt(s, lat), v);
          const grp = new THREE.Group();
          const crest = new THREE.Mesh(crestGeo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.75, side: THREE.DoubleSide }));
          crest.position.set(0, 0.62, 0);
          crest.castShadow = true;
          for (const off of [-0.6, 0.6]) {
            const leg = new THREE.Mesh(crestLegGeo, legMat);
            leg.position.set(off, 0.32, 0);
            leg.castShadow = true;
            grp.add(leg);
          }
          grp.add(crest);
          grp.position.copy(v);
          grp.rotation.y = course.sampleTrack(s).h + Math.PI;
          group.add(grp);
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Vegetation and rock asset builders (merged, vertex-coloured, instanced)
// ---------------------------------------------------------------------------

function colorizeGeometry(geo, color) {
  const c = new THREE.Color(color);
  const n = geo.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(arr, 3));
  return geo;
}

/** One merged conifer: smooth trunk plus stacked cone tiers, snow-laden tops. */
function makeConifer(rng, kind) {
  const H = 7.0 + rng() * 5.0;
  const parts = [];
  const trunk = new THREE.CylinderGeometry(H * 0.014 + 0.05, H * 0.022 + 0.08, H * 0.34, 5, 1);
  trunk.translate(0, H * 0.17, 0);
  parts.push(colorizeGeometry(trunk, 0x4a3626));

  const tiers = 5 + Math.floor(rng() * 2);
  const baseColor = kind === 'dry' ? 0x5d6626 : kind === 'snow' ? 0x24422a : (rng() < 0.5 ? 0x24422a : 0x2c5230);
  const tipColor = kind === 'dry' ? 0x8a8a3a : kind === 'snow' ? 0xe9f1f6 : 0x5d7f63;
  const tipMix = kind === 'snow' ? 0.82 : kind === 'dry' ? 0.3 : 0.34;
  let y = H * 0.16, r = H * 0.215, th = H * 0.36;
  for (let t = 0; t < tiers; t++) {
    const cone = new THREE.ConeGeometry(r, th, 7, 1);
    cone.rotateY(rng() * 0.9);
    cone.translate((rng() - 0.5) * H * 0.04, y + th / 2, (rng() - 0.5) * H * 0.04);
    const pos = cone.attributes.position;
    const cBase = new THREE.Color(baseColor), cTip = new THREE.Color(tipColor);
    const arr = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const local = clamp((pos.getY(i) - y) / th, 0, 1);
      const c = cBase.clone().lerp(cTip, smoothstep((local - 0.3) / 0.55) * tipMix);
      arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b;
    }
    cone.setAttribute('color', new THREE.Float32BufferAttribute(arr, 3));
    parts.push(cone);
    y += th * 0.52; r *= 0.78; th *= 0.8;
  }
  return mergeGeometries(parts, false);
}

/** Cheap far-LOD conifer (trunk + one tier). */
function makeConiferFar(rng, kind) {
  const H = 7.5 + rng() * 4.5;
  const parts = [];
  const trunk = new THREE.CylinderGeometry(H * 0.016 + 0.04, H * 0.026 + 0.06, H * 0.3, 4, 1);
  trunk.translate(0, H * 0.15, 0);
  parts.push(colorizeGeometry(trunk, 0x4a3626));
  const cone = new THREE.ConeGeometry(H * 0.22, H * 0.82, 6, 1);
  cone.translate(0, H * 0.21 + H * 0.41, 0);
  const pos = cone.attributes.position;
  const cBase = new THREE.Color(kind === 'dry' ? 0x5d6626 : kind === 'snow' ? 0x24422a : 0x2b4f2d);
  const cTip = new THREE.Color(kind === 'dry' ? 0x8a8a3a : kind === 'snow' ? 0xeef4f8 : 0x5d7f63);
  const mix = kind === 'snow' ? 0.85 : 0.3;
  const arr = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const local = clamp((pos.getY(i) - H * 0.21) / (H * 0.82), 0, 1);
    const c = cBase.clone().lerp(cTip, smoothstep((local - 0.22) / 0.65) * mix);
    arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b;
  }
  cone.setAttribute('color', new THREE.Float32BufferAttribute(arr, 3));
  parts.push(cone);
  return mergeGeometries(parts, false);
}

/** Displaced icosphere boulder with snow dusted on upward faces. */
function makeRock(rng, snowy) {
  const geo = new THREE.IcosahedronGeometry(1, 1);
  const pos = geo.attributes.position;
  const seed = rng() * 100;
  const squash = 0.62 + rng() * 0.4;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const n = vnoise2(v.x * 2.4 + seed, v.z * 2.4 + seed * 0.7) + vnoise2(v.y * 3.6 + seed, v.x * 3.6) * 0.5;
    v.multiplyScalar(1 + n * 0.18);
    pos.setXYZ(i, v.x * (1 + rng() * 0.35), v.y * squash, v.z * (1 + rng() * 0.35));
  }
  geo.computeVertexNormals();
  const nor = geo.attributes.normal;
  const arr = new Float32Array(pos.count * 3);
  const rockC = new THREE.Color(0x7d7468);
  const snowC = new THREE.Color(0xe9eef1);
  for (let i = 0; i < pos.count; i++) {
    const up = nor.getY(i);
    const dust = snowy ? smoothstep((up - 0.25) / 0.4) : smoothstep((up - 0.5) / 0.4) * 0.5;
    const shade = 0.82 + (vnoise2(pos.getX(i) * 2 + seed, pos.getZ(i) * 2) * 0.5 + 0.5) * 0.35;
    const c = rockC.clone().multiplyScalar(shade).lerp(snowC, dust);
    arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(arr, 3));
  return geo;
}

function addInstanced(group, geometry, material, matrices, { castShadow = true, receiveShadow = false } = {}) {
  if (!matrices.length) return null;
  const im = new THREE.InstancedMesh(geometry, material, matrices.length);
  for (let i = 0; i < matrices.length; i++) im.setMatrixAt(i, matrices[i]);
  im.instanceMatrix.needsUpdate = true;
  im.castShadow = castShadow;
  im.receiveShadow = receiveShadow;
  im.frustumCulled = true;
  im.computeBoundingSphere();
  group.add(im);
  return im;
}

function foliageKind(s, cfg, rng) {
  const f = s / FINISH_S;
  if (f < 0.62) return rng() < 0.8 ? 'snow' : 'green';
  if (f < 0.86) return rng() < 0.45 ? 'snow' : 'dry';
  return 'dry';
}

function buildScenery(group, course, cfg) {
  const rng = mulberry32(cfg.seed + 31);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(),
    pv = new THREE.Vector3(), sv = new THREE.Vector3();

  // Buckets keyed by asset family so every family is one instanced draw.
  const obstacle = {}; // trees the rider can hit: they cast shadows
  const near = {};     // hillside scatter: cheap, shadow-casting off
  const far = {};
  const rockBuckets = [[], [], [], []];
  const push = (bucket, key, matrix) => { (bucket[key] || (bucket[key] = [])).push(matrix); };

  // 1. In-corridor obstacles: placed at the baked colliders so the visible
  //    tree/rock is exactly what the physics collides with.
  for (const c of cfg.colliders) {
    rng();
    if (c.kind === 'tree') {
      const sc = (c.r || 0.75) / 0.75;
      course.worldPosition(c.s, c.lat, course.heightAt(c.s, c.lat), pv);
      q.setFromEuler(e.set(0, hash2(Math.round(c.s * 10), Math.round(c.lat * 10)) * 6.28, 0));
      m4.compose(pv.clone().setY(pv.y), q, sv.set(sc, sc, sc));
      const kind = foliageKind(c.s, cfg, rng);
      push(obstacle, '0-' + kind, m4.clone());
    } else {
      const sc = (c.r || 0.64) / 0.8;
      course.worldPosition(c.s, c.lat, course.heightAt(c.s, c.lat) - 0.12, pv);
      q.setFromEuler(e.set(rng() * 3, rng() * 3, rng() * 3));
      m4.compose(pv, q, sv.set(sc * (1 + rng() * 0.5), sc * 0.8, sc * (1 + rng() * 0.5)));
      (c.s < FINISH_S * 0.45 ? rockBuckets[0] : rockBuckets[1]).push(m4.clone());
    }
  }

  // 2. Cosmetic hillside/forest scatter (visual only; outside the contact band).
  for (let s = 60; s < S_MAX - 40; s += 5.5 + rng() * 7) {
    if (rng() < Math.min(0.85 * cfg.treeD, 0.97)) {
      const side = rng() < 0.5 ? 1 : -1;
      const sT = s + rng() * 4, sc = 0.9 + rng() * 0.9;
      let lat = side * (9.5 + rng() * 15.5);
      if (sT > 855 && sT < 1025 && Math.abs(lat) < 15) lat = side * (15 + rng() * 10);
      course.worldPosition(sT, lat, course.heightAt(sT, lat), pv);
      q.setFromEuler(e.set(0, rng() * 6.28, 0));
      m4.compose(pv, q, sv.set(sc, sc, sc));
      push(near, (Math.floor(rng() * 4)) + '-' + foliageKind(sT, cfg, rng), m4.clone());
    }
    for (let k = 0; k < 3; k++) {
      if (rng() < Math.min(1.0 * Math.max(cfg.treeD, 0.45), 1)) {
        const side = rng() < 0.5 ? 1 : -1;
        const sT = s + rng() * 8, lat = side * (26 + rng() * 40), sc = 0.8 + rng() * 1.0;
        course.worldPosition(sT, lat, course.heightAt(sT, lat), pv);
        q.setFromEuler(e.set(0, rng() * 6.28, 0));
        m4.compose(pv, q, sv.set(sc, sc, sc));
        push(far, foliageKind(sT, cfg, rng), m4.clone());
      }
    }
  }
  // Sheltered stands thickening both valley walls around the first-half jump.
  for (let s = 800; s < 1140; s += 4.5 + rng() * 6) {
    for (const side of [-1, 1]) {
      if (rng() < 0.45) continue;
      const lat = side * (15.5 + rng() * 10), sc = 0.95 + rng() * 1.1;
      course.worldPosition(s, lat, course.heightAt(s, lat), pv);
      q.setFromEuler(e.set(0, rng() * 6.28, 0));
      m4.compose(pv, q, sv.set(sc, sc, sc));
      push(near, Math.floor(rng() * 4) + '-snow', m4.clone());
    }
  }
  // Mid-size boulders lining the trail shoulders and the open slopes.
  for (let s = 40; s < S_MAX - 40; s += 14 + rng() * 20) {
    const side = rng() < 0.5 ? 1 : -1, lat = side * (12 + rng() * 34), sc = 0.9 + rng() * 2.6;
    course.worldPosition(s, lat, course.heightAt(s, lat) - 0.45 + sc * 0.2, pv);
    q.setFromEuler(e.set(rng() * 3, rng() * 3, rng() * 3));
    m4.compose(pv, q, sv.set(sc * (1 + rng() * 0.6), sc, sc * (1 + rng() * 0.6)));
    rockBuckets[2 + Math.floor(rng() * 2)].push(m4.clone());
  }
  // 3. Small loose stones hugging the trail shoulders.
  const stones = [];
  for (let s = 70; s < S_MAX - 50; s += 6 + rng() * 9) {
    if (rng() < 0.6) {
      const side = rng() < 0.5 ? 1 : -1;
      const lat = side * (6.4 + rng() * 5.5), sc = 0.08 + rng() * 0.22;
      course.worldPosition(s, lat, course.heightAt(s, lat), pv);
      q.setFromEuler(e.set(rng() * 3, rng() * 3, rng() * 3));
      m4.compose(pv, q, sv.set(sc, sc * (0.6 + rng() * 0.5), sc));
      stones.push(m4.clone());
    }
  }

  // 4. Hero boulders framing the takeoff: left mid-ground cluster, banner
  //    bases, ramp sides and trail-shoulder blocks.
  const heroSpots = [
    [941, -15.8, 1.35], [945, -17.6, 1.05], [937.5, -18.9, 0.85], [950.5, -19.5, 0.7],
    [952, 12.9, 1.0], [956.5, 14.8, 1.3], [959.5, 16.2, 0.8], [947, -11.6, 0.75],
    [953, 10.6, 0.65], [962, -10.8, 0.9], [966, 11.4, 1.05], [931, 11.8, 0.8],
    [927, -12.6, 0.85], [972, -14.2, 1.2], [979, 13.4, 0.95], [987, -11.8, 0.8],
  ];
  for (let i = 0; i < heroSpots.length; i++) {
    const [s, lat, sc0] = heroSpots[i];
    const sc = sc0 * 0.8;
    course.worldPosition(s, lat, course.heightAt(s, lat) - 0.3 + sc * 0.24, pv);
    q.setFromEuler(e.set(rng() * 3, rng() * 3, rng() * 3));
    m4.compose(pv, q, sv.set(sc * (1 + rng() * 0.5), sc * (0.75 + rng() * 0.4), sc * (1 + rng() * 0.5)));
    rockBuckets[2 + (i % 2)].push(m4.clone());
  }

  const treeMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0 });
  const rockMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.97, metalness: 0 });

  const variantRngs = [mulberry32(cfg.seed + 41), mulberry32(cfg.seed + 42), mulberry32(cfg.seed + 43), mulberry32(cfg.seed + 44)];
  const nearGeos = {}, farGeos = { kind: {} };
  for (const key of Object.keys(obstacle)) {
    const [variant, kind] = key.split('-');
    const geo = makeConifer(variantRngs[Number(variant) % 4], kind);
    nearGeos['o-' + key] = geo;
    addInstanced(group, geo, treeMat, obstacle[key], { castShadow: true, receiveShadow: true });
  }
  for (const key of Object.keys(near)) {
    const [variant, kind] = key.split('-');
    const geo = makeConifer(variantRngs[Number(variant) % 4], kind);
    nearGeos[key] = geo;
    addInstanced(group, geo, treeMat, near[key], { castShadow: false, receiveShadow: true });
  }
  for (const kind of Object.keys(far)) {
    const geo = makeConiferFar(mulberry32(cfg.seed + 51 + kind.length), kind);
    farGeos.kind[kind] = geo;
    addInstanced(group, geo, treeMat, far[kind], { castShadow: false });
  }
  const rockVariantRngs = [mulberry32(cfg.seed + 61), mulberry32(cfg.seed + 62), mulberry32(cfg.seed + 63), mulberry32(cfg.seed + 64)];
  const rockGeos = rockVariantRngs.map((r) => makeRock(r, true));
  for (let i = 0; i < 4; i++) addInstanced(group, rockGeos[i], rockMat, rockBuckets[i], { castShadow: i < 2, receiveShadow: true });
  const stoneGeo = makeRock(mulberry32(cfg.seed + 71), true);
  addInstanced(group, stoneGeo, rockMat, stones, { castShadow: false, receiveShadow: true });
  return { nearGeos, farGeos, rockGeos, stoneGeo };
}

/** Build the whole course world into one group. */
export function buildWorld({ course }) {
  const cfg = courseConfig(course);
  const group = new THREE.Group();
  const textures = buildTerrain(group, course, cfg);
  buildScenery(group, course, cfg);
  buildGates(group, course, cfg);
  let disposed = false;
  return {
    group,
    config: cfg,
    dispose() {
      if (disposed) return;
      disposed = true;
      group.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        const m = o.material;
        if (m) (Array.isArray(m) ? m : [m]).forEach((mm) => {
          if (mm.map && mm.map.dispose) mm.map.dispose();
          mm.dispose();
        });
      });
      textures?.dispose();
      group.clear();
      if (group.parent) group.parent.remove(group);
    },
  };
}
