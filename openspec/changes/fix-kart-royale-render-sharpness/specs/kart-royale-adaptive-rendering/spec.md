## Purpose

Define the adaptive image-quality policy for Kart Royale in both compositions (standalone page and Afterlight-hosted cabinet): how the game degrades under GPU pressure, which qualities it sacrifices first, how sharp the image must stay on desktop-class hardware, how hosted renderer state stays correct across lease and warm-host lifecycles, and how the resulting behavior is measured.

## ADDED Requirements

### Requirement: Effect degradation precedes spatial-resolution reduction

The system SHALL respond to sustained measured GPU pressure by degrading secondary effect cost before reducing the spatial drawing-buffer resolution. Spatial render scale SHALL NOT descend while a cheaper effect-degradation tier has not yet been applied at the current pressure level. The degradation order SHALL be derived from measurement of the actual per-effect frame cost, and inexpensive effects SHALL NOT be disabled merely because they sound expensive.

#### Scenario: Sustained pressure with effects still at full quality

- **WHEN** the frame-time signal exceeds the sustained-pressure threshold while effects remain at their current tier
- **THEN** the system applies the next effect-degradation tier (reducing the measured-most-expensive secondary effect cost first)
- **AND** the drawing-buffer resolution is unchanged for that step.

#### Scenario: Effect tiers exhausted

- **WHEN** pressure persists after the defined effect tiers have been applied
- **THEN** the system may reduce the render scale one rung at a time within the device-class floor
- **AND** each reduction remains subject to the sustained-pressure and payoff rules.

#### Scenario: Cost order is evidence-based

- **WHEN** the degradation ladder is authored or retuned
- **THEN** the recorded order cites measured per-effect frame costs from the benchmark captures
- **AND** the ladder does not disable an effect measured as insignificant.

### Requirement: Desktop image sharpness and dynamic-resolution floor

On desktop-class hardware the system SHALL hold `dynamicScale` at 1.0 during ordinary gameplay and SHALL NOT descend below approximately 0.85 during normal play. Reaching a lower scale SHALL require sustained GPU-pressure evidence AND exhaustion of the effect-degradation tiers. The player kart, kart body edges, road surface detail, track/lane edges, kerbs, nearby barriers, nearby scenery and the HUD SHALL remain visually crisp at normal desktop settings; only distant scenery may retain intentional cinematic softness.

#### Scenario: Ordinary desktop play

- **WHEN** a desktop-class device drives at ordinary speeds on a typical circuit
- **THEN** the drawing-buffer resolution stays at the intended effective pixel ratio with `dynamicScale` at 1.0 or within one small step of it (≥ ~0.85)
- **AND** the player kart, road and kerbs read crisp in before/after screenshot comparison at 1280×720, 1920×1080 and 2560×1440.

#### Scenario: Anti-aliasing preserved

- **WHEN** the image-quality policy changes under this capability
- **THEN** an anti-aliasing path (composer multisampling or SMAA) remains active on every desktop tier
- **AND** kerb stripes, railings, fences and kart silhouettes do not regress to heavy aliasing in captured frames.

### Requirement: Sustained-pressure scaling

The system SHALL descend (a tier or a rung) only on sustained pressure evidence measured while racing, not on isolated long frames. A single stall, a loading spike, a garbage-collection pause, or entry/selection transitions SHALL NOT by themselves move the quality state. Every descent SHALL be verified against the frame-time improvement it bought, and a descent that bought less than the required payoff SHALL be reverted and its rung locked out.

#### Scenario: Transient spike immunity

- **WHEN** one or a few frames overrun (e.g. a background preparation job or an isolated hitch) during racing
- **THEN** no quality tier or render-scale rung changes as a result of that spike alone.

#### Scenario: Payoff verification

- **WHEN** a descent completes its evaluation window and the frame-time signal improved by less than the required payoff
- **THEN** the system reverts the descent and refrains from repeating it for a bounded lockout period.

### Requirement: Temporal stability of quality changes

The system SHALL prefer stable quality over oscillation: minimum cooldowns between quality changes, bounded recovery probes, and recovery that requires a sustained window of clean frames. The visible frequency of resolution changes during a race SHALL be low enough that individual changes do not read as visible quality pops.

#### Scenario: No rapid oscillation

- **WHEN** the frame-time signal hovers near a threshold
- **THEN** the quality state changes at most according to its cooldown and probe schedule
- **AND** the 1.0 → deep-rung → 1.0 flip pattern observed today cannot recur within a single race.

#### Scenario: Recovery requires sustained cleanliness

