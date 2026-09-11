/**
 * Downhill Mayhem riders (integrate-multiplayer-downhill-mayhem-arcade 5.3).
 * Rider rig construction, jersey recolouring, trick/crash/strike poses and the
 * per-frame visual update — ported from the frozen source `buildRiderModel` /
 * `riderVisual` (`standalone.html`). The rig is added to a caller-owned group;
 * this module owns no scene, renderer or RAF.
 *
 * The authoritative rider state comes from `shared/downhill/rules.js`
 * (`initialRiderState`); the visual update only reads it and adds cosmetic
 * client-local fields (crash spin) where the pure rules intentionally omit them.
 */

import * as THREE from 'three';
import { clamp, lerp } from './course.js';
import { TRICKS, PEDAL_VMAX } from '../../../../shared/downhill/rules.js';

export const JERSEY_POOL = [0xe0392b, 0xff7f27, 0xf2c515, 0x7ac324, 0x18a85c, 0x1fb3c4, 0x2f66d0, 0x8a4fd8, 0xe259b5, 0xf2f2f2];
export const RIVAL_NAMES = ['BLAZE', 'RHONDA', 'DIESEL', 'KAZU', 'SIERRA', 'NITRO', 'AXEL', 'RAVEN',
  'BOLT', 'VIPER', 'TANK', 'ROCCO', 'JETT', 'LUNA', 'FANG', 'DUSTY', 'CINDER', 'ZANE', 'GRIT', 'TREAD'];

function partBox(parts, color, w, h, d, x, y, z, rx, ry, rz) {
  const p = { geo: new THREE.BoxGeometry(w, h, d), color, x, y, z, rx: rx || 0, ry: ry || 0, rz: rz || 0 };
  parts.push(p);
  return p;
}

