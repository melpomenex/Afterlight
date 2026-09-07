# Design — Node server authority retirement

## Context

The ownership matrix (`docs/architecture/elixir/ownership.md`) has governed the whole migration: one writer per durable domain, cutover ceremony per domain, no dual writes, Node read-only after each flip. By P11 rows 1–16 and 22 have Phoenix/Ash or room-runtime owners; row 17 (IRC bridge + IRC server) and row 18 (torrent engine) are retained Node sidecars behind the P7 authenticated adapters by explicit decision; rows 19–21 (conferencing) were Elixir-native from birth. The umbrella change's non-goals are still binding at P11: no frontend rewrite happened, `shared/*.js` pure rules remain the parity reference, and the existing `node --test` suite was never allowed to break.

What P11 actually retires is therefore not "the Node codebase" but **Node's authority over game domains and the machinery that made coexistence safe**: the proxy boundary (`add-phoenix-gateway-transport`), dual-run configuration, and the transitional guestId semantics that predate server-signed identity (`add-ash-accounts-domain` P4). The migration-governance rules also fix the honesty requirements this change must honor: cutover evidence before removal, read-only retention of source snapshots with hashes, and "after PostgreSQL receives authoritative writes, reverting to JSON is not a valid rollback". The P9 fencing means the retirement cannot be mistaken for a rollback path to single-node-with-Node either — removal happens only after multi-node safety is proven.

## Goals / Non-Goals

**Goals**

- Evidence over assertion: every ownership-matrix row gets an explicit disabled-and-verified record for its Node write path (or a retained-sidecar record for rows 17–18).
- No live route, config flag, or code path can send a game-domain write to Node when this change is done.
- Compatibility machinery is removed item-by-item, each only after its cutover proof is cited.
- Snapshots (`data/game-state.json`, `data/iptv.json`, `data/epg.json`) retained read-only with recorded hashes; `data/` originals never deleted.
- One topology, described consistently in README, AGENTS.md, and the architecture docs, with legacy env vars deprecated loudly.
- A final verification sweep green on both stacks, including a scripted two-browser end-to-end and a load re-baseline.

**Non-Goals**

- No removal of the specialty sidecars (torrent engine, IRC server + bridge) — they are retained through P11 at least by ownership rows 17–18.
- No deleting any compatibility code before its cutover proof exists; the checklist is the gate, not the calendar.
- No player-facing behavior change of any kind: message shapes, `NetworkClient` semantics, desiredRoom replay, self-echo filtering, caps, and error strings are frozen by the client-preservation requirement.
- No JS test deletion or rewrite; `shared/` pure rules stay the parity fixture source.
- No schema/data migration — this change removes code and config, not tables or rows.

## Decisions

### D1 — The audit is the change: a row-by-row checklist with recorded evidence
*Decision:* Implement P11 as an explicit audit artifact (checklist in the tasks, evidence recorded per row): for each migrated ownership row, the Node write path is (a) located in the retired code, (b) disabled/removed, and (c) verified — by a test, a runtime probe, or code-deletion proof — with the evidence noted on the checklist. Rows 17–18 are verified as retained sidecars with their adapter boundaries intact, so the audit also proves the retirement didn't overreach. The audit also explicitly classifies the retained authenticated adapter ingress (IRC bridge → Social) as sanctioned ingress — actor = sidecar, authority = `Afterlight.Social` — so it cannot be read as a second chat writer.
*Alternative Considered:* treating "we deleted server/" as the audit. Rejected: deletion without per-row verification cannot distinguish "retired" from "accidentally still routable", and the phase gate demands evidence, not absence.

### D2 — Router table first, compatibility layer second, each item gated on proof
*Decision:* Order of removal: (1) the gateway's domain→owner routing entries for game domains go to Elixir-only — no Node owners remain in the table and unknown/unrouted game domains fail loudly instead of proxying; (2) the Node proxy boundary code path is deleted once the table is proven Node-free; (3) dual-run configuration (process supervisors, env selectors, dev scripts that boot both servers for game domains) is removed; (4) transitional guestId semantics — client-generated id as authorization, `garden:<guestId>` self-filter coupling, duplicate-guestId session overwrite behavior — are confirmed dead code paths and their compatibility shims removed. Each step cites its cutover evidence (P2–P7 verification records) before the deletion lands.
*Alternative Considered:* one big-bang deletion of `server/`. Rejected: the specialty sidecars live in the same tree, and a bulk deletion invites exactly the unreviewed overreach the audit exists to prevent; itemized removal keeps every deletion attributable to a proof.

