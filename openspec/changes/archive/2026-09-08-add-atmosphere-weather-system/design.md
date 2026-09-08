# Atmosphere and weather design

## Context

A supplies manifest/runtime hooks, explicit resource ownership, tagged room frames and directory. At baseline main.js has a global 120-point field, a weather handler changing fog in every room, one shadow sun and an unreferenced looping Web Audio source. District static boxes become a single vertex-colored material batch. Mutating a pre-batched box material will not change that batch. World.Weather is a global agricultural flag, not a room atmosphere model. Read A program.md before implementation; P9 live handle propagation is an explicit gate.

## Goals / Non-Goals

Deliver reusable fixed/scheduled semantic state, transitions, shelter, surface response, audio and timed events with a deterministic harness before C's content. No per-drop networking, new room authority, weather database, physical fluid model, SSR, volumetric clouds, new render framework, actual call implementation, real-world weather API or garden simulation change. Implement `weatherMode: fixed|scheduled`; reject `dynamic` with a clear validation error until a later change supplies policy. Implement `timeMode: fixed|accelerated`; reserve but reject real-time/event-controlled modes. The schema is versioned so unsupported modes cannot silently pretend to work.

## Decisions

### D1 — Separate agricultural weather from place atmosphere

Add pure **shared/atmosphereModel.js** and client controller **src/atmosphere/controller.js**. The World context remains authority for transience; **Afterlight.World.Atmosphere** is a pure module held inside the existing RoomServer, not another process. Leave World.Weather.get/is_raining? and its P6 tick consumers unchanged. New room state goes through `atmosphere_state`, never `weather_update`. Existing WEATHER_UPDATE/WELCOME weather update legacy HUD/cache only; while a manifest atmosphere controller is active they MUST NOT write scene fog or weather caption. On legacy rooms the existing presentation remains available. Theater uses captured baseline fog/background/sun/exposure; its presentation must not be changed by C's storm or legacy weather while returning from C.

Preset definitions live in **shared/atmospherePresets.js**, plain data, exported to the same build-controlled Phoenix manifest projection as A. Client visual values include fog RGB/density, hemisphere sky/ground/intensity, directional RGB/intensity, exposure, cloud opacity, rain/wind/wetness targets, audio mix and sky phase. Server subset contains semantic preset identity, schedule/time parameters, event policy and finite wind/intensity values; do not send material colors/meshes over the wire. Duplicate numeric rules in Elixir only where needed to schedule; cross-language fixture vectors pin time/event results. All seeded integer math uses a specified unsigned 32-bit LCG `(1664525*x+1013904223) mod 2^32`, including zero seed; no locale hashes or Math.random for shared decisions.

### D2 — One owner, explicit envelope, late join

Define full replacement JSON snapshot:

```js
{type:'atmosphere_state', roomId:'court', schemaVersion:1,
 epoch:7, revision:4, serverNow:1770000000000,
 state:{seed:123, mode:'fixed', preset:'rain-night', intensity:0.8,
        wind:[0.2,0.05], startedAt:1770000000000,
        transition:null,
        time:{mode:'fixed',phase:0.82,anchorAt:1770000000000,rate:0},
        events:[{id:'7:4:0',kind:'lightning',at:1770000045000,
                 durationMs:800,intensity:0.4,origin:[-30,12,-40]}]}}
```

Epoch is the existing **room lease** epoch, never a timestamp or an independent weather counter. Revision is atmosphere-only monotonic within epoch, independent of Theater revision and presence sequence. Any semantic change/event-window replacement increments revision. Same epoch+revision duplicates are no-ops except bounded clock refresh; lower epoch/revision discarded. Higher epoch resets local event dedup and transition state, requires full snapshot. Explicit wrong room rejected **before** recording an epoch. Frame size ≤8KiB; events max 4; preset/IDs build-controlled; finite intensity [0,1], wind components [−1,1], timestamps safe nonnegative JS integers, durations ≤120000ms; unknown schema/preset/malformed data keeps last valid snapshot/default and exposes unavailable sync status, never partially applies.

RoomServer evaluates active scheduled phase from server time, stores state plus next-deadline and current lease handle. Add to existing 100ms tick with an early deadline check; emit on join, semantic transition, event-window replacement and a max once-per-30s repair snapshot while occupied. No particle-rate network loop; no autonomous user weather command in B–E. `atmosphere_get {requestId}` allows one membership-gated resnapshot every 5s; envelope requestId ≤64. Registered non-atmospheric/unknown rooms reply `atmosphere_unavailable`; no dynamic allocation by arbitrary room ID. All unsolicited output uses A's tagged World delivery and slow-consumer bound. Snapshot to joiner follows roster and does not replace/reorder specialized Theater/catalog join snapshots.