function buildMerged(parts) {
  const pos = [], nor = [], col = [];
  const ranges = { jersey: [], frame: [] };
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(),
    pv = new THREE.Vector3(), sv = new THREE.Vector3(), c = new THREE.Color();
  let vOff = 0;
  for (const p of parts) {
    const g = p.geo.toNonIndexed();
    q.setFromEuler(e.set(p.rx || 0, p.ry || 0, p.rz || 0));
    m4.compose(pv.set(p.x || 0, p.y || 0, p.z || 0), q, sv.set(p.sx || 1, p.sy || 1, p.sz || 1));
    g.applyMatrix4(m4);
    const pa = g.attributes.position, na = g.attributes.normal;
    c.setHex(p.color);
    for (let i = 0; i < pa.count; i++) {
      pos.push(pa.getX(i), pa.getY(i), pa.getZ(i));
      nor.push(na.getX(i), na.getY(i), na.getZ(i));
      col.push(c.r, c.g, c.b);
    }
    if (p.tint && ranges[p.tint]) ranges[p.tint].push([vOff, vOff + pa.count]);
    vOff += pa.count;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.userData.tintRanges = ranges;
  return g;
}

let wheelGeoCache = null;
function wheelGeo() {
  if (wheelGeoCache) return wheelGeoCache;
  const parts = [
    { geo: new THREE.TorusGeometry(0.34, 0.05, 6, 12), color: 0x14141a, ry: Math.PI / 2 },
    { geo: new THREE.BoxGeometry(0.03, 0.62, 0.03), color: 0x9aa0a8 },
    { geo: new THREE.BoxGeometry(0.03, 0.62, 0.03), color: 0x9aa0a8, rx: Math.PI / 2 },
  ];
  wheelGeoCache = buildMerged(parts);
  return wheelGeoCache;
}

/** Build one rider rig and add it (plus its blob shadow) to `parent`. */
export function createRiderViz(def, parent) {
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, metalness: 0.02 });
  const J = def.color, F = new THREE.Color(def.color).multiplyScalar(0.5).getHex(),
    SK = def.skin, DK = 0x24242a;
  const root = new THREE.Group(); root.rotation.order = 'YXZ';
  const M = (parts) => new THREE.Mesh(buildMerged(parts), mat);

  const recolorables = [];
  const MR = (parts) => { const m = M(parts); recolorables.push(m); return m; };

  const bike = new THREE.Group(); root.add(bike);
  const bp = [];
  partBox(bp, F, 0.07, 0.62, 0.07, 0, 0.66, 0.22, 0.72, 0, 0).tint = 'frame';
  partBox(bp, F, 0.06, 0.06, 0.52, 0, 0.88, 0.08).tint = 'frame';
  partBox(bp, F, 0.06, 0.42, 0.06, 0, 0.72, -0.22, -0.35, 0, 0).tint = 'frame';
  partBox(bp, F, 0.06, 0.62, 0.06, 0, 0.62, 0.50, -0.25, 0, 0).tint = 'frame';
  partBox(bp, DK, 0.5, 0.05, 0.05, 0, 0.99, 0.42);
  partBox(bp, DK, 0.13, 0.05, 0.26, 0, 0.95, -0.26);
  bike.add(MR(bp));
  const mkWheel = (z) => { const w = new THREE.Group(); w.position.set(0, 0.34, z); w.add(new THREE.Mesh(wheelGeo(), mat)); bike.add(w); return w; };
  const wheelF = mkWheel(0.56), wheelR = mkWheel(-0.52);

  const person = new THREE.Group(); person.position.set(0, 0.92, -0.18); root.add(person);
  const hp = []; partBox(hp, DK, 0.27, 0.17, 0.19, 0, 0.06, 0); person.add(M(hp));
  const torsoG = new THREE.Group(); torsoG.position.set(0, 0.13, 0); person.add(torsoG);
  const tp = [];
  partBox(tp, J, 0.35, 0.44, 0.21, 0, 0.22, 0).tint = 'jersey';
  tp.push({ geo: new THREE.BoxGeometry(0.3, 0.36, 0.14), color: 0x232833, x: 0, y: 0.24, z: -0.17, rx: -0.12 });
  tp.push({ geo: new THREE.SphereGeometry(0.105, 8, 6), color: SK, x: 0, y: 0.52, z: 0.03 });
  tp.push({ geo: new THREE.SphereGeometry(0.128, 8, 6), color: J, x: 0, y: 0.565, z: 0, sy: 0.82, sz: 1.12, tint: 'jersey' });
  partBox(tp, DK, 0.16, 0.03, 0.12, 0, 0.52, 0.15);
  torsoG.add(MR(tp));
  const mkArm = (x) => {
    const g2 = new THREE.Group(); g2.position.set(x, 0.40, 0.03); torsoG.add(g2);
    const ap = []; partBox(ap, J, 0.085, 0.42, 0.085, 0, -0.19, 0).tint = 'jersey'; partBox(ap, SK, 0.07, 0.08, 0.07, 0, -0.42, 0);
    g2.add(MR(ap)); return g2;
  };
  const armL = mkArm(-0.205), armR = mkArm(0.205);
  const mkLeg = (x) => {
    const g2 = new THREE.Group(); g2.position.set(x, -0.02, 0); person.add(g2);
    const lp = []; partBox(lp, DK, 0.105, 0.46, 0.11, 0, -0.21, 0); partBox(lp, J, 0.09, 0.06, 0.2, 0, -0.46, 0.04).tint = 'jersey';
    g2.add(MR(lp)); return g2;
  };
  const legL = mkLeg(-0.10), legR = mkLeg(0.10);

  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.85, 10),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.24, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.renderOrder = 1;
  root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  (parent || root).add(shadow);
  (parent || root).add(root);
  return {
    root, bike, wheelF, wheelR, person, torsoG, armL, armR, legL, legR, shadow, mat, recolorables,
    personHome: person.position.clone(), color: def.color,
  };
}

/** Recolour jersey + frame vertex ranges without rebuilding geometry. */
export function recolorRider(viz, hex) {
  viz.color = hex;
  const c = new THREE.Color(hex), f = c.clone().multiplyScalar(0.5);
  for (const mesh of viz.recolorables) {
    const attr = mesh.geometry.attributes.color, ud = mesh.geometry.userData.tintRanges || {};
    for (const key of ['jersey', 'frame']) {
      const col = key === 'jersey' ? c : f;
      for (const rg of ud[key] || []) for (let i = rg[0]; i < rg[1]; i++) attr.setXYZ(i, col.r, col.g, col.b);
    }
    attr.needsUpdate = true;
  }
}

