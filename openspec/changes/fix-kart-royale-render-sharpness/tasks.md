## 1. Diagnostics and baseline (instrument before tuning — design D1, D10)

- [x] 1.1 Add `getRenderStats()` to the hosted `window.__kartDebug` surface (always available for read-only stats, not only under `?debug`) and to the standalone `window.__render` seam, reporting: `viewportCss`, `devicePixelRatio`, `maxPixelRatioCap`, `renderScale`, `dynamicScale`, `effectivePixelRatio`, `drawingBuffer`, `composerBuffer`, `quality`, `degradeStage`, `currentRung`, `lowestRung`, effect states (motion blur / DoF / AO / bloom), `aaPath`, `frameEmaMs`, `renderCostEmaMs`, `pressureGapMs`, `scalerPinned`, `resets` (design D10; spec "Render diagnostics"). Standalone exposes `window.__renderStats()`; hosted exposes `window.__kartDebug.getRenderStats()` backed by `KartRoyaleHost.getRenderStats()`.
- [ ] 1.2 Verify stats are inert: no per-frame allocation, reading repeatedly does not change rendering (assert in code review + one browser check; browser half blocked on the environment — see evidence.md).
- [ ] 1.3 Capture the BEFORE benchmark matrix with `games/kart-royale/tools/fps-bench.mjs` at 1280×720, 1920×1080, 2560×1440 (DPR 1) and one DPR-2 profile, standalone and hosted (via the browser gate harness), across selection / race start / cruise / top speed / drift / boost / heavy scenery / full AI grid; record median frame interval, tail percentiles, js-vs-delta split, `renderCostEma`, `dynamicScale`, drawing-buffer pixel count, degradation stage (design D1).
- [ ] 1.4 Capture BEFORE screenshots (stationary, high speed, boost, cornering) in both compositions at 1080p DPR 1 and the DPR-2 profile; store under the change's evidence directory with `getRenderStats()` output per shot.
- [ ] 1.5 Run the pinned-scaler A/B that separates blur sources: pin each current rung (`?scaler=`) with motion blur on/off and DoF on/off, and record perceived-sharpness captures + frame cost per combination (design D1, finding 10).

## 2. Pure render-policy module (design D2, D4, D5)

- [x] 2.1 Create the plain-JS pure policy module at `shared/kart-royale/renderPolicy.js` (no Three.js/DOM imports; the game package is CommonJS-typed, so the shared ESM tree — the `shared/downhill` precedent — is the only place the Node suite can import it) owning: device-class policy tables (normal/emergency ladders, CSS-buffer floors per desktop/tablet/handheld/software), sustained-pressure window logic, payoff check, lockout, recovery probe schedule, attribution (pressureGap), degrade-stage selection order, and the hosted render-policy clamp ("may only tighten").
- [x] 2.2 Express the 4K/retina boot-cap case in the policy's own units: when the boot budget or 4.0 Mpx backstop caps the ratio below 1.0, that cap is the preferred scale and the floor is compared in ×CSS units (design D4, finding 15).
- [x] 2.3 Wire `RenderPipeline.setDynamicScale` clamping and `runtime` bookkeeping through the policy module, preserving `SCALER_PINNED` (`?scaler=`) and the standalone context-restore reset exactly.
- [x] 2.4 Add Node unit tests (`tests/kart-royale-render-policy.test.js`, repo test runner) covering: ladder selection per device class; desktop floor ≥0.85 in ordinary play; mobile/handheld floors preserved (≥1.0× CSS buffer); descent only after the sustained window; single-spike immunity; payoff revert + lockout; recovery probe cadence and suppression under host-page contention; emergency rung gated on stage exhaustion; hosted policy clamp (cannot loosen detection); effective pixel ratio arithmetic including the backstop cases (1080p DPR1, DPR2 window, 4K DPR1, handheld 1.51×CSS).

## 3. Effect-before-resolution degradation ladder (design D3)

- [x] 3.1 Implement the degrade-stage state (0 = full) with the initial order: blur tap budget → AO samples → DoF off → bloom levels → AO off → shadows off → render scale 0.90 → floor → emergency (design D3 as amended for the init-time-baked shadow cascades and particle pools); validate the order against the task-1 measurements and adjust if they disagree.
- [x] 3.2 Keep tier steps that change shader defines on the existing `rebuild()` path (degradeStage is part of `pipelineSignature`) and confirm tier moves respect the hysteresis/cooldown rules; confirm AA never reaches zero on desktop (SMAA stays; preset step only at late stages).
- [x] 3.3 Confirm every stage is reversible (LIFO recovery: the most recent degradation reverts first, so render-scale rungs recover BEFORE effect stages return) and that no stage disables speed lines, vignette, grade, or the hold-outs.
- [x] 3.4 Unit-test stage selection/transition order and reversibility in the policy module tests.

## 4. Hosted render-policy seam (design D8; spec "Hosted render policy seam")

- [x] 4.1 Forward the declared-but-unused `KartRoyaleHostOptions.params` into `KartRoyaleRuntimeOptions.settingsOverrides` in `games/kart-royale/src/host/index.ts`.
- [x] 4.2 Extend the overrides with the cohesive `HostRenderPolicy` shape (`normalScaleFloor`, `emergencyScaleFloor`, `motionBlurStrength`, `depthOfField`), enforced tighten-only in `createSettings`/the policy module; no URL reads, no globals.
- [x] 4.3 Pass a desktop-hosted policy from `src/activities/kart-royale/controller.js` (floors per design D4, `motionBlurStrength` per D6); standalone path unaffected.
- [x] 4.4 Assert the policy seam in the Node suite (source contracts: `params` forwarded, Afterlight passes the desktop floors, the policy module reads no page state).

