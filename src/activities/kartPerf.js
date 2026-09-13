/**
 * Opt-in bounded performance instrumentation for Kart Royale entry and lifecycle.
 * (fix-kart-royale-instant-entry Phase 1, Design D10).
 *
 * Mark prefix format: afterlight:kart:<resource-generation>:<attempt>:<phase>
 * Bounded storage: at most 20 recent attempts (ring buffer).
 * Development-only / opt-in via ?debug=1 or window.__afterlightKartPerfEnabled.
 */

import { estimateWorldAssetBytes } from '../worlds/assets.js';

const MAX_RECORDS = 20;
const records = [];
let activeAttempt = null;

function sanitizeDiagnosticString(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/(?:token|auth|bearer|pass|credential|session|key)[=:\s]+[A-Za-z0-9-_.~%+/]{16,}/gi, '[REDACTED]')
    .replace(/bearer\s+[A-Za-z0-9-_.~%+/]+/gi, 'Bearer [REDACTED]');
}

export function isPerfEnabled() {
  if (typeof globalThis !== 'undefined' && globalThis.__afterlightKartPerfEnabled !== undefined) {
    return Boolean(globalThis.__afterlightKartPerfEnabled);
  }
  if (typeof window === 'undefined') return false;
  try {
    return new URLSearchParams(window.location.search).has('debug');
  } catch {
    return false;
  }
}

export function setPerfEnabled(enabled) {
  if (typeof globalThis !== 'undefined') {
    globalThis.__afterlightKartPerfEnabled = Boolean(enabled);
  }
}

function detectEnvironment() {
  if (typeof window === 'undefined') {
    return { platform: 'node', isSoftwareGpu: false };
  }
  const gl = typeof document !== 'undefined' ? document.createElement('canvas').getContext('webgl') : null;
  let gpuBackend = 'unknown';
  let isSoftwareGpu = false;
  if (gl) {
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    if (dbg) {
      gpuBackend = gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || 'unknown';
    } else {
      gpuBackend = gl.getParameter(gl.RENDERER) || 'unknown';
    }
    const lower = gpuBackend.toLowerCase();
    isSoftwareGpu = lower.includes('swiftshader') || lower.includes('llvmpipe') || lower.includes('software');
  }
  return {
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
      dpr: window.devicePixelRatio || 1,
    },
    gpuBackend,
    isSoftwareGpu,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
  };
}

export function startAttempt({
  generation = 0,
  attemptId = 1,
  route = 'cold',
  world = null,
} = {}) {
  if (!isPerfEnabled()) return null;

  const env = detectEnvironment();
  const idStr = String(attemptId);
  const worldStateObj = typeof globalThis !== 'undefined' ? globalThis.__afterlightWorldState : null;
  const worldSnap = worldStateObj?.snapshot?.() ?? null;
  const worldSel = world?.selection
    || worldSnap?.selection
    || (worldSnap?.worldId ? { worldId: worldSnap.worldId, variantId: worldSnap.variantId ?? null } : null)
    || null;
  const worldRev = world?.appliedRevision ?? worldSnap?.revision ?? 1;
  const actualHost = world?.actualHost ?? 'kart';
  const fallback = world?.fallback ?? false;
  const assets = world?.assets ?? [];
  const byteEstimates = world?.byteEstimates ?? estimateWorldAssetBytes(assets);

  const record = {
    attemptId: idStr,
    generation,
    route, // 'cold' | 'prefetched' | 'ready' | 'suspended'
    status: 'pending', // 'pending' | 'success' | 'cancelled' | 'failed'
    error: null,
    world: {
      selection: worldSel ? { worldId: worldSel.worldId, variantId: worldSel.variantId || null } : null,
      actualHost,
      appliedRevision: worldRev,
      fallback,
      assets: [...assets],
      byteEstimates,
    },
    startTime: performance.now(),
    endTime: null,
    totalDurationMs: null,
    spans: {},
    marks: [],
    environment: env,
  };

  activeAttempt = record;
  records.push(record);
  if (records.length > MAX_RECORDS) {
    records.shift();
  }

  recordMark('attempt-start', { route });
  return record;
}