export function trickPose(type) {
  switch (type) {
    case 'nohander': return { tor: 0.18, aLx: -2.5, aLz: 1.15, aRx: -2.5, aRz: -1.15, lLx: -0.4, lRx: -0.4, pz: 0, py: 0 };
    case 'superman': return { tor: 0.4, aLx: -0.2, aLz: 0.12, aRx: -0.2, aRz: -0.12, lLx: 2.05, lRx: 2.05, pz: -0.95, py: 0.32 };
    case 'backflip': return { tor: 1.25, aLx: -1.35, aLz: 0.12, aRx: -1.35, aRz: -0.12, lLx: -1.6, lRx: -1.6, pz: 0, py: -0.05 };
    case 'heel': return { tor: 1.15, aLx: -1.2, aLz: 0.12, aRx: -1.2, aRz: -0.12, lLx: -2.3, lRx: -2.3, pz: 0.05, py: 0.16 };
    default: return null;
  }
}

/**
 * Per-frame rider visual update. `ctx = { course, time }`. Mutates only the
 * visual rig and cosmetic rider fields (pitch/lean/glow/crash spin).
 */
export function updateRiderVisual(r, dt, ctx) {
  const course = ctx.course;
  const v = r.viz;
  if (!v) return;
  course.worldPosition(r.s, r.lat, r.y, v.root.position);
  const c = course.sampleTrack(r.s);
  let pitchT;
  if (r.grounded) {
    const slope = (course.heightAt(r.s + 1.6, r.lat) - course.heightAt(r.s - 1.6, r.lat)) / 3.2;
    pitchT = -Math.atan(slope);
  } else pitchT = clamp(-r.vy * 0.05, -0.35, 0.45);
  r.pitch = lerp(r.pitch, pitchT, Math.min(1, dt * 8));
  const flip = (r.trick === 'backflip') ? -Math.PI * 2 * clamp(r.trickT / TRICKS.backflip.dur, 0, 1) : 0;
  const leanT = r.crashed ? 0 : clamp(r.steerPos * (0.45 + 0.2 * r.driftT) + (r.vlat / Math.max(r.vs, 5)) * 0.55, -0.75, 0.75);
  r.lean = lerp(r.lean || 0, leanT, Math.min(1, dt * 7));
  const velYaw = r.crashed ? 0 : clamp(r.vlat / Math.max(r.vs, 4), -1, 1) * -0.35 - r.steerPos * 0.5 * r.driftT;
  v.root.rotation.set(r.pitch + flip, c.h + velYaw, r.lean);
  const wspin = r.vs / 0.34 * dt;
  v.wheelF.rotation.x += wspin; v.wheelR.rotation.x += wspin;
  v.person.visible = r.invuln > 0 ? (Math.floor(ctx.time * 10) % 2 === 0) : true;

  if (r.crashed) {
    if (r.crashSpinX == null) { r.crashSpinX = 4 + Math.random() * 6; r.crashSpinY = (Math.random() - 0.5) * 8; }
    const t = Math.min(r.crashT / 1.8, 1);
    const arc = Math.sin(Math.min(t * 1.6, 1) * Math.PI);
    v.person.position.set(v.personHome.x, v.personHome.y + arc * 1.1, v.personHome.z + t * 2.0);
    v.person.rotation.x += r.crashSpinX * dt * (1 - t * 0.7);
    v.person.rotation.y += r.crashSpinY * dt * (1 - t);
    v.bike.rotation.z = lerp(v.bike.rotation.z, 1.35, Math.min(1, dt * 6));
    v.bike.rotation.y = lerp(v.bike.rotation.y, 0.8, Math.min(1, dt * 4));
    v.armL.rotation.set(-2.2, 0, 0.8); v.armR.rotation.set(-1.4, 0, -0.9);
    v.legL.rotation.set(-1.2, 0, 0.4); v.legR.rotation.set(0.6, 0, -0.4);
  } else {
    r.crashSpinX = null; r.crashSpinY = null;
    v.person.position.lerp(v.personHome, Math.min(1, dt * 10));
    v.person.rotation.x *= Math.pow(0.001, dt); v.person.rotation.y *= Math.pow(0.001, dt); v.person.rotation.z = 0;
    v.bike.rotation.z *= Math.pow(0.001, dt); v.bike.rotation.y *= Math.pow(0.001, dt);

    const crouch = r.grounded ? clamp(r.vs * 0.006, 0, 0.12) : 0.0;
    let tor = 0.78 + crouch, aLx = -1.05, aLz = 0.12, aRx = -1.05, aRz = -0.12,
      lLx = -0.42, lRx = -0.42, pz = 0, py = 0;
    if (r.inp.pedal > 0 && r.grounded && r.vs < PEDAL_VMAX) {
      r.pedalPhase = (r.pedalPhase || 0) + (2 + r.vs * 0.5) * dt;
      const o = Math.sin(r.pedalPhase * 4) * 0.4; lLx += o; lRx -= o;
    }
    let legZ = 0;
    const p = r.trick ? trickPose(r.trick) : null;
    if (r.trick && p) {
      const def = TRICKS[r.trick], t = r.trickT;
      const w = clamp(Math.min(t / 0.15, (def.dur - t) / 0.18), 0, 1);
      const pr = clamp(t / def.dur, 0, 1);
      tor = lerp(tor, p.tor, w); aLx = lerp(aLx, p.aLx, w); aLz = lerp(aLz, p.aLz, w);
      aRx = lerp(aRx, p.aRx, w); aRz = lerp(aRz, p.aRz, w);
      lLx = lerp(lLx, p.lLx, w); lRx = lerp(lRx, p.lRx, w); pz = p.pz * w; py = p.py * w;
      if (r.trick === 'heel') {
        const s = pr < 0.55 ? (pr / 0.55) : Math.max(0, 1 - (pr - 0.55) * 9);
        legZ = s * 1.35 * w;
      } else if (r.trick === 'superman') {
        py += Math.sin(pr * Math.PI) * 0.12 * w;
      } else if (r.trick === 'nohander') {
        const wave = Math.sin(t * 12) * 0.12 * w; aLz += wave; aRz -= wave;
      }
    }
    v.torsoG.rotation.x = tor; v.torsoG.rotation.y = 0;
    v.armL.rotation.set(aLx, 0, aLz); v.armR.rotation.set(aRx, 0, aRz);
    v.legL.rotation.set(lLx, 0, legZ); v.legR.rotation.set(lRx, 0, -legZ);

    const sd = r.strikeSide || 1, zs = -sd;
    const arm = sd > 0 ? v.armL : v.armR, leg = sd > 0 ? v.legL : v.legR;
    if (r.windupT >= 0) {
      arm.rotation.set(-0.35, 0, zs * 1.25);
      v.torsoG.rotation.y = zs * 0.35;
    }
    if (r.punchAnimT >= 0) {
      r.punchAnimT += dt;
      const t = r.punchAnimT / 0.38;
      if (t >= 1) r.punchAnimT = -1;
      else {
        const k = Math.sin(Math.min(t, 1) * Math.PI);
        arm.rotation.set(lerp(-0.6, -1.75, k), 0, zs * 1.55 * k);
        v.torsoG.rotation.y = -zs * 0.6 * k;
        v.person.rotation.z = zs * 0.14 * k;
      }
    } else if (r.kickAnimT >= 0) {
      r.kickAnimT += dt;
      const t = r.kickAnimT / 0.4;
      if (t >= 1) r.kickAnimT = -1;
      else {
        const k = Math.sin(Math.min(t, 1) * Math.PI);
        leg.rotation.set(lerp(-0.5, -1.35, k), 0, zs * 1.6 * k);
        v.torsoG.rotation.y = -zs * 0.4 * k;
        v.torsoG.rotation.x = tor + 0.18 * k;
        v.person.rotation.z = zs * 0.1 * k;
      }
    }
    v.person.position.z = v.personHome.z + pz; v.person.position.y = v.personHome.y + py;
    v.glowT = Math.max((v.glowT || 0) - dt * 3, r.boosting ? 1 : 0);
    if (v.glowT > 0.05) v.mat.emissive.setHex(r.color ?? r.def.color).multiplyScalar(0.55);
    else v.mat.emissive.setHex(r.revengeT > 0 ? 0x550000 : 0x000000);
  }

  const gnd = course.heightAt(r.s, r.lat);
  course.worldPosition(r.s, r.lat, gnd + 0.06, v.shadow.position);
  const hgt = clamp(r.y - gnd, 0, 8);
  const sc = lerp(1, 0.45, hgt / 8);
  v.shadow.scale.set(sc, sc, sc);
  v.shadow.material.opacity = 0.24 * (1 - hgt / 9);
}

/** Dispose one rig's geometries/materials (rigs share no GPU resources). */
export function disposeRiderViz(viz) {
  if (!viz) return;
  for (const root of [viz.shadow, viz.root]) {
    if (!root) continue;
    root.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      const m = o.material;
      if (m) (Array.isArray(m) ? m : [m]).forEach((mm) => {
        if (mm.map && mm.map.dispose) mm.map.dispose();
        mm.dispose();
      });
    });
    if (root.parent) root.parent.remove(root);
  }
}
