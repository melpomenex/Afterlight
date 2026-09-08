/**
 * Wet material families and puddles (add-atmosphere-weather-system task
 * 3.3, design D6). Binds the material families a place world declared in
 * `world.environment.materialFamilies` — each family's material object IS
 * the post-batch InstancedMesh material, so wetness reaches batched
 * geometry without cloning per-instance materials or touching
 * instanceColor.
 *
 * Response rules (all ABSOLUTE — always computed from the immutable dry
 * snapshot, never from the mutated material, so wet/dry cycles cannot
 * drift):
 *   color     = dry.color * lerp(1, 0.72, wetness)
 *   roughness = lerp(dry.roughness, max(0.18, dry.roughness * 0.45), wetness)
 *   metalness = unchanged
 * Sheltered families are bound but never modified — slabs under a roof
 * stay recognizably dry. Two worlds never share a mutable material: every
 * binding reads its own world's declarations only.
 *
 * Puddles and amber glints pool from the world's authored
 * `environment.emitterAnchors` entries of kind 'puddle'
 * (`{ id, kind: 'puddle', x, z, w, d, y? }`), capped at 8 normal / 4
 * reduced, one InstancedMesh per effect. An optional bounded procedural
 * wet map (a seeded 128×128 DataTexture used as roughnessMap) adds patchy
 * variation; when it is disabled the material response + glints carry the
 * look alone. No SSR, no mirrors, no env-map claims.
 */

import * as THREE from 'three';
import { createLcg, lcgFloat } from '../../shared/atmosphereModel.js';

export const WET_COLOR_FACTOR = 0.72;
export const WET_ROUGHNESS_FACTOR = 0.45;
export const WET_ROUGHNESS_MIN = 0.18;

export const PUDDLE_CAPS = Object.freeze({ normal: 8, reduced: 4 });

const WET_MAP_SIZE = 128;

const clamp01 = value => (value < 0 ? 0 : value > 1 ? 1 : value);
const lerp = (a, b, u) => a + (b - a) * u;

/** Deterministic grayscale noise texture (shared LCG; zero seed valid).
 * RGBA bytes with the value in every channel — three's roughnessMap reads
 * the green channel, so a red-only format would read as zero. */
