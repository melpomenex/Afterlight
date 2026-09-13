/**
 * Ambient Place Presentation Host Manager (introduce-global-world-system D5, Task 5.3).
 *
 * Implements bounded ambient World presentation (lighting temperature and audio profile)
 * for all non-theater places through the WorldPresentationHost lifecycle.
 *
 * Enforces hard constraints:
 *   - Zero dynamic lights, zero shadow maps, zero postprocessing passes added;
 *   - Permitted slots strictly restricted to ['lighting', 'audio'];
 *   - Preserves authored practical lights (lamps, glows) and semantic weather (rain, fog);
 *   - Preserves landmarks, restoration rings, field notes, and sightlines;
 *   - Fences against stale generations;
 *   - Restores baseline lighting exactly on teardown or travel.
 */

import * as THREE from 'three';
import { createWorldPresentationHost } from './host.js';
import { resolveWorldPresentation } from './resolver.js';
import { gateVisualBoxesFor } from '../places/worldFactory.js';

/**
 * Extracts protected exclusion volumes for a place world.
 *
 * @param {object} world Place world object ({ obstacles, items, group })
 * @param {object} def Place definition from shared/placeDefinitions.js
 * @returns {Array<object>} Frozen list of exclusion boxes
 */
export function getPlaceExclusions(world, def) {
  const exclusions = [];

  // 1. World obstacles (collision boxes)
  if (Array.isArray(world?.obstacles)) {
    for (const obs of world.obstacles) {
      if (obs && typeof obs.x === 'number' && typeof obs.z === 'number') {
        exclusions.push({
          role: 'obstacle',
          x: obs.x,
          z: obs.z,
          w: typeof obs.w === 'number' ? obs.w * 2 : 1,
          d: typeof obs.d === 'number' ? obs.d * 2 : 1,
        });
      }
    }
  }

  // 2. Authored landmark clearance
  if (Array.isArray(def?.landmark) && def.landmark.length >= 2) {
    exclusions.push({
      role: 'landmark',
      x: def.landmark[0],
      z: def.landmark[1],
      w: 2.4,
      d: 2.4,
    });
  }

  // 3. Authored field note clearance
  if (Array.isArray(def?.note) && def.note.length >= 2) {
    exclusions.push({
      role: 'note',
      x: def.note[0],
      z: def.note[1],
      w: 2.0,
      d: 2.0,
    });
  }

  // 4. Primary and companion spawns
  if (Array.isArray(def?.spawn) && def.spawn.length >= 2) {
    exclusions.push({
      role: 'spawn',
      x: def.spawn[0],
      z: def.spawn[1],
      w: 2.8,
      d: 2.8,
    });
  }
  if (Array.isArray(def?.spawns?.spawn) && def.spawns.spawn.length >= 2) {
    exclusions.push({
      role: 'spawn',
      x: def.spawns.spawn[0],
      z: def.spawns.spawn[1],
      w: 2.8,
      d: 2.8,
    });
  }
  if (Array.isArray(def?.spawns?.companionSpawn) && def.spawns.companionSpawn.length >= 2) {
    exclusions.push({
      role: 'companion-spawn',
      x: def.spawns.companionSpawn[0],
      z: def.spawns.companionSpawn[1],
      w: 2.4,
      d: 2.4,
    });
  }

  // 5. Gate visual boxes and portal clearance
  if (def && Array.isArray(def.exits)) {
    const gateBoxes = gateVisualBoxesFor(def);
    for (const gb of gateBoxes) {
      exclusions.push({
        role: `gate-${gb.role}`,
        x: gb.x,
        z: gb.z,
        w: gb.w + 0.5,
        d: gb.d + 0.5,
      });
    }
  }

  return Object.freeze(exclusions);
}

/**
 * Computes bounded ambient lighting adjustments by blending place base lighting
 * with World lighting values.
 *
 * @param {object} params
 * @param {object} params.baseline Base place lighting values
 * @param {object} params.lighting World lighting targets
 * @param {number} [params.blendFactor=0.38] Blend weight for color temperature (0 to 1)
 * @returns {object} Blended lighting specification
 */
