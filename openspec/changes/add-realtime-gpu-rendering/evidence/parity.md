# Screenshot parity set — task 3.3

Scenes required: empty room, 2 players, 50 players, garden, theater.
Compared: CPU harness arm vs live game (placement, shadows, overlay, HUD).

## What exists

| scene | harness preset | live game |
|---|---|---|
| empty room | `?scene=empty` | attempted (`live-default.png`) |
| 2 players | `?scene=two` | not captured (no headed multiplayer session) |
| 50 players | `?scene=fifty` + `harness-fifty.png` | not captured |
| garden | `?scene=garden` (population only, not the district mesh) | not captured |
| theater | `?scene=theater` (population only, not Orpheum / overlay) | default spawn; headless stayed on the loader |

## Live capture attempt

`tools/realtime/capture-live-parity.mjs` against the already-running game
dev server (`http://127.0.0.1:5173`, unchanged `main.js`). Headless
Chromium + SwiftShader never left `INITIALIZING EXPEDITION...` —
same WebGL-context failure as the harness. No playable frame, no HUD, no
garden/theater geometry, no overlay.

## Disposition

**Parity is not claimed.** The CPU harness is a box-instance prototype
without bloom, theater homography, or HUD. Combined with the probe's
scatter checksum failure on SwiftShader, this is why
`renderer_webgpu_fastpath` stays default OFF and why the decision record
is ADOPT SELECTIVELY (seam + CPU) / PARK (WebGPU) / REJECT (live default).

A headed GPU session must produce the five-scene set before any later
change proposes flipping the flag for a scene class.
