/**
 * Downhill Mayhem world (integrate-multiplayer-downhill-mayhem-arcade 5.2).
 * Terrain mesh, instanced scenery/gates — ported from the frozen source
 * `buildTerrain`/`buildScenery`/`buildGates` (`standalone.html`) but evaluated
 * against the canonical course document through `course.heightAt` /
 * `course.worldPosition`. In-corridor obstacle trees and boulders are placed at
 * the document's `colliders` so render and contact agree exactly; hillside
 * scatter is cosmetic.
 *
 * Owns a `THREE.Group`; the caller adds it to its own scene. No renderer, RAF
 * or resize ownership. `dispose()` frees this group's geometries/materials.
 */

import * as THREE from 'three';
import {
  courseConfig, clamp, lerp, smoothstep, mulberry32, hash2, vnoise2,
  S_MIN, S_MAX, DS, FINISH_S, HALF_W, RIDE_W,
} from './course.js';

function hasDocument() {
  return typeof document !== 'undefined' && !!document.createElement;
}

function terrainColor(cfg, s, lat, rampH, out) {
  const a = Math.abs(lat), n = vnoise2(s * 0.9 + cfg.noff, lat * 0.9 + cfg.noff);
  if (rampH > 0.04) { // wooden kicker: planks + pale stripe on the lip edge
    for (const r of cfg.ramps) {
      if (s >= r.s0 && s <= r.s0 + r.len + 0.1 && (r.s0 + r.len) - s < 0.95) { out.setRGB(0.88, 0.85, 0.76); return out; }
    }
    const plank = (Math.floor(s * 1.4) % 2 === 0) ? 1 : 0.76;
    out.setRGB(0.62 * plank + n * 0.03, 0.40 * plank + n * 0.03, 0.16 * plank);
    return out;
  }
  const dirt = { r: 0.472 + n * 0.05 + (1 - Math.min(a / 8, 1)) * 0.03, g: 0.357 + n * 0.04, b: 0.243 + n * 0.03 };
  const grass = { r: 0.263 + n * 0.05, g: 0.443 + n * 0.06, b: 0.212 + n * 0.04 };
  const rock = { r: 0.46 + n * 0.08, g: 0.44 + n * 0.08, b: 0.41 + n * 0.07 };
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
  if (cold > 0) {
    const snow = a > 6 ? clamp(vnoise2(s * 0.31 + cfg.noff, lat * 0.27) + 0.35, 0, 1) * cold : 0;
    r = lerp(r, 0.84, snow * 0.85); g = lerp(g, 0.86, snow * 0.85); b = lerp(b, 0.92, snow * 0.85);
    b = Math.min(1, b * (1 + 0.18 * cold)); g = g * (1 - 0.05 * cold);
  }
  if (warm > 0) { r = Math.min(1, r * (1 + 0.20 * warm) + 0.03 * warm); g = g * (1 - 0.04 * warm); b = b * (1 - 0.26 * warm); }
  out.setRGB(r, g, b);
  return out;
}

