// Granular acceleration flags (governance capability: no master switch).
// Resolution order: URL params (?rt_binary=1&rt_wasm=0…) override
// localStorage ('afterlight-rt-flags') overrides defaults. All default OFF,
// so an unconfigured game is byte-identical to the legacy path.
//
// realtime_binary  — accept negotiated binary frames (decode via shared/realtime)
// realtime_wasm    — prefer the WASM decoder when binary is on (JS decoder fallback)
// realtime_worker  — decode in a Web Worker when binary is on (main-thread fallback)
// renderer_webgpu_fastpath — experimental GPU entity backend, harness-only.
// Default OFF. The live renderer (main.js / wireRealtime) never constructs
// WebGPUThreeBackend from this flag.

const KEYS = ['realtime_binary', 'realtime_wasm', 'realtime_worker', 'renderer_webgpu_fastpath'];

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
    // malformed or restricted storage: defaults apply (session-only tolerance)
  }
  return out;
}

// Sources are injected so tests stay headless; browser callers use resolveFlags().
export function resolveFlagsFrom({ search = '', storage = null } = {}) {
  const flags = {
    realtime_binary: false,
    realtime_wasm: false,
    realtime_worker: false,
    renderer_webgpu_fastpath: false,
  };
  Object.assign(flags, fromLocalStorage(storage), fromUrl(search));
  // wasm/worker require binary; nothing enables anything else implicitly.
  if (!flags.realtime_binary) {
    flags.realtime_wasm = false;
    flags.realtime_worker = false;
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
