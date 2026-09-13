/**
 * Procedural rock, cliff, mesa, sea-stack and floating-island geometry for
 * the Theater environments. Low-poly with computed normals and baked vertex
 * colors; deformations are deterministic through the caller's seeded stream.
 *
 * All geometry is authored with its base at y = 0 (or centered for boulders)
 * so instances can be dropped directly onto terrain heights.
 */

import * as THREE from 'three';

function paint(geometry, color, jitter = 0.12) {
  const c = new THREE.Color(color);
  const position = geometry.attributes.position;
  const colors = new Float32Array(position.count * 3);
  for (let i = 0; i < position.count; i++) {
    const n = (Math.sin(position.getX(i) * 9.1 + position.getZ(i) * 5.7 + position.getY(i) * 3.1) + 1) * 0.5;
    const k = 1 + (n - 0.5) * jitter * 2;
    colors[i * 3] = Math.min(1, c.r * k);
    colors[i * 3 + 1] = Math.min(1, c.g * k);
    colors[i * 3 + 2] = Math.min(1, c.b * k);
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geometry;
}

/**
 * Boulders and cliff chunks: an icosahedron with deterministic radial noise,
 * flattened underneath so pieces sit convincingly on terrain.
 */
export function createRockGeometry({
  float,
  detail = 1,
  jaggedness = 0.34,
  color = '#5b5a57',
  squash = [1, 0.72, 1],
  seedPhase = 0,
} = {}) {
  if (typeof float !== 'function') throw new Error('createRockGeometry requires a float() stream');
  const geometry = new THREE.IcosahedronGeometry(1, detail);
  const position = geometry.attributes.position;
  const bumps = [];
  const vertices = position.count;
  for (let i = 0; i < vertices; i++) bumps.push(1 + (float() - 0.5) * jaggedness * 2);
  // Snap near-coincident vertices to their average so the surface stays
  // closed (IcosahedronGeometry duplicates vertices across faces).
  for (let i = 0; i < vertices; i++) {
    const x = position.getX(i), y = position.getY(i), z = position.getZ(i);
    let sum = 0, n = 0;
    for (let j = 0; j < vertices; j++) {
      if (Math.abs(position.getX(j) - x) < 1e-4 && Math.abs(position.getY(j) - y) < 1e-4 && Math.abs(position.getZ(j) - z) < 1e-4) {
        sum += bumps[j]; n++;
      }
    }
    const k = sum / Math.max(1, n);
    position.setXYZ(i, x * k * squash[0], y * k * squash[1], z * k * squash[2]);
  }
  for (let i = 0; i < vertices; i++) {
    if (position.getY(i) < -0.12) position.setY(i, -0.12 + (position.getY(i) + 0.12) * 0.18);
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  paint(geometry, color, 0.16);
  return geometry;
}

/** A rock field as one InstancedMesh (boulders, outcrops, rubble). */
export function createRockField({ kit, geometry, placements, material = null, name = 'environment-rocks', castShadow = false }) {
  if (!material) {
    material = kit.track(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0.02, flatShading: true }));
  }
  const mesh = new THREE.InstancedMesh(geometry, material, Math.max(1, placements.length));
  mesh.name = name;
  mesh.castShadow = castShadow;
  mesh.receiveShadow = true;
  const dummy = new THREE.Object3D();
  for (let i = 0; i < placements.length; i++) {
    const p = placements[i];
    dummy.position.set(p.x, p.y ?? p.h ?? 0, p.z);
    dummy.rotation.set(p.rx ?? 0, p.rot ?? 0, p.rz ?? 0);
    dummy.scale.set(p.sx ?? p.scale ?? 1, p.sy ?? p.scaleY ?? p.scale ?? 1, p.sz ?? p.scale ?? 1);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.count = placements.length;
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}

/**
 * Layered mesa / butte: stacked tapering drum with banded vertex colors.
 * `tiers` alternates slight widenings to read as stratigraphy.
 */
export function createMesaGeometry({
  float,
  height = 26,
  baseRadius = 15,
  topRadius = 9,
  tiers = 5,
  color = '#a3653c',
  bandColor = '#b97b4b',
  capColor = '#c09064',
} = {}) {
  const parts = [];
  let prevY = 0;
  let prevR = baseRadius;
  for (let i = 0; i < tiers; i++) {
    const t = (i + 1) / tiers;
    const y = height * t;
    const r = THREE.MathUtils.lerp(baseRadius, topRadius, Math.pow(t, 0.85)) * (1 + (i % 2 ? 0.04 : -0.03));
    const segment = new THREE.CylinderGeometry(r, prevR, y - prevY, 10 + (i === 0 ? 4 : 0), 1, false);
    segment.translate(0, (y + prevY) / 2, 0);
    // Nudge vertices sideways for eroded faces.
    const position = segment.attributes.position;
    for (let v = 0; v < position.count; v++) {
      const a = Math.atan2(position.getZ(v), position.getX(v));
      const k = 1 + Math.sin(a * 3 + i * 1.7) * 0.045;
      position.setX(v, position.getX(v) * k);
      position.setZ(v, position.getZ(v) * k);
    }
    parts.push(paint(segment, i === tiers - 1 ? capColor : (i % 2 ? color : bandColor), 0.1));
    // Thin overhang lip between tiers.
    const lip = new THREE.CylinderGeometry(r * 1.05, r * 1.05, height * 0.012, 12);
    lip.translate(0, y, 0);
    parts.push(paint(lip, capColor, 0.08));
    prevY = y;
    prevR = r;
  }
  const merged = mergeGeometriesSafe(parts);
  return merged;
}

/** Sea stack: a tall eroded rock column. */
export function createSeaStackGeometry({ float, height = 30, radius = 4.5, color = '#4d4a45' } = {}) {
  const parts = [];
  const segments = 5;
  for (let i = 0; i < segments; i++) {
    const t0 = i / segments, t1 = (i + 1) / segments;
    const r0 = radius * (1 - t0 * 0.35) * (1 + Math.sin(i * 2.3) * 0.12);
    const r1 = radius * (1 - t1 * 0.35) * (1 + Math.sin((i + 1) * 2.3) * 0.12);
    const seg = new THREE.CylinderGeometry(r1, r0, height / segments, 8);
    seg.translate(0, height * (t0 + t1) / 2, 0);
    const position = seg.attributes.position;
    for (let v = 0; v < position.count; v++) {
      position.setX(v, position.getX(v) + Math.sin(position.getY(v) * 0.7 + i) * 0.25);
      position.setZ(v, position.getZ(v) + Math.cos(position.getY(v) * 0.6 + i) * 0.25);
    }
    parts.push(paint(seg, color, 0.14));
  }
  const top = new THREE.ConeGeometry(radius * 0.55, height * 0.18, 7);
  top.translate(0, height + height * 0.07, 0);
  parts.push(paint(top, '#3f3d39', 0.16));
  const merged = mergeGeometriesSafe(parts);
  // Weathered strata: horizontal bedding planes and damp crevices darkened
  // into the vertex colors, with the base darker where the surf wets it.
  // The strata carry the rock read at silhouette distance where the surface
  // shading is just a gradient.
  const position = merged.attributes.position;
  const colors = merged.attributes.color;
  const scratch = new THREE.Color();
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i), y = position.getY(i), z = position.getZ(i);
    const angle = Math.atan2(z, x);
    const bedding = 0.5 + 0.5 * Math.sin(y * 4.2 + Math.sin(y * 1.1) * 2.1);
    const crevice = Math.pow(0.5 + 0.5 * Math.sin(angle * 7.0 + y * 0.8), 3);
    const wet = 1 - clamp01(y / 1.8);
    const k = (1 - bedding * 0.26) * (1 - crevice * 0.22) * (1 - wet * 0.32);
    scratch.setRGB(colors.getX(i), colors.getY(i), colors.getZ(i));
    scratch.multiplyScalar(k);
    colors.setXYZ(i, scratch.r, scratch.g, scratch.b);
  }
  colors.needsUpdate = true;
  return merged;
}

