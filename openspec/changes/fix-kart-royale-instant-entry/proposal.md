## Why

Kart Royale currently performs its procedural world construction and GPU preparation after cabinet interaction, with a reported approximately 30-second wait and an exposed unfinished scene. Preparation must precede normal entry, and presentation must never reveal an unposed camera or incomplete destination.

## What Changes

- Instrument the actual interaction, admission, import, procedural initialization, GPU preparation, first-frame and input-ready critical paths before optimizing; preserve measurements as implementation evidence.
- Add staged Theater-idle module prefetch and proximity-driven, interruptible preparation using the existing activity lifecycle and shared WebGL renderer.
- Introduce a readiness barrier covering complete world/spawn data, a posed camera, prepared render resources and a successfully rendered hidden frame; acquire visible presentation only after that barrier and authoritative admission.
- Retain at most one prepared Kart runtime in a bounded suspended cache; detach session input/HUD/audio and release admission on exit, then reuse the prepared world on subsequent entry.
- Audit cancellation, renderer-state transactions, disposal and module-level resource ownership before enabling background GPU work or retention.
- Preserve character selection and the normal race countdown; measure those intentional interactions separately from loading latency.

## Capabilities

### New Capabilities

- `kart-royale-entry-readiness`: staged preparation, safe atomic activation, bounded retention, failure recovery and measurable entry/Theater performance contracts.

### Modified Capabilities

None in `openspec/specs/`. The Kart capabilities exist only in the unarchived `integrate-kart-royale-arcade` change. This change explicitly supersedes its E-only download/bystander policy and optional warm-cache implementation details, while preserving single-renderer ownership, admission, racing quality and deterministic exit. See design reconciliation; do not mark unfinished predecessor tasks complete merely by association.

## Impact

Host: `src/activities/kart-royale.js`, `kart-royale/controller.js`, `resourceCache.js`, `runtime.js`, `viewLease.js`, and the frame/renderer ownership seam in `src/main.js`. Game: `games/kart-royale/src/host/{index,runtime,types}.ts`, `core/Prewarm.ts`, renderer, procedural world/material/kart systems and lifecycle-owned UI/audio/input. Tests: existing Kart controller/cabinet/browser gates plus new readiness, cancellation, resource and timing coverage. Documentation: arcade authoring, controls/performance behavior and reconciliation evidence.

No new runtime dependency, second renderer/canvas/loop, separate application, networking rewrite, visual downgrade, or production change is included in this proposal. Asset compression and worker extraction are conditional follow-up work only when baseline attribution justifies them.
