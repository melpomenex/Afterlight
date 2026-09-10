## Context

See proposal.md — Why. Current behavior that shapes the fix:

- `resolveFlagsFrom()` (`src/realtime/flags.js`) merges env → localStorage → URL
  params, with all five acceleration flags defaulting to `false`. URL wins, so
  `?rt_webgpu_fastpath=0` can override an env default.
- `wireRealtime()` (`src/realtime/wire.js`) selects
  `createLiveInstancedSession()` (green capsule proxies, no nicknames) when
  `shouldConstructWebGpu(flags)` — i.e. `renderer_webgpu_fastpath` — is set and
  a scene is provided; otherwise it selects `createLiveEntitySession()`
  (full gardener avatars driven through `RemotePlayersManager.setPlayer()`).
- `.env.production` and `.env.development` currently set
  `VITE_RT_WEBGPU_FASTPATH=1` (commit `9658158`), and the committed `dist/`
  bundle bakes `VITE_RT_WEBGPU_FASTPATH:"1"`.
- `docs/architecture/realtime/gpu-rendering.md` and `decisions.md` §7 record:
  defaulting `renderer_webgpu_fastpath` for any live scene is **REJECT**; the
  flag stays opt-in and default OFF; live instanced proxies are adopted
  selectively behind `?rt_webgpu_fastpath=1`.
- The `player-identity` spec requires full procedural gardener avatars with
  overhead nickname plates for remote players.

## Goals / Non-Goals

**Goals:**

- The shipped dev and production configurations render remote players as full
  gardener avatars with nickname plates.
- The benchmarked data plane (`realtime_binary`, `realtime_wasm`,
  `realtime_worker`) stays enabled; only the rejected rendering default changes.
- The experimental proxy renderer stays reachable through explicit runtime
  opt-in for harness/debug use.
- A repository test fails if committed configuration re-enables the rejected
  default.

**Non-Goals:**

- Changing `wireRealtime()` selection logic, the proxy renderer, or
  `src/render/avatars.js`.
- Deleting the WebGPU/harness path, its benchmarks, or its evidence.
- Re-benchmarking or promoting WebGPU rendering.
- Reworking flag precedence or the granular-flag contract.

## Decisions

**1. Fix the committed defaults, not the renderer.** Remove
`VITE_RT_WEBGPU_FASTPATH=1` from `.env.production` and `.env.development` and
update the section comment; keep `VITE_RT_BINARY`, `VITE_RT_WASM`,
`VITE_RT_WORKER`. The renderer and selection code already follow the recorded
decision when the flag is off.
*Alternatives considered:* (a) gate `createLiveInstancedSession` on a URL-only
opt-in — rejected: expands the change, departs from documented flag precedence,
and URL/storage opt-in is already supported; (b) leave the env on and document
the proxy look — rejected: contradicts the recorded decision and the
`player-identity` requirement.

**2. Regression guard tests resolved flags, not just file text.** A Node test
reads the committed `.env.production`/`.env.development`, merges their values
through `resolveFlagsFrom({ env })`, and asserts `renderer_webgpu_fastpath` stays
`false` while `realtime_binary` remains `true` (the full-avatar path). It also
asserts `shouldConstructWebGpu()` is false for those values. File paths resolve
relative to the test module (`new URL('../../.env.production', import.meta.url)`)
so cwd does not matter. This guards the actual contract — the flag set a default
build resolves to — rather than a string match, so benign formatting changes do
not break it.

**3. Keep the opt-in escape hatch.** `?rt_webgpu_fastpath=1` or a personal
localStorage flag continues to select the proxy path; only the committed default
returns to OFF. Verification for the fix includes an explicit opt-in run to show
the hatch still works.

**4. Refresh generated output.** Rebuild `dist/` and confirm the bundle no
longer contains the fastpath default, since the repo commits the built preview.
Vercel rebuilds from source using `.env.production`, so the production deploy
follows the same fix.

## Risks / Trade-offs

- [A tester with the flag already in localStorage still sees proxies] →
  verification uses a clean profile or clears `afterlight-rt-flags`; the opt-in
  is by design.
- [Committed `dist/` drifts from source again] → rebuild in the same change and
  verify the bundle literal.
- [The regression test reads env files that could be repurposed later] → test
  asserts resolved-flag shape (`binary on`, `fastpath off`), so any intentional
  change must update the test and the decision record.
- [Other flagged acceleration paths could silently alter avatar rendering] →
  the browser smoke check renders a second client in The Orpheum with the
  shipped defaults and confirms full avatars plus nickname plates, while root
  `npm test` covers the resolved-flag contract.

## Migration Plan

No data migration. Restart dev servers after the env edit, run `npm test` and
`npm run build`, then redeploy the frontend (`npm run deploy:frontend` or the
standard deploy flow). Rollback is re-adding the flag, which reintroduces the
defect and is not recommended.
