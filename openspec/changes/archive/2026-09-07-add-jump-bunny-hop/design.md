# Design: Add Jump and Bunny Hop

## Context

Movement in `src/main.js` is flat and per-frame: `move()` steps a dt-scaled direction (walk 2.8 u/s, run 5.0 u/s) through per-axis `isWalkable()` rectangle collision; the avatar's `y` is purely cosmetic (walk bob, forced to 0 when idle). Space is already intercepted by the key handler (preventDefault, seated stand-up, added to `keys`) but has no movement effect. Presence sync is `sendMovement(x, z, rotY, walking, sitting)` at ~12 Hz client / 10 Hz server broadcast; `server/world.js` validates finite x/z/rotY and relays flags; remote avatars lerp x/z and derive y from the walking/sitting flags. The first-person camera already sits at `player.position.y + eye`, and `cameraControl.js` established the precedent of pure, Node-testable modules for input math. See proposal.md for motivation and specs/character-movement for the behavior contract.

## Goals / Non-Goals

**Goals:**
- Real vertical jump physics on the local avatar, owned by one place in the frame loop.
- CS-style hold-to-bhop: no ground pause between chained hops, momentum preserved, small per-hop gain, hard cap, no air friction on steering.
- Zero collision/bounds changes — the existing 2D contract holds while airborne.
- Jumps visible to other players via an additive presence flag.
- Jump/bhop math in a pure module covered by Node tests, like `cameraControl.js`.

