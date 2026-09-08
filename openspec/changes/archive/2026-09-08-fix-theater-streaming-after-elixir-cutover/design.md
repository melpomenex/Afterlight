## Context

The theater/catalog cut is live: Phoenix owns the bill (`Afterlight.Theater`, PG rows + revision + outbox), the Node sidecar keeps the torrent engine and transitional relay, and `AfterlightWeb.HTTPProxy` forwards `/api/theater/*` to the sidecar. Verified against the running dev stack (2026-09-07):

- A Node WS probe (no Origin header) that joins `game:v1` → `theater` receives the join `theater_state` snapshot, sees `theater_queue add` broadcast to the room, and can remove the item again — the Phoenix bill path works.
- A real browser on `http://localhost:5173` never connects: `POST /api/auth/guest` answers 200 with CORS headers, but the `/ws/websocket` upgrade from that origin answers **403**. The gateway process predates the `check_origin` fix at HEAD (`926a802`); the cutover commit (`f40bf19`) configured no origin list at all, so Phoenix's default same-host check rejected the dev client. Result: no socket → no `theater_state`/`iptv_state`/grants → every source kind silently dead while the UI says "reconnecting".
- Production already accepts the deployed frontend origin (101 handshake with a Vercel origin; unlisted origin correctly 403).
- Soft spots found while tracing: `Theater.OutboxRelay` silently no-ops when the world Registry has no `{RoomServer, "theater"}` entry (indistinguishable from an empty room); the proxy's `Finch` `receive_timeout: 60_000` applies to torrent Range streams that can legitimately idle; the dev bill still carries a ~20 h-old `playing: true` live item, which every joiner's client must self-heal via `ended`.

Constraints: one writer per domain (Node stays read-only); the client owns the DOM overlay/engines; grants are required on torrent streams (P7 contract); `data/` files are never deleted; the dev stack script is the supported local topology.

## Goals / Non-Goals

**Goals**
- A connected browser plays all four source kinds against `npm run dev:stack` at HEAD, proven by a repeatable pass, with whatever breaks on that path fixed.
- Origin misconfiguration can never again present as a silent reconnect loop (loud gateway log + failing stack smoke check).
- The three soft spots above are hardened with tests pinning the contracts.

**Non-Goals**
- No new source kinds, bill rules changes, queue-cap changes, or overlay/UX redesign (covered by `video-screen`/`add-theater-district` deltas).
- No production redeploy, no new transport, no rewrap of the specialty boundary.
- No migration of `data/game-state.json` / `iptv.json` / `epg.json` (already imported; forensic read-only).

## Decisions

**D1 — Origin contract: keep the HEAD allow-list, add guards; do not loosen defaults.**
`runtime.exs` at HEAD already resolves the right list (`localhost:5173/4173`, `127.0.0.1:5173`, `*.vercel.app`, env overridable via `PHX_CHECK_ORIGIN`). The fix is operational (restart the dev gateway onto it) plus regression coverage: (a) a config-resolution test asserting the dev endpoint's origin list includes the Vite origin and that `PHX_CHECK_ORIGIN=false` / CSV overrides still parse; (b) a handshake check in `scripts/dev-elixir-stack.sh` (token + browser `Origin` → expect 101, non-zero exit otherwise) run right after the listeners-wait loop.
*Alternatives:* `check_origin: false` in dev (rejected — dev/prod divergence hid this bug once already); documentation only (rejected — the config was broken for a full cutover cycle with zero signal).

**D2 — Acceptance gate is a scripted real-browser pass, not WS-level probes.**
Drive the running stack with browser automation as a guest: for each source kind, submit → observe playback state on the screen overlay → clean up probe items (add + remove, or skip). The pass script lives under `scripts/` (checklist form is acceptable; full automation preferred) so the next deploy reuses it. Node-probe checks remain as fast unit-ish smoke but never count as streaming verification.
*Alternatives:* EEx/channel tests only (rejected — this migration repeatedly shipped WS-green, browser-red behavior).

**D3 — Bill broadcast key: one shared room-key definition, pinned by test.**
`OutboxRelay` hardcodes `"theater"` while the world runtime keys rooms by `wire_id` (today `TorrentRules.theater_wire_id() == "theater"`). Extract a single theater room-key definition used by both the relay and the specialty rules, add a regression test asserting the relay's Registry lookup key equals the world runtime's key, and log (debug) on publish-when-room-absent so a future room renaming shows up in `ripwire`-style traces and telemetry instead of vanishing. Broadcasting to an empty room stays a quiet no-op.
*Alternatives:* publish via `Phoenix.PubSub` topic per room (bigger refactor of the RoomServer frame path; unnecessary here).

**D4 — Proxy streaming timeout: make the torrent path bounded but patient.**
Keep the general 60 s proxy timeout; for `/api/theater/torrent/*` requests use an env-tunable longer `receive_timeout` (default ~5 min). Client disconnects already abort the upstream pull (`{:__proxy_abort__, acc}`), so the worst case is one sidecar stream held a few minutes, bounded by the cache cap and LRU reap. Document the knob next to the existing proxy config.
*Alternatives:* true idle-timeout machinery in the proxy (rejected — complexity out of scope for a repair change).

**D5 — Stale/stuck live items: pin the self-heal contract with a channel test.**
The reducer already guards advances by item `generation`; the client reports `ended` once per item id. Add an Elixir channel-level test: join with a live item whose authoritative position is past its duration → client `ended` → exactly one advance (concurrent duplicate reports collapse) → queue drains to idle cleanly. If the browser pass shows the client wedging instead, fix on the client side (`theaterScreen.js`) under the same contract.
*Alternatives:* server-side expiry sweep that auto-advances stale items (rejected — changes bill semantics and hides client bugs; revisit only if the pass shows real-world wedges).

**D6 — Probe hygiene during the pass.**
All bill mutations by the verification pass use a dedicated probe guest and restore state (remove added items; never `clear`); shared fixture items ("Cutover A/B") are left untouched. Saves are not reset; probe localStorage uses an isolated browser profile.

## Risks / Trade-offs

- [Restarting the dev gateway drops other occupants' sessions briefly] → coordinate the restart; reconnect resnapshots by design (desiredRoom replay), presence is transient.
- [Longer torrent proxy timeout holds sidecar connections longer] → bounded by ~5 min default, env-tunable, abort-on-client-disconnect already implemented; sidecar streams are per-file and cache-capped.
- [Browser pass mutates the shared dev bill] → dedicated probe guest, add+remove restore, no `clear`, fixtures untouched (D6).
- [Origin allow-list drift when the frontend moves to a custom domain] → `PHX_CHECK_ORIGIN` CSV override is the documented path; smoke check fails loudly at startup, which is the designed tripwire.
- [Client-side fixes may surface late (engines/iframe/hls.js)] → D2 pass is scripted and repeatable; budget explicitly includes fixing what it surfaces rather than declaring the path healthy by code inspection.

## Migration Plan

1. Restart the local gateway/stack onto HEAD config (dev-local; no data migration — PG theater rows are already authoritative).
2. Land hardening (D1/D3/D4/D5) with tests; `npm test` + `mix test` stay green.
3. Run the D2 browser pass; fix surfaced defects; re-run until green.
4. Rollback: revert the hardening commits; the stack returns to today's behavior (no schema/data changes to undo).

## Open Questions

- Exact production frontend origin list (any custom domains beyond `*.vercel.app`?) — an ops confirmation for the deploy checklist, not a code decision; the env override already covers it.
