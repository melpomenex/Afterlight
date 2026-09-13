## Purpose

Defines fast, failure-isolated World presentation loading, bounded shared-resource ownership, runtime replacement and diagnosable performance across Views.

## ADDED Requirements

### Requirement: Optional cosmetics do not gate gameplay entry

Gameplay readiness SHALL NOT await optional World scenery, audio, textures or probes. Preparation SHALL prioritize functional resources, then cheap World profile, prominent scenery and lesser decoration. Startup SHALL request only current presentation needs; intent/proximity prefetch SHALL be bounded and deduplicated. Background preparation SHALL respect the current render owner, hidden-page state, input demand and frame budgets.

#### Scenario: Slow cosmetic download
- **WHEN** a World decoration is still downloading after Kart is otherwise ready and admitted
- **THEN** Kart becomes playable using valid fallback scenery and adopts the optional asset only when safe.

#### Scenario: Competing requests
- **WHEN** two consumers request the same compatible asset concurrently
- **THEN** one load supplies independent ownership handles without duplicate download or parse work.

### Requirement: Latest selection and activation win

Every pending presentation attachment SHALL be fenced by the current View activation, activity attempt where relevant, World selection revision and renderer context. A runtime switch SHALL preserve gameplay, input ownership, camera preference, membership, seat and media state. Ready geometry SHALL replace cosmetic geometry only; stale work SHALL not attach or restore obsolete global settings. Failures SHALL preserve a valid prior or native presentation, expose degraded status and permit bounded explicit retry.

#### Scenario: Rapid choices
- **WHEN** a visitor selects coastal, rainforest and cloud while their loads finish in another order
- **THEN** only cloud's current result can attach and the active game continues.

#### Scenario: Travel during load
- **WHEN** a visitor leaves a View before its decoration finishes
- **THEN** the late result cannot modify the destination, its audio or its renderer settings.

#### Scenario: Missing resource
- **WHEN** a GLB, texture, probe, audio resource or optional import fails
- **THEN** the View stays playable, diagnostics identify the failed slot and no repeated per-frame retry occurs.

### Requirement: Explicit shared resource lifetimes

Shared immutable resources SHALL survive View changes within a bounded cache; View instances SHALL release their own groups, clones, effects and audio on teardown. Handles SHALL be idempotent and owner-checked, including repeated acquires by the same owner. Canceling one request SHALL NOT cancel another consumer's asset. Failed loads SHALL permit retry; late resolved resources SHALL be retained within policy or disposed. GPU resources SHALL not be reused across incompatible renderer contexts. No consumer SHALL dispose another live consumer's resources or host renderer/audio context.

#### Scenario: Repeated release
- **WHEN** one consumer releases the same handle twice while a second consumer still uses the texture
- **THEN** the second texture remains valid and reference accounting is unchanged by the duplicate release.

#### Scenario: Context replacement
- **WHEN** the renderer context is lost and recreated
- **THEN** invalid GPU resources are rebuilt for that context without rerolling the World or restarting multiplayer membership.

#### Scenario: Eviction after repeated travel
- **WHEN** twenty travel/game return cycles complete and idle resources are evicted
- **THEN** owned resource counts return to their measured baseline without continued growth or missing shared assets.

### Requirement: Quality and performance admission

World presentation SHALL respect existing environment tiers, comfort controls, effect ceilings and native game quality policy. Ambient adapters SHALL add no dynamic lights, shadow maps or postprocessing passes. Optional work SHALL yield or be omitted before exceeding gameplay entry and frame budgets. Resource accounting SHALL include compressed transfer, decoded CPU, estimated GPU, material/program, geometry, particle and render-target costs, counting shared resources once. Measurements SHALL distinguish estimates from actual hardware observations.

#### Scenario: Constrained client
- **WHEN** a low-tier client cannot admit optional scenery within its budget
- **THEN** it keeps the World palette and playable native View with reduced decoration, without increasing quality automatically.

#### Scenario: Kart entry acceptance
- **WHEN** prepared resources are within retention policy, the page is visible and admission RTT is at most 100 ms
- **THEN** ready entry retains p95 first-frame at most 500 ms and input-ready at most 1000 ms; suspended return retains first-frame at most 200 ms and p95 input-ready at most 500 ms.

#### Scenario: Background frame acceptance
- **WHEN** World preparation runs during theater walking against the declared no-preparation baseline
- **THEN** p95 frame interval increase is at most 2 ms, no added preparation CPU task exceeds 50 ms, and startup median/p95 increase is both at most 5 percent and at most 100 ms.

### Requirement: Development diagnostics and acceptance evidence

Debug tooling SHALL expose selected World/variant, View, host, inheritance level, applied revision, fallback reason, pending/cached/live resources, errors and estimated allocation costs without exposing identity tokens. Acceptance SHALL include visual checks and reproducible production-build measurements on declared desktop and constrained hardware; missing measurements SHALL be reported as unverified.

#### Scenario: Debug a missing variant
- **WHEN** a developer forces a World/View combination lacking bespoke art
- **THEN** diagnostics show the chosen selection, resolved fallback and actual applied presentation rather than falsely claiming full support.
