/**
 * Shared kit for Theater environment builders.
 *
 * One kit per built environment owns:
 *   - a seeded deterministic float stream (`float()`, `range`, `pick`);
 *   - an explicit disposal ledger (`track`) so every geometry, material and
 *     texture this environment created is released on switch — never a
 *     shared, borrowed or module-level resource;
 *   - ONE wind system: materials registered here receive a shared wind
 *     uniform update in the frame loop (GPU vertex animation, no per-object
 *     CPU work);
 *   - a convenience `mesh()` that adds children to the environment group.
 *
 * Builders must create everything through the kit (or track it explicitly)
 * and must never touch the shared scene, the theater group's own resources,
 * or global renderer state.
 */

import * as THREE from 'three';
import { createLcg, lcgFloat } from '../../../shared/atmosphereModel.js';

/** Patch a MeshStandardMaterial (or similar) with instanced wind sway. */
export function applyWind(material, { height = 1, strength = 1, speed = 1.15 } = {}) {
  material.userData.wind = {
    time: { value: 0 },
    dir: { value: new THREE.Vector2(1, 0) },
    strength: { value: strength },
    height: { value: Math.max(0.0001, height) },
    speed: { value: speed },
  };
  material.userData.windBaseStrength = strength;
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, {
      uWindTime: material.userData.wind.time,
      uWindDir: material.userData.wind.dir,
      uWindStrength: material.userData.wind.strength,
      uWindHeight: material.userData.wind.height,
      uWindSpeed: material.userData.wind.speed,
    });
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        uniform float uWindTime;
        uniform vec2 uWindDir;
        uniform float uWindStrength;
        uniform float uWindHeight;
        uniform float uWindSpeed;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        {
          #ifdef USE_INSTANCING
            vec3 windBase = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
          #else
            vec3 windBase = vec3(0.0);
          #endif
          float sway = pow(clamp(transformed.y / uWindHeight, 0.0, 1.0), 1.7);
          float phase = uWindTime * uWindSpeed + windBase.x * 0.37 + windBase.z * 0.29;
          float w = sin(phase) * 0.55 + sin(phase * 2.31 + 1.7) * 0.3;
          transformed.x += uWindDir.x * w * sway * uWindStrength;
          transformed.z += uWindDir.y * w * sway * uWindStrength;
        }`);
  };
  material.customProgramCacheKey = () => 'afterlight-env-wind';
  return material;
}

export function createEnvironmentKit({ tier = 'high', seed = 1, features = {}, group, renderer = null } = {}) {
  if (!group || !group.isObject3D) throw new Error('createEnvironmentKit requires an environment group');
  const draw = createLcg(seed >>> 0);
  const ledger = new Set();
  const windMaterials = [];

  const float = () => lcgFloat(draw);
  const range = (min, max) => min + lcgFloat(draw) * (max - min);
  const pick = (list) => list[Math.floor(lcgFloat(draw) * list.length) % list.length];
  const int = (min, max) => Math.floor(min + lcgFloat(draw) * (max - min + 1));

  function track(resource) {
    if (resource && typeof resource.dispose === 'function') ledger.add(resource);
    return resource;
  }

  function mesh(object3D, { castShadow = false, receiveShadow = false } = {}) {
    object3D.castShadow = castShadow;
    object3D.receiveShadow = receiveShadow;
    group.add(object3D);
    return object3D;
  }

  /** Register a wind-animated material; returns it for chaining. */
  function wind(material, options = {}) {
    applyWind(material, options);
    windMaterials.push(material);
    track(material);
    return material;
  }

  /** Per-frame wind write: one uniform update per registered material. */
  function setWind(time, windX, windZ, strength = 1) {
    const len = Math.hypot(windX, windZ) || 1;
    for (const material of windMaterials) {
      const state = material.userData.wind;
      if (!state) continue;
      state.time.value = time;
      state.dir.value.set(windX / len, windZ / len);
      state.strength.value = (material.userData.windBaseStrength ?? state.strength.value) * strength;
    }
  }

  function disposeAll() {
    for (const resource of ledger) {
      try { resource.dispose(); } catch { /* best-effort disposal */ }
    }
    ledger.clear();
    windMaterials.length = 0;
    group.clear();
  }

  return {
    THREE,
    tier,
    seed,
    features,
    group,
    renderer,
    float, range, pick, int,
    track, mesh, wind, setWind, disposeAll,
    get trackedCount() { return ledger.size; },
  };
}
