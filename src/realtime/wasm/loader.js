// Browser-side loader for afterlight_realtime.wasm (served from /public/wasm).

let cachedModule = null;

export const DEFAULT_WASM_URL = '/wasm/afterlight_realtime.wasm';

/**
 * Compile the realtime decoder module once. `compileBytes` supports Node tests.
 */
export async function loadWasmModule({ url = DEFAULT_WASM_URL, compileBytes = null } = {}) {
  if (cachedModule) return cachedModule;
  let bytes;
  if (compileBytes) {
    bytes = compileBytes;
  } else {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`wasm fetch failed (${res.status})`);
    bytes = await res.arrayBuffer();
  }
  cachedModule = await WebAssembly.compile(bytes);
  return cachedModule;
}

/** Test-only: drop cached module between cases. */
export function resetWasmModuleCache() {
  cachedModule = null;
}
