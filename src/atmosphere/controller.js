/**
 * The ONE retained active atmosphere controller (add-atmosphere-weather-system
 * task 3.1, design D4/D8). It binds the shared scene's presentation globals —
 * FogExp2, background, sun, hemisphere, renderer tone-mapping exposure —
 * captures their exact baseline on activation and restores it on
 * deactivation, so a place's authored presentation always survives an
 * atmosphere visit byte for byte.
 *
 * Hard architecture rules enforced here:
 *   - exactly one active controller; it updates ONLY while its activation is
 *     current and its world's group is visible. Hidden frames cost zero
 *     work: no sampling, no uniform writes, no uploads;
 *   - no requestAnimationFrame of its own and no second renderer/composer —
 *     the game's single frame loop calls `update(dtMs)`;
 *   - no per-frame allocations: one retained sample record, retained
 *     scratch THREE.Colors, and subsystems (sky, precipitation, surfaces)
 *     that are created on activate and disposed on deactivate;
 *   - deactivation is idempotent and restores the captured baseline exactly
 *     before the next place applies its own;
 *   - a failed activation restores the baseline, detaches every owned
 *     object and leaves the previous presentation untouched (a travel that
 *     fails to build an atmosphere never breaks the old world);
 *   - borrowed resources (scene, lights, renderer, world materials) are
 *     never disposed here — only the controller's own effects are.
 *
 * Presentation ownership: a place opts in through its manifest
 * `atmosphere.preset`. Without one (every legacy room, the Theater) the
 * controller refuses to activate and the existing presentation stands,
 * including the legacy agricultural weather writes.
 */

import * as THREE from 'three';
import { getPreset } from '../../shared/atmospherePresets.js';
import { normalizeZones } from './exposure.js';
import { createSky } from './sky.js';
import { createPrecipitation } from './precipitation.js';
import { createSurfaceWetness } from './surfaces.js';
import { createPlaceEffects } from './placeEffects.js';
import { sampleVisualSchedule } from './visualSchedule.js';

export const ATMOSPHERE_TIERS = Object.freeze(['normal', 'reduced']);

const lerp = (a, b, u) => a + (b - a) * u;

