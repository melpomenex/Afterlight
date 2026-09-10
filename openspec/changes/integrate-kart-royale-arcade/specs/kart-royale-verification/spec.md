## Purpose

The measurable gates proving the Kart Royale cabinet integration: automated
lifecycle and leak audits, a real-browser entry/race/exit gate, preservation of
the game's standalone harnesses, regression of existing activities, and
performance budgets while racing.

## ADDED Requirements

### Requirement: Automated cabinet and lifecycle tests

The Node test suite SHALL cover the Kart Royale integration with executable
contracts: cabinet manifest validity (skin normalization, distinct LED, row
fit, anchor/dismount clearance) inside the existing arcade cabinet test; a
bystander-module economy test proving synchronous registration, occupancy-driven
screen states, idempotent disposal, and that bystander code holds no static
imports of the game (exactly one dynamic import path); and a controller
lifecycle test proving view-lease generation binding, listener removal after
dispose, cancellation-token discard of stale loads, and idempotent disposal.

#### Scenario: Bystander economy audit

- **WHEN** the bystander module's source is audited by the test suite
- **THEN** it contains no static import of game code and exactly one guarded
  dynamic import site.

#### Scenario: Repeated enter/exit audit

- **WHEN** the lifecycle test drives repeated activate/participate/exit cycles
- **THEN** the world group is emptied, the camera is restored, and instance
  counts return to zero on every cycle.

### Requirement: Browser gate for entry, race, exit and reentry

A chromedriver-based browser gate (modeled on the existing Summit Run gate)
SHALL drive a real session against the running app: walk to the cabinet, verify
the prompt, press E, wait for the race to become interactive, exercise pause
and exit, verify world movement is restored after exit (a real movement key
must displace the avatar), and repeat entry to prove reentry. A second isolated
session SHALL observe the occupied cabinet state.

#### Scenario: Full loop in a real browser

- **WHEN** the gate runs its entry, race, exit and reentry phases
- **THEN** each phase passes against the real application with real key input
- **AND** the exit phase proves Theater locomotion works again.

### Requirement: Standalone game harnesses preserved

The Kart Royale standalone tooling SHALL keep working against the standalone
entrypoint after the hosting refactor: the full-race autoplay gate, the drift
benchmark, the screenshot harness and the context-loss test SHALL pass in
`games/kart-royale` without modification of their assertions.

#### Scenario: Autoplay still gates the game

- **WHEN** the standalone autoplay harness runs after the refactor
- **THEN** it completes a full race and its outcome assertions pass
- **AND** the standalone dev server still boots from `games/kart-royale`.

### Requirement: Regression of existing activities

The existing test suites for Pong, the arcade phase gates, Summit Run, pool and
place travel SHALL pass unchanged (beyond manifest-driven updates from the
cabinet repurposing), and the production build SHALL succeed.

#### Scenario: Suite and build stay green

- **WHEN** the full Node suite and the production build run after integration
- **THEN** no pre-existing activity test regresses
- **AND** the build completes with the game split into lazy chunks.

### Requirement: Performance and memory budgets

While a race is active the page SHALL sustain the existing activity frame-time
budget on the reference gate hardware (p95 frame time at or under the
documented activity gate threshold), with the Theater world's per-frame work
suspended. A soak over repeated sessions SHALL bound heap growth and texture
memory, SHALL report zero context losses, and after exit plus cache eviction
the page's retained memory SHALL return to its pre-entry baseline within the
documented tolerance.

#### Scenario: Racing within budget

- **WHEN** the browser gate measures frame times during a race on the
  reference hardware
- **THEN** p95 frame time stays within the activity gate budget.

#### Scenario: Bounded memory across sessions

- **WHEN** a soak enters and exits races repeatedly
- **THEN** heap and texture growth stay within the committed budgets and no
  WebGL context is lost.
