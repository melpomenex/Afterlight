# Planning validation — 2026-09-07

This record covers specification artifacts only. No runtime feature was implemented, no implementation task was checked off, and no rendering/performance/provider acceptance is claimed. Existing unrelated working-tree changes were preserved.

## Actual checks

Each of the following passed `openspec validate <change> --strict --json --no-interactive`, with zero issues. `openspec status --change <change> --json` reported all four planning artifacts complete. Here, planning complete means proposal/design/specs/tasks exist; it does not mean implementation complete.

| Change | Unchecked tasks | Parsed requirements | Parsed scenarios |
|---|---:|---:|---:|
| add-social-place-framework | 9 | 13 | 35 |
| add-atmosphere-weather-system | 11 | 13 | 32 |
| add-rain-court-social-space | 5 | 4 | 6 |
| add-desert-camp-social-space | 5 | 4 | 7 |
| add-rooftop-social-space | 5 | 4 | 6 |
| deemphasize-legacy-farming | 4 | 4 | 8 |
| Total | 39 | 42 | 94 |

`openspec show <change> --json` parsed all six: ten new capability files and one modified capability (`biome-exploration-mechanics`). Parsed capability sets match the on-disk spec directories. The modified delta targets the existing navigation requirement rather than replacing unrelated exploration requirements.

A local structural check inspected all 39 task blocks for all ten required fields: goal, target files/symbols, reuse, required behavior, architecture constraints, failure/cleanup, tests, verification commands, definition of done and do-not-change. All are present; no completed checkboxes exist. Relative Markdown links resolve. New Markdown files have no trailing whitespace. `git diff --check` passed; because new files are untracked, their whitespace was also checked directly. Git status shows the six new planning directories alongside the preexisting user modifications.

## Adversarial review and corrections

- Product: social destinations work without farming, rewards or restoration. Theater stays default. F changes presentation and documentation without deleting saves or stopping economic correctness work. Optional rooftop legacy completion remains compatible.
- Ownership: RoomServer roster is keyed by player ID with conn_ref fencing, not Phoenix Presence. Directory reads its unique roster count. Corrected the earlier prose shorthand suggesting conn_ref was the map key.
- Live integration: P9's checked task status does not erase the observed discarded lease handle/missing RoomServer epoch seam. B explicitly repairs and tests existing ownership before enabling shared weather; no second process/epoch authority.
- Travel: prepare-before-commit, stale generation rejection, typed garden update, tagged JSON/binary envelopes and input/media cleanup are specified at actual production seams.
- Theater: specialized UI/engines remain intact. Logical volume gains preserve iframe/CORS behavior, pending resolutions, homography and queue ownership. P8 alone owns capture; absent adapter is a no-op.
- Layout: Desert now has a fixed bent route around the fire ring, rather than an ambiguous straight-corridor exception. Rooftop's second southern seat is fixed away from the legacy note. Production collision/flood-fill tests still gate the authored layouts; this planning review is not a rendered reachability result.
- Rendering: selected retained rain segments, uniform shelter masks, batched material families and absolute wetness response; hidden worlds have no active effects. Reduced Desert explicitly omits smoke/embers and uses three slots instead of leaving batch reduction to guesswork.
- Handoff: replaced help-only capture instructions with an exact future CLI contract, measurement definitions, provider regression matrix and scene-specific evidence checks in verification.md.

## Remaining implementation gates

Actual owner takeover/fencing, live providers, two-client sync, route/seat geometry, audio/comfort, GPU/CPU budgets and travel/resource soaks remain unexecuted. Their reproducible procedures and thresholds are in [verification.md](verification.md). P8 voice readiness and multi-node/load GO remain separate upstream gates; neither blocks local social places with voice/multi-node disabled. No runtime tests/build were run for this documentation-only task, consistent with repository instructions.