- **WHEN** the system has descended and frames are subsequently clean
- **THEN** recovery probes upward only after the sustained clean-frame window, one step at a time.

### Requirement: Motion-blur clarity

The system SHALL preserve a sense of speed while materially reducing image-space smear: the perceived motion-blur strength at high speed and boost SHALL be reduced to approximately 40–60% of the current implementation (exact values set by visual measurement), the smear SHALL stay weighted toward frame edges and distant scenery, and the player kart SHALL remain sharply defined including during boost. Speed lines, vignette and FOV cues SHALL be retained so speed readability does not depend on full-frame smear, and blur strength SHALL be a policy value rather than fixed behavior.

#### Scenario: Kart crisp under boost

- **WHEN** the player takes a boost at maximum speed on a desktop device
- **THEN** the kart silhouette, livery and near road remain readable and sharply defined in the captured frame
- **AND** radial streak length at the frame corners is reduced relative to the current implementation.

#### Scenario: Speed perception retained

- **WHEN** motion blur strength is reduced
- **THEN** the speed-line comb, vignette and lens cues remain active above the existing speed gate
- **AND** high-speed frames still communicate velocity.

#### Scenario: Hosted vs standalone blur policy

- **WHEN** a hosted render policy requests a calmer lens than standalone
- **THEN** the hosted composition applies the requested strength without modifying the standalone default
- **AND** both remain within the acceptance bounds above.

### Requirement: Depth-of-field containment

Depth of field SHALL act only as distant-scenery garnish: the player kart, road, kerbs, near corners and nearby barriers SHALL stay within the sharp field at normal desktop settings. The effect's internal target resolution and strength SHALL be documented, measured, and either kept (with measured justification), raised in internal resolution, or gated by quality tier/policy — the overall frame SHALL NOT read as a soft lens.

#### Scenario: Near field stays sharp

- **WHEN** depth of field is enabled at High or Ultra
- **THEN** the kart, the road immediately ahead and the near kerbs are not defocused in captured frames.

#### Scenario: Internal-resolution decision is measured

- **WHEN** the implementation chooses the DoF internal target scale
- **THEN** the choice records the measured cost and the measured softness contribution
- **AND** changing or keeping it is justified by those captures.

### Requirement: Hosted renderer resolution correctness

While the hosted game holds the view lease, the drawing-buffer dimensions SHALL equal the viewport dimensions multiplied by exactly one effective pixel ratio (`min(devicePixelRatio, cap) × renderScale × dynamicScale`), with no double application or omission of devicePixelRatio, no stale pixel ratio after resize, no CSS stretching of an undersized buffer beyond the intended policy, and no `setSize` receiving physical pixels where CSS pixels are expected. On lease release the shared renderer's captured presentation policy (including pixel ratio and size) SHALL be restored exactly, and the Theater SHALL present as before.

#### Scenario: Drawing buffer matches policy

- **WHEN** Kart Royale is presenting at a known `dynamicScale` on displays at DPR 1 and DPR 2
- **THEN** the reported drawing-buffer dimensions equal viewport × effective pixel ratio
- **AND** the render diagnostics report consistent viewport, ratio, dynamicScale and buffer values.

#### Scenario: Resize during hosted play

- **WHEN** the window is resized while the lease is held
- **THEN** the drawing buffer is re-derived from the new viewport under the same policy without stale sizes or doubled ratios.

#### Scenario: Exit restores the social renderer

- **WHEN** the session ends through any exit path
- **THEN** the renderer policy snapshot is restored and verified, and the Theater renders at its prior pixel ratio and size.

### Requirement: Hosted render policy seam

The host boundary SHALL accept a structured render policy from Afterlight (device-class floors, preferred scale, emergency permission, motion-blur strength or equivalent cohesive concepts) and the hosted runtime SHALL honour it. The policy SHALL only be able to tighten what device detection allows, must not read the host page URL or install globals, and the currently-declared-but-unwired settings-override field SHALL be connected so the policy actually reaches the game's settings.

#### Scenario: Host clamps the desktop floor

- **WHEN** Afterlight passes a hosted render policy with a desktop minimum dynamic scale of 0.85
- **THEN** the hosted game's adaptive ladder cannot descend below that rung except through the emergency path
- **AND** standalone Kart Royale is unaffected.

#### Scenario: Policy cannot loosen detection

- **WHEN** a host policy value exceeds what device classification and the pixel budget allow
- **THEN** the effective value remains the tighter of the two.

### Requirement: Warm-host scale reset

