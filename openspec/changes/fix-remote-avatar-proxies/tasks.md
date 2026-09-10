## 1. Restore full-avatar defaults

- [x] 1.1 Remove `VITE_RT_WEBGPU_FASTPATH=1` from `.env.development` and update the section comment so it no longer claims WebGPU proxies are enabled by default; keep `VITE_RT_BINARY`, `VITE_RT_WASM`, `VITE_RT_WORKER`.
- [x] 1.2 Remove `VITE_RT_WEBGPU_FASTPATH=1` from `.env.production`, keeping the same binary/WASM/worker flags and the gateway URL untouched.
- [x] 1.3 Confirm no other committed build input enables the fastpath by default (`vite.config.js`, `package.json`, `deploy/**`, `index.html`); only the runtime URL/localStorage opt-in may.

## 2. Regression guard

- [x] 2.1 Add a test (in `tests/realtime/gpu-backend.test.js` or a sibling under `tests/realtime/`) that reads the committed `.env.production` and `.env.development` relative to the test module, merges their values through `resolveFlagsFrom({ env })`, and asserts `renderer_webgpu_fastpath === false` while `realtime_binary === true` and `shouldConstructWebGpu(...) === false`.
- [x] 2.2 In the same test, assert the explicit runtime opt-in still selects the fastpath (`resolveFlagsFrom({ search: '?rt_webgpu_fastpath=1' })` → `true`) so the escape hatch stays covered.
- [x] 2.3 Run `npm test` and resolve any relevant failures.

## 3. Record the regression

- [x] 3.1 Add a dated note to `docs/architecture/realtime/decisions.md` §7 recording that commit `9658158` briefly enabled the rejected live default, that `renderer_webgpu_fastpath` remains opt-in/default OFF, and that a repository test now guards the committed configuration.
- [x] 3.2 Confirm `docs/architecture/realtime/gpu-rendering.md`'s verdict table still matches the shipped default; adjust wording only if it contradicts the fix.

## 4. Rebuild and verify

- [x] 4.1 Run `npm run build` and confirm the emitted bundle contains no `VITE_RT_WEBGPU_FASTPATH:"1"` literal.
- [x] 4.2 Keep the regenerated `dist/` output consistent with source (do not hand-edit generated bundles).
- [x] 4.3 With shipped defaults and a second client in The Orpheum, verify the remote player renders as a full gardener avatar with a nickname plate and that no `rt-remote-proxies` instanced layer is active.
- [x] 4.4 Load once with `?rt_webgpu_fastpath=1` and confirm the experimental proxy path still engages, then reload without the switch and confirm full avatars return.
- [x] 4.5 Report the verification performed, including any browser check that could not be completed.
