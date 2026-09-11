## Context

Kart Royale renders through one `EffectComposer` chain (`games/kart-royale/src/render/PostFX.ts`) on a single shared `WebGLRenderer` (Afterlight's canvas in hosted mode; its own canvas standalone). Everything below was verified against HEAD; in-repo measured figures are cited as such, and every derived number is labelled. Pixel quantities that differ — CSS viewport, drawing buffer, composer buffer, devicePixelRatio, settings caps, dynamicScale — are named individually throughout.

### Current rendering pipeline (both compositions)

Chain, in order (PostFX.build):

1. `RenderPass` — scene into a half-float HDR composer buffer (8-bit on the LDR rung).
2. `N8AOPostPass` — AO at `halfRes`, `aoSamples` 16 (Ultra) / 8 (High), 1 denoise iteration. In-repo audit: ~0.84 ms/Mpx after the half-res change (was 2.24); the pass is called "the most expensive thing in the chain".
3. `EffectPass[DoF, Bloom]` (merged). DoF: `focusDistance 9`, `focusRange 60`, `bokehScale 1.25`, library `resolutionScale 0.5` **plus** `ScaledDepthOfFieldEffect` halving the base — near/far/CoC-blurred targets end up at **¼ of the drawing buffer**, masked/far/CoC at ½. In-repo audit: ~2.46 Mpx of full-screen writes per frame at 1080p (was 9.85 before the halving), with ~1 px of extra bilinear-upsampling softness on the far field on top of the authored ~1.25 px bokeh. Bloom: threshold 1.55 (HDR), 6 mip levels, radius 0.72.
4. `EffectPass[Grade]` — one shader: reprojection motion blur + radial "rush" blur + chromatic aberration + highlight shoulder + ACES + grade + speed lines + vignette + grain.
5. `EffectPass[SMAA]` — final resolve, `SMAAPreset.ULTRA` at High+, luma edge detection.

Anti-aliasing: `RenderPipeline.msaaSamples()` returns **0 whenever SSAO is on** (the N8AO read-back conflict), so at High/Ultra — every desktop tier — scene AA is SMAA-only. The hosted canvas (Afterlight's renderer, `antialias: true`) gives driver MSAA to the final blit only.

Resolution policy (`RenderPipeline.effectivePixelRatio()`):

```text
effectivePixelRatio = min(devicePixelRatio, maxPixelRatioCap) × renderScale × dynamicScale
  maxPixelRatioCap  = min(settings.maxPixelRatio, boot pixel-budget ceiling), floored at 1.0
  + hardware edge ceiling (maxTextureSize/maxRenderbufferSize) and a 4.0 Mpx drawing-buffer backstop,
    both multiplying renderScale×dynamicScale through so the ladder keeps authority
dynamicScale ∈ [0.5, 1] (setDynamicScale), NOT part of pipelineSignature (no chain rebuild)
```

Boot pixel budgets (`Settings.PIXEL_BUDGET_MPX`): Low 0.75, Medium 1.5, High 2.2, Ultra 2.4 Mpx of drawing buffer, applied once at `createSettings` as a `maxPixelRatio` ceiling floored at `MIN_CEILING_RATIO = 1`.

### The adaptive-resolution ladder (host/runtime.ts, the only runtime pressure response)

Verified constants and rules:

```text
SCALE_RUNGS          = [1, 0.85, 0.72, 0.6, 0.5]
FRAME_SLOW_MS        = 18.0    (descent threshold on frameEma; 60 fps budget is 16.7 → 1.3 ms headroom)
FRAME_CLEAN_MS       = 17.6
FRAME_EMA_ALPHA      = 0.06
renderCostEma        = α 0.12 over (kart update + present) wall time — Kart-only
frameEma             = α 0.06 over intervals between presented frames — RACING frames only,
                       after ≥30 racing frames (RACING_SETTLE_FRAMES)
descent gate         = frameEma > 18.0 (or renderCostEma > 45)
                       AND (renderCostEma < 13 [GPU-bound guess] or renderCostEma > 45)
                       AND rung < lowestRung(); SCALE_COOLDOWN = 60 frames between moves;
                       may jump 2 rungs (MAX_JUMP_RUNGS) when frameEma > 25 ms
lowestRung()         = desktop: deepest rung keeping buffer ≥ 0.6× CSS (CSS_FLOOR_DEFAULT)
                       → rung 0.6 allowed; MIN_LADDER_RUNGS = 2 forces ≥ 0.72 availability everywhere
                       handheld: buffer ≥ 1.0× CSS (CSS_FLOOR_HANDHELD) → rung 0.72 at its 1.51× CSS base
recovery             = cleanFrames ≥ probeFrames (starts 360 = 6 s, DOUBLES per failed probe to 3600 = 60 s),
                       one rung per probe, RECOVER_COOLDOWN = 120 frames
no-payoff            = descent buying < 0.6 ms reverts + locks the rung out 3600 frames (after the fact)
reset                = ONLY on WebGL context restore (standalone-only wiring). NOT on beginSession,
                       race start/restart, retained-host re-entry, or session end.
```

`frameEma` is fed from the **host page's presented-frame interval** (`rawTickMs` from Afterlight's frame loop in hosted mode). It is what the player feels, but it includes every main-thread competitor the host page has (chat/theater/net handlers, lease-frame glue), none of which Kart Royale can degrade.

### Current hosted lifecycle

E at cabinet → controller (`src/activities/kart-royale/controller.js`) → `createKartRoyaleHost` (cheap, no GL) → `boot()` (systems + prewarm; GL mutations bracketed by `runGraphicsTransaction` snapshot/restore) → `prepareSelectionReadiness()` (hidden frame, same bracketing) → `acquireView(...)` leases the render pass scene + active camera and **swaps presentation to `lease.present()`** → Afterlight's frame loop calls `host.update(dt)` then `host.present()` → `RenderPipeline.render()` on the shared renderer → on exit, `captureRendererPolicy`/`restoreRendererPolicy` restore tone mapping, shadow state, pixel ratio and size; `rendererPolicyMatches` verifies.

Two extra hosted facts that matter here:

- **The warm/background host.** The prepare scheduler builds a *separate* background `createKartRoyaleHost` on the same renderer for CPU world slices; the session host is a fresh instance (module singletons: `Materials`, `glCapabilities`). After a session, `retentionEnabled` (default on via `kartRoyaleRollout`) retains the *suspended session host* and re-enters it — with whatever scaler state it closed with.
- **The overrides seam is declared but not wired.** `KartRoyaleHostOptions.params?: HostSettingsOverrides` exists in `host/types.ts`, but `createKartRoyaleHost` never forwards it into `KartRoyaleRuntimeOptions.settingsOverrides`, so `createSettings` runs with no overrides in hosted mode. Afterlight currently cannot pass any render policy. (This is an integration gap, not by itself a blur cause — but it blocks the fix.)

## Goals / Non-Goals

**Goals:** sharpness as the default on desktop-class hardware; degrade effect cost before spatial resolution; make the scaler's judgement sustained, attributed and hysteretic; keep the sense of speed while cutting full-frame smear; contain DoF to its authored garnish; keep hosted renderer-state correctness verified; make all of it measurable; no regression for standalone or mobile.

**Non-Goals:** forcing native resolution on all hardware; disabling post-processing, adaptive resolution, or the instant-entry/warm-host architecture; a second renderer/canvas/RAF loop; a general Afterlight renderer rewrite; an upscaling/FSR-style reconstruction pass (recorded as possible future work); changes to other arcade activities or the theater.

## Verified findings (the investigation answers)

1. **Drawing-buffer sizes, 1920×1080 DPR 1, High tier** (budget ceiling 1.03; `min(dpr, cap)` binds at dpr 1): rung 1.0 → 1920×1080; 0.85 → 1632×918; 0.72 → 1382×777; 0.6 → 1152×648; 0.5 → 960×540. The compositor upscales every rung below 1.0.
2. **DPR 2** (e.g. 1512×982 CSS window, Ultra; ceiling 1.27): rung 1.0 → ratio 1.27 → ~1923×1249; 0.85 → ratio 1.08 → ~1634×1061 (still above CSS); 0.72 → ratio 0.92 → **below CSS resolution — genuine upscale softness**. A full-window DPR-2 1080p viewport (Ultra, ceiling 1.08) crosses below CSS at rung 0.85 already.
3. **Descent cause:** `frameEma > 18.0 ms` (or `renderCostEma > 45`) sustained through the α=0.06 EMA while racing ≥30 frames, with the crude GPU/CPU guard and a 60-frame cooldown. `FRAME_SLOW_MS` leaves 1.3 ms of headroom over the 60 fps budget.
4. **Recovery cause:** `cleanFrames ≥ probeFrames` — 6 s of continuously clean presented racing frames at first, doubling to 60 s after each failed probe; one rung per probe.
5. **Warm preparation and the scaler:** background `prepareWorldSlice` and boot-time GPU transactions do **not** feed the EMAs (present-gated; first 30 presented frames hold EMAs at 16.7). They *can* contend for GPU/CPU with the Theater just before lease acquisition, but that is before Kart measurement starts. The real warm-entry hazard is retention of state (6), not signal pollution.
6. **Scale does NOT reset between sessions or races.** `scaleRung`/`dynamicScale` reset only on standalone context restore. A retained hosted host re-enters at its last rung; a race restart inherits the previous race's rung. This is the verified "warm host keeps a degraded resolution" mechanism.
7. **Hosted quality == standalone auto-detection.** No overrides reach `createSettings` (unwired `params`); desktop detects High or Ultra (`Apple M|RTX|Radeon RX|Arc A` → Ultra). There is no hosted-specific quality difference beyond the missing seam.
8. **No viewport/DPR bug found.** The pipeline owns pixel ratio while leased; `applyResolution` derives buffer = viewport × effective ratio; Afterlight's `resize()` forwards to the lease; `restoreRendererPolicy` restores ratio+size and `graphicsJobs` verifies each transaction. The found integration gap is the unwired `params` (above).
9. **DoF internals:** base halved then library `resolutionScale 0.5` → near/far/CoC-blurred targets at ¼ drawing buffer, masked/far/CoC at ½; ~2.46 Mpx writes @1080p (in-repo audit); ~1 px bilinear softness far-field; near-field CoC ≈ 0.05 — authored to leave the near frame untouched.
10. **Motion blur vs render scale:** not yet separately quantified — the design mandates a pinned A/B (`?scaler=` standalone; new hosted diagnostics) before final tuning. Verified magnitudes: shutter `0.50 + 0.34·fast` (×frame-rate normaliser), camera streak capped 0.016 uv, radial rush `0.0165·fast^1.5` edge-weighted ≈ 13 px at the corner at 101 km/h and ~27 px under boost, `travelCap` up to ~0.0256 uv ≈ **~50 px at 1080p during boost ignition**. Speed lines are additive display-referred (no smear) and cheap.
11. **Effect cost order (in-repo audits, to be re-measured):** AO ≈ 0.84 ms/Mpx (largest chain item) > DoF ≈ 2.46 Mpx-writes @1080p > motion-blur taps (SMEAR_SAMPLES = **11** taps × 1–3 fetches on streak pixels — bandwidth that rises exactly at speed/boost) > bloom (6-level mip chain) ≈ SMAA ULTRA. Post chain ≈ 5.3 of ~7.0 ms/Mpx total (fps-bench fit).
12. **GPU- or CPU-bound at descent?** The ladder guesses with `renderCostEma < 13 ms`. It cannot attribute `frameEma` inflation to host-page work; if Kart submit cost sits in the 13–45 ms band the ladder refuses to act at all.
13. **Can the existing scaler distinguish those cases?** Only via the crude guard in (12). The design adds attribution (D5) rather than trusting the guess.
14. **What to degrade before spatial resolution:** by measurement — AO sample count/pass, DoF (it is authored "garnish only"), motion-blur tap budget, bloom levels, shadow cascade quality, particle density; spatial scale last (D3).
15. **Desktop floor:** the repo's own fits (`frame_ms ≈ 6.25 + 5.30·Mpx`) put 16.7 ms at ~1.8–2.0 Mpx at Ultra. 1080p DPR 1 native (2.07 Mpx) measured 16.67–17.20 ms — **marginal**, so the shipped policy sits one rung down (1632×918, ~1.6 Mpx ≈ 14.7 ms). 1440p DPR 1 native (3.69 Mpx ≈ 25.8 ms) cannot hold 60 fps → the ladder lands at **0.72 (1382×777 upscaled to 2560×1440)** — the literal "rendered small and enlarged" report. A 4K DPR 1 display is worse: the budget floors `maxPixelRatio` at 1.0 and the **4.0 Mpx renderer backstop then caps the ratio at ~0.695** — 2668×1501 even at full quality, before the ladder moves. Derived from in-repo fits and code arithmetic; the benchmark tasks re-verify each.

**Conclusion:** no single bug. The shipped strategy makes spatial resolution the first, deepest and sometimes only lever; arms it 1.3 ms above the frame budget; feeds it a hosted frame signal polluted by the host page; lets effect cost (11-tap blur at speed) grow exactly when the ladder is watching; and remembers degraded state across hosted sessions. The fix is a policy change, not a hotfix.

## Decisions

### D1. Instrument first; decide the constants from captures (tasks 1–3 before any retune)

Extend the existing diagnostics (`Diagnostics.ts`, `__render`, `window.__kartDebug`) with a `getRenderStats()`-style snapshot (D10) and capture the before-state with `tools/fps-bench.mjs` (median + tails, js-vs-delta split) at 1280×720 / 1920×1080 / 2560×1440 DPR 1 plus one DPR-2 profile, in hosted and standalone compositions, across the states the acceptance criteria name (selection, start, cruise, top speed, drift, boost, heavy scenery, full AI grid). Pin the scaler (`?scaler=` standalone; the new hosted policy/pin seam) to separate "blur from render scale" from "blur from motion blur / DoF" (finding 10). No constant in D3–D7 is final until this matrix exists.

### D2. One pure policy module; device-class tables; no magic-number bag

Extract the ladder maths (rungs, floors, thresholds, cooldowns, payoff, recovery, tier selection) into a pure module authored as plain JavaScript with JSDoc so the Afterlight Node suite can unit-test it directly — the established pattern (`shared/pool/rules.js`, `shared/downhill/rules.js`). Implementation note (apply-phase finding): the module lives at **`shared/kart-royale/renderPolicy.js`**, not inside `games/kart-royale/src/core/` — that package declares `"type": "commonjs"`, so a plain `.js` file there is CommonJS to the Node runner and cannot be imported by name from the repo's ESM tests. The `shared/` tree (ESM) is importable by both the tests and the game's Vite build (the `shared/downhill` precedent). The module owns no Three.js/DOM state; the runtime feeds it samples and applies its decisions. Device classes come from the existing `profileDevice()` classification plus the GL capability probe's software flag (touch-primary / handheld / memory / software rasteriser) — no user-agent hacks. Policy per class is one cohesive table (D4), and the hosted seam (D8) may tighten it.

### D3. Effect-before-resolution degradation ladder

A `degradeStage` (0 = full) travels OUTSIDE `pipelineSignature` for stage changes that do not alter what the chain builds, and INSIDE it for the steps that must recompile passes (motion-blur taps are a shader define; AO samples, DoF and bloom levels are build-time configuration) — so a stage move rebuilds the chain, exactly as a manual quality change already does. Acceptable only because tier moves are hysteretic (D5).

Initial order from finding 11, each step re-validated by the D1 matrix:

```text
Stage 0  full quality
Stage 1  motion-blur tap budget 11 → 6 (halves smear bandwidth at speed; look preserved by jitter+cap)
Stage 2  AO samples 16 → 8 (High AND Ultra both ship 16 today — apply-phase correction of the
         earlier "High already 8" note)
Stage 3  DoF off (authored garnish; far-field only)
Stage 4  bloom mip levels 6 → 4 (veil reach halves; disc glow kept)
Stage 5  AO off (authored contact shadows lost — late)
Stage 6  renderer shadow maps off
Stage 7  render scale 1.0 → 0.90 (first spatial cut)
Stage 8  render scale → device floor (desktop 0.85)
Stage 9  EMERGENCY below floor (0.80 → 0.72): only sustained evidence + every cheaper stage active
```

Apply-phase feasibility corrections, recorded rather than silently changed: the shadow CASCADE MAPS are baked into shader literals at `Sky.init` (no uniform channel exists), so the reachable runtime shadow lever is the renderer flag (stage 6), not a cascade resize; and PARTICLE density is not runtime-reachable at all (pools and caps are built once in `Effects.init`), so the particle stage is dropped from the ladder. The order is otherwise a starting point gated by measurement: if the D1 matrix shows a different cost ranking, the ladder follows the measurements. Cheap-but-visible effects (speed lines, vignette, grade, SMAA) are never disabled; SMAA preset may step ULTRA → HIGH as part of the emergency rungs but AA never reaches zero on desktop.

### D4. Resolution policy: desktop floor ≈ 0.85, mobile unchanged, 4K handled explicitly

```text
                 normal ladder        emergency (post-stage-9)    CSS-buffer floor
Desktop          [1, 0.90, 0.85]      [0.80, 0.72]                0.85 (0.72 emergency)
Tablet           [1, 0.90, 0.85, 0.78] [0.72]                     ~0.78
Handheld/phone   current rungs        current                     1.0× CSS (unchanged)
Software/CI      current behaviour    current                     unchanged
```

`MIN_LADDER_RUNGS` stays as a hard availability guarantee so a handheld can always reach its floor. The desktop values are the task's proposed starting points — D1 decides the final numbers, with the acceptance criterion "≥ 0.85 during ordinary desktop play; below only after stage 9". Two structural fixes accompany the table:

- **The 4K/retina backstop case (finding 15).** When the boot budget or the 4.0 Mpx backstop already caps the ratio below 1.0, that cap is the *preferred* scale and is reported as such; the ladder's descent starts from whatever the cap allows and its floor is expressed in the same units (× CSS), so a 4K DPR 1 display at 0.695× is treated as "at floor", not as "at rung 1.0 and falling".
- **`dynamicScale` clamp** (`setDynamicScale`, 0.5–1) is widened to the policy's range so rungs below 0.5 remain impossible while the floors above become expressible without magic clamps.

### D5. Scaler judgement: sustained, attributed, hysteretic, revert-checked

Keep the existing skeleton (racing-only, EMA signals, settle window, no-payoff lockout) and change the policy through the D2 module:

- **Sustained-pressure window:** descent requires the pressure signal to exceed its threshold for a *window* of racing frames (order 45–90), not merely an EMA crossing; isolated long frames (stall, GC, background job) cannot arm it. The existing STALL_MS present-skip watchdog stays as-is.
- **Attribution:** descend on the presented-frame signal, but record `renderCostEma` and the gap `frameEma − renderCostEma`; the gap identifies host-page contention and (a) suppresses *recovery probes* while contention is high, (b) picks the ladder branch (effect stage vs render scale). The current hard `renderCostEma < 13` precondition is replaced by this attribution rather than a cliff.
- **Payoff:** keep `settleDescent` (0.6 ms minimum gain, revert + lockout) and shorten its evaluation so a useless descent is undone in seconds, not after the full cooldown.
- **Hysteresis:** descent cooldown ≥ current 60 frames; recovery stays probe-based with a sustained clean window; recovery is suppressed while the attribution gap says the host page, not the game, is slow. A quality state must not flip more than N times per race (bounded, logged).
- **Warm-entry immunity:** measurement restarts with the session (D9), so entry spikes cannot count.

### D6. Motion blur: retune the art, expose the strength, keep the speed cues

Verified today: shutter `0.50 + 0.34·fast`, camera streak ≤ 0.016 uv, radial rush `0.0165·fast^1.5` + boost/ignite terms, travel cap ≈ 0.0256 uv (~50 px @1080p), hero hold-out 2.05→3.40 m world-space sphere, 11-tap smear loop. Changes:

- Reduce the perceived smear to ~40–60% of current (target values fixed by D1 captures): shutter base/coefficient down (order `0.35 + 0.20·fast`), rush coefficients and `travelCap` down proportionally, ignition overshoot capped lower.
- Raise the activation knee so ordinary cruising stays fully clean (the existing 70%-of-top gate is kept upstream; the radial term's `fast` exponent/knee moves so mid-pace driving stays sharp).
- Strengthen the near-road holdout: widen the hero sphere fade and add the same world-space mask logic to the road immediately ahead (a second sphere/segment ahead of the kart), so the racing line reads during streaks.
- Speed lines, vignette, FOV punch, CA are unchanged cues — speed readability must survive the blur reduction (spec scenario).
- `motionBlurStrength` becomes a policy value (D8) defaulting to the retuned art; hosted Afterlight may set it calmer; standalone keeps the retuned default. `settings.motionBlur` retains its current meaning (off = no smear; speed lines stay).

### D7. Depth of field: keep the measured perf work, contain the softness, verify

The quarter-res internals were a measured −75% DoF cost with kernel compensation — not silently reverted. What changes: DoF joins the degradation ladder (Stage 3), its far-field bilinear softness is measured against the acceptance captures, and if the captures show it materially softening *readable* scenery, its internal far-target scale rises one step (¼ → ½ base) with the cost delta recorded. Near-field behaviour is already authored sharp (CoC ≈ 0.05 at 1 m) and is asserted by captures, not assumed. `dof` stays a High/Ultra feature; policy may force it off (D8) on request.

### D8. Hosted render-policy seam (wires the dead `params` field)

`createKartRoyaleHost` forwards `options.params` into `KartRoyaleRuntimeOptions.settingsOverrides` (the runtime already plumbs it into `createSettings`). Extend the override shape with one cohesive concept — a render policy — rather than a bag of numbers:

```ts
interface HostRenderPolicy {
  normalScaleFloor?: number;        // desktop/tablet floor, × CSS (e.g. 0.85)
  emergencyScaleFloor?: number;     // below-floor limit (e.g. 0.72)
  motionBlurStrength?: number;      // 0..1 multiplier on the authored smear
  depthOfField?: 'authored' | 'off';
}
// KartRoyaleHostOptions.params?: SettingsOverrides & { renderPolicy?: HostRenderPolicy }
```

Rules: the policy can only **tighten** what device classification and the pixel budget allow (same invariant `createSettings` already enforces for `maxPixelRatio`); it never reads the host URL, installs globals, or knows about Afterlight by name; standalone ignores it entirely. The Afterlight controller passes a desktop-hosted policy (floors per D4, `motionBlurStrength` per D6) — one construction site (`controller.js`), no `window` path sniffing.

### D9. Hosted session/warm-host reset semantics

`beginSession()` (hosted) resets the adaptive state: rung → preferred (1.0 subject to the boot cap), EMAs → 16.7, clean/probe/no-payoff bookkeeping cleared — the same table the standalone context-restore path already resets. Measurement begins only once presentation is active (`present()` counts presented racing frames only, as today), so background preparation and boot transactions can never move the ladder (finding 5). Retention keeps the *world* warm (the instant-entry win) but never the *degradation*; race restarts within a session keep their rung (mid-session pressure is real pressure) unless the player returns to selection, where the settle window re-arms anyway.

### D10. Render diagnostics

One surface, both compositions, reusing existing seams: hosted `window.__kartDebug.getRenderStats()` (the object already exists behind `?debug`; add the method and stop gating read-only stats behind it), standalone on the existing `window.__render` pipeline plus the same helper. Fields (spec's list): `viewportCss, devicePixelRatio, maxPixelRatioCap, renderScale, dynamicScale, effectivePixelRatio, drawingBuffer, composerBuffer, quality, degradeStage, currentRung, lowestRung, motionBlur/DoF/AO/bloom states, aaPath, frameEmaMs, renderCostEmaMs, pressureGapMs, scalerPinned, resets`. Cheap field reads; no per-frame allocation; reading nothing changes nothing.

### D11. Renderer-state ownership — unchanged, verified

No new renderer mutations: the pipeline keeps owning pixel ratio/composer size while leased; `graphicsJobs`/`runGraphicsTransaction` keep bracketing boot/prepare GL work; `restoreRendererPolicy` + `rendererPolicyMatches` keep guaranteeing the restore. This change *adds* a gate assertion (drawing-buffer == viewport × effective ratio during hosted play; policy match after exit) to the browser gate so the correctness the spec demands is mechanically checked rather than assumed. Findings 8's review (resize paths, physical-vs-CSS pixels, DPR double-application) found no defect; if implementation discovers one, it is fixed here and recorded as evidence.

### D12. Failure / fallback behaviour

A missing or invalid policy falls back to the shipped defaults (today's behaviour, tightened only by the device-class table); diagnostics failures are swallowed (a broken stat never kills a frame); tier-step chain rebuilds reuse the existing `rebuild()` ladder so a rebuild failure degrades exactly as a quality change does today; the scaler module is pure and cannot throw into the frame loop without the existing `guard()` in `host/index.ts` catching it. Context-loss behaviour is unchanged (hosted exits the session; standalone restores and resets the ladder).

### D13. Performance and GPU-memory implications

The retune *costs* fill rate where the ladder used to win it back: at 1080p DPR 1 the difference between rung 1.0 (2.07 Mpx) and the commonly-visited 0.85 (1.6 Mpx) is ~4–5 ms/frame per the in-repo fit — that is precisely why D3 spends cheaper stages first (taps, AO samples, DoF, bloom levels ≈ 3–6 ms combined at 1080p) and why D4's emergency rung exists. Memory: effect stages reduce allocations (smaller AO sample work, fewer bloom mips); no stage increases memory. The known double-composer window (background host + session host) is pre-existing instant-entry architecture; this change does not extend it and the D1 capture records its footprint for the follow-up that finally shares one prepared runtime.

### D14. Alternatives considered and rejected

- **Always `setPixelRatio(devicePixelRatio)`:** the 4.0 Mpx backstop exists because a retina 1920×1200 window at ratio 2 asks ~65 ms frames. Rejected.
- **Disable adaptive resolution:** regresses phones/weak GPUs; the ladder is the right tool, wrongly tuned. Rejected.
- **Disable post-processing (or "quality toggle" alone):** loses the art direction; users must not choose between blur and flat. Rejected.
- **Force Ultra/native on desktop:** thermals, memory, the 4K backstop case. Rejected.
- **Second canvas/renderer/RAF:** architecture violation (view lease, single renderer). Rejected.
- **Hosted-only deep ladders ("Afterlight is just a wrapper"):** contradicts hosted-first product reality; the D8 policy instead makes hosted a first-class target with its own cohesive knobs. Rejected the opposite way too — standalone is not forked.
- **Temporal upscaling / FSR-style reconstruction:** a new dependency and pipeline stage; recorded as possible future work if the D1 matrix shows desktops that cannot hold the floor even at stage 9.
- **Removing speed lines to "fix blur":** they are the cheap, non-smearing speed cue this change leans on. Rejected.

## Risk register

- **Sharpness vs frame rate on mid desktops** — mitigated by D3 ordering + D4 emergency rung + D13 budget; accepted risk is a mid-GPU settling one effect stage lower, not one resolution rung lower.
- **Retuned blur read as "lost speed"** — mitigated by keeping lines/vignette/FOV cues and the D1 before/after capture protocol; values land in the 40–60% band the acceptance criteria name.
- **Chain rebuilds from tier steps** — bounded by hysteresis (D5); rebuild cost equals today's quality-change cost.
- **Attribution misclassifies host contention** — worst case the ladder defers a decision by one window; never a wrong-direction change, because descent still requires the presented-frame signal itself to be slow.
