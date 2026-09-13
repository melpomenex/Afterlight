/**
 * Procedural vegetation for the Theater environments: low-poly tree, palm,
 * fern, grass and bush geometries built once per environment build and
 * instanced in bulk. Every geometry carries vertex colors so one material
 * per family covers trunk + foliage, and foliage materials can be wind-
 * animated through the kit (GPU vertex sway).
 *
 * Geometries are authored in normalized-ish local space with the base at
 * y = 0 so instances sit exactly on the terrain height.
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

function paint(geometry, color, jitter = 0.06) {
  const c = new THREE.Color(color);
  const count = geometry.attributes.position.count;
  const colors = new Float32Array(count * 3);
  const position = geometry.attributes.position;
  for (let i = 0; i < count; i++) {
    // Slight per-vertex value shift keeps merged chunks from reading flat.
    const n = ((Math.sin(position.getX(i) * 12.9 + position.getZ(i) * 7.7 + position.getY(i) * 3.3) + 1) * 0.5);
    const k = 1 + (n - 0.5) * jitter * 2;
    colors[i * 3] = Math.min(1, c.r * k);
    colors[i * 3 + 1] = Math.min(1, c.g * k);
    colors[i * 3 + 2] = Math.min(1, c.b * k);
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geometry;
}

function transformGeometry(geometry, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1 } = {}) {
  const m = new THREE.Matrix4();
  m.compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
    new THREE.Vector3(sx, sy, sz),
  );
  geometry.applyMatrix4(m);
  return geometry;
}

function mergeParts(parts) {
  // Mixed indexed (cylinders/cones) and non-indexed (icosahedra) parts must
  // be normalized before merging; BufferGeometryUtils refuses mixed sets.
  const prepared = parts.map((part) => (part.index ? part.toNonIndexed() : part));
  const merged = mergeGeometries(prepared, false);
  for (const part of parts) part.dispose();
  for (const part of prepared) {
    if (!parts.includes(part)) part.dispose();
  }
  if (!merged.attributes.color) paint(merged, '#ffffff', 0);
  merged.computeVertexNormals();
  return merged;
}

/** Layered conifer: tapered trunk plus 3–5 conical tiers. Height in units. */
export function createConiferGeometry({ height = 10, radius = 2.2, tiers = 4, color = '#2f4a34', trunkColor = '#3b2b22', snow = 0 } = {}) {
  const parts = [];
  const trunkH = height * 0.34;
  parts.push(paint(transformGeometry(
    new THREE.CylinderGeometry(radius * 0.055, radius * 0.11, trunkH, 6),
    { y: trunkH / 2 },
  ), trunkColor, 0.12));
  for (let i = 0; i < tiers; i++) {
    const t = i / Math.max(1, tiers - 1);
    const y = trunkH * 0.72 + t * height * 0.62;
    const r = radius * (1 - t * 0.62);
    const h = height * (0.36 - t * 0.055);
    const cone = paint(transformGeometry(
      new THREE.ConeGeometry(r, h, 7),
      { y: y + h * 0.32 },
    ), color, 0.16);
    parts.push(cone);
    if (snow > 0 && i > 0) {
      parts.push(paint(transformGeometry(
        new THREE.ConeGeometry(r * 0.72, h * 0.32, 7),
        { y: y + h * 0.42 },
      ), '#eef4f8', 0.05));
    }
  }
  return mergeParts(parts);
}

