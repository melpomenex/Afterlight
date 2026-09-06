# Design: realtime GPU rendering

## Context

The renderer audit (`docs/architecture/realtime/` workstream notes; summarized
in compat-report §1) established what must not break: ACES + bloom look,
PCFSoft shadow character, `activeCamera` as the single camera authority (four
consumers), theater DOM-overlay homography, deterministic procedural placement,
and the statics batching discipline. The GPU backend is scoped to *dynamic
entity state* and deliberately leaves the post chain alone.

## Backend seam

```
EntityRenderBackend
  ensureCapacity(n) / applyDeltaPack(pack) / sample(indices, out) / dispose()
  ├── CPUThreeBackend    — Object3D writes + existing InstancedMesh discipline
  └── WebGPUThreeBackend — persistent storage buffers + compute scatter
```

The consumer (worker-pipeline's consumer.js) calls the seam; which backend is
constructed is a capability+flag decision at session start, re-decidable on
device loss. The local player and Kiln stay on the traditional path (camera
and interaction coupling outweigh instance savings at n=2).

## GPU state layout

Persistent storage buffers per component group (contract §2): transforms
(vec4 x,y,z,yaw), motion (vec4), anim/flags (u32-packed). Archetype/variant
live in an instance attribute buffer (changes rarely). Delta packs from the
pipeline map 1:1 onto section payloads, so the scatter compute shader is
format-stable against protocol evolution.

Interpolation: per-instance prev/next ring (2N vec4s + timestamps) updated in
the same scatter pass; vertex stage mixes by alpha = (now - tPrev)/(tNext -
tPrev). CPU arm keeps the current exponential lerp so both arms are visually
compared at their best, not strawmanned.

## Rendering path

The harness page instantiates three's `WebGPURenderer` (r0.180 `three/webgpu`)
for the accelerated arm and the standard pipeline for the control arm, drawing
the same instanced avatar/vegetation populations. The WebGL bloom composer is
not reproduced in the harness — the visual comparison therefore documents the
tonemapping/post delta explicitly instead of pretending parity. Any *future*
integration into the live game must solve the TSL post chain; that is a
separate gated change with the audit's risk list as its checklist.

## Failure model

Async device loss, requestAdapter/requestDevice rejection, and validation
errors all route to `onDeviceLost` → rebuild on CPUThreeBackend from the last
acknowledged snapshot. The probe's checksum validation catches wrong-scatter
states before they can render.

## Risks / Trade-offs

- WebGPU availability is the riskiest dependency in the program — hence the
  probe-first, harness-second, integrate-never-without-parity ordering, and a
  legitimate `park` verdict if availability or stability disappoints.
- At Afterlight's current populations (dozens of avatars), the win may be
  small; the decision record must say so plainly rather than manufacturing a
  justification. The milestone matters for the 50k-entity populations the
  fixtures model.

## Migration Plan

Prototype only in this change. Integration into the live game requires: probe
+ harness numbers, screenshot parity review, governance fallback tests, and
its own gated change flipping `renderer_webgpu_fastpath` per scene class.

## Open Questions

- Indirect draw / GPU culling / LOD: explicitly out of scope until the basic
  scatter path is proven (umbrella governance).
- Octahedral yaw packing and quantized positions: deferred additive section
  encodings, measured before adoption.
