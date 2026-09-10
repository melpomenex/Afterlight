/**
 * Shared WebGLRenderer presentation policy capture/restore
 * (fix-kart-royale-instant-entry D4).
 *
 * Used by the activity view lease and the frame-bound graphics job queue so
 * background Kart preparation cannot leave the Theater renderer mutated.
 */

import * as THREE from 'three';

/**
 * Capture the host renderer fields Kart boot/prepare may touch.
 * @param {THREE.WebGLRenderer} renderer
 */
export function captureRendererPolicy(renderer) {
  if (!renderer) return null;
  const target = renderer.getRenderTarget();
  const clearColor = new THREE.Color();
  renderer.getClearColor(clearColor);
  const scissor = new THREE.Vector4();
  renderer.getScissor(scissor);
  const viewport = new THREE.Vector4();
  renderer.getViewport(viewport);
  return {
    toneMappingExposure: renderer.toneMappingExposure,
    toneMapping: renderer.toneMapping,
    outputColorSpace: renderer.outputColorSpace,
    autoClear: renderer.autoClear,
    autoClearColor: renderer.autoClearColor,
    autoClearDepth: renderer.autoClearDepth,
    autoClearStencil: renderer.autoClearStencil,
    shadowEnabled: renderer.shadowMap.enabled,
    shadowType: renderer.shadowMap.type,
    shadowAutoUpdate: renderer.shadowMap.autoUpdate,
    shadowNeedsUpdate: renderer.shadowMap.needsUpdate,
    pixelRatio: renderer.getPixelRatio(),
    scissorTest: renderer.getScissorTest(),
    scissor: scissor.clone(),
    viewport: viewport.clone(),
    renderTarget: target,
    activeCubeFace: renderer.getActiveCubeFace(),
    activeMipmapLevel: renderer.getActiveMipmapLevel(),
    clearColor: clearColor.clone(),
    clearAlpha: renderer.getClearAlpha(),
    width: renderer.domElement?.width ?? null,
    height: renderer.domElement?.height ?? null,
  };
}

/**
 * Apply a leased activity's renderer overrides (exposure, etc.).
 * @param {THREE.WebGLRenderer} renderer
 * @param {{ toneMappingExposure?: number }} overrides
 */
export function applyLeasedRendererOverrides(renderer, overrides = {}) {
  if (!renderer) return;
  if (typeof overrides.toneMappingExposure === 'number') {
    renderer.toneMappingExposure = overrides.toneMappingExposure;
  }
}

/**
 * Restore a captured policy to the current viewport (CSS pixels).
 * @param {THREE.WebGLRenderer} renderer
 * @param {ReturnType<typeof captureRendererPolicy>} snapshot
 * @param {{ width?: number, height?: number }} [viewport]
 */
/**
 * Compare live renderer fields to a captured snapshot (post-restore verification).
 * @param {THREE.WebGLRenderer} renderer
 * @param {ReturnType<typeof captureRendererPolicy>} snapshot
 */
export function rendererPolicyMatches(renderer, snapshot) {
  if (!renderer || !snapshot) return false;
  const eps = 1e-6;
  return (
    Math.abs(renderer.toneMappingExposure - snapshot.toneMappingExposure) < eps
    && renderer.toneMapping === snapshot.toneMapping
    && renderer.outputColorSpace === snapshot.outputColorSpace
    && renderer.autoClear === snapshot.autoClear
    && renderer.autoClearColor === snapshot.autoClearColor
    && renderer.autoClearDepth === snapshot.autoClearDepth
    && renderer.autoClearStencil === snapshot.autoClearStencil
    && renderer.shadowMap.enabled === snapshot.shadowEnabled
    && renderer.shadowMap.type === snapshot.shadowType
    && renderer.shadowMap.autoUpdate === snapshot.shadowAutoUpdate
    && renderer.shadowMap.needsUpdate === snapshot.shadowNeedsUpdate
    && renderer.getPixelRatio() === snapshot.pixelRatio
    && renderer.getScissorTest() === snapshot.scissorTest
    && renderer.getRenderTarget() === snapshot.renderTarget
    && renderer.getActiveCubeFace() === snapshot.activeCubeFace
    && renderer.getActiveMipmapLevel() === snapshot.activeMipmapLevel
  );
}

export function restoreRendererPolicy(renderer, snapshot, viewport = {}) {
  if (!renderer || !snapshot) return;
  renderer.toneMappingExposure = snapshot.toneMappingExposure;
  renderer.toneMapping = snapshot.toneMapping;
  renderer.outputColorSpace = snapshot.outputColorSpace;
  renderer.autoClear = snapshot.autoClear;
  renderer.autoClearColor = snapshot.autoClearColor;
  renderer.autoClearDepth = snapshot.autoClearDepth;
  renderer.autoClearStencil = snapshot.autoClearStencil;
  renderer.shadowMap.enabled = snapshot.shadowEnabled;
  renderer.shadowMap.type = snapshot.shadowType;
  renderer.shadowMap.autoUpdate = snapshot.shadowAutoUpdate;
  renderer.shadowMap.needsUpdate = snapshot.shadowNeedsUpdate;
  renderer.setScissorTest(snapshot.scissorTest);
  renderer.setScissor(snapshot.scissor);
  renderer.setViewport(snapshot.viewport);
  renderer.setClearColor(snapshot.clearColor, snapshot.clearAlpha);
  renderer.setRenderTarget(
    snapshot.renderTarget,
    snapshot.activeCubeFace,
    snapshot.activeMipmapLevel,
  );
  const cssW = viewport.width ?? (snapshot.width !== null ? snapshot.width / snapshot.pixelRatio : null);
  const cssH = viewport.height ?? (snapshot.height !== null ? snapshot.height / snapshot.pixelRatio : null);
  if (cssW !== null && cssH !== null && Number.isFinite(cssW) && Number.isFinite(cssH)) {
    renderer.setPixelRatio(snapshot.pixelRatio);
    renderer.setSize(cssW, cssH, false);
  }
}
