# Tasks: port-backend-to-elixir (umbrella)

## 1. Governance contract
- [x] 1.1 Write `docs/architecture/elixir/ownership.md` (22-subsystem source-of-truth matrix, phase map, test matrix, invariants)
- [x] 1.2 Write `docs/architecture/elixir/protocol-catalog.md` (complete message/persistence/HTTP inventory of the Node baseline)
- [x] 1.3 Write `docs/architecture/elixir/parity-notes.md` (porting hazards, fixture conventions, priorities)
- [x] 1.4 Record the Ash-layering decision as ADR-008 in `docs/architecture/elixir/decisions.md` and update README/runtime wording

## 2. Subordinate changes authored
- [x] 2.1 `add-parity-fixture-baseline` (P0)
- [x] 2.2 `add-elixir-phoenix-foundation` (P1)
- [x] 2.3 `add-phoenix-gateway-transport` (P2)
- [x] 2.4 `add-world-room-runtime` (P3)
- [x] 2.5 `add-ash-accounts-domain` (P4)
- [x] 2.6 `add-ash-theater-catalog-domains` (P5)
- [x] 2.7 `add-ash-gardens-economy-restoration` (P6)
- [x] 2.8 `add-node-specialty-adapters` (P7)
- [x] 2.9 `add-conferencing-media-spike` (P8)
- [x] 2.10 `add-distributed-room-ownership` (P9)
- [x] 2.11 `add-observability-security-loadtesting` (P10)
- [x] 2.12 `remove-node-server-authority` (P11)

## 3. Validation and review
- [x] 3.1 `openspec validate` (strict) passes for the umbrella and all twelve subordinate changes
- [ ] 3.2 Adversarial architecture review of all specs; gaps fixed (split-brain, dual writes, rollback honesty, client preservation)
- [x] 3.3 Dependency ordering verified: 00→01→02→03→04→05→06→{07,10}; 07→08; 10→09; 09→11 (consistent DAG)

## 4. Implementation begins (this run's scope)
- [ ] 4.1 P0 implementation: fixture exporter, fixture sets, Elixir parity runner green
- [ ] 4.2 P1 implementation: `server_elixir/` app compiles and tests green; owns nothing
- [ ] 4.3 P2+ implementation (future runs, in dependency order)
