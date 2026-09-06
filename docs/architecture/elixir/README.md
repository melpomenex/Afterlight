# Afterlight: proposed Elixir architecture

Status: design proposal, 2026-09-06. No application migration or deployment has been performed. Capacity figures below are planning assumptions, not measured results.

## Recommendation

Keep the playable Three.js client. Use Phoenix LiveView for accounts, lobby, inventory/market forms and conference controls; Phoenix Channels for movement, room events and signaling; PostgreSQL for durable state behind an Ash domain layer, giving Phoenix + Ash + PostgreSQL for anything that must survive a restart; and a separately deployed Membrane media service for conferencing. Start with one regional Phoenix application and bounded rooms. Split web gateways and room workers into separate release roles only when measurements justify it.

Elixir is a good fit for concurrent sessions, supervised room processes and realtime fanout. It does not remove network bandwidth, browser rendering, database contention or video forwarding limits. A full rewrite of the browser renderer would add risk without helping those constraints.

## Read the documents

- [Platform diagram](diagrams/platform.html): proposed service boundaries.
- [Conferencing diagram](diagrams/conferencing.html): signaling, media, TURN and optional recording.
- [Migration diagram](diagrams/migration.html): coexistence and single-writer cutover.
- [Runtime and data design](runtime.md): ownership, consistency, protocol and failure handling.
- [Ownership matrix](ownership.md): source-of-truth ownership matrix and migration contract.
- [Protocol catalog](protocol-catalog.md) and [parity notes](parity-notes.md): message contracts and cross-implementation parity findings.
- [Media design](media.md): Membrane selection gate, privacy, watch-together and call flows.
- [Migration and capacity plan](migration.md): phases, acceptance criteria and sizing assumptions.
- [Architecture decisions](decisions.md): proposed ADRs and tradeoffs.
- [Sources](sources.md): repository evidence and official framework references.
- [Validation](validation.md): artifact checks and their limits.

The HTML files are standalone Archify documents. Their editable JSON specifications are beside them. Diagrams are selective views: an omitted edge is not a prohibition; the prose defines complete runtime contracts.

## First implementation slice

Build a Phoenix-hosted lobby with the existing Three.js world mounted as a JavaScript island. Connect two authenticated guest sessions through a Channels adapter, preserving travel/reconnect and remote avatars. Independently prove a two-to-eight participant Membrane call with TURN fallback. These experiments settle the two biggest integration risks before migrating the economy.

## Assumptions to revisit

Initial operation is single-region, cooperative gameplay, roughly 50 visible players per room instance, and conferences initially capped at eight participants. Target 1,000 concurrent game sessions first; 10,000 is a later distributed load-test scenario. Large audiences use a stage/broadcast model rather than everyone publishing cameras. Hosting budget, geography, desired room sizes, moderation ownership and recording retention remain product decisions. Ash and AshPostgres versions will be selected, pinned and documented at implementation time; no untested dependency matrix is promised here.