function clamp01(v) {
  return Math.min(1, Math.max(0, v));
}

/**
 * Floating island: a grass-capped disc over a jagged rock underside.
 * Returns { top, rock } geometries so callers can use two materials.
 */
export function createFloatingIslandGeometry({ float, radius = 12, depth = 9, grassColor = '#5f8a49', rockColor = '#4c453e' } = {}) {
  const topGeometry = new THREE.CylinderGeometry(radius, radius * 0.92, radius * 0.22, 14, 2);
  const topPosition = topGeometry.attributes.position;
  for (let i = 0; i < topPosition.count; i++) {
    const y = topPosition.getY(i);
    if (y > radius * 0.09) {
      const x = topPosition.getX(i), z = topPosition.getZ(i);
      topPosition.setY(i, y + Math.sin(Math.atan2(z, x) * 4.0) * radius * 0.035);
    }
  }
  topPosition.needsUpdate = true;
  topGeometry.computeVertexNormals();
  paint(topGeometry, grassColor, 0.16);

  const underside = new THREE.ConeGeometry(radius * 0.94, depth, 10, 3);
  underside.rotateX(Math.PI);
  underside.translate(0, -depth / 2 - radius * 0.1, 0);
  const up = underside.attributes.position;
  for (let i = 0; i < up.count; i++) {
    const k = 1 + Math.sin(up.getX(i) * 0.6 + up.getZ(i) * 0.8) * 0.13;
    up.setXYZ(i, up.getX(i) * k, up.getY(i), up.getZ(i) * k);
  }
  up.needsUpdate = true;
  underside.computeVertexNormals();
  paint(underside, rockColor, 0.18);

  return { top: topGeometry, rock: underside };
}

function mergeGeometriesSafe(parts) {
  // Local merge to avoid importing BufferGeometryUtils here; concatenates
  // position/normal/color attributes. Every part is normalized to INDEXED
  // or NON-INDEXED consistently: dropping the index of a CylinderGeometry
  // would reinterpret its vertex pool as triangle lists and shatter the
  // mesh (this is what made sea stacks and mesas render as hollow shells).
  let vertexCount = 0;
  for (let i = 0; i < parts.length; i++) {
    if (parts[i].index) parts[i] = parts[i].toNonIndexed();
    vertexCount += parts[i].attributes.position.count;
  }
  const positions = new Float32Array(vertexCount * 3);
  const normals = new Float32Array(vertexCount * 3);
  const colors = new Float32Array(vertexCount * 3);
  let offset = 0;
  for (const part of parts) {
    const p = part.attributes.position;
    const n = part.attributes.normal;
    const c = part.attributes.color;
    for (let i = 0; i < p.count; i++) {
      positions[(offset + i) * 3] = p.getX(i);
      positions[(offset + i) * 3 + 1] = p.getY(i);
      positions[(offset + i) * 3 + 2] = p.getZ(i);
      normals[(offset + i) * 3] = n ? n.getX(i) : 0;
      normals[(offset + i) * 3 + 1] = n ? n.getY(i) : 1;
      normals[(offset + i) * 3 + 2] = n ? n.getZ(i) : 0;
      colors[(offset + i) * 3] = c ? c.getX(i) : 1;
      colors[(offset + i) * 3 + 1] = c ? c.getY(i) : 1;
      colors[(offset + i) * 3 + 2] = c ? c.getZ(i) : 1;
    }
    offset += p.count;
    part.dispose();
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeBoundingSphere();
  return geometry;
}
