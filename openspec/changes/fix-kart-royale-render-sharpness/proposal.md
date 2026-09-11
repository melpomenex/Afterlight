## Why

Kart Royale played inside Afterlight looks noticeably soft during actual driving, as if the scene were rendered well below the display's resolution and enlarged back to the window. Investigation against HEAD confirms the softness is not one bug but the predictable output of the current degradation strategy: the adaptive-resolution ladder is the **only** runtime response to GPU pressure, it may legally descend to 0.60× CSS resolution on desktop, it is armed by a 18 ms threshold with only ~1.3 ms of headroom over 60 fps, and its frame-time signal in hosted mode includes main-thread work Kart Royale did not cause. On top of that, the speed-driven motion blur (13–27 px streaks at the frame corners, up to ~50 px at boost ignition) and the quarter-resolution depth-of-field internals smear the same frames the player judges sharpness by. The result reads as a low-resolution upscaled image rather than a crisp racing game with cinematic effects.

## What Changes

- Re-balance the adaptive-quality strategy so **effect degradation precedes spatial-resolution reduction**: measured GPU pressure first reduces the cost of secondary effects (motion-blur tap budget, AO, DoF, bloom reach, shadow quality) and only drops render scale after those tiers are exhausted.
- Raise the desktop dynamic-resolution floor from the current allowed 0.60× CSS to ~0.85× CSS during ordinary play (device-class-dependent; a deeper emergency rung remains available only after cheaper tiers are spent and under sustained, verified pressure).
- Make the scaler's judgement hysteretic and pressure-attributable: longer sustained-pressure windows before descent, immunity to isolated long frames and entry/transition spikes, faster detection of "descent bought nothing", and a dedicated hosted signal that excludes non-Kart main-thread work from the descent decision.
- Reduce the default motion-blur strength toward ~40–60% of the current perceived smear while keeping speed lines, vignette, FOV punch and the hero-kart hold-out as the speed cues; make the strength a policy input rather than hard-coded behaviour.
- Contain depth-of-field softness to the intended distant-scenery garnish (monitor internal target resolution and strength; never the near field, road or kart).
- Reset adaptive-resolution state when a hosted session (including a retained warm host) begins presenting, so no session inherits a previous session's degraded rung.
- Wire the existing-but-unused host settings-override seam into a cohesive hosted render policy (`KartRoyaleHostOptions`), letting Afterlight state desktop/mobile floors and effect strength without URL hacks, globals or a second renderer.
- Add render diagnostics (`window.__kartDebug.getRenderStats()` or equivalent) distinguishing CSS viewport, devicePixelRatio, settings ceilings, dynamicScale, effective pixel ratio, drawing-buffer and composer-buffer dimensions, effect states and the scaler's EMA signals — in both compositions.
- Add automated tests for the policy (ladder selection, floors, descent/recovery, spike immunity, hosted reset) using the established source-contract and browser-gate patterns, plus a before/after benchmark and screenshot matrix at 1280×720, 1920×1080 and 2560×1440 (DPR 1 and where feasible DPR 2).

## Capabilities

### New Capabilities

- `kart-royale-adaptive-rendering`: the adaptive-quality policy for Kart Royale in both compositions — effect-before-resolution degradation order, desktop/mobile resolution floors, sustained-pressure and transient-immunity rules, motion-blur and depth-of-field containment, hosted renderer resolution correctness and state restore, warm-host scale reset, and measurable render diagnostics.

### Modified Capabilities

None in `openspec/specs/`. The Kart capabilities exist only in the unarchived `integrate-kart-royale-arcade` and `fix-kart-royale-instant-entry` changes; this change preserves their load-bearing contracts (single shared WebGLRenderer, view lease, renderer-state snapshot/restore, instant entry, warm preparation) and only changes how the hosted game chooses image quality under pressure.

## Impact

Game (`games/kart-royale/src/`): `host/runtime.ts` (scaler policy, reset semantics), `render/Renderer.ts` (dynamic-scale clamps, diagnostics), `render/PostFX.ts` (motion-blur/DoF policy hooks), `core/Settings.ts` (device-class policy tables), `host/index.ts` + `host/types.ts` (render-policy option, currently-declared-but-unwired `params`), likely a new pure policy module importable by both the game and the Node test suite (`allowJs` is already on). Host (`src/`): `activities/kart-royale/controller.js` (pass policy, expose diagnostics), possibly `activities/kart-royale.js` (construction seam). Tests: new Node policy tests plus `scripts/kart-royale-gate-browser.mjs` and `games/kart-royale/tools/fps-bench.mjs` extensions. No new dependency, no second canvas/renderer/RAF loop, no change to the theater or other arcade activities, no removal of instant-entry work.

Non-goals: forcing native resolution on all hardware, disabling post-processing or adaptive resolution wholesale, permanently forcing Ultra, breaking standalone Kart Royale, or a general Afterlight renderer rewrite.
