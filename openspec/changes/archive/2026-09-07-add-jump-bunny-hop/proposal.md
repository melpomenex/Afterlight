# Add Jump and Bunny Hop

## Why

Movement is currently glued to the floor: WASD/click-to-walk and Shift-run at fixed speeds, with the avatar's y used only for a cosmetic walk bob. Space is already intercepted by the input layer but does nothing. Jumping is the one universal movement verb the game lacks, and a CS-style bunny hop adds a genuine skill expression — timing hops to preserve and build momentum — without touching the game's collision or level design.

## What Changes

- **Space = jump.** A grounded player leaps with real vertical motion (gravity, landing). While airborne the avatar's y is owned by the jump physics, replacing the walk bob; grounded play is unchanged.
- **Bunny hop.** Holding Space re-jumps on the landing frame. Each clean chained hop preserves the horizontal momentum carried into the jump and grants a small speed bonus, capped (≈1.5× run speed). Steering mid-air bleeds no speed; landing without a chained hop drops momentum back to normal walk/run speed. Broken chains (stopping, pausing, sitting, traveling) reset the chain.
- **Collision unchanged.** Obstacles and world bounds block at all times, including mid-air. Jumps do not clear crates, benches, or other props, and nothing can be stood on. (User-confirmed decision.)
- **Authentic speed model.** Momentum is preserved through chained hops with a small per-hop gain up to the cap, so skilled hopping is faster than running. (User-confirmed decision.)
- **First person rides along.** The FP camera is already placed at `player.position.y + eye`, so the view follows jumps with no camera-branch changes; isometric views simply see the avatar hop.
- **Multiplayer presence.** The movement packet gains an additive `airborne` flag (and jumps stay visible via avatar y interpolation for remotes) so other players see hops. Server relays the flag; no persistence, no new validation beyond today's finite checks.
- **State interplay preserved.** Space while seated still stands the player up (no jump from the chair); jump is suppressed while paused, in dialogs, or typing in chat; traveling, sitting, or entering cinema view resets the jump state.
- Speed/momentum/chain state is session-local movement mechanics: never saved, never persisted.
- Documentation (README controls) and tests for the extracted, pure jump/bhop math.

## Capabilities

### New Capabilities
- `character-movement`: The character's vertical and momentum-based movement as player-facing behavior — the jump input and its physics, bunny-hop chaining and the speed model, how jumping interacts with seated/cinema/paused states and travel, how jumps appear to remote players, and the invariant that collision and world bounds keep blocking while airborne.

### Modified Capabilities
- (none — no capability has been archived yet; grounded walking, running, and click-to-walk behavior are unchanged and are specified once under `character-movement`)

## Impact

- **Client**: `src/main.js` — Space triggers jump in the key handler; the frame loop applies vertical physics and momentum to the player (Kiln stays a ground follower as today); the avatar's y is driven by the jump controller instead of the walk bob while airborne. New pure module (e.g. `src/jump.js`) holding the jump/bhop math — gravity, hop timing, momentum bonus, cap, chain reset — with no Three.js dependencies so it is unit-testable.
- **Rendering**: `src/render/avatars.js` — remote avatars render an airborne pose/height from the new flag (and smoothed y), mirroring the local tuck-and-land presentation.
- **Protocol/server**: additive optional `airborne` flag on the existing MOVEMENT message; `server/world.js` `updateMovement()` stores and relays it like `walking`/`sitting`. No persistence, no schema migration, old clients unaffected (field ignored).
- **Untouched**: collision (`isWalkable`, obstacle rects, bounds), districts/builders, save data, theater playback, chat/economy.
- **Tests**: new tests for the pure jump/bhop helpers (timing, gain, cap, decay, reset rules); existing suites unchanged.
- **Docs**: README (Space = jump, hold to bunny hop), AGENTS.md movement notes.