**Non-Goals:**
- Height-aware collision, clearing or standing on obstacles (explicitly excluded).
- True Quake/Source vector air-acceleration (`accelerate()`-style speed gain from strafe-turning); the spec requires momentum preservation and free steering, not strafe-gain physics.
- Saving jump state anywhere; companion Kiln jumping; animations beyond a simple leg tuck.
- New UI surfaces (no jump button on the HUD; keyboard-only input, consistent with the game's controls).

## Decisions

### D1: Pure jump module (`src/jump.js`)
A state object plus a step function — roughly `createJumpState()` and `stepJump(state, { grounded, jumpHeld, moveSpeed }, dt)` returning `{ y, vy, airborne, hopSpeed, chain }` — with no Three.js imports. `main.js` owns the state, feeds it grounded/movement facts each frame, and applies the returned y and speed scalar.

*Why:* matches the `cameraControl.js` pattern; the timing/gain/cap rules are the interesting logic and must be Node-testable. *Alternative:* inline in `main.js` — rejected: `main.js` is already the largest file and the rules would be untestable.

### D2: Vertical physics constants
Gravity ≈ 22 u/s², takeoff velocity ≈ 5.5 u/s → ~0.5 s airtime, ~0.69 u apex (about waist height on a 1.5-unit avatar: clearly visible, no platforming implications). Integrated with the frame's dt under the existing 0.04 s cap; landing clamps y to 0.

*Why:* tuned for readability at isometric zoom (18–34) and stability across 30–144 fps. *Alternative:* shorter pogo-hop (~0.3 s) — rejected: too fast for the 10 Hz presence relay to depict reliably.

### D3: Momentum as a scalar speed override, not a velocity vector
The game commands *direction × speed per frame*; there is no velocity vector to preserve. Introduce a `hopSpeed` scalar used in place of the walk/run speed while a chain is live:

- Takeoff from the ground: `hopSpeed` = the currently commanded speed (walk or run).
- Airborne: horizontal displacement uses `direction × hopSpeed`; steering changes direction only — `hopSpeed` never decays in air.
- Clean landing (Space held): `hopSpeed = min(hopSpeed + GAIN, CAP)` with GAIN ≈ 0.35 u/s, CAP = 1.5 × run = 7.5 u/s, and the next hop launches immediately.
- Landing without Space, or any chain-reset event: `hopSpeed` cleared; the next grounded frame uses normal walk/run speed.

*Why:* achieves every observable in the spec (preserve, grow, cap, free steering) with a one-line change to the speed argument `move()` already takes. *Alternative:* true velocity-vector movement with Source-style air acceleration — rejected for this slice: it rewrites the entire movement model and interacts with per-axis collision and click-to-walk in nontrivial ways; the scalar model can be upgraded later without changing the spec.

### D4: Chain-reset hooks at existing state-change call sites
The same places that already clear keys/target handle resets: `standUp()`, `setRoom()` (travel/spawn), pause paths (`toggleSettings`, `openDistricts`), chat-input focus change, and window blur. Landing without Space held resets in the step function. No new subsystem for "chain validity".

*Why:* these call sites are the proven single points of truth for movement-state hygiene (they already fix stuck-keys bugs). *Alternative:* infer resets from flags each frame — rejected: spreads the rules and invites the exact "previous area's state" bugs the codebase has hit before.

### D5: Airborne presence flag only — remotes synthesize the hop
MOVEMENT gains an optional `airborne` boolean. The server stores and relays it exactly like `sitting` (`server/world.js` `updateMovement()` + broadcast payload; finite-check unchanged; not persisted). Remote clients animate a standardized hop parabola on the flag's rising edge and settle on the falling edge (with a stale-flag timeout as a guard), rather than receiving y.

*Why:* one boolean keeps the protocol additive and untrusted-y-free; a ~0.5 s hop spans ≥4 packets at 10–12 Hz, so edges are reliably seen. *Alternative:* send y and interpolate — rejected: more protocol surface and validation for presentation the client can synthesize.

### D6: Input integration
Jump triggers on non-repeat Space keydown while grounded, not seated, and not paused — the existing seated branch keeps standing the player up without jumping. Holding Space is the bhop mechanism: the step function re-launches whenever a landing occurs with Space in `keys`. While paused, the frame loop doesn't step physics, so jumps freeze; D4's reset ensures a clean grounded resume. Typing focus is already handled (input guard + `keys.clear()`).

### D7: Who owns avatar y
One rule: while `airborne`, y comes from the jump state; otherwise the existing bob code runs untouched. `move()` keeps its exact collision contract (jump only changes the speed scalar passed in). FP camera needs no change (reads `player.position.y`); isometric camera follows x/z only. Remote avatars: flag-edge parabola in `RemotePlayersManager.update()`, with `sitting` still winning (seat > air).

## Risks / Trade-offs

- [Scalar momentum can't reward strafe-turning like real Source air-accel] → Accepted trade-off; the spec requires preservation + gain + cap, not strafe-gain. D3 leaves a clean seam to upgrade to a vector model later without spec changes.
- [Bhoppers at 7.5 u/s outrun walkers, runners, and Kiln (3.5 u/s)] → Capped at 1.5× run; Kiln already trails a running player today and catches up on stop. Social/race dynamics unaffected in practice.
- [12 Hz movement sampling could miss airborne edges] → Hop airtime ~0.5 s ≥ 4 packets; remotes also snap to ground on a stale-flag timeout so a dropped packet can't leave an avatar hovering.
- [Frame-rate dependence of the parabola] → dt-based integration under the existing delta clamp; constants chosen stable across 30–144 fps.
- [Airborne pinning against obstacles looks odd] → Collision is intentionally unchanged; landing always restores grounded handling, and cap-limited speed limits any pressing-into-a-wall time.
- [State leaking across travel/sit/pause] → D4 pins resets to the call sites that already own movement hygiene; covered by unit tests on the step function's reset paths.

## Migration Plan

Additive only: one optional boolean on an existing message, a new client module, and local presentation changes. No save-schema, collision, or district changes. Deploy server and client together or in any order — a client without the flag and a server without it both degrade to today's behavior. Rollback is a client revert; the flag is ignored if present.

## Open Questions

None material. The feel constants (airtime, gain, cap) are recorded in D2/D3 as starting values and are tunable during implementation without changing the specs or task breakdown.