/** Broadleaf tree: tapering trunk + several distorted canopy blobs. */
export function createBroadleafGeometry({ height = 7, radius = 2.6, blobs = 4, color = '#3f6238', trunkColor = '#4a3527', rng = Math.random } = {}) {
  const parts = [];
  const trunkH = height * 0.52;
  parts.push(paint(transformGeometry(
    new THREE.CylinderGeometry(radius * 0.09, radius * 0.16, trunkH, 6),
    { y: trunkH / 2 },
  ), trunkColor, 0.12));
  for (let i = 0; i < blobs; i++) {
    const blob = new THREE.IcosahedronGeometry(radius * (0.55 + rng() * 0.35), 1);
    const position = blob.attributes.position;
    for (let v = 0; v < position.count; v++) {
      const s = 1 + (rng() - 0.5) * 0.34;
      position.setXYZ(v, position.getX(v) * s, position.getY(v) * s * 0.86, position.getZ(v) * s);
    }
    parts.push(paint(transformGeometry(blob, {
      x: (rng() - 0.5) * radius * 1.1,
      y: trunkH + radius * (0.2 + rng() * 0.5),
      z: (rng() - 0.5) * radius * 1.1,
    }), color, 0.18));
  }
  return mergeParts(parts);
}

/** Wind-shaped coastal tree: leaning trunk, flattened canopy pushed one way. */
export function createWindTreeGeometry({ height = 6, lean = 0.42, color = '#48604a', trunkColor = '#4d3b2a', rng = Math.random } = {}) {
  const parts = [];
  const trunkH = height * 0.6;
  const trunk = paint(transformGeometry(
    new THREE.CylinderGeometry(0.1, 0.24, trunkH, 6),
    { y: trunkH / 2, rz: lean * 0.5 },
  ), trunkColor, 0.14);
  parts.push(trunk);
  const dir = Math.sign(lean) || 1;
  for (let i = 0; i < 4; i++) {
    const blob = new THREE.IcosahedronGeometry(height * (0.16 + rng() * 0.09), 1);
    const p = blob.attributes.position;
    for (let v = 0; v < p.count; v++) {
      p.setXYZ(v, p.getX(v) * 1.35, p.getY(v) * 0.55, p.getZ(v) * 1.35);
    }
    parts.push(paint(transformGeometry(blob, {
      x: dir * (height * 0.16 + i * height * 0.11) + (rng() - 0.5) * 0.6,
      y: trunkH + height * (0.12 + rng() * 0.16),
      z: (rng() - 0.5) * height * 0.28,
    }), color, 0.2));
  }
  return mergeParts(parts);
}

/** Single palm: curved trunk and drooping frond fans. */
export function createPalmGeometry({ height = 8, color = '#4c6b3a', trunkColor = '#6a5436', rng = Math.random } = {}) {
  const parts = [];
  const segments = 7;
  let prev = new THREE.Vector3(0, 0, 0);
  const curve = height * 0.12;
  for (let i = 0; i < segments; i++) {
    const t0 = i / segments;
    const t1 = (i + 1) / segments;
    const p0 = new THREE.Vector3(Math.sin(t0 * 1.1) * curve, t0 * height, Math.sin(t0 * 0.7) * curve * 0.4);
    const p1 = new THREE.Vector3(Math.sin(t1 * 1.1) * curve, t1 * height, Math.sin(t1 * 0.7) * curve * 0.4);
    const mid = p0.clone().lerp(p1, 0.5);
    const dir = p1.clone().sub(p0);
    const len = dir.length();
    const seg = new THREE.CylinderGeometry(0.1 * (1 - t1 * 0.4), 0.13 * (1 - t0 * 0.35), len, 6);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    const m = new THREE.Matrix4().compose(mid, q, new THREE.Vector3(1, 1, 1));
    seg.applyMatrix4(m);
    parts.push(paint(seg, trunkColor, 0.12));
  }
  const top = new THREE.Vector3(Math.sin(1.1) * curve, height, Math.sin(0.7) * curve * 0.4);
  const fronds = 7;
  for (let i = 0; i < fronds; i++) {
    const a = (i / fronds) * Math.PI * 2;
    const droop = 0.35 + rng() * 0.35;
    const frond = new THREE.PlaneGeometry(height * 0.62, height * 0.14, 1, 2);
    frond.translate(height * 0.31, 0, 0);
    const p = frond.attributes.position;
    for (let v = 0; v < p.count; v++) {
      const t = p.getX(v) / (height * 0.62);
      p.setY(v, p.getY(v) * (1 - t * 0.85) - t * t * height * 0.22);
    }
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -a, -droop));
    const m = new THREE.Matrix4().compose(top, q, new THREE.Vector3(1, 1, 1));
    frond.applyMatrix4(m);
    parts.push(paint(frond, color, 0.22));
  }
  return mergeParts(parts);
}

