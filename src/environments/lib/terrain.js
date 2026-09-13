/**
 * Terrain mesh generator shared by the Theater environments.
 *
 * One displaced PlaneGeometry with per-vertex colors and computed normals.
 * The height and color functions are supplied by the environment builder so
 * every world keeps its own geology; this module owns only the mesh craft:
 * deterministic displacement, seams-free UV-free vertex colors, correct
 * normals and clean disposal.
 *
 * The terrain is static scenery outside the walkable Theater bounds; it never
 * participates in collision. Actors stay on the flat y=0 theater floor.
 */

import * as THREE from 'three';

export const DEFAULT_TERRAIN_SIZE = 320;

/**
 * @param {object} options
 * @param {number} [options.size]        full edge length in world units
 * @param {number} [options.segments]    grid divisions per edge
 * @param {(x:number, z:number) => number} options.height
 * @param {(ctx:{x:number,z:number,h:number,slope:number}) => THREE.Color|string|number} options.colorAt
 * @param {number} [options.y]           base elevation of the plane
 * @param {boolean} [options.flatShading]
 * @param {number} [options.roughness]
 * @param {number} [options.metalness]
 */
export function createTerrain({
  size = DEFAULT_TERRAIN_SIZE,
  segments = 128,
  height,
  colorAt,
  y = 0,
  flatShading = false,
  roughness = 0.94,
  metalness = 0.02,
  receiveShadow = true,
} = {}) {
  if (typeof height !== 'function') throw new Error('createTerrain requires a height(x, z) function');
  if (typeof colorAt !== 'function') throw new Error('createTerrain requires a colorAt(ctx) function');

  const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
  geometry.rotateX(-Math.PI / 2);
  const position = geometry.attributes.position;
  const colors = new Float32Array(position.count * 3);
  const color = new THREE.Color();
  const step = size / segments;
  const sample = { x: 0, z: 0, h: 0, slope: 0 };

  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const z = position.getZ(i);
    const h = height(x, z);
    position.setY(i, h + y);
    // Central-difference slope feeds color/placement decisions.
    const hx = height(x + step, z) - height(x - step, z);
    const hz = height(x, z + step) - height(x, z - step);
    sample.x = x; sample.z = z; sample.h = h;
    sample.slope = Math.hypot(hx, hz) / (2 * step + 1e-6);
    const c = colorAt(sample);
    if (c && c.isColor) color.copy(c);
    else color.set(c);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();

  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness,
    metalness,
    flatShading,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'environment-terrain';
  mesh.receiveShadow = receiveShadow;
  mesh.castShadow = false;
  mesh.matrixAutoUpdate = false;
  mesh.updateMatrix();

  return {
    mesh,
    geometry,
    material,
    heightAt: height,
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}

/** Smooth deterministic value noise (hash-based, no textures). */
export function hash2(x, z, seed = 0) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(z | 0, 668265263) + Math.imul(seed | 0, 2246822519)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function smooth(t) {
  return t * t * (3 - 2 * t);
}

/** Tileable value noise in [0,1] at integer lattice scale `scale`. */
export function valueNoise(x, z, seed = 0) {
  const xi = Math.floor(x), zi = Math.floor(z);
  const xf = smooth(x - xi), zf = smooth(z - zi);
  const a = hash2(xi, zi, seed);
  const b = hash2(xi + 1, zi, seed);
  const c = hash2(xi, zi + 1, seed);
  const d = hash2(xi + 1, zi + 1, seed);
  return (a + (b - a) * xf) + ((c + (d - c) * xf) - (a + (b - a) * xf)) * zf;
}

/** Fractal Brownian motion over valueNoise. */
export function fbm(x, z, { octaves = 5, frequency = 0.02, lacunarity = 2.05, gain = 0.5, seed = 0 } = {}) {
  let sum = 0;
  let amp = 1;
  let norm = 0;
  let f = frequency;
  for (let o = 0; o < octaves; o++) {
    sum += valueNoise(x * f, z * f, seed + o * 131) * amp;
    norm += amp;
    amp *= gain;
    f *= lacunarity;
  }
  return norm > 0 ? sum / norm : 0;
}

/** Ridged fbm, useful for mountain crests. */
export function ridged(x, z, options = {}) {
  const n = fbm(x, z, options);
  return 1 - Math.abs(n * 2 - 1);
}

export function smoothstep(edge0, edge1, x) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0 + 1e-9)));
  return t * t * (3 - 2 * t);
}

export function clamp(x, min, max) {
  return x < min ? min : x > max ? max : x;
}
