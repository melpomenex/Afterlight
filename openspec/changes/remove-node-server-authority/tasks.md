## 1. Final authority audit (evidence-first, before any deletion)

- [ ] 1.1 Create the audit checklist artifact covering every `docs/architecture/elixir/ownership.md` row: migrated rows 1–16 and 22 with locate/disable/verify columns, retained rows 17–18 (torrent, IRC) with adapter-intact checks; record evidence (test name, runtime probe, or deletion proof) per row.
- [ ] 1.2 Run runtime probes for any row whose Node write path still exists in code: attempt a game-domain write through the Node path and verify it is refused or routes nowhere; record results.
- [ ] 1.3 Fix any findings before deletions: disable/remove any still-routable Node write path discovered, re-verify, and note the finding on the checklist.

## 2. Router retirement

- [ ] 2.1 Remove the Node owner entries for game domains from the gateway's domain→owner routing table; game domains become Elixir-only.
- [ ] 2.2 Make unroutable game-domain requests fail loudly (visible error, log with room/request correlation, no silent Node fallback); add a test asserting no game-domain route reaches Node.
- [ ] 2.3 Delete the Node proxy boundary code path for game domains once the table is proven Node-free; cite the P2 cutover evidence in the removal record.

## 3. Compatibility layer removal (per-item, proof-gated)

- [ ] 3.1 Remove dual-run configuration: process supervisors, env selectors, and dev scripts that boot the Node game server alongside Phoenix for game domains; cite the P5/P6/P7 cutover evidence per item.
- [ ] 3.2 Remove transitional guestId semantics: any remaining client-generated-guestId authorization, `garden:<guestId>` self-filter coupling, or duplicate-guestId session-overwrite compatibility shims; verify identity derives solely from the server-verified session; cite the P4 evidence.
- [ ] 3.3 Confirm the specialty sidecars survive the cleanup intact: torrent grant/adapter tests and IRC adapter/loop-prevention tests green; `server/torrents.js` and `server/irc.js` untouched in authority.

## 4. Snapshots and data policy

- [ ] 4.1 Capture SHA-256 hashes of `data/game-state.json`, `data/iptv.json`, `data/epg.json` and record them in the change evidence; mark the files read-only in the repo/docs and confirm no runtime code path writes them (grep + test).
- [ ] 4.2 Codify the `data/` cleanup policy in docs (AGENTS.md/README): original data files are never deleted; only regenerable caches (torrent cache dir) may be cleared; sidecar-owned files are written only by their sidecar.

## 5. Config deprecation

- [ ] 5.1 Enumerate legacy Node-only env vars and dual-run selectors; add startup/config-load deprecation warnings naming each variable, its replacement, and the removal timeline.
- [ ] 5.2 Make the Phoenix gateway config the single supported server-topology description; remove dual-run examples from config files.

## 6. Final verification sweep

- [ ] 6.1 Run `npm test` (full JS client suite) and `mix test`; both green, failures resolved or explicitly investigated.
- [ ] 6.2 Script and run the two-browser end-to-end sweep: travel between rooms; garden→market→mill loop; theater playback including torrent streaming, IPTV, and EPG; chat and DMs; emotes; reconnect with fresh snapshots; record the pass with notes.
- [ ] 6.3 Run the load re-baseline: repeat the P10 profile against the final topology and record results (p50/p95/p99, hardware, versions, payload sizes, error definitions) beside the prior baseline; investigate any regression.
- [ ] 6.4 Verify snapshot hashes are unchanged after the sweep (retention proof).

## 7. Documentation

- [ ] 7.1 Update `README.md` to the post-migration topology (Phoenix/Ash authority, room runtime, retained specialty sidecars, how to run the stack) and remove dual-run instructions.
- [ ] 7.2 Update `AGENTS.md` architecture notes: new topology, retired Node game server, retained sidecars, `data/` policy, deprecated env vars.
- [ ] 7.3 Update `docs/architecture/elixir/ownership.md` with final per-row statuses (Node write paths retired/verified; rows 17–18 retained) and mark the Node-baseline sections of `docs/architecture/elixir/protocol-catalog.md` historical.
- [ ] 7.4 Record the completed audit checklist, sweep results, re-baseline report, and snapshot hashes as the P11 exit evidence for the `port-backend-to-elixir` umbrella gate.
