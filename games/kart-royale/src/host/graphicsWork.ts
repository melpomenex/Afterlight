/**
 * Hosted GPU work brackets (fix-kart-royale-instant-entry D4).
 *
 * When the Afterlight host supplies `runGraphicsTransaction`, Kart boot/prepare
 * routes renderer mutations through it. A synchronous fallback mirrors the same
 * capture/restore contract for resize paths that cannot await.
 */
import * as THREE from 'three';
import type { Ctx } from '../types';

type GpuFn = () => void | Promise<void>;

type GraphicsTxn = (fn: (ctx: {
  renderer: THREE.WebGLRenderer;
  viewport: { width: number; height: number };
}) => void | Promise<void>) => Promise<void>;

type CtxWithGpu = Ctx & {
  runGraphicsTransaction?: GraphicsTxn | null;
  perfSpan?: (name: string, action: 'start' | 'end', meta?: Record<string, unknown>) => void;
};

function captureSnapshot(renderer: THREE.WebGLRenderer) {
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

function restoreSnapshot(
  renderer: THREE.WebGLRenderer,
  snapshot: ReturnType<typeof captureSnapshot>,
  viewport: { width: number; height: number },
) {
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

function viewportFromCtx(ctx: Ctx) {
  return { width: ctx.width, height: ctx.height };
}

export function hostedGpuAvailable(ctx: Ctx): boolean {
  return typeof (ctx as CtxWithGpu).runGraphicsTransaction === 'function';
}

/** Async GPU batch — used during awaited boot init and prewarm. */
export async function runHostedGpuWork(ctx: Ctx, batch: string, fn: GpuFn): Promise<void> {
  const run = (ctx as CtxWithGpu).runGraphicsTransaction;
  const perfSpan = (ctx as CtxWithGpu).perfSpan;
  if (typeof run === 'function') {
    perfSpan?.(`gpu:${batch}`, 'start');
    try {
      await run(async () => { await fn(); });
    } finally {
      perfSpan?.(`gpu:${batch}`, 'end');
    }
    return;
  }
  await fn();
}

/** Synchronous GPU batch — used from resize and readiness probes. */
export function runHostedGpuWorkSync(ctx: Ctx, batch: string, fn: () => void): void {
  const run = (ctx as CtxWithGpu).runGraphicsTransaction;
  const perfSpan = (ctx as CtxWithGpu).perfSpan;
  const renderer = ctx.renderer;
  if (typeof run === 'function' && renderer) {
    perfSpan?.(`gpu:${batch}`, 'start');
    const snap = captureSnapshot(renderer);
    const viewport = viewportFromCtx(ctx);
    try {
      fn();
    } finally {
      restoreSnapshot(renderer, snap, viewport);
      perfSpan?.(`gpu:${batch}`, 'end');
    }
    return;
  }
  fn();
}

export async function runHostedGpuWorkFromOptions(
  options: { runGraphicsTransaction?: GraphicsTxn | null },
  renderer: THREE.WebGLRenderer,
  viewport: { width: number; height: number },
  batch: string,
  fn: GpuFn,
): Promise<void> {
  const run = options.runGraphicsTransaction;
  if (typeof run === 'function') {
    await run(async () => { await fn(); });
    return;
  }
  await fn();
}

export function runHostedGpuWorkSyncFromOptions(
  options: { runGraphicsTransaction?: GraphicsTxn | null },
  renderer: THREE.WebGLRenderer,
  viewport: { width: number; height: number },
  batch: string,
  fn: () => void,
): void {
  const run = options.runGraphicsTransaction;
  if (typeof run === 'function') {
    const snap = captureSnapshot(renderer);
    try {
      fn();
    } finally {
      restoreSnapshot(renderer, snap, viewport);
    }
    return;
  }
  fn();
}
