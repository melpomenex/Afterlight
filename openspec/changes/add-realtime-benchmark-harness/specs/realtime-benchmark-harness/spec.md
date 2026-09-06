# realtime-benchmark-harness

## Purpose

Make data-plane performance claims in this repository reproducible and honest:
deterministic Afterlight-style fixtures, comparable encodings over identical
inputs, hostile-input coverage for anything that parses wire bytes, and
committed results with environment metadata. Every adoption decision in the
acceleration program cites this harness.

## ADDED Requirements

### Requirement: Deterministic Afterlight-style fixtures

The harness SHALL generate worlds deterministically (seeded, reload-stable) that model the game's realtime population: sparse gap-y u32 server ids, string guest identities, coordinates within world bounds, busy-room flag distributions, and churn across fractions 0.1%–100% at populations 50 through 50,000. The JSON baseline SHALL serialize the *current* `presence_update` wire shape (string ids, rounded coordinates, boolean flags) so the legacy path is measured, not an idealized stand-in.

#### Scenario: Same seed, same world

- **WHEN** the fixture generator runs twice with the same seed and population
- **THEN** both runs produce identical id spaces, columns, and churn sequences

#### Scenario: Baseline is the real wire shape

- **WHEN** the JSON encoding is applied to a fixture world
- **THEN** the produced object matches the `presence_update` field names and types the current server emits, with string ids

### Requirement: Comparable encodings over shared inputs

The harness SHALL provide encodings for: legacy JSON; custom binary Array-of-Structs; contract-shaped binary SoA (dense, sorted-id, and Roaring section encodings); Arrow IPC record batches (with and without sparse masks); and a density-selected hybrid whose thresholds carry their justifying measurements in code. All binary encodings SHALL share the same frame header so size and time comparisons are apples-to-apples, and each SHALL decode to values semantically equal to its inputs on fixture samples.

#### Scenario: Identical inputs, comparable outputs

- **WHEN** the same (world, changed-set) fixture point is encoded by two encodings
- **THEN** both consume the same input data and their results are recorded against the same fixture coordinates

#### Scenario: Round-trip is semantic

- **WHEN** any encoder's output is decoded on a fixture sample
- **THEN** entity ids, transforms, and flags equal the fixture values

### Requirement: Honest measurement reporting

Benchmark runners SHALL report median, p95, and minimum per measurement, commit results as JSON plus generated markdown with environment metadata (runtime version, CPU count, GC availability, date), and never report an allocation metric when the GC hook is unavailable. A rejected technology SHALL produce a recorded verdict with its numbers rather than silent omission.

#### Scenario: Results are committed and attributable

- **WHEN** a benchmark run completes
- **THEN** `benchmarks/realtime/results/` contains machine-readable and human-readable outputs stating the environment they were measured on

#### Scenario: GC-less environments do not fabricate numbers

- **WHEN** node runs without `--expose-gc`
- **THEN** allocation fields are absent rather than zero or estimated

### Requirement: Wire-parser robustness coverage

Every harness decoder that consumes frame bytes SHALL reject truncated input, bad magic, oversized or negative length fields, unknown enum values, and trailing garbage with a bounded rejection that does not throw into caller code, and SHALL be covered by automated tests for exactly those cases. The same coverage SHALL exist for the WASM decoder via its in-crate fuzz suite.

#### Scenario: Fuzz operators never crash a decoder

- **WHEN** valid frames are mutated by truncation, byte flips, length overflow, and bad enums
- **THEN** every decoder returns a bounded rejection and remains usable for a subsequent valid frame

### Requirement: Dependency and boundary isolation

Benchmark-only dependencies SHALL live in a nested manifest (`benchmarks/realtime/package.json`) and SHALL NOT modify the repository root manifest; the harness SHALL NOT import game code, and game code SHALL NOT import the harness. Browser-dependent probes SHALL be self-contained pages runnable without a build step and SHALL document their execution requirements including software-adapter fallbacks.

#### Scenario: Root manifest untouched

- **WHEN** the harness is installed and run
- **THEN** the repository root `package.json` and lockfile are unchanged

#### Scenario: Probe runs standalone

- **WHEN** the WebGPU probe page is served statically and opened
- **THEN** it reports capability, runs its matrix or reports `{supported: false, reason}`, without needing any build step