export function recordWorldContext(context) {
  if (!activeAttempt) return;
  if (!activeAttempt.world) activeAttempt.world = {};
  if (context?.selection) activeAttempt.world.selection = { ...context.selection };
  if (context?.actualHost !== undefined) activeAttempt.world.actualHost = context.actualHost;
  if (context?.appliedRevision !== undefined) activeAttempt.world.appliedRevision = context.appliedRevision;
  if (context?.fallback !== undefined) activeAttempt.world.fallback = context.fallback;
  if (context?.assets) {
    activeAttempt.world.assets = [...context.assets];
    activeAttempt.world.byteEstimates = context.byteEstimates || estimateWorldAssetBytes(context.assets);
  }
  if (context?.byteEstimates) activeAttempt.world.byteEstimates = context.byteEstimates;
}

export function getActiveAttempt() {
  return activeAttempt;
}

export function recordMark(phase, data = null) {
  if (!isPerfEnabled() || !activeAttempt) return;
  const now = performance.now();
  const markName = `afterlight:kart:${activeAttempt.generation}:${activeAttempt.attemptId}:${phase}`;
  try {
    if (typeof performance !== 'undefined' && performance.mark) {
      performance.mark(markName);
    }
  } catch {}
  activeAttempt.marks.push({
    name: phase,
    time: now,
    data,
  });
}

export function startSpan(name, meta = null) {
  if (!isPerfEnabled() || !activeAttempt) return;
  const start = performance.now();
  activeAttempt.spans[name] = {
    start,
    end: null,
    durationMs: null,
    meta: meta || {},
  };
  recordMark(`${name}:start`, meta);
}

export function endSpan(name, meta = null) {
  if (!isPerfEnabled() || !activeAttempt) return;
  const span = activeAttempt.spans[name];
  const end = performance.now();
  if (span) {
    span.end = end;
    span.durationMs = Math.max(0, end - span.start);
    if (meta) {
      span.meta = { ...span.meta, ...meta };
    }
  } else {
    activeAttempt.spans[name] = {
      start: end,
      end,
      durationMs: 0,
      meta: meta || {},
    };
  }
  recordMark(`${name}:end`, meta);
}

export function endAttempt(status = 'success', error = null) {
  if (!activeAttempt) return;
  const end = performance.now();
  activeAttempt.status = status;
  activeAttempt.error = error ? sanitizeDiagnosticString(String(error?.message || error)) : null;
  activeAttempt.endTime = end;
  activeAttempt.totalDurationMs = Math.max(0, end - activeAttempt.startTime);
  recordMark('attempt-end', { status, error: activeAttempt.error });
  activeAttempt = null;
}

export function clearRecords() {
  records.length = 0;
  activeAttempt = null;
  try {
    if (typeof performance !== 'undefined' && performance.clearMarks) {
      // Clear any afterlight:kart marks
      const marks = performance.getEntriesByType?.('mark') || [];
      for (const m of marks) {
        if (m.name.startsWith('afterlight:kart:')) {
          performance.clearMarks(m.name);
        }
      }
    }
  } catch {}
}

export function getRecords() {
  return records.map((r) => ({
    ...r,
    world: r.world ? { ...r.world, assets: [...(r.world.assets || [])] } : null,
    spans: { ...r.spans },
    marks: [...r.marks],
  }));
}

export function exportJson() {
  return JSON.stringify(getRecords(), null, 2);
}

// Global debug inspection hook
if (typeof globalThis !== 'undefined') {
  globalThis.__kartPerf = {
    isPerfEnabled,
    setPerfEnabled,
    startAttempt,
    endAttempt,
    recordWorldContext,
    startSpan,
    endSpan,
    recordMark,
    getRecords,
    clearRecords,
    exportJson,
  };
}