## 5. Motion-blur retune (design D6; spec "Motion-blur clarity")

- [ ] 5.1 Reduce authored smear to the measured 40–60% band: shutter base/coefficient, radial rush coefficients, `travelCap`, ignition overshoot. IMPLEMENTED at ~55% (shutter `0.35 + 0.20·fast`, rush/cap scaled to match, ignition ceiling 1.25 → 1.1); final-value confirmation against the task-1.5 A/B captures is outstanding.
- [x] 5.2 Raise the activation knee so cruising and mid-pace driving stay clean; keep the upstream 70%-of-top speed gate untouched (`smoothstep(0.30, 0.75, fast)` on the sustained rush term).
- [x] 5.3 Strengthen the near-road holdout (second world-space sphere ~3 m down the kart's forward axis, 4.5 m outer radius, max-blended with the hero hold-out) while keeping rival karts' streaks.
- [x] 5.4 Expose `motionBlurStrength` through the policy (default 1.0 = the retuned authored art; hosted may set it calmer via `HostRenderPolicy`); `settings.motionBlur = false` keeps current meaning (no smear; speed lines remain).
- [ ] 5.5 Capture AFTER boost/top-speed frames; verify kart silhouette, near road and racing line read sharply and speed cues (lines/vignette/FOV) still communicate velocity.

## 6. Depth-of-field containment (design D7; spec "Depth-of-field containment")

- [ ] 6.1 Measure DoF's far-field softness contribution from task-1 captures; record the keep/raise/off decision with the cost delta.
- [ ] 6.2 If captures show readable-scenery softening, raise the internal far-target scale one step (¼ → ½ base) with kernel compensation reviewed; otherwise keep the measured internals and record why.
- [ ] 6.3 Verify near-field sharpness (kart, road, kerbs) with DoF enabled at High/Ultra in AFTER captures.

## 7. Hosted session/warm-host reset (design D9; spec "Warm-host scale reset")

- [x] 7.1 Reset adaptive state on hosted `beginSession()` (rung → preferred under the boot cap, EMAs → 16.7, clean/probe/no-payoff cleared) mirroring the standalone context-restore reset table.
- [x] 7.2 Assert that measurement starts only on presented racing frames and that background preparation/boot transactions cannot move the ladder (source-contract tests for the shared `resetAdaptiveState` table and the present-gated EMA logic; the present()/EMA gating was already present-gated by construction and is unchanged).
- [ ] 7.3 Verify a retained host re-enters at dynamicScale 1.0 via the browser gate (reentry phase), and that a race restart within a session keeps its rung.

## 8. Tests and gates (spec requirements → automated checks)

- [ ] 8.1 Extend `scripts/kart-royale-gate-browser.mjs` with a sharpness phase: during a real hosted race, sample `getRenderStats()` and assert drawing-buffer == viewport × effective ratio (DPR 1 and a DPR-2 window), `dynamicScale ≥ 0.85` in ordinary play on the gate machine, and policy-restore match (`rendererPolicyMatches`) plus Theater-presenting-after-exit. (Requires chromedriver; not runnable in the apply environment — see evidence.md.)
- [ ] 8.2 Add the hosted-descent behaviour assertions the gate can exercise: transient spike does not descend; sustained synthetic pressure moves stages in order before render scale; recovery after sustained clean frames.
- [x] 8.3 Add source-contract tests (established read-and-assert pattern, in `tests/kart-royale-render-policy.test.js`) pinning the load-bearing invariants: single renderer/no second canvas or RAF in the new code, `params` actually forwarded, no host-URL reads in the policy path, AA never fully disabled on desktop tiers.
- [x] 8.4 Run `npm test` and `npm run build` (root) and `npm run build` in `games/kart-royale` (tsc + vite) — all green. Note: the root build's wasm step needs the rustup toolchain first on PATH on this machine (`PATH="$HOME/.rustup/toolchains/stable-x86_64-unknown-linux-gnu/bin:$PATH"`); the system rustc shadows rustup and lacks the wasm32 std — a pre-existing machine quirk, unrelated to this change.

## 9. Benchmarks, visual comparison, and documentation of final behaviour (design D1, D13)

- [ ] 9.1 Capture the AFTER benchmark matrix identical to task 1.3 (profiles, states, fields); publish before/after side by side with the acceptance thresholds (median interval within budget per profile; no new tail-stutter class).
- [ ] 9.2 Capture AFTER screenshots matching task 1.4 and compare: kart/road/kerb/HUD crisp at 720p/1080p/1440p DPR 1 + DPR-2 profile; distant-scenery cinematic softness retained; no aliasing regression on kerb stripes, railings, fences, kart silhouettes.
- [ ] 9.3 Verify mobile-class behaviour did not regress: handheld floor (≥1.0× CSS buffer) and tablet intermediate floor hold in the policy tests, and the mobile profile of `fps-bench` still runs (soak gate if available).
- [ ] 9.4 Record final measured behaviour (settled rungs per profile, stage activation thresholds, motion-blur/DoF final constants and the captures that justified them) in the change's evidence notes; update `docs/arcade.md` and README player-facing notes if controls or presentation changed; note the follow-up candidates (shared prepared runtime; temporal upscaling) without implementing them.