function buildTerrain(group, course, cfg) {
  const LATS = [-70, -42, -34, -29, -26, -22.5, -19, -16, -13, -10.5, -8.6, -8, -6, -3, 0, 3, 6, 8, 8.6, 10.5, 13, 16, 19, 22.5, 26, 29, 34, 42, 70];
  const rows = [];
  for (let s = S_MIN; s <= S_MAX; s += 3.5) rows.push(s);
  for (const r of cfg.ramps) rows.push(r.s0, r.s0 + r.len - 0.9, r.s0 + r.len, r.s0 + r.len + 0.08);
  for (const d of cfg.drops) rows.push(d.s0, d.s0 + 4.2);
  rows.sort((a, b) => a - b);

  const P = [], C = [], tmpC = new THREE.Color(), v = new THREE.Vector3();
  for (let ri = 0; ri < rows.length; ri++) {
    const s = rows[ri]; P.push([]); C.push([]);
    for (let ci = 0; ci < LATS.length; ci++) {
      let lat = LATS[ci];
      const far = Math.abs(lat) >= 34;
      if (far) lat += (hash2(ri, ci) - 0.5) * 6;
      const rampH = course.rampHeightAt(s, lat);
      course.worldPosition(s, lat, course.heightAt(s, lat), v);
      if (far) v.y += (hash2(ci, ri) - 0.5) * 2.2;
      P[ri].push([v.x, v.y, v.z]);
      terrainColor(cfg, s, lat, rampH, tmpC);
      C[ri].push([tmpC.r, tmpC.g, tmpC.b]);
    }
  }

  const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  const CHUNK = 36;
  for (let r0 = 0; r0 < rows.length - 1; r0 += CHUNK) {
    const r1 = Math.min(r0 + CHUNK, rows.length - 1);
    const pos = [], col = [];
    for (let ri = r0; ri < r1; ri++) {
      for (let ci = 0; ci < LATS.length - 1; ci++) {
        const a = P[ri][ci], b = P[ri][ci + 1], c = P[ri + 1][ci], d = P[ri + 1][ci + 1];
        const ca = C[ri][ci], cb = C[ri][ci + 1], cc = C[ri + 1][ci], cd = C[ri + 1][ci + 1];
        pos.push(...a, ...b, ...c, ...c, ...b, ...d);
        col.push(...ca, ...cb, ...cc, ...cc, ...cb, ...cd);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.computeVertexNormals();
    group.add(new THREE.Mesh(g, mat));
  }
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
  g.font = 'italic 900 54px Arial'; g.fillText(main, 256, checker ? 72 : 66);
  if (sub) { g.font = 'italic 700 20px Arial'; g.fillText(sub, 256, 26); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function buildGates(group, course) {
  const poleG = new THREE.CylinderGeometry(0.14, 0.14, 5.4, 6);
  const poleM = new THREE.MeshLambertMaterial({ color: 0xd8d8d8 });
  const mk = (s, tex) => {
    const grp = new THREE.Group(); const v = new THREE.Vector3();
    for (const side of [-9, 9]) {
      const p = new THREE.Mesh(poleG, poleM);
      course.worldPosition(s, side, course.heightAt(s, side) + 2.7, v);
      p.position.copy(v);
      grp.add(p);
    }
    if (tex) {
      const geo = new THREE.PlaneGeometry(18, 2.1);
      const mat = new THREE.MeshBasicMaterial({ map: tex });
      course.worldPosition(s, 0, course.heightAt(s, 0) + 4.7, v);
      const h = course.sampleTrack(s).h;
      for (const flip of [0, Math.PI]) {
        const b = new THREE.Mesh(geo, mat);
        b.position.copy(v);
        b.rotation.y = h + Math.PI + flip;
        grp.add(b);
      }
    }
    group.add(grp);
  };
  mk(0, makeBannerTex('START', 'DOWNHILL MAYHEM', '#224488', false));
  mk(FINISH_S, makeBannerTex('FINISH', '', '#ffffff', true));
}

function addInstanced(group, geometry, material, matrices) {
  if (!matrices.length) return null;
  const im = new THREE.InstancedMesh(geometry, material, matrices.length);
  const ctr = new THREE.Vector3();
  for (const m of matrices) ctr.add(new THREE.Vector3().setFromMatrixPosition(m));
  ctr.divideScalar(matrices.length);
  let rad = 0;
  for (const m of matrices) rad = Math.max(rad, new THREE.Vector3().setFromMatrixPosition(m).distanceTo(ctr));
  im.geometry.boundingSphere = new THREE.Sphere(ctr.clone(), rad + 12);
  for (let i = 0; i < matrices.length; i++) im.setMatrixAt(i, matrices[i]);
  im.instanceMatrix.needsUpdate = true;
  im.frustumCulled = true;
  group.add(im);
  return im;
}

function buildScenery(group, course, cfg) {
  const rng = mulberry32(cfg.seed + 31);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(),
    pv = new THREE.Vector3(), sv = new THREE.Vector3();
  const trunk = [], fol1 = [], fol2 = [], folSnow = [], folDry = [], rock1 = [], rock2 = [];

  // 1. In-corridor obstacles: placed at the baked colliders so the visible
  //    tree/rock is exactly what the physics collides with.
  for (const c of cfg.colliders) {
    rng(); // keep the authoring stream aligned with the source generator order
    if (c.kind === 'tree') {
      const sc = (c.r || 0.75) / 0.75;
      course.worldPosition(c.s, c.lat, course.heightAt(c.s, c.lat), pv);
      q.setFromEuler(e.set(0, hash2(Math.round(c.s * 10), Math.round(c.lat * 10)) * 6.28, 0));
      m4.compose(pv.clone().setY(pv.y + 1.1 * sc), q, sv.set(sc, sc, sc)); trunk.push(m4.clone());
      m4.compose(pv.clone().setY(pv.y + 2.2 * sc + 1.3 * sc), q, sv.set(sc, sc, sc));
      (c.s < FINISH_S * 0.3 ? folSnow : c.s > FINISH_S * 0.7 ? folDry : fol1).push(m4.clone());
    } else {
      const sc = (c.r || 0.64) / 0.8;
      course.worldPosition(c.s, c.lat, course.heightAt(c.s, c.lat) - 0.08, pv);
      q.setFromEuler(e.set(rng() * 3, rng() * 3, rng() * 3));
      m4.compose(pv, q, sv.set(sc * (1 + rng() * 0.5), sc * 0.8, sc * (1 + rng() * 0.5)));
      rock1.push(m4.clone());
    }
  }

  // 2. Cosmetic hillside/forest scatter (visual only; outside the contact band).
  for (let s = 60; s < S_MAX - 40; s += 8 + rng() * 10) {
    if (rng() < Math.min(0.4 * cfg.treeD, 0.85)) {
      const side = rng() < 0.5 ? 1 : -1;
      const sT = s + rng() * 4, lat = side * (9.5 + rng() * 15.5), sc = 0.75 + rng() * 0.7;
      course.worldPosition(sT, lat, course.heightAt(sT, lat), pv);
      q.setFromEuler(e.set(0, rng() * 6.28, 0));
      m4.compose(pv.clone().setY(pv.y + 1.1 * sc), q, sv.set(sc, sc, sc)); trunk.push(m4.clone());
      m4.compose(pv.clone().setY(pv.y + 2.2 * sc + 1.3 * sc), q, sv.set(sc, sc, sc));
      (sT < FINISH_S * 0.3 ? folSnow : sT > FINISH_S * 0.7 ? folDry : fol2).push(m4.clone());
    }
    for (let k = 0; k < 2; k++) {
      if (rng() < Math.min(0.8 * Math.max(cfg.treeD, 0.45), 0.95)) {
        const side = rng() < 0.5 ? 1 : -1;
        const sT = s + rng() * 8, lat = side * (28 + rng() * 36), sc = 0.75 + rng() * 0.7;
        course.worldPosition(sT, lat, course.heightAt(sT, lat), pv);
        q.setFromEuler(e.set(0, rng() * 6.28, 0));
        m4.compose(pv.clone().setY(pv.y + 1.1 * sc), q, sv.set(sc, sc, sc)); trunk.push(m4.clone());
        m4.compose(pv.clone().setY(pv.y + 2.2 * sc + 1.3 * sc), q, sv.set(sc, sc, sc));
        (sT > FINISH_S * 0.7 ? folDry : fol2).push(m4.clone());
      }
    }
  }
  for (let s = 40; s < S_MAX - 40; s += 26 + rng() * 34) {
    const side = rng() < 0.5 ? 1 : -1, lat = side * (28 + rng() * 30), sc = 0.6 + rng() * 1.6;
    course.worldPosition(s, lat, course.heightAt(s, lat) - 0.45 + sc * 0.2, pv);
    q.setFromEuler(e.set(rng() * 3, rng() * 3, rng() * 3));
    m4.compose(pv, q, sv.set(sc * (1 + rng() * 0.6), sc, sc * (1 + rng() * 0.6)));
    (rng() < 0.5 ? rock1 : rock2).push(m4.clone());
  }

  const lam = (color) => new THREE.MeshLambertMaterial({ color });
  addInstanced(group, new THREE.CylinderGeometry(0.16, 0.24, 2.2, 5), lam(0x5a4028), trunk);
  addInstanced(group, new THREE.ConeGeometry(1.5, 3.4, 6), lam(0x2d5a27), fol1);
  addInstanced(group, new THREE.ConeGeometry(1.3, 3.0, 6), lam(0x3a6b2f), fol2);
  addInstanced(group, new THREE.ConeGeometry(1.4, 3.2, 6), lam(0x71917f), folSnow);
  addInstanced(group, new THREE.ConeGeometry(1.3, 3.0, 6), lam(0x77772f), folDry);
  addInstanced(group, new THREE.DodecahedronGeometry(1, 0), lam(0x8d8a84), rock1);
  addInstanced(group, new THREE.DodecahedronGeometry(1, 0), lam(0x6f6d68), rock2);
}

/** Build the whole course world into one group. */
export function buildWorld({ course }) {
  const cfg = courseConfig(course);
  const group = new THREE.Group();
  buildTerrain(group, course, cfg);
  buildScenery(group, course, cfg);
  buildGates(group, course);
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
      group.clear();
      if (group.parent) group.parent.remove(group);
    },
  };
}
