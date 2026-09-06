// Capability negotiation helpers (contract §5): additive JSON fields on
// hello/welcome only. Absence anywhere = legacy mode. Tolerant by design —
// legacy peers ignore unknown fields.

import { RT_PROTOCOL } from './constants.js';

// Client → hello payload.
export function buildHelloRt({ webgpu = false, wasm = false, protocols = [RT_PROTOCOL] } = {}) {
  return { protocols: protocols.slice(), webgpu: !!webgpu, wasm: !!wasm };
}

// Server → welcome payload.
export function buildWelcomeRt({ protocol = RT_PROTOCOL, snapshotHz = 10 } = {}) {
  return { protocol, snapshot_hz: snapshotHz };
}

// Parse client hello `rt` (unknown shapes → null = legacy).
export function parseHelloRt(hello) {
  const rt = hello && typeof hello === 'object' ? hello.rt : null;
  if (!rt || typeof rt !== 'object' || !Array.isArray(rt.protocols)) return null;
  return {
    protocols: rt.protocols.filter((p) => typeof p === 'string' && p === RT_PROTOCOL),
    webgpu: rt.webgpu === true,
    wasm: rt.wasm === true,
  };
}

// Parse server welcome `rt` (absence → null = legacy).
export function parseWelcomeRt(welcome) {
  const rt = welcome && typeof welcome === 'object' ? welcome.rt : null;
  if (!rt || typeof rt !== 'object' || rt.protocol !== RT_PROTOCOL) return null;
  const hz = Number(rt.snapshot_hz);
  return { protocol: rt.protocol, snapshotHz: Number.isFinite(hz) && hz > 0 ? hz : 10 };
}