### D3 — Snapshots stay; hashes recorded; originals are never deleted
*Decision:* `game-state.json`, `iptv.json`, and `epg.json` remain in `data/` as read-only snapshots of the pre-cutover state, each with a recorded SHA-256 hash captured at retirement time; nothing in the runtime writes them again. The `data/` policy codified in docs: originals are never deleted — only regenerable caches (the torrent cache dir) may be cleared, and only sidecar-owned files may be written by their sidecar. If a future cleanup wants them gone, that is a new, explicit change.
*Alternative Considered:* moving snapshots into an archive directory or deleting them as "superseded". Rejected: migration-governance requires retaining sources read-only, the hashes are the cutover evidence chain, and "never delete originals" is the cheapest possible insurance against discovering a parity gap years later.

### D4 — Deprecate loudly, remove later: legacy config gets warnings plus a timeline
*Decision:* Node-only env vars and dual-run selectors are marked deprecated: startup/config-load warnings naming the replacement, and a documented removal timeline in README. Docs (README, AGENTS.md, architecture docs) describe the new topology as the only supported one — Phoenix/Ash authority, room runtime, retained sidecars — and mark the pre-migration protocol catalog sections historical.
*Alternative Considered:* silent removal of legacy env vars in the same change. Rejected: deployments and developer muscle memory may still set them; a loud deprecation window is honest about the transition without keeping dual-write capability alive.

### D5 — The final sweep is scripted and re-baselined, not anecdotal
*Decision:* The acceptance sweep runs both suites (`npm test` for the JS client tests, `mix test` for the Elixir stack) plus a scripted two-browser end-to-end covering the phase-map's core loops: travel between rooms, garden→market→mill, theater playback including torrent + IPTV + EPG, chat + DM, emotes, and reconnect with resnapshot. A load re-baseline repeats the P10 profile against the final topology and records the numbers beside the old baseline so regression is measurable, not remembered.
*Alternative Considered:* relying on the per-phase suites alone. Rejected: P11 is the last moment at which "everything at once, both stacks, real browsers" is cheap to prove; per-phase greens do not compose into an end-to-end guarantee.

## Risks / Trade-offs

- *[Removing the proxy boundary eliminates the fastest rollback]* → accepted and intended: migration-governance already states reverting to JSON is not a valid rollback after PG writes; rollback for P11 itself is "revert this change's deletions" (git), which restores dormant machinery, not dual authority.
- *[Audit misses a dormant write path]* → the checklist covers every matrix row explicitly, verification is per-row (runtime probe where code remains, deletion proof where removed), and the loud-failure router (unrouted game domain errors instead of proxying) turns a miss into an immediate, visible error rather than silent split writes.
- *[Specialty sidecars accidentally broken by shared-tree cleanup]* → rows 17–18 are audit rows in their own right: sidecar tests, the P7 grant/adapter suites, and the end-to-end theater playback step must all pass, so overreach fails the sweep.
- *[Legacy env removal breaks an unknown deployment]* → deprecation-with-timeline (D4) rather than same-change removal; warnings name the replacement.
- *[End-to-end sweep flakiness masks regressions]* → the sweep is scripted (same scenario list every run) and the load re-baseline is numeric, so failures are reproducible and comparable across runs.

## Migration Plan

1. Freeze scope: run the authority audit and record per-row evidence; anything found still routable to Node is fixed (routed/disabled) before any deletion. 2. Retire the router table entries and delete the proxy boundary for game domains, citing P2–P7 cutover evidence per item. 3. Remove dual-run config and transitional guestId semantics with the same per-item proofs; confirm specialty sidecars and adapters intact. 4. Record snapshot hashes; codify the `data/` never-delete-originals policy; add deprecation warnings for legacy env vars. 5. Run the final sweep (`npm test`, `mix test`, scripted two-browser end-to-end, load re-baseline) and record results. 6. Update README, AGENTS.md, and architecture docs to the final topology. Rollback at any step: revert the change — deletions are git-recoverable, snapshots and PG data are untouched, and no step writes durable state.
