# Baseline — integrate-multiplayer-downhill-mayhem-arcade

Recorded 2026-09-10 before implementation (task 0.1/0.5).

## Revision

- Repo: `melpomenex/Afterlight` (local `$(git rev-parse --show-toplevel)`)
- Commit: `0e3ba441b36a23395aabb8501c21cc799bd33cd2`
- Working tree: clean at inspection start (only this change's untracked planning
  directory).

## Downhill Mayhem source hashes (SHA-256)

| File | SHA-256 |
| --- | --- |
| `games/downhill-mayhem/index.html` | `254858046aa8a934a26b4080e51d882b24406227686508318e0f93bc80cba3fc` |
| `games/downhill-mayhem/README.md` | `2b13edc9aad4f54d66aaf1eb9744ac3734e60721752637db4b8d6ce2d63a13be` |
| `games/downhill-mayhem/LICENSE` | `449ed6c493d9635f9caa8cab1af635a95843d550298f5aee4ae8014500e764b5` |
| `games/downhill-mayhem/THREE.LICENSE` | `7dddf7c5b8fd10ee654db8857d75d104b5557889aa5a91fc4ca545ea7c07062f` |

The original self-contained `index.html` includes three.js r128 inline
(line 402) and the game script at lines 468–3182. It is preserved verbatim as
`games/downhill-mayhem/standalone.html` (task 2.2).

## Source control/behaviour map

See `investigation.md` §7 for the full symbol/line inventory (utils, config,
track, audio, input, three/world, riders, physics, combat, AI, race flow, HUD,
camera/fx, main loop, test hooks).

## Starting suite state (task 0.5)

- `npm test` (`node --test tests/*.test.js tests/**/*.test.js`): RECORDED BELOW.
- `npm run build`: requires the rustup `wasm32-unknown-unknown` toolchain for
  `build:wasm` (`AGENTS.md` documents this machine quirk); recorded below.
- Targeted Elixir suites: recorded when the server phases begin.

### Node result

`node --test tests/*.test.js tests/**/*.test.js` at `0e3ba44` (clean tree):

```
# tests 1163
# suites 4
# pass 1163
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 8132.754902
```

### Build result

`npm run build` runs `build:wasm` first, which needs the rustup
`wasm32-unknown-unknown` target (documented machine quirk in `AGENTS.md`).
Build status recorded after the Phase 0 run; the Vite step itself is unaffected
by this change until the game chunk is added.

## Implementation evidence (apply block 1)

Landed and verified at 2026-09-10:

- **Manifest/cabinet (Phase 1).** `'downhill-mayhem'` type; the definition at
  the Signal Lost transform with six anchors; projection regenerated; the
  `downhill` motif; discovery label; `body.dm-racing`; Signal Lost left dormant.
  Tests: arcade-cabinet (+ new Downhill/dormancy/motif tests), activity
  definitions, orpheum-arcade, kart-royale-cabinet enumerations updated.
- **Course (4.1/4.2).** `shared/downhill/course.js` (faithful generator +
  sampler), `courseHash.js`, `courseDocument.js`, `scripts/export-downhill-courses.mjs`,
  and committed byte-identical web/server documents for classic/timber/rock.
  Source parity: the generated `heightAt` matches the frozen source
  `groundHeight` within 1 mm across the course; ramps/drops match.
- **Rules (3.1/3.3/3.5/3.6).** `shared/downhill/rules.js` (riderStep, landing,
  crash, tricks, combat, collisions, positions). Source parity: a 24 s scripted
  replay tracks the frozen source `riderStep` within `1e-6` on classic and rock.
- **AI (3.2/3.4).** `shared/downhill/ai.js` (aiThink/aiBoostWant/predictAirRemaining/
  rampAheadFor) with every `Math.random()` replaced by an injected deterministic
  rng. A six-rider (1 human + 5 AI) field is deterministic, finite and races
  forward; revenge hunting arms after a human decks an AI.

Suite: `node --test tests/*.test.js tests/**/*.test.js` → **1185 pass, 0 fail**.

Still open (not started): hosted runtime/modularization (Phase 2.3/2.4/2.6,
Phase 5–7), Elixir authority (Phase 8–9), prediction/interpolation wiring
(Phase 10), lobby/queue UI (Phase 11), lifecycle soak (Phase 12), standalone
shell re-point (Phase 13), browser gate and load characterization (Phases
14–17), docs (Phase 18).

## Implementation evidence (apply block 2)

- **Protocol (9.1/9.2/9.4 JS).** `shared/activityProtocol.js` gains the
  `downhill-mayhem` constants, `activity_config`, `validateDownhillControls`,
  `validateDownhillConfig`, `validateDownhillFence`, and error codes;
  `src/net/client.js` sends `activity_config` and applies the type-scoped
  controls allowlist. `tests/downhill-protocol.test.js` covers every branch.
- **Elixir course (8.2).** `Afterlight.Activities.DownhillMayhem.Course` loads
  the committed document and evaluates the same sampler; `hash2`/`vnoise2` are
  bit-for-bit ports. Test: `downhill_course_test.exs` — height parity within
  1e-6 across the course, noise parity within 1e-12.
- **Elixir rules (8.1).** `Afterlight.Activities.DownhillMayhem` mirrors the
  JS physics/tricks/landing/crash/combat/collisions/positions. Test:
  `downhill_mayhem_test.exs` replays a 180-tick, six-rider scripted fixture and
  matches the JS authority within 1e-6 (`scripts/export-downhill-fixtures.mjs`).
- **Elixir AI (8.3).** `DownhillMayhem.AI` generates server-owned controls
  (racing line, braking, boost, obstacle avoidance, hops/tricks, rubber-band,
  revenge, combat edges) using the seeded BEAM `:rand` state; strikes resolve
  through the shared physics.

Suite: JS **1192 pass, 0 fail**; Elixir downhill **4 pass, 0 fail** (harness
still running with the wider suite).