export function computeBoundedAmbientLighting({
  baseline,
  lighting,
  blendFactor = 0.38,
}) {
  const baseSunColor = new THREE.Color(baseline?.sunColor ?? '#ffe0a5');
  const baseSunIntensity = typeof baseline?.sunIntensity === 'number' ? baseline.sunIntensity : 3.0;
  const baseHemiSky = new THREE.Color(baseline?.hemiSky ?? '#c5d9d4');
  const baseHemiGround = new THREE.Color(baseline?.hemiGround ?? '#343a2b');
  const baseHemiIntensity = typeof baseline?.hemiIntensity === 'number' ? baseline.hemiIntensity : 2.2;
  const baseExposure = typeof baseline?.exposure === 'number' ? baseline.exposure : 1.0;

  if (!lighting) {
    return {
      sunColor: baseSunColor,
      sunIntensity: baseSunIntensity,
      hemiSky: baseHemiSky,
      hemiGround: baseHemiGround,
      hemiIntensity: baseHemiIntensity,
      exposure: baseExposure,
    };
  }

  const worldSunColor = lighting.sunColor ? new THREE.Color(lighting.sunColor) : baseSunColor;
  const worldAmbientColor = lighting.ambientColor
    ? new THREE.Color(lighting.ambientColor)
    : (lighting.sunColor ? new THREE.Color(lighting.sunColor) : baseHemiSky);
  const worldGroundColor = lighting.groundColor ? new THREE.Color(lighting.groundColor) : baseHemiGround;

  const sunColor = baseSunColor.clone().lerp(worldSunColor, blendFactor);
  const hemiSky = baseHemiSky.clone().lerp(worldAmbientColor, blendFactor);
  const hemiGround = baseHemiGround.clone().lerp(worldGroundColor, blendFactor);

  const sunIntensity = typeof lighting.sunIntensity === 'number'
    ? baseSunIntensity * (1 - 0.35) + lighting.sunIntensity * 0.35
    : baseSunIntensity;

  const hemiIntensity = typeof lighting.hemisphereIntensity === 'number'
    ? baseHemiIntensity * (1 - 0.35) + lighting.hemisphereIntensity * 0.35
    : baseHemiIntensity;

  const exposure = typeof lighting.exposure === 'number'
    ? baseExposure * (1 - 0.25) + lighting.exposure * 0.25
    : baseExposure;

  return {
    sunColor,
    sunIntensity,
    hemiSky,
    hemiGround,
    hemiIntensity,
    exposure,
  };
}

/**
 * Creates an AmbientPlaceManager to coordinate presentation hosts across non-theater places.
 *
 * @param {object} params
 * @param {THREE.Scene} params.scene Shared 3D scene
 * @param {object} [params.renderer] Shared WebGLRenderer
 * @param {THREE.DirectionalLight} params.sun Directional sun light
 * @param {THREE.HemisphereLight} [params.hemisphere] Hemisphere light
 * @param {object} [params.environmentAudio] Environment audio manager
 * @param {Function} params.getWorldSelection Returns { worldId, variantId }
 * @returns {object} Manager API
 */
