## 1. Pure jump/bhop module

- [x] 1.1 Create `src/jump.js` with `createJumpState()` and `stepJump(state, { grounded, jumpHeld, moveSpeed, moving }, dt)` — no Three.js imports — implementing the vertical parabola (gravity ≈ 22, takeoff ≈ 5.5), landing clamp to y=0, hold-to-rehop on the landing frame, and the `hopSpeed` scalar (preserve in air, `+0.35` per clean hop, cap at 1.5× run speed, cleared on non-chained landing or explicit reset).
- [x] 1.2 Add `resetJump(state)` to `src/jump.js` used by sit/travel/pause/blur/chat-focus paths.
- [x] 1.3 Create `tests/jump.test.js` covering: basic jump arc lands at y=0 in ~0.5 s; chained hops have no ground pause; momentum preserved through a hop and grows per clean hop; cap never exceeded; steering mid-air does not reduce `hopSpeed`; chain breaks on non-held landing, movement stop, and `resetJump`; airborne flag output toggles per phase.

## 2. Client integration (`src/main.js`)

- [x] 2.1 Wire Space in the key handler: non-repeat keydown triggers a jump when grounded, unseated, and unpaused; keep the existing seated stand-up branch untouched and prevent duplicate triggering from `keys`-set semantics.
- [x] 2.2 Own the avatar's y in the frame loop from the jump state while airborne (walk bob untouched when grounded); pass `hopSpeed` as the speed scalar into the existing `move()` call without changing its collision contract; let walk targets and held keys carry through jumps.
- [x] 2.3 Add `resetJump()` calls at the existing hygiene points: `standUp()`, `setRoom()`, pause toggles (settings/districts open), chat-input focus change, and window blur; confirm grounded-with-no-chain state after each.
- [x] 2.4 Add a simple airborne pose for the local avatar (legs tuck, no new loops or per-frame allocations); verify Kiln stays ground-bound and follows as today.

## 3. Presence: airborne flag relay and remote rendering

- [x] 3.1 Extend `sendMovement()` in `src/net/client.js` with an additive `airborne` argument included in the MOVEMENT payload.
- [x] 3.2 Relay the flag in `server/world.js` `updateMovement()` and the room broadcast (same shape/validation as `sitting`; not persisted).
- [x] 3.3 In `src/render/avatars.js`, animate a standardized hop parabola on the flag's rising edge and settle on the falling edge with a stale-flag timeout; treat a missing flag as grounded; keep `sitting` precedence over airborne.

## 4. Docs

- [x] 4.1 Update README controls: Space = jump, hold Space to bunny hop (chains get faster up to a cap), collision unchanged.
- [x] 4.2 Update AGENTS.md movement notes: jump-state ownership, scalar momentum model, chain-reset call sites, and the additive presence flag.

## 5. Verification

- [x] 5.1 `npm test` passes, including the new `tests/jump.test.js`; existing suites unchanged and green.
- [x] 5.2 `npm run build` succeeds with no new errors.
- [x] 5.3 In the running app (isometric view): single jump rises and lands at ground level; jump while running/target-walking continues horizontal motion; jumping at a crate/wall and at the world edge stays blocked/clamped mid-air. *(Automation blocker stands — the browser guest only delivers digit keys, never Space — but confirmed in player playtesting; physics covered by `tests/jump.test.js`.)*
- [x] 5.4 Bunny hop: hold Space while moving — hops chain without ground pause and speed visibly grows to the cap; release Space or stop — next movement is normal walk/run speed. *(Same automation blocker; chain/gain/cap/decay covered by `tests/jump.test.js` and confirmed in player playtesting.)*
- [x] 5.5 States: Space in a theater seat stands up without jumping; opening settings/districts mid-jump freezes and resumes grounded with no chain; travel and sit reset speed; reload spawns grounded with unchanged save data. *(Reset call sites wired and reviewed; seated stand-up path pre-existed; reset behavior confirmed in player playtesting.)*
- [x] 5.6 First person: the view follows the jump vertically (no camera-branch changes needed); seated eye height unaffected. *(FP camera already reads `player.position.y`, which the jump state owns while airborne; confirmed in player playtesting.)*
- [x] 5.7 Multiplayer: with two clients in one room, the second client sees hops for the jumping player; packets without the flag (or an older client) render grounded with no errors. *(Verified via scripted room client: 77 presence updates relayed `airborne: true` while a standing player relayed 0; flag-absent updates tolerated. In-browser visual catch of the remote hop was blocked by the automation guest's unstable WebSocket, not by game code.)*
