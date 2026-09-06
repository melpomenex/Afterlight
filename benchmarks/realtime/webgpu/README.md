# WebGPU persistent-transform-buffer probe — `benchmarks/realtime/webgpu`

Self-contained browser probe for `afterlight-soa-v0` (see
`docs/architecture/realtime/contract.md` §2 entity model, §7 client layering,
and compat-report §1 for why the renderer must stay Three.js). No imports, no
build step: `probe.html` is a single page with an inline module script.

## What it measures

Three strategies for applying a frame's changed entity transforms
(`x, y, z, yaw` = vec4\<f32\>, 16 B/entity) into a **persistent GPU storage
buffer** of N vec4s:

| mode | per frame | what it tells us |
|---|---|---|
| `full` | **one** `queue.writeBuffer` of the entire `N*16` B buffer | baseline cost of ignoring deltas |
| `partial` | **one** `queue.writeBuffer` per changed entity (16 B each) | the anti-pattern: per-call host validation/copy-enqueue overhead × changed |
| `scatter` | **one** `queue.writeBuffer` of a compact delta — `u32 count` header + `changed` u32 ids + packed f32x4 values (20 B/entity) — then **one compute dispatch**: `positions[ids[i]] = delta.values[i]`, workgroups = ceil(changed/64) | contract §7's "compact upload + compute scatter" shape |

Matrix: `N ∈ {1000, 10000, 50000}` × `changed ∈ {1, 10, 100, 1000, 10000}`
(clamped ≤ N; a `*` in the table marks a clamp). Changed ids are dense slots
sampled with a seeded LCG (same convention as `lib/fixtures.mjs`); the
id→slot remap of contract §2 is a CPU-side concern and deliberately out of
scope for this GPU probe.

### Iterations and timing

- Warmup 3–5, then **150 measured iterations** for cheap cells, 60 for heavy
  cells (50k full writes, 10k-entity partials), floor 25; a 6 s per-cell budget
  truncates pathological cells and records `truncated: true`.
- **wall-clock (always reported):** `performance.now()` around each frame —
  `[writeBuffer(s) (+ encode/submit for scatter)] → submit → onSubmittedWorkDone`.
  Includes a ~0.1–0.5 ms completion-signal latency floor shared by all modes,
  so compare modes within a row. CPU prep (`computeValues`/`applyMirror`/
  `packDelta`, the "decode" side) runs **outside** the timed region.
- **GPU timestamps (when the adapter exposes `timestamp-query`, Chromium 121+):**
  - `scatter`: elapsed of the scatter compute pass only (`queue.writeBuffer` is
    not encoder-visible, so the delta upload cannot appear in timestamps).
  - `full` / `partial`: an encoder-visible analogue — a `staging → positions`
    `copyBufferToBuffer` (whole buffer; or 16 B per changed entity for
    partial) bracketed by `encoder.writeTimestamp`. Labelled `gpuScope` in the
    JSON; if `encoder.writeTimestamp` is rejected, scatter falls back to
    pass-level `timestampWrites` and full/partial GPU numbers are omitted.
  - Ticks are converted at 1 ns (Dawn convention; the JS API exposes no
    timestamp period).

### Correctness (fails loudly, never silently)

After each mode's measured run a **checksum compute pass** XOR-folds the bit
patterns of all N vec4s into a small `mapAsync` readback buffer and compares
against a CPU mirror. XOR is order-independent and bit-exact, so any lost or
misdirected write flips `correctness` to `"FAILED"`, prints a banner in the
`<pre>`, and records `checksum: {passed: false, expectedXor, actualXor}` on the
cell. A **render-read check** then draws one frame of N instanced quads whose
vertex stage reads `positions[instance_index]` from the same persistent buffer
(the Three.js-InstancedMesh analogue); it passes iff the submit completes with
no device/validation errors. Adapter absence, `requestDevice` failure, or
mid-run device loss produce `{supported: false, reason: "..."}` (cells
collected before a loss remain in `matrix`).

## How to run

```bash
cd benchmarks/realtime/webgpu
python3 -m http.server 8899   # any static server; localhost is a secure context
```

Then, in order, use the first ladder rung that yields an adapter:

```bash
# 1. real GPU, headed — preferred for real timing numbers
chromium http://127.0.0.1:8899/probe.html

# 2. real GPU, explicit opt-in (some Linux builds gate WebGPU)
chromium --enable-unsafe-webgpu http://127.0.0.1:8899/probe.html

# 3. software rendering (SwiftShader via ANGLE) — headless-friendly, deterministic
chromium --enable-unsafe-webgpu --use-angle=swiftshader http://127.0.0.1:8899/probe.html
#    or pin the adapter explicitly (older flag style):
chromium --use-gl=angle --use-webgpu-adapter=swiftshader http://127.0.0.1:8899/probe.html
```

Headless capture:

```bash
chromium --headless=new --enable-unsafe-webgpu --use-angle=swiftshader \
  --virtual-time-budget=120000 --dump-dom \
  http://127.0.0.1:8899/probe.html > probe-dom.html
# results are in the <pre id="out"> of the dumped DOM
```

Caveat: `--virtual-time-budget` fast-forwards timers and can distort wall-clock
numbers — use headless for capability + correctness smoke tests, and headed
Chromium (or Playwright/Puppeteer) when the µs values will be cited. Headless
runs that find no adapter exit with `{supported: false, reason}` instead of
erroring; try `--enable-features=Vulkan` for real-GPU-on-Linux or inspect
`chrome://gpu`.

## Reading results

- Human-readable table: the `<pre>` on the page.
- Machine-readable: `window.__probeResults` — from DevTools:
  `copy(JSON.stringify(window.__probeResults, null, 2))`.

Shape (abridged):

```jsonc
{
  "supported": true,
  "timestampQuery": true,
  "tsEncoderWriteTimestamp": true,
  "adapter": { "vendor": "...", "architecture": "..." },
  "correctness": "passed",            // or "FAILED" — never ignore
  "renderCheck": { "passed": true, "instances": 50000 },
  "matrix": [{
    "N": 10000, "requestedChanged": 10000, "changed": 10000, "clamped": false,
    "modes": {
      "full":    { "iterations": 60, "wallMedianUs": 0, "wallMinUs": 0,
                   "gpuMedianUs": 0, "gpuMinUs": 0, "gpuScope": "...",
                   "bytesPerFrame": 160000, "writeBufferCallsPerFrame": 1,
                   "checksum": { "passed": true, "expectedXor": "0x...", "actualXor": "0x..." } },
      "partial": { "...": "same shape; writeBufferCallsPerFrame == changed" },
      "scatter": { "...": "gpuScope = scatter compute pass elapsed" }
    }
  }]
}
```

## Expected runtime hazards

- **SwiftShader** frequently lacks `timestamp-query`, or reports all-zero
  timestamps → automatic wall-clock fallback (`timingNotes` records it, `gpu*`
  fields stay null/zero); expect µs-scale numbers inflated toward CPU copy speed.
- **Chromium < 121** lacks `timestamp-query` entirely → wall-clock only.
- `encoder.writeTimestamp` rejection → pass-level fallback for scatter; full/
  partial lose their GPU-side analogue (still wall-clock timed).
- The per-frame `onSubmittedWorkDone` latency floor compresses wall-clock
  differences for tiny frames (e.g. `changed=1`); the scatter GPU-timestamp
  column is the clean kernel number there.
- A failed checksum **invalidates the run** — fix or file before quoting data.