/** Fern: radial tapered fronds. */
export function createFernGeometry({ radius = 1.2, fronds = 9, color = '#3d6b3c', rng = Math.random } = {}) {
  const parts = [];
  for (let i = 0; i < fronds; i++) {
    const a = (i / fronds) * Math.PI * 2 + rng() * 0.2;
    const lift = 0.45 + rng() * 0.3;
    const frond = new THREE.PlaneGeometry(radius, radius * 0.22, 1, 1);
    frond.translate(radius / 2, 0, 0);
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -a, -lift * 0.9));
    const m = new THREE.Matrix4().compose(new THREE.Vector3(0, radius * 0.1, 0), q, new THREE.Vector3(1, 1, 1));
    frond.applyMatrix4(m);
    parts.push(paint(frond, color, 0.24));
  }
  return mergeParts(parts);
}

/** Grass tuft: crossed blade fans; cheap, wind-animated, densely instanced. */
export function createGrassTuftGeometry({ blades = 7, height = 0.75, width = 0.055, rng = Math.random, tipColor = '#8a9a4e', baseColor = '#4f6b33' } = {}) {
  const positions = [];
  const colors = [];
  const indices = [];
  const cBase = new THREE.Color(baseColor);
  const cTip = new THREE.Color(tipColor);
  let vi = 0;
  for (let i = 0; i < blades; i++) {
    const a = (i / blades) * Math.PI * 2 + rng() * 0.7;
    const h = height * (0.6 + rng() * 0.7);
    const lean = (rng() - 0.5) * 0.5;
    const dx = Math.cos(a), dz = Math.sin(a);
    const bx = dx * width, bz = dz * width;
    const tx = dx * (width * 0.3 + lean * 0.4);
    const tz = dz * (width * 0.3 + lean * 0.4);
    positions.push(-bz, 0, bx, bz, 0, -bx, tx, h, tz);
    colors.push(cBase.r, cBase.g, cBase.b, cBase.r, cBase.g, cBase.b, cTip.r, cTip.g, cTip.b);
    indices.push(vi, vi + 1, vi + 2);
    vi += 3;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** Flower cluster on a thin stem (cloud garden, meadow accents). */
export function createFlowerGeometry({ color = '#e8a0c0', stemColor = '#5d7a3e', height = 0.5, rng = Math.random } = {}) {
  const parts = [];
  parts.push(paint(transformGeometry(new THREE.CylinderGeometry(0.012, 0.02, height, 4), { y: height / 2 }), stemColor, 0.1));
  const head = new THREE.IcosahedronGeometry(0.075, 0);
  parts.push(paint(transformGeometry(head, { y: height }), color, 0.25));
  return mergeParts(parts);
}

/** Huge ancient trunk with root flare and buttresses (redwood scale). */
export function createAncientTrunkGeometry({ height = 34, radius = 3.4, color = '#5a4434', ridgeColor = '#3f3025', rng = Math.random, buttresses = 7 } = {}) {
  const parts = [];
  // Flared trunk via lathe profile: roots spread wide at the base.
  const profile = [];
  const steps = 10;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const r = radius * (1 + Math.pow(1 - t, 2.4) * 2.1);
    profile.push(new THREE.Vector2(r, t * height));
  }
  const latheGeo = new THREE.LatheGeometry(profile, 12);
  parts.push(paint(latheGeo, color, 0.1));
  for (let i = 0; i < buttresses; i++) {
    const a = (i / buttresses) * Math.PI * 2 + rng() * 0.4;
    const b = new THREE.ConeGeometry(radius * 0.34, radius * 2.2, 5);
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -a, Math.PI * 0.42));
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(Math.cos(a) * radius * 0.9, radius * 0.4, Math.sin(a) * radius * 0.9),
      q, new THREE.Vector3(1, 1, 1),
    );
    b.applyMatrix4(m);
    parts.push(paint(b, ridgeColor, 0.14));
  }
  // A few bark ridges for silhouette interest at eye level.
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.3;
    const ridge = new THREE.CylinderGeometry(radius * 0.12, radius * 0.2, height * 0.5, 4);
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -a, 0));
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(Math.cos(a) * radius * 0.98, height * 0.3, Math.sin(a) * radius * 0.98),
      q, new THREE.Vector3(1, 1, 1),
    );
    ridge.applyMatrix4(m);
    parts.push(paint(ridge, ridgeColor, 0.16));
  }
  return mergeParts(parts);
}

