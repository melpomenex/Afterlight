## 1. Source baseline and contract reconciliation

- [x] 1.1 Record working-tree status, nested SSXTricky revision/dirty hashes and source provenance; preserve concurrent changes.
- [x] 1.2 Run the actual SSXTricky source and capture start, ramp/speed lane, trick, chairlift, finish and results; record controls and source rules test results.
- [x] 1.3 Reconcile the unarchived add-multiplayer-snowboard-arcade proposal/design/specs/tasks with this change: replace reference-only/night-mountain/robot decisions, retain shared authority and lifecycle requirements.
- [x] 1.4 Create a source-to-port fidelity checklist covering every scene feature, mechanic, HUD element and intentional multiplayer adaptation in design.md.

## 2. Extract the actual Alpine Rush presentation

- [x] 2.1 Extract source scene/course construction into host-compatible modules without altering terrain composition, seed, scenery, ramps, lanes or pickups; preserve standalone comparison entry.
- [ ] 2.2 Port the source rider rigs, camera, trick animation, particles, shadows and daylight lighting; verify matching captures at fixed poses.
- [ ] 2.3 Connect scene update/resize/dispose to the existing view lease and host frame loop; verify no second renderer, RAF, app or socket and restore renderer settings on exit.
- [ ] 2.4 Port source HUD/menu/result feedback to scoped DOM/CSS, hiding unrelated world HUD during play while preserving chat and exit.

## 3. Deterministic source gameplay

- [x] 3.1 Extract simulation from source tick and rules.mjs into a fixed-step, seeded shared model; test source-equivalent carve, brake, tuck/lean and boost behavior.
- [x] 3.2 Generate versioned canonical Alpine Rush terrain, ramps, speed zones, pickups and finish geometry; verify visual/contact agreement and hash determinism.
- [x] 3.3 Add replay fixtures for charge/super-pop, ramp edge launch, speed lanes, airborne tricks, clean combos, bails and per-rider pickup limits.
- [x] 3.4 Port these rules to Phoenix with cross-language fixture parity and explicit numeric tolerances; reject impossible/unbounded inputs and client-authored scores.

## 4. Shared race integration

- [ ] 4.1 Extend bounded controls/snapshots for source trick/boost state and score; provide explicit authoritative start time and normalize rider slot/player identity.
- [ ] 4.2 Wire source-model prediction/reconciliation and remote interpolation to existing activity transport and version negotiation; replace AI with actual participants.
- [ ] 4.3 Preserve source E/Q/X/B/W/Shift/Space inputs with phase-scoped Ready/Rematch and Escape exit; add touch equivalents and typing/blur neutralization.
- [ ] 4.4 Implement first-press load/readiness with seat identity, acknowledgement matching, retry and cancellation; cover fresh seat, re-seat, promotion and stale acknowledgements.
- [ ] 4.5 Implement authoritative finish order plus trick scores and rematch reset of prediction, pickups, boost, tricks and results; keep all rewards session-local.
- [ ] 4.6 Verify opt-in audio and complete exit/travel/dispose restoration of world, theater, input and listeners.

## 5. Acceptance and rollout readiness

- [ ] 5.1 Compare paired source/integrated captures for start, ramps, airborne tricks, chairlift and finish; reject sparse substitute scenes even when technically renderable.
- [ ] 5.2 Run real two-client fresh Ready, race, result, first Rematch, exit/re-seat and reconnect playtests; save frames and visible evidence rather than protocol-only claims.
- [ ] 5.3 Record 2/4/8-rider performance, low-quality readability and repeated entry/exit resource stability; retain source-defining content when optimizing.
- [ ] 5.4 Run source rules tests, shared/Phoenix parity and lifecycle tests, npm test, production build, Ripwire quality/test review and strict OpenSpec validation; document any remaining limitation.
- [ ] 5.5 Update README controls and prepare coordinated server-first capability rollout, active-race drain and rollback instructions. Deployment remains a separate user action.
