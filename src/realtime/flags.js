// Granular acceleration flags (governance capability: no master switch).
// Resolution order: URL params (?rt_binary=1&rt_wasm=0…) override
// localStorage ('afterlight-rt-flags') override Vite env defaults override
// built-in defaults. Unconfigured game = legacy path (byte-identical).

const KEYS = [
  'realtime_binary',
  'realtime_wasm',
  'realtime_worker',
  'renderer_webgpu_fastpath',
  'rt_entity_seam',
];

const ENV_MAP = {
  realtime_binary: 'VITE_RT_BINARY',
  realtime_wasm: 'VITE_RT_WASM',
  realtime_worker: 'VITE_RT_WORKER',
  renderer_webgpu_fastpath: 'VITE_RT_WEBGPU_FASTPATH',
  rt_entity_seam: 'VITE_RT_ENTITY_SEAM',
};

function fromUrl(search) {
  const out = {};
  if (typeof search !== 'string') return out;
  for (const key of KEYS) {
    const v = new URLSearchParams(search).get(key.replace('realtime_', 'rt_').replace('renderer_', 'rt_'));
    if (v === '1' || v === 'true') out[key] = true;
    else if (v === '0' || v === 'false') out[key] = false;
  }
  return out;
}

function fromLocalStorage(store) {
  const out = {};
  try {
    const raw = typeof store?.getItem === 'function' ? store.getItem('afterlight-rt-flags') : null;
    if (!raw) return out;
    const obj = JSON.parse(raw);
    if (obj && typeof obj === 'object') {
      for (const key of KEYS) if (typeof obj[key] === 'boolean') out[key] = obj[key];
    }
  } catch {
    // malformed or restricted storage: defaults apply
  }
  return out;
}

function fromEnv(envOverride) {
  const out = {};
  const env = envOverride ?? (typeof import.meta !== 'undefined' ? import.meta.env : {});
  for (const [key, envKey] of Object.entries(ENV_MAP)) {
    const v = env?.[envKey];
    if (v === '1' || v === 'true') out[key] = true;
    else if (v === '0' || v === 'false') out[key] = false;
  }
  return out;
}

export function resolveFlagsFrom({ search = '', storage = null, env = null } = {}) {
  const flags = {
    realtime_binary: false,
    realtime_wasm: false,
    realtime_worker: false,
    renderer_webgpu_fastpath: false,
    rt_entity_seam: false,
  };
  Object.assign(flags, fromEnv(env), fromLocalStorage(storage), fromUrl(search));

  if (!flags.realtime_binary) {
    flags.realtime_wasm = false;
    flags.realtime_worker = false;
  }

  // Phase 1: entity seam follows binary unless explicitly forced alone.
  if (flags.realtime_binary && !('rt_entity_seam' in fromUrl(search)) && !fromLocalStorage(storage).rt_entity_seam) {
    flags.rt_entity_seam = true;
  }

  // WebGPU fast path stays harness-only unless explicitly enabled (Phase 5).
  if (!flags.renderer_webgpu_fastpath) {
    // live game never auto-enables WebGPU from binary/worker alone
  }

  return flags;
}

export function resolveFlags() {
  let search = '';
  try { search = typeof location !== 'undefined' ? location.search : ''; } catch { /* headless */ }
  let storage = null;
  try { storage = typeof localStorage !== 'undefined' ? localStorage : null; } catch { /* headless */ }
  return resolveFlagsFrom({ search, storage });
}
