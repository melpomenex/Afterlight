# Screenshot parity set — task 3.3

Scenes required: empty room, 2 players, 50 players, garden, theater.
Compared: CPU harness arm vs live game (placement, shadows, overlay, HUD).

## What exists

| scene | harness preset | live game |
|---|---|---|
| empty room | `?scene=empty` | attempted (`live-default.png`) |
| 2 players | `?scene=two` | not captured (no headed multiplayer session) |
| 50 players | `?scene=fifty` + `harness-fifty.png` + **headed** `harness-headed-fifty.png` | not captured |
| garden | `?scene=garden` (population only, not the district mesh) | not captured |
| theater | `?scene=theater` (population only, not Orpheum / overlay) | default spawn; headless stayed on the loader |

## Live capture attempt

`tools/realtime/capture-live-parity.mjs` against the already-running game
dev server (`http://127.0.0.1:5173`, unchanged `main.js`). Headless
Chromium + SwiftShader never left `INITIALIZING EXPEDITION...` —
same WebGL-context failure as the harness. No playable frame, no HUD, no
garden/theater geometry, no overlay.

## Headed harness (2026-09-07)

User-headed Brave/Chromium run at
`tools/realtime/gpu-harness.html?rt_webgpu_fastpath=1`, fifty-player
preset: both control and accelerated arms rendered (`harness-headed-fifty.png`,
`harness-headed.json`). This is harness placement parity at n=50, not live
game parity.

## Disposition

**Live-game parity is not claimed.** The harness is a box-instance prototype
without bloom, theater homography, or HUD. Headed evidence un-parks the
WebGPU harness arm; `renderer_webgpu_fastpath` still defaults OFF in the
client. Decision: ADOPT SELECTIVELY (seam + CPU) / UNPARK WebGPU (harness
only) / REJECT (live default).

A headed live-game five-scene set is still required before any later change
proposes flipping the flag for a scene class.
