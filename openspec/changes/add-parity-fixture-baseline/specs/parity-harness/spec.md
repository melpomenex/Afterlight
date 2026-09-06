# parity-harness

## Purpose

Give every backend-migration phase a mechanical, language-neutral definition of "the rules did not change": a byte-reproducible fixture corpus exported from the JS implementations, a determinism gate that keeps the corpus from drifting, an honestly measured Node performance baseline, and an Elixir runner that must pass the corpus before any domain takes authority. This capability owns the harness — never the authority it gates.

## ADDED Requirements

### Requirement: Deterministic fixture export

The system SHALL provide `scripts/export-parity-fixtures.mjs`, which regenerates the entire fixture corpus under `tests/fixtures/parity/` from the current JS implementations with pinned `nowMs` (and pinned seeds where functions accept them) and with generated identifiers masked as `"<generated>"`. Two consecutive exports from an unchanged tree SHALL produce byte-identical files, and the committed fixtures SHALL always equal a fresh export.

#### Scenario: repeated export is byte-identical

- **WHEN** the exporter runs twice from an unchanged repository revision
- **THEN** both runs write identical bytes for every fixture file
- **AND** no wall-clock time, process id, or random value appears in any output file

#### Scenario: committed fixtures cannot drift

- **WHEN** `tests/parity-fixtures.test.js` runs as part of `npm test`
- **THEN** a fresh export is compared against the committed `tests/fixtures/parity/*.json`
- **AND** the test fails if any committed file differs from the fresh export

### Requirement: Language-neutral case shape

Each fixture case SHALL be self-contained JSON of the form `{fn, args, state, nowMs, seed?, expected, error?}`, evaluable without a JS runtime. Multi-step reducer behavior SHALL be recorded as `{steps: [...]}` scripts that thread state between steps. Error outcomes SHALL be data: `expected` carries the returned output (including null-state outcomes) and `error?` carries the exact reason string. Comparators used by any runner of the corpus SHALL be numeric-tolerant for integer/float distinctions introduced by JSON round-tripping, and SHALL be order-sensitive exactly where a fixture marks order as semantic.

#### Scenario: a fixture case is self-contained

- **WHEN** a runner that has never seen the JS code reads a fixture case
- **THEN** the case contains every input it needs — function name, arguments, state, pinned clock, and optional seed — alongside the expected outcome
- **AND** evaluating it requires no network access, no filesystem state, and no wall-clock time

### Requirement: Hazard coverage

The fixture corpus SHALL pin at least one case for every hazard class in `docs/architecture/elixir/parity-notes.md` §1: JS `Math.round` half-toward-positive-infinity rounding, `Number.toFixed(3)` binary-float formatting, UTF-16 code-unit slicing, WHATWG URL parsing, semantic object key iteration order, `Number` coercion, null/undefined/absent conflation, 32-bit arithmetic, `Date.UTC` component rollover, and stable-sort tie order. A fixture manifest SHALL map each hazard class to its representative case ids, and the determinism test SHALL verify the mapping is non-empty for every class.

#### Scenario: each hazard class has a pinned case

- **WHEN** the fixture manifest is validated by the determinism test
- **THEN** every hazard class from parity-notes §1 maps to at least one existing case id
- **AND** validation fails if any class has no representative case

### Requirement: Fixture set coverage

The corpus SHALL cover the ten priority fixture sets from `parity-notes.md` §3: theaterModel (`applyTheaterAction` op matrix, `classifySource` URL table of roughly 40 cases including hostile inputs, `parseM3U`, `normalizeTheaterState`, `effectivePositionSec` at fixed nowMs values), torrentModel (`parseMagnet` hex and base32, `sanitizeTorrentPick` boundaries, `orderFilesForPicker` tie stability, `normalizeTorrentStatus`, `torrents.parseRange`), gardenModel and crops (`tickBed` dt=1 sequences, `harvestBed` quality boundaries, `sprinklerCoverage`, `getGrowthStage` millisecond boundaries, `calculateQuality`), shared/economy (NPC sell and seed prices across goods, qualities, and multipliers, `updateMarketMultiplier` chains), orderbook (`placeOrder` scripts, fees, `cancelOrder`, `getBookSnapshot`), iptvModel and xmltv (playlist apply, channel sanitize, guide programme sorting, M3U round-trip, catalog snapshot, time-parse table with rollover, index and lookup behavior), identity (nickname generation, sanitization, duplicate ladder, palette), nodes and machines (harvest and depletion, contribution clamps, milling order, crafting), youtubePlaylist (extraction over synthetic HTML, id predicates), and `protocol.parse` on malformed input.

#### Scenario: all ten sets are present

- **WHEN** the fixture manifest is validated
- **THEN** each of the ten priority fixture sets is present with its named functions
- **AND** a missing set fails validation

### Requirement: Node performance baseline recorded

The repository SHALL contain `docs/architecture/elixir/baseline-node.md` recording measured values — never estimates — for room broadcast bytes (captured from a scripted two-client run against the real server), save latency, and event-loop lag, each with its measurement method, environment, and repository revision. A value that could not be measured SHALL be recorded as "not measured" with the reason, never approximated or invented.

#### Scenario: baseline states method and revision

- **WHEN** the baseline document is reviewed
- **THEN** each recorded number names the script or probe that produced it, the environment it ran in, and the revision
- **AND** unmeasured quantities are explicitly marked as not measured with the reason

### Requirement: Elixir runner consumes the corpus unchanged

The Elixir application SHALL provide an `Afterlight.Parity` runner under `server_elixir/test/parity/` that reads `tests/fixtures/parity/*.json` without transformation and evaluates each case through Elixir implementations of the pinned functions, applying the comparator rules of this capability. The runner SHALL be part of `mix test`, SHALL pass against the committed fixtures, and SHALL be green before any change flips domain authority per the `migration-governance` parity gate.

#### Scenario: runner passes against JS-exported vectors

- **WHEN** `mix test` runs the parity suite against the committed fixtures
- **THEN** every case passes under the declared comparator rules
- **AND** a deliberately wrong Elixir implementation produces an explicit failure naming the fixture file and case id

### Requirement: Harness changes no game behavior

The harness SHALL NOT alter game behavior, the wire protocol, persistence formats, or domain authority. Server-side measurement instrumentation SHALL be opt-in via an environment variable and gameplay-neutral when disabled. The existing JS test suite SHALL remain green with the harness added.

#### Scenario: game is unaffected

- **WHEN** the exporter, fixtures, baseline harness, and runner scaffold are added
- **THEN** `npm test` passes without modifications to existing tests or to game module behavior
- **AND** no message type, persistence format, or authority assignment changes
