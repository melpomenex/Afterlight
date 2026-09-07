// gpu-arm-adapter.js — the ONE reconciliation point between the GPU harness
// page (tools/realtime/gpu-harness.html + gpu-harness.main.js) and the
// accelerated arm's backend module at src/realtime/gpu/webgpuBackend.js
// (openspec change add-realtime-gpu-rendering, tasks 3.2 + 4.2).
//
// webgpuBackend.js now EXISTS (wave-2 landed while this page was being
// written), so this adapter is thin: it wraps the real
// createWebGPUThreeBackend factory and documents the two cross-module drifts
// the harness had to absorb. If the GPU module's API moves again, fix it HERE
// (and in gpu-harness.main.js's sample write-out), not across the page.
//
//   import { createAcceleratedBackend, adaptSnapshotForCpu } from './gpu-arm-adapter.js';

// The real factory (verified against webgpuBackend.js):
//   await createWebGPUThreeBackend({ device?, navigator?, onUnavailable?,
//                                    ...WebGPUThreeBackendOpts })
//     → Promise<WebGPUThreeBackend | null>  — null + onUnavailable(reason)
//       for every boring unavailability; NEVER throws for unavailability.
// backendOpts: { maxSlots (default 8192 — the harness passes a larger value
// so N=10000 fits), tickRate, now, timeOrigin }.
// Backend surface (verified): ensureCapacity(n), applyDeltaPack(pack) →
// Promise<receipt{ok, packId, epoch, tick, frameSequence, appliedRows, …}>,
// slotOf(entityId), sample(slotIndices, out) → setPlayer-shaped rows,
// snapshot(), dispose(), onDeviceLost(handler), reportDeviceLost(reason),
// sharedNowSeconds(), getRenderState().
export async function createAcceleratedBackend({
  population = 0,
  onDeviceLost = null,
  onUnavailable = null,
  maxSlots = null,
}) {
  const { createWebGPUThreeBackend } = await import('/src/realtime/gpu/webgpuBackend.js');
  const backend = await createWebGPUThreeBackend({
    // maxSlots must cover the largest selectable population; the module
    // default (8192) would silently clamp N=10000.
    maxSlots: maxSlots ?? Math.max(16384, population * 2),
    onUnavailable: (reason) => {
      if (onUnavailable) onUnavailable(reason);
      else console.info('[gpu-harness] accelerated arm unavailable:', reason);
    },
  });
  if (!backend) return { ok: false, reason: 'createWebGPUThreeBackend resolved null (WebGPU unavailable)' };
  let unsub = null;
  if (onDeviceLost) {
    try { unsub = backend.onDeviceLost(onDeviceLost) ?? null; } catch { /* surfaced at drill time */ }
  }
  return { ok: true, backend, unsubDeviceLost: unsub };
}

// DRIFT (reported; one-file fix lives here): the GPU backend's snapshot()
// emits entities as { entityId, guestId, x, z, yaw, flags } while
// CPUThreeBackend.restoreSnapshot() consumes { id, guestId, x, y, z, yaw,
// flags, archetype, variant } (it reads e.id and e.y). Left alone, a
// device-loss rebuild would collapse every entity into one `undefined`-keyed
// slot at y=0. This adapter reshapes the snapshot so the harness-side rebuild
// is faithful; the backend pair should eventually agree on one field name.
export function adaptSnapshotForCpu(snapshot) {
  if (!snapshot) return null;
  return {
    ...snapshot,
    entities: (snapshot.entities ?? []).map((e) => ({
      id: e.id ?? e.entityId,
      guestId: e.guestId ?? null,
      x: e.x ?? 0,
      y: e.y ?? 0,
      z: e.z ?? 0,
      yaw: e.yaw ?? 0,
      flags: e.flags ?? 0,
      archetype: e.archetype ?? 0,
      variant: e.variant ?? 0,
    })),
  };
}
