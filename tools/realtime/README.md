# GPU rendering harness — `tools/realtime/gpu-harness.html`

Accelerated-vs-control comparison page for openspec change
`add-realtime-gpu-rendering`, tasks **3.2** (harness: same populations,
frame-time capture, honest post-chain delta) and **4.2**
(`renderer_webgpu_fastpath` wired in this harness only; default off
everywhere).

**Standalone.** Nothing in the live game imports anything in this directory.
The page exists to produce measurements and screenshots for the decision
record (task 4.3); it is never shipped.

## Files

| file | role |
| --- | --- |
| `gpu-harness.html` | The page: import map, two arm panes, controls, fixed post-chain notice. |
| `gpu-harness.main.js` | Driver: arms, synthetic 10 Hz tick pipeline, per-arm frame-time capture, device-loss drill, JSON report. |
| `gpu-arm-adapter.js` | The ONE reconciliation point with `src/realtime/gpu/webgpuBackend.js` (factory wrapper + snapshot field-drift fix). |
| `gpu-harness.fixtures.js` | Browser-side mirror of `benchmarks/realtime/lib/fixtures.mjs` (`rng`/`WORLD_BOUNDS`/`makeWorld`/`stepWorld`) — same seeds, same worlds. Mirrored because plain static servers do not reliably serve `.mjs` MIME. |
| `capture-gpu-harness.mjs` | (Pre-existing, not part of this task) headless CDP capture driver; this page keeps its `window.__gpuHarness` + `?capture=1` contract. |

## Serving

Serve the **repo root** statically (the page needs `/node_modules`, `/src`,
and its own directory):

```sh
cd $(git rev-parse --show-toplevel)
python3 -m http.server 8899     # localhost is a secure context; WebGPU needs one
```

Then open:

```
http://127.0.0.1:8899/tools/realtime/gpu-harness.html
```