**Mandatory live owner gate:** current `ensure_room_with_lease` discards its handle and RoomServer lacks epoch/renewal state. At B task 1.1, integrate existing Lease.Handle/Renewer/Directory/Successor into that owner path, initialize held epoch in RoomServer and propagate into Frames; no SQL/lease calls per rendered particle or 100ms tick. Use existing renewer notifications and fail closed when handle invalid/expired; no scheduled events after lost ownership. Admission/startup acquires existing lease once and successor uses its acquired handle; avoid double acquisition/reacquisition against itself. Demonitor/cancel renewal on stop according to P9 lifecycle. Test actual GameChannel→World→RoomServer→frame plus owner kill/reacquire. If upstream has since repaired this, consume its tested API, do not implement a second handle. Attribute resulting integration evidence to P9; keep multi-node disabled absent P10 GO. This is a prerequisite with a selected solution, not permission to fabricate epoch 0 synchronized production state.

State is deliberately transient. Restart/new owner resets fixed presets, regenerates bounded future events and publishes a new epoch. Scheduled phases derive from absolute configured anchor, so restart resumes the schedule without replaying old events. No guarantee of meteor/lightning continuity across owner loss. Empty rooms stop at existing grace; no timer-per-empty-place. Local disconnected clients continue interpolation of last state and benign particles, mark unsynchronized, suppress pending shared one-shots after disconnect; reconnect installs the current full snapshot. Never freeze renderer or replay missed thunder.

### D3 — Interpolation, clock and events

Pure `sampleAtmosphere(state,serverNow,out)` computes target at sample time; `out` and renderer Colors/Vectors retained. Transition `{fromPreset,toPreset,fromIntensity,toIntensity,fromWind,toWind,startAt,durationMs}` contains enough source state for a late join at 50%. Use u=clamp((now−start)/duration,0,1), smoothstep `u*u*(3−2*u)` for fog/directional/hemisphere/exposure/cloud/rain/wind/audio targets; lerp colors in linear color space. Reject nonpositive duration at validation; instantaneous state replacement is represented by null transition, not division by zero. Retarget only at scheduled boundary after prior transition ends in v1 (no arbitrary mid-transition user commands). Time phase is `mod(phase+(now−anchorAt)*rate/1000,1)` for accelerated mode, constant for fixed. Use shortest wrapped angular interpolation for sky orientation; no backwards astronomical claims.

Wetness uses target from sampled state and analytic approach from last sample `next=target+(previous−target)*exp(−dt/tau)`, tau wet=20s/dry=90s, clamped [0,1]. For late joins derive wetness from deterministic preset/schedule history within a bounded cycle rather than accumulating from local entry: preset fixed rain defaults wet=1, fixed desert wet=0; scheduled profiles provide wetness keyframes alongside transitions. Thus no permanently dry newly joined court. Local cosmetic smoothing maximum 1s only when replacing fallback with authoritative state. Do not repeatedly lerp against last mutated material color.

Clock uses `serverNow` at receipt and local performance.now anchor, independent of paused game `t`; one-way latency is a known bound, not exact clock synchronization. If NetworkClient already has usable ping timing at implementation, consume it; otherwise use receipt offset with max 1s correction blend, discontinuity >5s requests fresh snapshot and suppresses events until resync. Deterministic tests inject clock. Settings pause stops costly rendering updates, but server time continues; resume samples current semantic state and skips expired events.

RoomServer schedules 1–4 future events from seeded policy with ≥5s lead time; IDs `epoch:revision:slot`, at most one replacement batch per policy interval. Clients allocate one local active event effect and retain ≤32 seen IDs for current epoch. On first snapshot join, execute only events whose at >= receipt-estimated now; an event already started is skipped entirely including delayed thunder. Subsequent live delivery arriving ≤250ms late can sample remaining envelope; later delivery skipped. No catch-up storms after hidden tab/settings/travel. Server scheduler bounds lightning spacing 45–90s and meteor spacing 35–70s. Lightning one smooth 800ms pulse, no multi-strobe. Thunder uses distance from sampled listener at event start /343 m/s, clamped 0.5–4s; scheduled audio node tied to activationGeneration and canceled on travel/mute/disconnect. Meteor duration 1200ms, no flash. Repeated snapshots cannot play the same one-shot twice. Clients may differ in individual rain/dust patterns and sound waveforms; shared IDs/times are the coherence contract.

### D4 — Renderer modules and allocation ownership

Use a controller plus small functions/modules, not an obligatory class tree:

