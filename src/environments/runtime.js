/**
 * Theater Environment runtime: ONE surrounding world per environment, layered
 * around the single shared Orpheum world group. The Theater core is never
 * rebuilt — switching environments removes the previous environment group and
 * builds the next one inside the same theater world group, while membership,
 * media, activities and actor state stay untouched.
 *
 * Responsibilities:
 *   - resolve the current atmosphere preset to an environment + variant;
 *   - build the environment through the registry (kit-owned disposal ledger);
 *   - install the environment's atmosphere hooks (material families, shelter
 *     zones, emitter anchors) into the world's existing `environment` object
 *     and restore the previous hooks on teardown;
 *   - variant switches reuse the built geometry through `api.setVariant`
 *     when implemented (otherwise the geometry rebuilds);
 *   - keep zero per-frame allocations on the retained state record.
 */

import * as THREE from 'three';
import { environmentForPreset, getTheaterEnvironment } from '../../shared/theaterEnvironments.js';
import { createEnvironmentKit } from './lib/kit.js';
import { requireEnvironmentBuilder } from './registry.js';
import { budgetForEnvironmentTier } from './quality.js';

const baseHooks = new WeakMap();

export function createTheaterEnvironmentRuntime({
  defaultTier = 'high',
  onHooksChanged = null,
  onError = null,
} = {}) {
  let root = null;
  let active = null;
  const state = {
    environmentId: null,
    variantId: null,
    presetId: null,
    tier: defaultTier,
    counts: null,
    failed: null,
    buildCount: 0,
  };
  const variantState = {
    tier: defaultTier,
    features: null,
    visuals: null,
    presetId: null,
    environmentId: null,
    variantId: null,
  };

  function captureBaseHooks(world) {
    if (!world?.environment || baseHooks.has(world)) return;
    baseHooks.set(world, {
      materialFamilies: Array.isArray(world.environment.materialFamilies) ? [...world.environment.materialFamilies] : [],
      zones: Array.isArray(world.environment.zones) ? [...world.environment.zones] : [],
      emitterAnchors: Array.isArray(world.environment.emitterAnchors) ? [...world.environment.emitterAnchors] : [],
      sky: world.environment.sky ?? null,
    });
  }

  function installHooks(world, api, row) {
    if (!world?.environment) return;
    captureBaseHooks(world);
    const base = baseHooks.get(world);
    const own = api?.environment ?? {};
    world.environment.materialFamilies = [...base.materialFamilies, ...(own.materialFamilies ?? [])];
    world.environment.zones = [...base.zones, ...(own.zones ?? [])];
    world.environment.emitterAnchors = [...base.emitterAnchors, ...(own.emitterAnchors ?? [])];
    // Per-environment sky hints consumed at atmosphere activation (stars,
    // milky way) plus the preset's own star density.
    world.environment.sky = {
      stars: row?.visuals?.starDensity > 0.15 ? 1 : 0,
      milkyWay: row?.visuals?.milkyWay > 0.1,
      ...(whichSky(own) ?? {}),
    };
  }

  function whichSky(own) {
    return own?.sky ?? null;
  }

  function restoreHooks(world) {
    if (!world?.environment || !baseHooks.has(world)) return;
    const base = baseHooks.get(world);
    world.environment.materialFamilies = [...base.materialFamilies];
    world.environment.zones = [...base.zones];
    world.environment.emitterAnchors = [...base.emitterAnchors];
    world.environment.sky = base.sky;
  }

  function teardown() {
    if (root) {
      root.removeFromParent();
      root = null;
    }
    if (active) {
      try { active.api?.dispose?.(); } catch { /* disposal is best effort */ }
      active = null;
    }
    state.environmentId = null;
    state.variantId = null;
    state.presetId = null;
    state.counts = null;
  }

  /**
   * Resolve + apply the environment for a preset. Returns
   * `{ changed, environmentId, variantId, status }`.
   */
  function sync({ presetId = null, def = null, world = null, force = false, tier = null } = {}) {
    if (tier) state.tier = tier;
    if (!world) return { changed: false, status: 'no-world' };
    const resolved = environmentForPreset(presetId) ?? environmentForPreset(def?.atmosphere?.preset);
    if (!resolved) {
      if (active || root) {
        restoreHooks(world);
        teardown();
        onHooksChanged?.();
        return { changed: true, status: 'cleared', environmentId: null, variantId: null };
      }
      return { changed: false, status: 'none' };
    }
    const { environmentId, variantId, row } = resolved;
    // A failed build for this same preset is not retried every frame; a new
    // preset or an explicit force retries.
    if (!force && !active && state.failed && state.failedPreset === row.preset) {
      state.presetId = row.preset;
      return { changed: false, status: 'failed', environmentId, variantId };
    }
    state.presetId = row.preset;
    state.tier = state.tier ?? defaultTier;

    // Same environment: variant-only update keeps the built geometry.
    if (active && active.environmentId === environmentId && !force) {
      if (active.variantId !== variantId) {
        variantState.tier = state.tier;
        variantState.features = row.features;
        variantState.visuals = row.visuals;
        variantState.presetId = row.preset;
        variantState.environmentId = environmentId;
        variantState.variantId = variantId;
        let applied = false;
        try {
          if (typeof active.api?.setVariant === 'function') {
            active.api.setVariant(variantState);
            applied = true;
          }
        } catch (error) {
          onError?.(error);
        }
        if (!applied) {
          buildInto(world, environmentId, variantId, row, state.tier);
        } else {
          active.variantId = variantId;
          state.variantId = variantId;
        }
        onHooksChanged?.();
        return { changed: true, status: 'variant', environmentId, variantId };
      }
      state.variantId = variantId;
      return { changed: false, status: 'same', environmentId, variantId };
    }

    buildInto(world, environmentId, variantId, row, state.tier);
    return { changed: true, status: 'environment', environmentId, variantId };
  }

  function buildInto(world, environmentId, variantId, row, tier) {
    const environment = getTheaterEnvironment(environmentId);
    if (!environment) throw new Error(`Unknown environment "${environmentId}"`);
    const builder = requireEnvironmentBuilder(environmentId);
    const previousRoot = root;
    const previous = active;
    const group = new THREE.Group();
    group.name = `theater-environment-${environmentId}`;
    const kit = createEnvironmentKit({
      tier,
      seed: row.preset.split('').reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) >>> 0, 7) >>> 0,
      features: row.features,
      group,
    });
    try {
      const api = builder({
        kit,
        environment,
        row,
        presetId: row.preset,
        variantId,
        tier,
        quality: budgetForEnvironmentTier(tier),
      });
      variantState.tier = tier;
      variantState.features = row.features;
      variantState.visuals = row.visuals;
      variantState.presetId = row.preset;
      variantState.environmentId = environmentId;
      variantState.variantId = variantId;
      api?.setVariant?.(variantState);
      world.group.add(group);
      // Install BEFORE tearing the old one down so a failed build keeps the
      // previous world (the new group is only kept on success).
      installHooks(world, api, row);
      if (previousRoot) previousRoot.removeFromParent();
      if (previous) {
        try { previous.api?.dispose?.(); } catch { /* best effort */ }
      }
      root = group;
      active = { environmentId, variantId, api, row, kit };
      state.environmentId = environmentId;
      state.variantId = variantId;
      state.counts = api?.counts ?? null;
      state.failed = null;
      state.failedPreset = null;
      state.buildCount += 1;
      onHooksChanged?.();
    } catch (error) {
      try { group.removeFromParent(); } catch { /* ignore */ }
      kit.disposeAll();
      state.failed = error?.message ?? String(error);
      state.failedPreset = row.preset;
      onError?.(error);
      throw error;
    }
  }

  function update(time, dt, sample = {}) {
    if (!active) return false;
    const world = sample.world ?? null;
    if (world && world.group.visible === false) return false;
    if (!sample.atmosphereActive) return false;
    active.api?.update?.(time, dt, {
      ...sample,
      features: active.row.features,
      visuals: active.row.visuals,
    });
    active.kit?.setWind(time, sample.windX ?? 0, sample.windZ ?? 0, active.row.features?.windStrength ?? 1);
    return true;
  }

  function deactivate() {
    // Keep the built environment cached for a fast return; the world group's
    // own visibility hides it while another place is active. Stop nothing:
    // update() is only called while the theater is the active world.
    return true;
  }

  function dispose() {
    teardown();
  }

  return {
    sync,
    update,
    deactivate,
    dispose,
    get state() { return { ...state }; },
    get active() { return active ? { environmentId: active.environmentId, variantId: active.variantId } : null; },
  };
}
