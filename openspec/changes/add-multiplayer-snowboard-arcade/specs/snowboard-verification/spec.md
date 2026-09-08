## Purpose

Make release readiness measurable through authoritative race tests, real multiplayer evidence, performance budgets and observable resource cleanup.

## ADDED Requirements

### Requirement: Rules and protocol regression evidence
Release SHALL include pure rule/course/prediction tests and backend tests for lifecycle, readiness, rematch, swept checkpoints, finish fractions/ties, DNF, cleanup, stale leases/matches, malformed input and ownership loss. Cross-runtime golden fixtures SHALL agree within 1cm position and 0.01m/s velocity over a 180-second fixture, with identical checkpoint/finish outcomes. Existing cabinet, participation, world, chat and theater regression checks SHALL pass.

#### Scenario: Validation suite
- **WHEN** the feature is prepared for release
- **THEN** recorded tests prove new racing behavior and preserved existing games rather than relying on source inspection alone.

### Requirement: Actual multiplayer browser proof
Release SHALL include automated two-browser walk-up E entry, shared lobby, explicit readiness, synchronized countdown, visible interpolated riders, valid checkpoints, agreed results, rematch without reload and exit. Additional cases SHALL cover third/fourth/eighth rider, late join, typing, all world camera modes, blur, exit mid-race, disconnect/reconnect, reload, failed/delayed load and session loss. Authoritative progression tests SHALL not replace the real-browser happy path with fabricated winner messages.

#### Scenario: Two-browser release gate
- **WHEN** two isolated authenticated browser sessions complete two races
- **THEN** they agree on session/match/results, see each other, and return to usable Afterlight without page reload.

### Requirement: Resource and rendering budgets
Recorded desktop tests SHALL target 60FPS at 1080p DPR≤1.5 with eight riders and normal snow, p95 frame≤20ms and low preset p95≤33ms. Twenty rematches and twenty enter/exit cycles SHALL show no monotonic growth in listeners, timers, AudioContexts, scenes or GPU resources. After cache eviction, retained resource counts SHALL return to baseline and stabilized heap SHALL be within 10 percent of the initial warm baseline. Mountain resources SHALL be lazy and rematches SHALL not reload them.

#### Scenario: Repeated play
- **WHEN** automated rematch and entry/exit cycles finish and unused cache is evicted
- **THEN** resource counts return to baseline, performance remains within budgets and theater/cabinet controls still work.

### Requirement: Measured load capacity
Before broad rollout the team SHALL run an isolated 100-session × four-rider real-transport soak and characterize 1,000 riders distributed across small sessions. Reports SHALL identify hardware/build/configuration, p95/p99 ticks, snapshot/input bandwidth, memory, queues, disconnects, errors and chat latency. No public single-cabinet test SHALL be misrepresented as independent race sessions, and capacity SHALL not be inferred merely from BEAM process support.

#### Scenario: Load release gate
- **WHEN** the 400-rider soak runs for 15 minutes plus failure injection
- **THEN** p95 session tick is ≤5ms, p99≤10ms, no sustained simulation debt or growing queues occur, chat p95 is ≤250ms at 100ms RTT, and session cleanup completes after grace/reap.

#### Scenario: Capacity shortfall
- **WHEN** the 1,000-rider characterization misses its target
- **THEN** the report states measured supported capacity and deployment limits rather than claiming unverified scale.

### Requirement: Operational visibility and rollout safety
The feature SHALL expose bounded low-cardinality session/player, duration, completion/DNF, disconnect, abort, load-failure, tick and traffic diagnostics through existing operational facilities. No credentials or user/session IDs SHALL become metric labels. Feature disable SHALL prevent new admissions and cleanly finish or abort active races without altering retained world snapshots.

#### Scenario: Disabled feature
- **WHEN** operators disable snowboard admission or the backend lacks support
- **THEN** the cabinet reports unavailable, current world/theater/other cabinets remain usable and no unsupported client session is created.