export function createAtmosphereController({
  scene,
  renderer,
  sun,
  hemisphere = null,
  stateClient,
  world = null, // () => the active world (read every update; never cached)
  camera = null, // () => the active camera (read every update; never cached)
  tier = 'normal',
  // Test seams: inject failing factories to prove failed activation.
  skyFactory = createSky,
  precipitationFactory = createPrecipitation,
  surfacesFactory = createSurfaceWetness,
} = {}) {
  if (!scene) throw new Error('createAtmosphereController requires the shared scene');
  if (!renderer) throw new Error('createAtmosphereController requires the renderer');
  if (!sun) throw new Error('createAtmosphereController requires the sun light');
  if (!stateClient || typeof stateClient.sample !== 'function') {
    throw new Error('createAtmosphereController requires the atmosphere state client');
  }

  let currentTier = ATMOSPHERE_TIERS.includes(tier) ? tier : 'normal';
  let active = false;
  let disposed = false;
  let roomId = null;
  let generation = null;
  let def = null;
  // Local preset override (Theater environment picker / debug preview): used
  // only when the room's semantic state has no accepted snapshot, so an
  // offline or pre-snapshot client can still render the chosen world.
  let localPresetId = null;

  // Baseline presentation, captured at activation and restored exactly.
  let baseline = null;

  // Owned subsystems (created on activate, disposed on deactivate).
  let group = null;
  let sky = null;
  let precipitation = null;
  let surfaces = null;
  let placeEffects = null;
  let activeEnvironment = null;

  // Retained per-frame scratch: one sample record + a fixed set of colors.
  const sampleOut = {};
  const scheduleOut = {};
  const scratchFog = new THREE.Color();
  const scratchSky = new THREE.Color();
  const scratchGround = new THREE.Color();
  const scratchSun = new THREE.Color();
  const scratchCloud = new THREE.Color();
  const scratchFrom = new THREE.Color();
  const scratchTo = new THREE.Color();
  // Extended Environment-campaign presentation (sun path, aurora, horizon
  // glow): optional fields legacy presets never author.
  const scratchSunDir = new THREE.Vector3();
  const scratchAurora = new THREE.Color();
  const scratchGlow = new THREE.Color();
  const scratchAmbient = new THREE.Color();
  // Camera-aware sky backdrop: retained basis vectors and one view record.
  const cameraRight = new THREE.Vector3();
  const cameraUp = new THREE.Vector3();
  const cameraForward = new THREE.Vector3();
  const cameraView = {
    mode: 'iso',
    forward: [0, 0, -1],
    right: [1, 0, 0],
    up: [0, 1, 0],
    spread: [0.62, 0.62],
    azimuth: 0,
    azimuthSpread: 0.62,
    elevationRange: [-1.4, 0.6],
  };

  /**
   * Update the retained view record from the active camera. Isometric
   * (orthographic) views use the painted-backdrop mapping; first person
   * (perspective) uses the real camera basis so pitch/yaw move the sky.
   */
  function sampleCameraView() {
    const cam = typeof camera === 'function' ? camera() : camera;
    if (!cam) return cameraView;
    cam.updateMatrixWorld?.();
    const e = cam.matrixWorld.elements;
    cameraRight.set(e[0], e[1], e[2]).normalize();
    cameraUp.set(e[4], e[5], e[6]).normalize();
    cameraForward.set(-e[8], -e[9], -e[10]).normalize();
    cameraView.right[0] = cameraRight.x; cameraView.right[1] = cameraRight.y; cameraView.right[2] = cameraRight.z;
    cameraView.up[0] = cameraUp.x; cameraView.up[1] = cameraUp.y; cameraView.up[2] = cameraUp.z;
    cameraView.forward[0] = cameraForward.x; cameraView.forward[1] = cameraForward.y; cameraView.forward[2] = cameraForward.z;
    if (cam.isPerspectiveCamera) {
      cameraView.mode = 'perspective';
      const half = Math.tan((cam.fov * Math.PI) / 360);
      cameraView.spread[0] = half * (cam.aspect || 1.79);
      cameraView.spread[1] = half;
    } else {
      cameraView.mode = 'iso';
      cameraView.azimuth = Math.atan2(cameraForward.z, cameraForward.x);
      cameraView.azimuthSpread = 0.62;
      cameraView.elevationRange[0] = -1.4;
      cameraView.elevationRange[1] = 0.6;
    }
    return cameraView;
  }
  const EXTENDED_VISUAL_DEFAULTS = Object.freeze({
    sunDisc: 0, moonDisc: 0, aurora: 0, horizonGlow: 0,
    cloudSharpness: 0.5, cloudDrift: 1, starDensity: 0, milkyWay: 0,
  });

  const stats = { frames: 0, updates: 0, skippedFrames: 0, activations: 0, failedActivations: 0 };

  function captureBaseline() {
    const entry = {
      fogColor: scene.fog?.color ? scene.fog.color.getHex() : null,
      fogDensity: typeof scene.fog?.density === 'number' ? scene.fog.density : null,
      background: scene.background?.isColor ? scene.background.getHex() : null,
      sunColor: sun.color.getHex(),
      sunIntensity: sun.intensity,
      sunPosition: sun.position?.toArray ? sun.position.toArray() : null,
      hemiSky: hemisphere?.color ? hemisphere.color.getHex() : null,
      hemiGround: hemisphere?.groundColor ? hemisphere.groundColor.getHex() : null,
      hemiIntensity: hemisphere ? hemisphere.intensity : null,
      exposure: typeof renderer.toneMappingExposure === 'number' ? renderer.toneMappingExposure : null,
    };
    return Object.freeze(entry);
  }

  function restoreBaseline() {
    if (!baseline) return;
    if (baseline.fogColor !== null) scene.fog.color.setHex(baseline.fogColor);
    if (baseline.fogDensity !== null) scene.fog.density = baseline.fogDensity;
    if (baseline.background !== null) scene.background.setHex(baseline.background);
    sun.color.setHex(baseline.sunColor);
    sun.intensity = baseline.sunIntensity;
    if (baseline.sunPosition && sun.position?.fromArray) sun.position.fromArray(baseline.sunPosition);
    if (hemisphere) {
      if (baseline.hemiSky !== null) hemisphere.color.setHex(baseline.hemiSky);
      if (baseline.hemiGround !== null) hemisphere.groundColor.setHex(baseline.hemiGround);
      if (baseline.hemiIntensity !== null) hemisphere.intensity = baseline.hemiIntensity;
    }
    if (baseline.exposure !== null) renderer.toneMappingExposure = baseline.exposure;
  }

  function detachOwned() {
    placeEffects?.dispose(); placeEffects = null; activeEnvironment = null;
    if (precipitation) { precipitation.dispose(); precipitation = null; }
    if (surfaces) { surfaces.dispose(); surfaces = null; }
    if (sky) { sky.dispose(); sky = null; }
    if (group) { group.removeFromParent(); group = null; }
  }

  /**
   * Activate for the current place. `seam` is the runtime's activation
   * payload: { roomId, generation, def, world }. Activating over an active
   * controller first restores the previous baseline (rapid generation
   * changes are safe). A place whose manifest has no atmosphere preset
   * never takes presentation ownership. Throws only after fully rolling
   * back, so the caller's world stays exactly as it was.
   */
  function activate(seam = {}) {
    if (disposed) return false;
    if (active) deactivate();
    if (!seam?.roomId || !seam.def?.atmosphere?.preset) return false;

    baseline = captureBaseline();
    roomId = seam.roomId;
    generation = seam.generation ?? null;
    def = seam.def;
    active = true;
    stats.activations += 1;

    try {
      const worldObj = typeof seam.world !== 'undefined' ? seam.world : world?.();
      const environment = worldObj?.environment ?? {};
      activeEnvironment = environment;
      const zones = normalizeZones(environment.zones);

      group = new THREE.Group();
      group.name = 'atmosphere-active';

      sky = skyFactory({ drift: currentTier !== 'reduced', tier: currentTier, stars: environment.sky?.stars ?? 0, milkyWay: !!environment.sky?.milkyWay });
      group.add(sky.mesh);

      precipitation = precipitationFactory({
        bounds: def.bounds ?? undefined,
        zones,
        anchors: environment.emitterAnchors ?? [],
        tier: currentTier,
        seed: Number.isFinite(def.seed) ? def.seed >>> 0 : 0,
      });
      group.add(precipitation.object3D);

      surfaces = surfacesFactory({
        world: worldObj ?? null,
        tier: currentTier,
        seed: Number.isFinite(def.seed) ? def.seed >>> 0 : 0,
      });
      group.add(surfaces.object3D);

      placeEffects = createPlaceEffects({ environment, tier: currentTier, seed: def.seed });
      if (placeEffects.group.children.length) group.add(placeEffects.group);
      scene.add(group);
      return true;
    } catch (error) {
      // Failed activation: detach everything owned, restore the captured
      // baseline, and surface the error with the controller INACTIVE — the
      // previously committed place keeps its exact presentation.
      detachOwned();
      restoreBaseline();
      baseline = null;
      active = false;
      roomId = null;
      generation = null;
      def = null;
      stats.failedActivations += 1;
      throw error;
    }
  }

  /**
   * Idempotent teardown: restore the shared presentation globals to their
   * captured baseline and dispose every owned effect. Cached worlds keep
   * their own geometry and materials — nothing borrowed is disposed here.
   */
  function deactivate() {
    if (!active) return false;
    active = false;
    detachOwned();
    restoreBaseline();
    baseline = null;
    roomId = null;
    generation = null;
    def = null;
    return true;
  }

  /** Preset visuals for the current semantic state: during a transition the
   * from/to preset rows are lerped in linear space by the sampled u. */
  function visualTargets() {
    const state = typeof stateClient.getState === 'function' ? stateClient.getState() : null;
    const scheduled = sampleVisualSchedule(getPreset(state?.preset ?? def?.atmosphere?.preset), sampleOut.serverNow ?? 0, scheduleOut);
    const transition = state?.transition ?? scheduled;
    const transitionU = state?.transition ? sampleOut.transitionU : scheduled?.u;
    if (transition && transitionU != null) {
      const from = transition.fromVisuals ?? getPreset(transition.fromPreset)?.visuals;
      const to = transition.toVisuals ?? getPreset(transition.toPreset)?.visuals;
      if (from && to) {
        scratchFog.set(from.fogColor).lerp(scratchTo.set(to.fogColor), transitionU);
        scratchSky.set(from.skyColor).lerp(scratchTo.set(to.skyColor), transitionU);
        scratchGround.set(from.groundColor).lerp(scratchTo.set(to.groundColor), transitionU);
        scratchSun.set(from.sunColor).lerp(scratchTo.set(to.sunColor), transitionU);
        scratchCloud.set(from.skyColor).lerp(scratchTo.set(to.fogColor), transitionU);
        scratchAurora.set(from.auroraColor ?? '#4be0a6').lerp(scratchTo.set(to.auroraColor ?? '#4be0a6'), transitionU);
        scratchGlow.set(from.horizonGlowColor ?? '#ffb46a').lerp(scratchTo.set(to.horizonGlowColor ?? '#ffb46a'), transitionU);
        scratchAmbient.set(from.ambientColor ?? from.skyColor).lerp(scratchTo.set(to.ambientColor ?? to.skyColor), transitionU);
        const out = {
          fogColor: scratchFog,
          skyColor: scratchSky,
          groundColor: scratchGround,
          sunColor: scratchSun,
          cloudColor: scratchCloud,
          fogDensity: lerp(from.fogDensity, to.fogDensity, transitionU),
          hemisphereIntensity: lerp(from.hemisphereIntensity, to.hemisphereIntensity, transitionU),
          sunIntensity: lerp(from.sunIntensity, to.sunIntensity, transitionU),
          exposure: lerp(from.exposure, to.exposure, transitionU),
          sunDisc: lerp(from.sunDisc ?? 0, to.sunDisc ?? 0, transitionU),
          moonDisc: lerp(from.moonDisc ?? 0, to.moonDisc ?? 0, transitionU),
          aurora: lerp(from.aurora ?? 0, to.aurora ?? 0, transitionU),
          auroraColor: scratchAurora,
          horizonGlow: lerp(from.horizonGlow ?? 0, to.horizonGlow ?? 0, transitionU),
          horizonGlowColor: scratchGlow,
          ambientColor: scratchAmbient,
          cloudSharpness: lerp(from.cloudSharpness ?? 0.5, to.cloudSharpness ?? 0.5, transitionU),
          cloudDrift: lerp(from.cloudDrift ?? 1, to.cloudDrift ?? 1, transitionU),
          starDensity: lerp(from.starDensity ?? 0, to.starDensity ?? 0, transitionU),
          milkyWay: lerp(from.milkyWay ?? 0, to.milkyWay ?? 0, transitionU),
        };
        applySunDirection(out, from.sunElevation, to.sunElevation, from.sunAzimuth, to.sunAzimuth, transitionU);
        return out;
      }
    }
    // The local override only stands in for a manifest-declared atmosphere
    // (the Theater): places with preset null keep their baseline untouched.
    const declaredPreset = def?.atmosphere?.preset ?? null;
    const presetId = state?.preset ?? (declaredPreset ? (localPresetId ?? declaredPreset) : null);
    const visuals = getPreset(presetId)?.visuals;
    if (!visuals) return null;
    scratchFog.set(visuals.fogColor);
    scratchSky.set(visuals.skyColor);
    scratchGround.set(visuals.groundColor);
    scratchSun.set(visuals.sunColor);
    scratchCloud.set(visuals.skyColor).lerp(scratchFog, 0.5);
    const out = {
      fogColor: scratchFog,
      skyColor: scratchSky,
      groundColor: scratchGround,
      sunColor: scratchSun,
      cloudColor: scratchCloud,
      fogDensity: visuals.fogDensity,
      hemisphereIntensity: visuals.hemisphereIntensity,
      sunIntensity: visuals.sunIntensity,
      exposure: visuals.exposure,
      sunDisc: visuals.sunDisc ?? 0,
      moonDisc: visuals.moonDisc ?? 0,
      aurora: visuals.aurora ?? 0,
      auroraColor: scratchAurora.set(visuals.auroraColor ?? '#4be0a6'),
      horizonGlow: visuals.horizonGlow ?? 0,
      horizonGlowColor: scratchGlow.set(visuals.horizonGlowColor ?? '#ffb46a'),
      ambientColor: visuals.ambientColor ? scratchAmbient.set(visuals.ambientColor) : null,
      cloudSharpness: visuals.cloudSharpness ?? 0.5,
      cloudDrift: visuals.cloudDrift ?? 1,
      starDensity: visuals.starDensity ?? 0,
      milkyWay: visuals.milkyWay ?? 0,
    };
    applySunDirection(out, visuals.sunElevation, visuals.sunElevation, visuals.sunAzimuth, visuals.sunAzimuth, 0);
    return out;
  }

  /** Sun direction for the sky disc and shadow light: only authored
   * elev/azimuth move the shared directional light; legacy presets keep
   * their exact original sun transform. */
  function applySunDirection(out, fromEl, toEl, fromAz, toAz, u) {
    if (!Number.isFinite(fromEl) && !Number.isFinite(toEl)) return;
    const el = lerp(Number.isFinite(fromEl) ? fromEl : toEl, Number.isFinite(toEl) ? toEl : fromEl, u);
    const az = lerp(Number.isFinite(fromAz) ? fromAz : (toAz ?? 0.5), Number.isFinite(toAz) ? toAz : (fromAz ?? 0.5), u);
    const ce = Math.cos(el);
    out.sunDir = scratchSunDir.set(ce * Math.cos(az), Math.max(0.04, Math.sin(el)), ce * Math.sin(az)).normalize();
  }

  /**
     One frame of atmosphere. Zero cost when inactive or when the active
     world's group is hidden (the game's travel keeps hidden worlds in
     memory but out of the loop). Runs entirely on retained objects.
   */
  function update(dtMs = 0) {
    stats.frames += 1;
    if (!active || disposed) {
      stats.skippedFrames += 1;
      return false;
    }
    const worldObj = typeof world === 'function' ? world() : null;
    if (worldObj?.group?.visible === false) {
      // Hidden world: zero updates — no sampling, no uploads, nothing.
      stats.skippedFrames += 1;
      return false;
    }

    stateClient.sample(sampleOut);
    const visuals = visualTargets();
    if (visuals) {
      scene.fog.color.copy(visuals.fogColor);
      if (typeof scene.fog?.density === 'number') scene.fog.density = visuals.fogDensity;
      if (scene.background?.isColor) scene.background.copy(visuals.fogColor).multiplyScalar(0.45);
      sun.color.copy(visuals.sunColor);
      sun.intensity = visuals.sunIntensity;
      if (hemisphere) {
        hemisphere.color.copy(visuals.ambientColor ?? visuals.skyColor);
        hemisphere.groundColor.copy(visuals.groundColor);
        hemisphere.intensity = visuals.hemisphereIntensity;
      }
      if (typeof renderer.toneMappingExposure === 'number') renderer.toneMappingExposure = visuals.exposure;
      // Authored sun paths move the shared directional light so shadows,
      // snow/ground response and the sky disc agree. Legacy presets never
      // author one and keep their original transform.
      if (visuals.sunDir && sun.position) sun.position.copy(visuals.sunDir).multiplyScalar(46);
      sky.setState({
        topColor: visuals.skyColor,
        horizonColor: visuals.fogColor,
        cloudColor: visuals.cloudColor,
        cloudOpacity: sampleOut.cloud ?? 0,
        phase: sampleOut.timePhase ?? 0,
        timeMs: sampleOut.serverNow ?? 0,
        sunDir: visuals.sunDir,
        sunColor: visuals.sunColor,
        sunDisc: visuals.sunDisc,
        moonDisc: visuals.moonDisc,
        aurora: visuals.aurora,
        auroraColor: visuals.auroraColor,
        horizonGlow: visuals.horizonGlow,
        horizonGlowColor: visuals.horizonGlowColor,
        cloudSharpness: visuals.cloudSharpness,
        cloudDrift: visuals.cloudDrift,
        starDensity: visuals.starDensity,
        milkyWay: visuals.milkyWay,
      });
      if (typeof sky.setCamera === 'function') sky.setCamera(sampleCameraView());
    }

    precipitation?.update({
      timeMs: sampleOut.serverNow ?? 0,
      rain: sampleOut.rain ?? 0,
      windX: sampleOut.windX ?? 0,
      windZ: sampleOut.windZ ?? 0,
      dtMs,
    });
    surfaces?.apply(sampleOut.wetness ?? 0);
    placeEffects?.update(sampleOut, { reduceMotion: currentTier === 'reduced' });
    stats.updates += 1;
    return true;
  }

  /**
   * Re-read the active world's environment hooks and rebuild the subsystems
   * that consume them (precipitation zones/anchors, wet material families,
   * place effects). Used when the Theater Environment system swaps the
   * surrounding world without a place travel; the presentation baseline,
   * room binding and generation are untouched.
   */
  function reloadEnvironment() {
    if (!active || disposed) return false;
    const worldObj = typeof world === 'function' ? world() : null;
    const environment = worldObj?.environment ?? activeEnvironment ?? {};
    activeEnvironment = environment;
    const zones = normalizeZones(environment.zones);
    if (precipitation) { precipitation.dispose(); group.remove(precipitation.object3D); precipitation = null; }
    if (surfaces) { surfaces.dispose(); group.remove(surfaces.object3D); surfaces = null; }
    if (placeEffects) { placeEffects.dispose(); placeEffects = null; }
    precipitation = precipitationFactory({
      bounds: def?.bounds ?? undefined,
      zones,
      anchors: environment.emitterAnchors ?? [],
      tier: currentTier,
      seed: Number.isFinite(def?.seed) ? def.seed >>> 0 : 0,
    });
    group.add(precipitation.object3D);
    surfaces = surfacesFactory({
      world: worldObj ?? null,
      tier: currentTier,
      seed: Number.isFinite(def?.seed) ? def.seed >>> 0 : 0,
    });
    group.add(surfaces.object3D);
    placeEffects = createPlaceEffects({ environment, tier: currentTier, seed: def?.seed });
    if (placeEffects.group.children.length) group.add(placeEffects.group);
    return true;
  }

  /**
   * Comfort tier switch (task 4.3 owns the UI): recycles bounded resources
   * once and freezes sky drift when reduced. Same-tier calls do nothing.
   */
  function setQuality(tierNext) {
    if (!ATMOSPHERE_TIERS.includes(tierNext) || tierNext === currentTier) return false;
    currentTier = tierNext;
    if (activeEnvironment) {
      placeEffects?.dispose();
      placeEffects = createPlaceEffects({environment: activeEnvironment, tier: tierNext, seed: def?.seed});
      if (placeEffects.group.children.length) group.add(placeEffects.group);
    }
    precipitation?.setTier(tierNext);
    surfaces?.setTier(tierNext);
    sky?.setDrift(tierNext !== 'reduced');
    return true;
  }

  /** Local fallback preset (no-op when the room state supplies one). */
  function setLocalPreset(presetId) {
    localPresetId = typeof presetId === 'string' && presetId.length > 0 ? presetId : null;
    return localPresetId;
  }

  function dispose() {
    if (disposed) return;
    deactivate();
    disposed = true;
  }

  return {
    activate,
    deactivate,
    update,
    setQuality,
    reloadEnvironment,
    setLocalPreset,
    dispose,
    isActive: () => active,
    get roomId() { return roomId; },
    get generation() { return generation; },
    get tier() { return currentTier; },
    get stats() { return stats; },
  };
}
