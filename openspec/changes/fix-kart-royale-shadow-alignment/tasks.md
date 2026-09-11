## 1. Reproduce and isolate the render path

- [x] 1.1 Reproduce the displaced shadow in a Kart Royale race with the reported vehicle view and record the camera distance, kart state, and LOD state. (The supplied paused-race capture was inspected; a second local live capture is blocked by unavailable WebGL 2.)
- [x] 1.2 Use the existing Kart Royale shadow diagnostics to independently toggle or inspect the live contact-shadow mesh, detail shadow casters, and far-detail impostor, identifying the source of the extra or offset silhouette.
- [x] 1.3 Document the confirmed root cause and the intended single-shadow ownership rule before changing rendering code. See `investigation.md`.

## 2. Correct vehicle shadow ownership and placement

- [x] 2.1 Update the confirmed contact-shadow/proxy path so the visible contact-shadow mesh stays aligned to the kart root and wheel-contact footprint across supported chassis and livery layouts.
- [x] 2.2 Ensure the corrected path cannot bake, retain, or concurrently render a second contact-shadow silhouette during detail-to-impostor transitions.
- [x] 2.3 Preserve suspension-responsive contact-shadow behavior and the existing draw-budget performance policy while leaving track and scenery lighting shadows unchanged.

## 3. Regression coverage and verification

- [x] 3.1 Add focused automated or deterministic diagnostic coverage for contact-shadow transform/ownership and near/far LOD hand-off behavior.
- [ ] 3.2 Visually verify steering, movement, suspension travel, and near-to-far-to-near transitions for several active karts; confirm one grounded contact shadow per kart. (Blocked here: the available browser cannot create a WebGL 2 context.)
- [x] 3.3 Run the focused Kart Royale tests, the repository test suite, and the applicable Kart Royale/root production builds; record any environment-limited browser check separately. (Focused test and Kart Royale build pass; root test has unrelated socket-dependent failures. Root build was not run because its generated `dist/` has unrelated user changes that must not be overwritten.)