/** Build one InstancedMesh from a geometry + placements. */
export function instanceVegetation({ geometry, material, placements, build, name = 'vegetation', castShadow = false }) {
  const mesh = new THREE.InstancedMesh(geometry, material, Math.max(1, placements.length));
  mesh.name = name;
  mesh.castShadow = castShadow;
  mesh.receiveShadow = true;
  const dummy = new THREE.Object3D();
  for (let i = 0; i < placements.length; i++) {
    dummy.position.set(placements[i].x, placements[i].y ?? placements[i].h ?? 0, placements[i].z);
    dummy.rotation.set(0, placements[i].rot ?? 0, 0);
    const s = placements[i].scale ?? 1;
    dummy.scale.set(placements[i].sx ?? s, placements[i].sy ?? s, placements[i].sz ?? s);
    if (build) build(dummy, placements[i], i);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    if (placements[i].color) mesh.setColorAt(i, placements[i].color);
  }
  mesh.count = placements.length;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.frustumCulled = true;
  return mesh;
}

/**
 * Resumable batch slicer for instanced vegetation generation.
 * Permits breaking heavy instance loops across frame budgets while guaranteeing
 * 100% bit-for-bit equivalence with instanceVegetation.
 */
export function createInstanceSlicer({
  geometry,
  material,
  placements,
  build,
  name = 'vegetation',
  castShadow = false,
  batchSize = 256,
}) {
  const mesh = new THREE.InstancedMesh(geometry, material, Math.max(1, placements.length));
  mesh.name = name;
  mesh.castShadow = castShadow;
  mesh.receiveShadow = true;
  const dummy = new THREE.Object3D();
  let currentIndex = 0;
  let done = placements.length === 0;

  function stepSlice(maxItems = batchSize) {
    if (done) return true;
    const end = Math.min(currentIndex + maxItems, placements.length);
    for (let i = currentIndex; i < end; i++) {
      dummy.position.set(placements[i].x, placements[i].y ?? placements[i].h ?? 0, placements[i].z);
      dummy.rotation.set(0, placements[i].rot ?? 0, 0);
      const s = placements[i].scale ?? 1;
      dummy.scale.set(placements[i].sx ?? s, placements[i].sy ?? s, placements[i].sz ?? s);
      if (build) build(dummy, placements[i], i);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      if (placements[i].color) mesh.setColorAt(i, placements[i].color);
    }
    currentIndex = end;
    if (currentIndex >= placements.length) {
      done = true;
      mesh.count = placements.length;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.frustumCulled = true;
    }
    return done;
  }

  function getResult() {
    if (!done) {
      while (!stepSlice(placements.length));
    }
    return mesh;
  }

  return {
    stepSlice,
    getResult,
    get progress() {
      return placements.length > 0 ? currentIndex / placements.length : 1;
    },
    get isDone() {
      return done;
    },
  };
}