`npm run dev` also works (Vite rewrites the bare `three` / `three/webgpu`
specifiers; the page's import map is simply inert there).

## The flag gate (task 4.2)

The accelerated arm is constructed **only** when `renderer_webgpu_fastpath`
resolves true, via `resolveFlags()` (`src/realtime/flags.js`) passed through
`shouldConstructWebGpu()` (`src/realtime/gpu/backend.js`) — the seam's own
authority, not a harness-local reimplementation. Default **off** everywhere;
with the flag off the arm is never constructed (no adapter request, no
backend) and the page runs control-only behind a visible banner.

Enable for this page only:

- URL: add `?rt_webgpu_fastpath=1` — note the effective param name is
  `rt_webgpu_fastpath`, not `rt_renderer_webgpu_fastpath` (flags.js maps
  `renderer_webgpu_fastpath` → `rt_webgpu_fastpath`), or
- localStorage: key `afterlight-rt-flags`, value `{"renderer_webgpu_fastpath":true}`.

`?rt_webgpu_fastpath=0` forces off for a run. Disable again by leaving; the
live game never reads this page and never auto-enables the flag.

## Arms

Both panes draw the same deterministic world (fixtures `makeWorld(n, 42)`,
world bounds x −11.3..11.3 / z −9.5..10.3) stepped by the mirrored
`stepWorld` at the 10 Hz server cadence, 10 % of entities changing per tick.
One delta pack per tick (`createPack` shape, `src/realtime/worker/core.js`)
is handed to **both** backends — same packs, true parity. Population is
selectable: 100 / 1000 / 10000 (also `?population=N`).

- **CONTROL** — `THREE.WebGLRenderer` + `CPUThreeBackend`
  (`src/realtime/gpu/backend.js`) with a bound `InstancedMesh`;
  per-frame `sample(null, scratch, {dt})` runs today's exponential lerp
  (rate `min(1, dt·12)`).
- **ACCELERATED** — `WebGPURenderer` (`three/webgpu`, r0.180) +
  `createWebGPUThreeBackend` (`src/realtime/gpu/webgpuBackend.js`, via
  `gpu-arm-adapter.js`). Packs go through the backend's scatter + on-GPU
  checksum path; the draw reads state back through the seam's `sample()`
  (slot indices → ring-evaluated rows) and updates its own `InstancedMesh`.

View modes: *side by side* (visual compare), *control only*, *accelerated
only*. An orbit camera can be disabled for stable screenshot pairs.

### Honest post-chain delta

The fixed on-page notice (and the report's `postChainNotice` field) states:
the live game's ACES tone mapping and UnrealBloomPass composer are
**deliberately not reproduced** — in **either** arm. Control =
`NoToneMapping`, no composer, no shadow maps; accelerated = WebGPURenderer
with explicit `NoToneMapping`. Screenshots from this page document the
rendering-path delta, not parity with the live game. Solving the TSL post
chain is a separate gated change (design.md).

### Device split (read before quoting numbers)

`webgpuBackend.js` creates its own raw WebGPU device; r0.180 three cannot
accept an injected device, so `WebGPURenderer` creates a second one. The
harness therefore feeds the accelerated pane's draw through the seam's
`sample()` read path (the backend's CPU mirrors + ring math — the same
interpolation its on-device vertex stage would run). The fast-path mechanics
(persistent buffers, one `writeBuffer` per section, scatter dispatch, XOR
checksum readback, fencing) all run for real inside the backend. A
zero-copy single-device draw needs three to expose device injection — future
work, noted in the report JSON.

## Frame-time capture

- `rAF` timestamps → per-arm `FrameClock` (rolling 1800-sample ring).
- First 30 frames of each arm are warmup and excluded.
- **Samples are recorded only in exclusive view modes** — with both arms
  rendering from one `rAF`, each arm's frame cost is confounded by the
  other's; the status lines show `capture paused (side-by-side view)`.
- Reported per arm: samples, mean/p50/p95/p99/min/max ms, fps and mean ms of
  the last full second, buffer coverage.
- **download JSON report** button (and `window.__gpuHarness.report`) emits:

```jsonc
{
  "harness": "afterlight-gpu-harness-v1",
  "date": "...", "userAgent": "...",
  "flags": { "renderer_webgpu_fastpath": false, "enablingParam": "rt_webgpu_fastpath=1", "...": "..." },
  "postChainNotice": "Bloom/ACES are NOT reproduced ...",
  "world": { "population": 1000, "seed": 42, "tickMs": 100, "tickFraction": 0.1,
             "ticksApplied": 412, "bounds": { "...": "..." }, "fixtureSource": "mirror of ..." },
  "acceleratedArm": { "flagOn": true, "status": "active|off|failed|fellback",
                      "adapterInfo": { "vendor": "...", "features": ["..."] },
                      "fellBack": null, "deviceSplitNote": "..." },
  "arms": {
    "control":     { "capture": { "samples": 240, "meanMs": 3.1, "p95Ms": 5.2, "...": "..." },
                     "packsApplied": 413, "badReceipts": 0, "lastReceipt": { "...": "..." } },
    "accelerated": { "...": "same shape; capture is null when the arm never ran" }
  }
}
```

Headless one-shot: `node tools/realtime/capture-gpu-harness.mjs
http://127.0.0.1:8899` opens `?capture=1`, which auto-runs a 4 s exclusive
capture per active arm and publishes `window.__gpuHarness.frames` (the
driver polls `frames.count`, screenshots, and writes
`openspec/changes/add-realtime-gpu-rendering/evidence/harness.json`). Its
Chromium flag ladder (`--enable-unsafe-webgpu`, `--use-angle=swiftshader`, …)
applies here unchanged; headed runs for any number you intend to quote
(virtual-time/headless distorts wall-clock).

## Device-loss drill

The **device-loss drill** button calls `reportDeviceLost("harness
device-loss drill (manual)")` on the accelerated backend. The handler
snapshots the dying backend, disposes it, and rebuilds the accelerated pane
on `CPUThreeBackend` seeded from the last acknowledged snapshot (fresh canvas
+ WebGL renderer), logging the snapshot ack
(`{kind, packId, epoch, tick, frameSequence, entities}`). Packs keep flowing
to the fallback backend, so rendering continues on the CPU path — the
design's failure model, exercised in-page. It also fires automatically on
async `device.lost`, validation errors, and checksum mismatch.

## Known limits (do not over-claim)

- Post chain absent in both arms (see notice); no shadows; proxy boxes +
  instanced vegetation, not player rigs — the harness isolates the
  dynamic-entity state path, it does not reproduce the live look.
- Lifecycle churn: all N entities join at tick 0, none leave afterwards
  (join/leave paths are covered by the backends' own tests).
- The CPU arm interpolates exponentially (`sample({dt})`), the GPU arm on the
  shared-clock ring — each arm at its native best, per design.md, so the
  comparison is not strawmanned in either direction.
- SwiftShader/software adapters: expect inflated, CPU-shaped numbers;
  compare arms within a run on the same adapter only.
- The parity line in the log samples 3 entities through both backends each
  second; it demonstrates the read path, it is not a full state diff.

## Drift notes for the orchestrator (one-file fixes)

1. **Snapshot field drift (absorbed in `gpu-arm-adapter.js`):**
   `webgpuBackend.js snapshot()` emits `{entityId, x, z, yaw, …}` while
   `CPUThreeBackend.restoreSnapshot()` consumes `{id, y, …}`. The adapter
   reshapes (`entityId→id`, `y:0`). The backend pair should converge on one
   field name.
2. **`maxSlots` default:** the GPU factory defaults to 8192; the adapter
   passes ≥16384 so population 10000 fits.
3. **Flag param name:** `rt_webgpu_fastpath` per flags.js's key mapping —
   any doc saying `rt_renderer_webgpu_fastpath` is wrong.
4. **Module choice:** the accelerated arm uses `src/realtime/gpu/webgpuBackend.js`
   (the real persistent-buffer + scatter + checksum implementation, per its
   header recipe), **not** `src/realtime/gpu/webgpu.js`'s `WebGPUThreeBackend`
   (the mock-oriented twin used by `session.js`/tests; its non-mock write path
   is not functional).
5. **History:** an earlier same-named `gpu-harness.html` draft (inline script
   against `session.js`, no drill/capture/report/N-select) was replaced by
   this page; two files this task briefly created (`gpu-harness.fixtures.js`,
   `gpu-arm-adapter.js`) were removed by a concurrent writer and recreated.
   If a concurrent writer edits this page again, this README + main.js are
   the spec.