- **src/atmosphere/model.js** re-export/client normalization only if needed; pure semantic math belongs in shared/atmosphereModel.js, do not duplicate it.
- **src/atmosphere/precipitation.js:** one line-segment BufferGeometry rain field (two vertices/drop), optional one instanced splash batch, preallocated typed arrays. Shader time/wind uniforms advance retained deterministic seeds; no per-drop Mesh/DOM/object allocation. Tile volume over whole visible place, not just player's head; near-camera alpha softening keeps first person usable.
- **src/atmosphere/sky.js:** one local sky backdrop dome/plane, cheap gradient/cloud alpha; no raymarched atmosphere. Stars supplied by D through same slot. All objects owned by active controller group, not global scene litter.
- **src/atmosphere/surfaces.js:** material-family wetness and authored puddle/ripple bindings.
- **src/atmosphere/events.js:** local pulse/meteor envelope/dedup; no local competing event scheduler.
- **src/audio/environmentAudio.js:** one active zone mixer with retained looping sources.
- **src/atmosphere/quality.js:** pure budgets/preferences and counters.

B creates **tools/atmosphere/harness.html** and small harness module importing production modules, with seeded fixtures, manual time seek, camera modes and normal/reduced controls. Do not expose debug weather manipulation through public room messages. B's harness tests wet slab + cover + light + event fixtures; C is the production proof.

Reference shared hemisphere light explicitly in main rather than adding a second global ambient source. Controller captures baseline background, FogExp2, hemisphere/sun colors/intensity and exposure before activation; restore exact values on deactivate before next place applies its baseline. Existing bloom remains one composer pass; no weather-specific post chain. Main forwards activeCamera and one dt/current server-time; expensive systems never update hidden worlds. On travel dispose emitter buffers/materials, disconnect nodes/cancel one-shots, detach listeners. Cached world geometry/material families remain owned by world; dispose controller does not dispose borrowed resources. A's ownership registry is the only disposal mechanism.

### D5 — Authored shelter and exposure

Builder returns `environment.zones`, max 16: `{id,rect:{minX,maxX,minZ,maxZ},roofY,exposure,priority,feather:0.5,audio:{rain,roof,wind,lowpassHz},acoustic:{groupId,quiet}}`. Closed boundaries, highest priority wins; equal priority lower exposure then lexical id for deterministic overlap. Exposure scalar [0,1]; outside =1. Feather a 0.5-unit inner/outer band with clamped smoothstep and normalized mix; test corners/overlap. Overhead roof is cosmetic geometry and never a giant floor collision block. Register supporting columns separately.

CPU classifies listener/player once per update against ≤16 rectangles. Rain rendering masks drop segments below roofY inside each cover rect using fixed-size shader uniforms, or equivalent precomputed cell mask; choose uniform rectangles initially. Mask the *segment*, not only its head, to prevent streaks passing through roofs. Clip splashes under cover; roof-edge runoff is separate authored emitter with downward streaks max 64 in same budget. Do not hide outdoor rain merely because listener is under cover. No arbitrary raycast per particle. Tree canopy uses partial exposure. Acoustic metadata is not networking/private voice enforcement.

### D6 — Wet materials compatible with batching

Extend buildDistrict's static batching only for explicit material family keys returned by new builders. Keep legacy single-batch appearance unchanged. New geometry groups static opaque boxes by family (`dry-stone`, `wet-stone`, `metal`, `wood`), one owned material per family, instanceColor unchanged. Snapshot each material's dry color/roughness/metalness once; apply absolute response dry→wet: wet-stone color factor 0.72, roughness max(0.18, dry*0.45), metalness unchanged. Sheltered slabs use separate dry family; no hundreds of clones or per-frame instanceColor writes. Two worlds never share a mutable wet material.

Puddles: authored planes above paving by 0.01, max 8 normal/4 reduced, depthWrite false, low opacity and roughness; add one cheap precomputed procedural environment map per active place if specular needs it (≤256² cube, ≤2MiB estimated incl. mip overhead), otherwise authored amber glint geometry gives reflected-light impression. No real mirror/SSR claim. Ripple rings are pooled/instanced with bounded lifetimes, excluded from static batch. Missing optional map falls back to glints + material response. Repeated wet/dry cycles restore original values within numeric epsilon, no cumulative darkening. Dispose map on controller exit; share ownership explicitly if reused by world.

### D7 — Audio mix that respects existing media

Extract existing sound/chime/footsteps context management into **src/audio/mixer.js**. One user-gesture-created AudioContext. Keep `afterlight-footsteps` behavior, no auto resume on travel. Master context branch → environment(ambience,weather), effects(steps/chimes). Distinct local media and voice gain factors are *logical buses*: YouTube/Vimeo/HTML video remain their existing engines, receive effective volume via existing engine.setVolume, not createMediaElementSource (current videos intentionally omit crossOrigin; WebAudio capture would break CORS-hostile sources). P8 owns voice tracks and receives the voice preference; no microphone analysis in B.