When a hosted session begins presenting — a cold boot or a re-entry into a retained warm host — the adaptive-resolution state SHALL begin from the preferred rung with fresh measurement windows, and measurement SHALL cover only frames the game actually presented while active. A retained host SHALL NOT resume a previous session's degraded rung, and background preparation work SHALL never contaminate the scaler's signals.

#### Scenario: Retained host re-enters sharp

- **WHEN** the player exits a race (leaving a retained host) and re-enters the cabinet
- **THEN** presentation starts at dynamicScale 1.0 with reset scaler bookkeeping
- **AND** no stale descent from the previous session persists.

#### Scenario: Preparation never moves the ladder

- **WHEN** background world preparation or boot-time GPU transactions run before presentation
- **THEN** the adaptive-resolution state is unchanged by that work.

### Requirement: Standalone compatibility

The standalone composition SHALL keep its current behavior contracts: its own device detection, its `?scaler=`/`?scale=`/`?quality=` harness knobs, its context-recovery reset, and its current art direction. Policy changes under this capability SHALL be expressed so the standalone game either benefits from the same corrected degradation order or retains its previous defaults, without regressing its frame rate or breaking its existing tools.

#### Scenario: Harness knobs still work

- **WHEN** the standalone page is launched with its existing harness parameters
- **THEN** they pin or override quality exactly as before.

#### Scenario: Standalone look and tools intact

- **WHEN** the standalone game is benchmarked before and after this change
- **THEN** its frame-rate distribution does not substantially regress and its screenshot-capture tooling still runs.

### Requirement: Mobile and constrained-device degradation

The capability-based device classification (touch-primary, handheld, memory/cores, software rasteriser) SHALL continue to govern a more permissive ladder on phones, tablets and constrained devices: handhelds keep their existing ≥ 1.0× CSS drawing-buffer floor, tablets may use an intermediate floor, and deeper rungs remain available to genuinely constrained devices. Desktop sharpness gains SHALL NOT be implemented by weakening mobile stability.

#### Scenario: Handheld floor preserved

- **WHEN** a phone plays a race after this change
- **THEN** its drawing buffer stays at or above its device-class floor and its adaptive ladder still functions under load.

#### Scenario: Tablet intermediate policy

- **WHEN** a touch-primary tablet meets sustained pressure
- **THEN** it may descend to its device-class floor without ever applying the desktop-only effect tiers that assume discrete-GPU headroom.

### Requirement: Render diagnostics

The system SHALL expose, in both compositions, a diagnostic that reports at least: CSS viewport dimensions, devicePixelRatio, the settings pixel-ratio cap, renderScale, dynamicScale, the effective pixel ratio, drawing-buffer dimensions, composer-buffer dimensions, quality tier, current degradation tier, active effect states (motion blur, DoF, AO, bloom), the anti-aliasing path, the frame-time and render-cost EMAs, the current and lowest allowed rungs, and whether the scaler is pinned. Diagnostics SHALL be cheap enough to leave installed in normal play and SHALL NOT alter production rendering behavior.

#### Scenario: Hosted stats readable from the page

- **WHEN** Kart Royale is running inside Afterlight (including under the existing debug entry path)
- **THEN** a page-callable diagnostic returns the values above for the live hosted session
- **AND** the same fields are available in standalone.

#### Scenario: Diagnostics are inert

- **WHEN** the diagnostic is not being read
- **THEN** it does not allocate per frame beyond negligible constants and does not change rendering.

### Requirement: Performance regression budget

The sharpness fix SHALL NOT trade blur for frame collapse: on desktop-class hardware currently capable of running Kart Royale, the change SHALL maintain approximately 60 fps with stable frame pacing (measured as median presented-frame interval and tail percentiles, not a mean), SHALL NOT cause a large regression in GPU memory, and SHALL NOT increase context-loss or input-latency behavior. Where the sharper configuration costs frame time on weaker hardware, the degradation ladder — not a permanent quality cut — absorbs the difference.

#### Scenario: Benchmark matrix holds pace

- **WHEN** the benchmark matrix (1280×720, 1920×1080, 2560×1440 at DPR 1, plus a high-DPR case where feasible) is captured before and after
- **THEN** median presented-frame interval stays within the accepted budget of the before-capture on each profile
- **AND** 1%-low/tail metrics do not show a new stutter class.

#### Scenario: Weak device uses the ladder, not a penalty

- **WHEN** a device cannot sustain the target at the desktop floor
- **THEN** it settles through documented degradation tiers to a stable state instead of dropping to an uncapped low resolution immediately or running at an unstable frame rate.
