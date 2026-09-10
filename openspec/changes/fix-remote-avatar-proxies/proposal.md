# Fix remote avatars rendering as proxy orbs

## Why

On 2026-09-08, commit `9658158` ("enable realtime acceleration flags") added
`VITE_RT_WEBGPU_FASTPATH=1` to `.env.production` and `.env.development`. That
flag makes the live client select the experimental instanced-proxy renderer for
remote players, so other players appear as untextured green capsule "orbs" with
no nickname instead of their full gardener avatars (reported in The Orpheum).
The flip contradicts the recorded decision — defaulting `renderer_webgpu_fastpath`
for any live scene is REJECTED and the flag "stays opt-in and default OFF"
(`docs/architecture/realtime/gpu-rendering.md`, `decisions.md` §7) — and breaks
the shipped `player-identity` avatar guarantee.

## What Changes

- Remove `VITE_RT_WEBGPU_FASTPATH=1` from `.env.production` and
  `.env.development`; the WebGPU/proxy renderer returns to explicit opt-in only
  (`?rt_webgpu_fastpath=1` or a personal localStorage flag).
- Keep the benchmarked `VITE_RT_BINARY`, `VITE_RT_WASM`, and `VITE_RT_WORKER`
  flags enabled; those route presence through the full-avatar live backend, not
  the proxy.
- Add a regression test that the committed build env files never force-enable
  the rejected fastpath, and that the shipped default resolves to full avatars
  with binary acceleration still on.
- Rebuild the committed `dist/` bundle so it no longer bakes the fastpath
  default.
- Record the incident and its guard in the realtime decision notes.

## Capabilities

### New Capabilities
<!-- none: the defect is a broken default of an existing guarantee -->

### Modified Capabilities
- `player-identity`: the "Avatar Differentiation and Remote Movement
  Interpolation" requirement gains the default-rendering guarantee — the
  shipped live configuration always renders full procedural gardener avatars
  with overhead nickname plates for remote players, and proxy/instanced
  representations appear only under explicit experimental opt-in.

## Impact

- `.env.production`, `.env.development` — build-time flag defaults for the
  production Vercel build and the dev server.
- `tests/realtime/gpu-backend.test.js` (or a sibling config regression test) —
  guard against the same class of default flip.
- `docs/architecture/realtime/decisions.md` §7 — dated note.
- `dist/` — generated bundle refresh.
- No change to `src/realtime/wire.js` selection logic or
  `src/render/avatars.js`; the avatar code is correct, the enabled default is
  not.