export function createAmbientPlaceManager({
  scene,
  renderer = null,
  sun,
  hemisphere = null,
  environmentAudio = null,
  getWorldSelection,
} = {}) {
  if (!sun) throw new Error('createAmbientPlaceManager requires the sun light');
  if (typeof getWorldSelection !== 'function') {
    throw new Error('createAmbientPlaceManager requires getWorldSelection function');
  }

  let activeSeam = null;
  let activeHost = null;
  let baseline = null;
  let currentPlan = null;
  let disposed = false;

  function captureBaseline(def) {
    const formatHex = (color, fallback) => {
      if (typeof color === 'string') {
        return color.startsWith('#') ? color : `#${color}`;
      }
      if (color && typeof color.getHexString === 'function') {
        return `#${color.getHexString()}`;
      }
      return fallback;
    };

    return Object.freeze({
      sunColor: formatHex(def?.sun, sun?.color ? `#${sun.color.getHexString()}` : '#ffe0a5'),
      sunIntensity: typeof sun?.intensity === 'number' ? sun.intensity : 3.0,
      hemiSky: formatHex(hemisphere?.color, '#c5d9d4'),
      hemiGround: formatHex(hemisphere?.groundColor, '#343a2b'),
      hemiIntensity: typeof hemisphere?.intensity === 'number' ? hemisphere.intensity : 2.2,
      exposure: renderer && typeof renderer.toneMappingExposure === 'number' ? renderer.toneMappingExposure : 1.0,
    });
  }

  function restoreBaseline() {
    if (!baseline) return;
    if (sun) {
      sun.color.set(baseline.sunColor);
      sun.intensity = baseline.sunIntensity;
    }
    if (hemisphere) {
      hemisphere.color.set(baseline.hemiSky);
      hemisphere.groundColor.set(baseline.hemiGround);
      hemisphere.intensity = baseline.hemiIntensity;
    }
    if (renderer && typeof baseline.exposure === 'number') {
      renderer.toneMappingExposure = baseline.exposure;
    }
    baseline = null;
  }

  function applyAtmosphere(atmosphere) {
    if (!baseline) return;
    if (!atmosphere) {
      restoreBaseline();
      return;
    }
    const lighting = atmosphere.lighting ?? atmosphere;
    const computed = computeBoundedAmbientLighting({
      baseline,
      lighting,
    });
    if (sun) {
      sun.color.copy(computed.sunColor);
      sun.intensity = computed.sunIntensity;
    }
    if (hemisphere) {
      hemisphere.color.copy(computed.hemiSky);
      hemisphere.groundColor.copy(computed.hemiGround);
      hemisphere.intensity = computed.hemiIntensity;
    }
    if (renderer) {
      renderer.toneMappingExposure = computed.exposure;
    }
  }

  function applyAudio(audioProfile) {
    if (environmentAudio && typeof environmentAudio.setAmbienceProfile === 'function') {
      environmentAudio.setAmbienceProfile(audioProfile ?? null);
    }
  }

  /**
   * Activates ambient presentation for a non-theater place.
   *
   * @param {object} seam Runtime activation payload ({ roomId, def, world, generation })
   * @returns {Promise<boolean>} True if activated
   */
  async function activate(seam = {}) {
    if (disposed) return false;
    if (!seam?.roomId || seam.roomId === 'theater') {
      return false;
    }

    if (activeHost) {
      deactivate();
    }

    activeSeam = seam;
    baseline = captureBaseline(seam.def);

    const world = seam.world;
    const containerGroup = world?.group ?? (world?.isGroup ? world : null);
    const exclusions = getPlaceExclusions(world, seam.def);

    activeHost = createWorldPresentationHost({
      containerGroup,
      viewId: `place:${seam.roomId}`,
      exclusions,
      applyAtmosphere,
      applyAudio,
    });

    const selection = getWorldSelection();
    const plan = resolveWorldPresentation({
      selection,
      viewId: `place:${seam.roomId}`,
    });

    currentPlan = plan;
    const mounted = await activeHost.mountPresentation({
      plan,
      generation: seam.generation ?? activeHost.activeGeneration,
    });

    return mounted;
  }

  /**
   * Synchronizes ambient presentation with the latest world selection.
   *
   * @returns {Promise<boolean>}
   */
  async function sync() {
    if (disposed || !activeHost || !activeSeam) return false;
    const selection = getWorldSelection();
    const plan = resolveWorldPresentation({
      selection,
      viewId: `place:${activeSeam.roomId}`,
    });
    currentPlan = plan;
    return activeHost.mountPresentation({
      plan,
      generation: activeHost.activeGeneration,
    });
  }

  /**
   * Deactivates and tears down the active ambient presentation host.
   */
  function deactivate() {
    if (activeHost) {
      try {
        activeHost.teardown();
      } catch (err) {
        console.warn('[ambientPlace] teardown error:', err);
      }
      activeHost = null;
    }
    restoreBaseline();
    activeSeam = null;
    currentPlan = null;
  }

  /**
   * Permanently disposes the manager.
   */
  function dispose() {
    deactivate();
    disposed = true;
  }

  return Object.freeze({
    get isActive() {
      return activeHost !== null;
    },
    get activeRoomId() {
      return activeSeam?.roomId ?? null;
    },
    get currentPlan() {
      return currentPlan;
    },
    get host() {
      return activeHost;
    },
    get baseline() {
      return baseline;
    },
    activate,
    sync,
    deactivate,
    dispose,
  });
}
