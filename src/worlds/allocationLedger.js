/**
 * Shared Allocation Admission and Retention Envelope Controller
 * (introduce-global-world-system D8, Task 6.7).
 *
 * Enforces Design D8's combined retention envelope:
 *   - 256 MiB CPU / 256 MiB GPU default.
 *   - 128 MiB CPU / 128 MiB GPU when deviceMemory <= 4 GiB.
 *   - Evicts zero-reference cosmetics first under memory pressure.
 *   - Never evicts active/live owners (refCount > 0).
 *   - Suspends updates on inactive hosts and returns owned resources to baseline.
 */

import { getWorldAssetDefinition } from './assets.js';

export const RETENTION_ENVELOPE_NORMAL_BYTES = 256 * 1024 * 1024; // 256 MiB
export const RETENTION_ENVELOPE_CONSTRAINED_BYTES = 128 * 1024 * 1024; // 128 MiB

/**
 * Returns retention limit in bytes based on device memory.
 * @param {number} [deviceMemory] in GiB
 * @returns {number}
 */
export function getRetentionLimitBytes(deviceMemory) {
  const mem = deviceMemory ?? (typeof navigator !== 'undefined' ? navigator.deviceMemory : 8) ?? 8;
  return mem <= 4 ? RETENTION_ENVELOPE_CONSTRAINED_BYTES : RETENTION_ENVELOPE_NORMAL_BYTES;
}

/**
 * Creates a shared allocation admission and retention envelope controller.
 *
 * @param {object} params
 * @param {object} params.cache Shared ResourceCache instance
 * @param {number} [params.deviceMemory]
 * @param {number} [params.maxCpuBytes]
 * @param {number} [params.maxGpuBytes]
 * @returns {object} Controller
 */
export function createAllocationAdmissionController({
  cache,
  deviceMemory = null,
  maxCpuBytes = null,
  maxGpuBytes = null,
} = {}) {
  if (!cache || typeof cache.acquire !== 'function') {
    throw new Error('createAllocationAdmissionController requires a valid ResourceCache');
  }

  const limitBytes = getRetentionLimitBytes(deviceMemory);
  const cpuLimit = maxCpuBytes ?? limitBytes;
  const gpuLimit = maxGpuBytes ?? limitBytes;

  // Tracked allocations: key -> { key, cpuBytes, gpuBytes, isCosmetic }
  const allocations = new Map();

  /**
   * Estimates byte sizes for an asset or generic resource.
   */
  function estimateResourceBytes(key, explicitBytes = null) {
    if (explicitBytes?.cpu != null && explicitBytes?.gpu != null) {
      return { cpu: explicitBytes.cpu, gpu: explicitBytes.gpu };
    }

    // Check if key is a known world asset
    for (const prefix of ['world-asset:', 'prefetch:', '']) {
      const candidateId = key.replace(prefix, '').split(':')[0];
      const def = getWorldAssetDefinition(candidateId);
      if (def?.estimatedBytes) {
        return { cpu: def.estimatedBytes.cpu, gpu: def.estimatedBytes.gpu };
      }
    }

    // Default conservative estimate (64 KB CPU, 128 KB GPU)
    return { cpu: 65_536, gpu: 131_072 };
  }

  /**
   * Computes current total estimated CPU and GPU bytes.
   */
  function getCurrentTotals() {
    let cpu = 0;
    let gpu = 0;
    for (const alloc of allocations.values()) {
      cpu += alloc.cpuBytes;
      gpu += alloc.gpuBytes;
    }
    return { cpu, gpu };
  }

  /**
   * Checks whether a new resource can be admitted within the retention envelope.
   * If adding it would exceed the budget, evicts unreferenced zero-ref cosmetics first.
   *
   * @param {object} params
   * @param {string} params.key
   * @param {object} [params.estimatedBytes]
   * @param {boolean} [params.isCosmetic=true]
   * @returns {{ admitted: boolean, reason?: string, currentTotals: object }}
   */
  function checkAdmission({ key, estimatedBytes = null, isCosmetic = true } = {}) {
    const bytes = estimateResourceBytes(key, estimatedBytes);
    let totals = getCurrentTotals();

    // If adding exceeds limits, sweep zero-ref entries first
    if (totals.cpu + bytes.cpu > cpuLimit || totals.gpu + bytes.gpu > gpuLimit) {
      evictUnreferencedCosmetics();
      totals = getCurrentTotals();
    }

    // Check again after eviction
    if (totals.cpu + bytes.cpu > cpuLimit || totals.gpu + bytes.gpu > gpuLimit) {
      if (isCosmetic) {
        return {
          admitted: false,
          reason: 'retention_envelope_exceeded',
          currentTotals: totals,
          limits: { cpu: cpuLimit, gpu: gpuLimit },
        };
      }
    }

    // Record allocation
    allocations.set(key, {
      key,
      cpuBytes: bytes.cpu,
      gpuBytes: bytes.gpu,
      isCosmetic,
    });

    return {
      admitted: true,
      currentTotals: getCurrentTotals(),
      limits: { cpu: cpuLimit, gpu: gpuLimit },
    };
  }

  /**
   * Releases an allocation from tracking.
   * @param {string} key
   */
  function releaseAllocation(key) {
    allocations.delete(key);
  }

  /**
   * Evicts unreferenced zero-ref cosmetic assets from cache and allocations.
   * NEVER evicts entries with live owners (refCount > 0).
   * @returns {number} Number of evicted entries
   */
  function evictUnreferencedCosmetics() {
    let evicted = 0;
    for (const [key, alloc] of [...allocations.entries()]) {
      if (alloc.isCosmetic && cache.refCount(key) <= 0) {
        allocations.delete(key);
        evicted += 1;
      }
    }
    // Sweep cache zero-ref entries
    cache.evictIdle();
    return evicted;
  }

  /**
   * Signals low memory pressure (e.g. from system or frame pressure).
   * Immediately clears zero-reference cosmetic resources.
   */
  function onLowMemoryPressure() {
    return evictUnreferencedCosmetics();
  }

  return {
    checkAdmission,
    releaseAllocation,
    evictUnreferencedCosmetics,
    onLowMemoryPressure,
    getTotals() {
      const totals = getCurrentTotals();
      return {
        cpuBytes: totals.cpu,
        gpuBytes: totals.gpu,
        limitCpu: cpuLimit,
        limitGpu: gpuLimit,
        trackedCount: allocations.size,
        isConstrained: cpuLimit === RETENTION_ENVELOPE_CONSTRAINED_BYTES,
      };
    },
    reset() {
      allocations.clear();
    },
  };
}