Add a narrow Theater `setMixGain(gain)` that keeps user's volume separately: effective=userVolume*mixGain. Apply effective volume on each engine creation, slider change and mix change; do not overwrite slider or queue state. On provider fallback lacking volume API, mark ducking unavailable; never mute/skip shared item to simulate ducking. Existing Sound toggle remains environment/effects only to avoid silently changing Theater volume; new labeled local media/voice controls are independent.

Default after gesture: environment ambience 0.35, weather 0.35, effects 0.7 (footstep subgain preserved), media 1, voice 1. User settings clamped 0..1, additive key `afterlight-audio-v1`; malformed/unavailable storage defaults session-only. Environment loops synthesized from reusable bounded noise buffers; one loop per layer, start once on activation after gesture, crossfade gains/filter cutoff over 500ms when crossing zones. Exposed rain [rain1,roof0,wind0.3,lowpass6000], arcade [0.35,0.7,0.15,2400], alcove [0.15,0.25,0.05,900]. Normalize summed layer gain to avoid stacking; a short synthesized impulse reverb is optional, budget ≤0.5s mono buffer, bypass on reduced quality.

P8 adapter calls one mix state hook `{voiceActive:boolean}`; default inactive. Duck environment/weather to 0.35× and media to 0.6× while active, attack 150ms/release 600ms; user voice volume never ducked. Remove duck on P8 leave/failure/travel. No duplicate voice activity detector or capture permission. Noise loops stopped/disconnected on exit; event nodes canceled, ramp ≤200ms; retained buffers shared and disposed only by mixer owner. Autoplay failure leaves visual world intact, next explicit Sound gesture retries.

### D8 — Budgets and comfort

Separate effect quality from existing DPR selector. `afterlight-atmosphere-v1` stores quality normal/reduced, ambience/weather gains in audio key, reduceMotion override nullable (null follows OS), lightning off/reduced. Default lightning **reduced**, never full-screen white strobe. Normal lightning adds ≤0.2 exposure and ≤20% directional intensity for one smooth pulse; off suppresses flash entirely but permits optional thunder/caption. Reduced motion retains rain/fog/wetness/lamps; rain density quartered, foliage/sky drift stopped, no screen shake, emitter near-camera motion reduced, meteors replaced by quiet optional caption. Particle checkbox off suppresses particles but leaves lighting/wetness. Settings have labels, keyboard focus, live value text and storage failure tolerance.

Budgets are acceptance ceilings for new systems, to be measured on declared hardware:

| Budget | normal | reduced |
|---|---:|---:|
| rain drops | 4096 | 1024 |
| splash/ripple instances | 128 | 32 |
| active particle render batches across all effects | 6 | 3 |
| total new atmosphere draw calls (excluding world) | 12 | 6 |
| new effect texture allocation | 8MiB | 2MiB |
| per-frame atmosphere CPU p95 after warmup | 2ms | 1ms |
| additional shadow-casting lights | 0 | 0 |

At most one atmosphere controller, one transient event visual, and ≤8MiB pooled CPU buffers. World slices specify geometry/light caps. Normal uses existing 2048 sun shadow; reduced can use 1024 on activation, restoring original on exit. Never change shadow-map size each frame. No offscreen simulation; visibility/settings resume analytically samples current time. Quality changes recycle bounded resources once, not on every update. Document actual measurements and failed hardware profiles; target ~16.7ms median/≤25ms p95 at 1920×1080 on declared ordinary desktop, not a universal FPS promise.

## Risks / Trade-offs

- [Shared schedule but imperfect receipt clock] → explicit approximate sync, future lead and late-event suppression; no frame-accurate flash claims.
- [Rain clipping/overdraw] → roof segment clipping, fixed density, camera tests, reduced tier; no extra renderer.
- [Specular without assets] → bounded procedural map/glints; no promise of screen-space reflections.
- [Lease integration incomplete upstream] → gate with real failure test, repair existing owner seam first; never enable separate weather authority.
- [Provider duck unsupported] → report local limitation and retain user volume; game and media continue.

## Migration Plan

Pure model/fixtures and owner verification → snapshot routing/client filtering → renderer/zone/surface/audio modules and harness → quality/accessibility → C content. Deploy server additive messages before client. Feature flag `AFTERLIGHT_PLACE_ATMOSPHERE` defaults false until owner tests pass, then enable supported single-node deployment. Client missing server gets deterministic manifest defaults marked unsynchronized. Disabling flag stops broadcasts/events and leaves default local presentation; never modifies farm weather, saves, Theater bill or Node routing. No rollback data migration.

## Testing and measurement gates

Use tasks.md and A verification.md. No benchmark was executed during specification. CPU budgets and full-frame targets are gates for implementation: if failed, reduce density/draw calls/lights and remeasure; do not edit ceilings to relabel a failure. P8 and multi-node rollout remain upstream measured gates with explicit off/unknown fallback.