export function createProceduralWetMap(size = WET_MAP_SIZE, seed = 0) {
  const data = new Uint8Array(size * size * 4);
  const draw = createLcg(seed >>> 0);
  // Coarse white noise, then one box blur so patches read as moisture
  // variation rather than static.
  const coarse = new Float32Array(size * size);
  for (let i = 0; i < coarse.length; i++) coarse[i] = lcgFloat(draw);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let sum = 0;
      for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const px = (x + dx + size) % size;
        const py = (y + dy + size) % size;
        sum += coarse[py * size + px];
      }
      const value = Math.round((sum / 5) * 255);
      const o = (y * size + x) * 4;
      data[o] = value;
      data[o + 1] = value;
      data[o + 2] = value;
      data[o + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Bind a world's material families + puddle anchors. `apply(wetness)` is
 * safe to call every frame; `restore()` returns every touched material to
 * its exact dry snapshot. Nothing here allocates after construction.
 */
export function createSurfaceWetness({
  world = null,
  tier = 'normal',
  seed = 0,
  wetMap = true,
} = {}) {
  const environment = world?.environment ?? {};
  const declarations = Array.isArray(environment.materialFamilies) ? environment.materialFamilies : [];
  // Wettable: declared, material-backed, with a dry snapshot, NOT sheltered.
  const wettable = [];
  const sheltered = [];
  for (const declaration of declarations) {
    if (!declaration || !declaration.material || !declaration.dry) continue;
    (declaration.sheltered ? sheltered : wettable).push(declaration);
  }

  const group = new THREE.Group();
  group.name = 'atmosphere-surfaces';
  let disposed = false;
  let currentTier = PUDDLE_CAPS[tier] ? tier : 'normal';

  // Optional bounded procedural wet map: assigned once per binding, owned
  // (and disposed) here; materials list us as their roughnessMap only while
  // the controller is active.
  let map = null;
  if (wetMap && wettable.length > 0) {
    map = createProceduralWetMap(WET_MAP_SIZE, seed);
    for (const { material } of wettable) {
      material.roughnessMap = map;
      material.needsUpdate = true; // once per activation, never per frame
    }
  }

  // Puddle pool: authored anchors of kind 'puddle', capped 8/4, ONE
  // instanced draw. Matrices are written once here, never per frame.
  const cap = PUDDLE_CAPS[currentTier];
  const puddleAnchors = (Array.isArray(environment.emitterAnchors) ? environment.emitterAnchors : [])
    .filter(a => a && typeof a === 'object' && a.kind === 'puddle' && Number.isFinite(a.x) && Number.isFinite(a.z));
  const puddleGeometry = new THREE.PlaneGeometry(1, 1);
  puddleGeometry.rotateX(-Math.PI / 2);
  const puddleMaterial = new THREE.MeshStandardMaterial({
    color: '#2e4a52', transparent: true, opacity: 0, roughness: 0.08, metalness: 0.55, depthWrite: false,
  });
  const puddles = new THREE.InstancedMesh(puddleGeometry, puddleMaterial, PUDDLE_CAPS.normal);
  puddles.name = 'atmosphere-puddles';
  puddles.frustumCulled = false;
  puddles.renderOrder = 4;
  const matrix = new THREE.Matrix4();
  const groundY = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const puddleScale = new THREE.Vector3();
  puddleAnchors.slice(0, PUDDLE_CAPS.normal).forEach((anchor, i) => {
    groundY.set(anchor.x, Number.isFinite(anchor.y) ? anchor.y : 0.17, anchor.z);
    puddleScale.set(Number.isFinite(anchor.w) ? anchor.w : 1, 1, Number.isFinite(anchor.d) ? anchor.d : 1);
    matrix.compose(groundY, quaternion, puddleScale);
    puddles.setMatrixAt(i, matrix);
  });
  if (puddles.instanceMatrix) puddles.instanceMatrix.needsUpdate = true;
  puddles.count = Math.min(puddleAnchors.length, cap);
  puddles.visible = false;
  group.add(puddles);

  // Amber glints: one more instanced draw hovering just above each puddle —
  // the honest "reflected light" impression (no SSR claim anywhere).
  const glintGeometry = new THREE.PlaneGeometry(1, 1);
  glintGeometry.rotateX(-Math.PI / 2);
  const glintMaterial = new THREE.MeshBasicMaterial({
    color: '#e8c889', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const glints = new THREE.InstancedMesh(glintGeometry, glintMaterial, PUDDLE_CAPS.normal);
  glints.name = 'atmosphere-glints';
  glints.frustumCulled = false;
  glints.renderOrder = 5;
  puddleAnchors.slice(0, PUDDLE_CAPS.normal).forEach((anchor, i) => {
    groundY.set(anchor.x, (Number.isFinite(anchor.y) ? anchor.y : 0.17) + 0.02, anchor.z);
    puddleScale.set(
      (Number.isFinite(anchor.w) ? anchor.w : 1) * 0.55, 1,
      (Number.isFinite(anchor.d) ? anchor.d : 1) * 0.55);
    matrix.compose(groundY, quaternion, puddleScale);
    glints.setMatrixAt(i, matrix);
  });
  glints.instanceMatrix.needsUpdate = true;
  glints.count = puddles.count;
  glints.visible = false;
  group.add(glints);

  let lastWetness = 0;

  function apply(wetness) {
    if (disposed) return;
    const w = clamp01(wetness);
    lastWetness = w;
    for (const { material, dry } of wettable) {
      // Absolute response from the immutable dry snapshot — applying the
      // same wetness twice, or ten wet/dry cycles, lands on identical bytes.
      material.color.setHex(dry.color).multiplyScalar(lerp(1, WET_COLOR_FACTOR, w));
      material.roughness = lerp(dry.roughness, Math.max(WET_ROUGHNESS_MIN, dry.roughness * WET_ROUGHNESS_FACTOR), w);
    }
    const puddleOpacity = 0.42 * w;
    puddleMaterial.opacity = puddleOpacity;
    puddles.visible = puddleOpacity > 0.01 && puddles.count > 0;
    glintMaterial.opacity = 0.26 * w;
    glints.visible = w > 0.02 && glints.count > 0;
  }

  function restore() {
    apply(0);
    for (const { material, dry } of wettable) {
      material.color.setHex(dry.color);
      material.roughness = dry.roughness;
    }
  }

  function setTier(tierNext) {
    if (disposed || !PUDDLE_CAPS[tierNext] || tierNext === currentTier) return false;
    currentTier = tierNext;
    // The pool was allocated at the normal cap; a tier change only redraws
    // fewer instances — never a reallocation.
    puddles.count = Math.min(puddleAnchors.length, PUDDLE_CAPS[currentTier]);
    glints.count = puddles.count;
    apply(lastWetness);
    return true;
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    // Dry the families FIRST (restore exact dry bytes), then remove the
    // owned wet map and dispose only what this module created.
    restore();
    for (const { material } of wettable) {
      if (material.roughnessMap === map) {
        material.roughnessMap = null;
        material.needsUpdate = true;
      }
    }
    if (map) map.dispose();
    group.removeFromParent();
    puddleGeometry.dispose();
    puddleMaterial.dispose();
    glintGeometry.dispose();
    glintMaterial.dispose();
  }

  return {
    object3D: group,
    apply,
    restore,
    setTier,
    dispose,
    get wettableKeys() { return wettable.map(f => f.key); },
    get shelteredKeys() { return sheltered.map(f => f.key); },
    get puddleCount() { return puddles.count; },
  };
}
