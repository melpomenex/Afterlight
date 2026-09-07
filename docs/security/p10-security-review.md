# P10 Security Review — Threat Model Checklist

Date: 2026-09-07  
Scope: `server_elixir/` gateway, world runtime, accounts, social, conferencing, and the new P10 observability surface.  
Method: code inspection + existing ExUnit suites; no external penetration test.

Correlation rule (runtime.md): logs carry request/room/revision/epoch — never tokens, grants, TURN secrets, or private message bodies. Enforcement: `Afterlight.LogScrubber` + `Afterlight.LogFormatter` with adversarial tests in `test/afterlight/log_scrubber_test.exs`.

Telemetry disable: `config :afterlight, :telemetry_enabled, false` or `AFTERLIGHT_TELEMETRY_ENABLED=0`. Benchmark runbook should record scrape/poller overhead with telemetry on vs off (task 1.6).

---

## Checklist

| # | Threat | What was checked | Evidence | Disposition |
|---|--------|------------------|----------|-------------|
| 1 | **Impersonation** (session/credential theft, guest token forgery) | WS connect requires verified `Phoenix.Token`; identity from claims only; hello injects/overrides `guestId` from claim | `UserSocket.connect/3`, `Auth.verify/1`, `GameChannel` hello handler; `user_socket_test.exs`, `game_channel_test.exs`, `log_audit_test.exs` (tokens absent from logs) | **Fixed in change** — log scrubber + correlation metadata; tokens never logged by construction in auth path |
| 2 | **Forged client-supplied IDs** used as authorization | Durable commands gated on live world membership + lease fence; guest auth validates printable bounded `guestId` shape only for issuance, not authorization | `GameChannel` `@durable_types`, `live_member?/1`, `Fence.allows_command?/1`; `auth.ex` `validate_guest_id/1` | **Accepted** — authorization is membership/lease-bound, not client room/player fields |
| 3 | **Channel join authorization** on every topic | Only `game:v1` registered; join requires verified `guest_id`; unknown topics refused | `UserSocket` channel macro, `GameChannel.join/3`; `game_channel_test.exs` "join authorization" | **Accepted** — defense in depth at socket + channel |
| 4 | **SSRF** on playlist/EPG URL imports | Elixir gateway proxies `/api/theater/*` to Node; no server-side URL fetch in Elixir path | `HTTPProxy` prefix table; Node owns IPTV/EPG fetch policy (`server/iptv.js`) | **Follow-up (Node, P5)** — SSRF policy must be verified on Node import path; Elixir proxy does not expand attack surface beyond existing Node contract |
| 5 | **Torrent grant scope** / sidecar bypass | Elixir gateway does not serve torrent bytes; theater paths proxied to Node | `HTTPProxy`, `router.ex` scope | **Follow-up (P7 sidecar)** — grant scope enforced in Node/sidecar; Elixir path unchanged |
| 6 | **Replay** (`request_id` / revision / epoch) | Accounts `run_idempotent/4` + `command_receipts`; lease fence rejects stale epoch commands | `accounts.ex`, `command_receipt.ex`, `GameChannel` lease_lost path; `domain_test.exs` outbox/dedup | **Fixed in change** — dedup hit telemetry; lease_lost rejection with epoch in error envelope |
| 7 | **Rate limiting** (auth/connect floods) | Token buckets on `POST /api/auth/guest` and WS connect (per IP + per identity) | `AuthController`, `UserSocket`, `RateLimit`; `rate_limit_test.exs`, `auth_controller_test.exs` | **Accepted** — limits present; load-test tuning deferred to P10 soak |
| 8 | **Moderation basics** (removal actually removes) | Conferencing `remove_participant/3` revokes grants; social relay supersedes duplicate transports without ghost presence | `conferencing.ex`, `conferencing_test.exs`; `social/relay.ex` | **Accepted** for conferencing metadata path; in-game moderation beyond chat relay is **follow-up** |
| 9 | **TURN credential theft** | Grants/TURN secrets from env/config; not persisted; scrubber denies `turn_secret` patterns | `conferencing/grants.ex`, `log_scrubber_test.exs` | **Fixed in change** — scrubber deny-list for TURN/media grant secret shapes |
| 10 | **Metrics endpoint exposure** | `/metrics` only on private RFC1918/loopback IPs; 404 otherwise; disabled when telemetry off | `MetricsPlug`, `metrics_plug_test.exs` | **Fixed in change** |
| 11 | **Private/DM message logging** | Social relay does not log message bodies; scrubber redacts `text`/DM patterns | `social/relay.ex` (no body logs), `log_scrubber_test.exs` | **Fixed in change** |
| 12 | **Boundary secret leakage** | Proxy adds `x-afterlight-boundary` header; audit test asserts secret absent from logs | `log_audit_test.exs` | **Accepted** |

---

## In-change fixes landed

1. Private-network-only `/metrics` plug with regression tests (`metrics_plug_test.exs`).
2. Formatter-level log scrubber + correlation formatter (`log_scrubber.ex`, `log_formatter.ex`, tests).
3. Durable command rejection + dedup telemetry for audit trails (`accounts.ex`, `game_channel.ex`).
4. Telemetry disable switch documented in `Afterlight.Telemetry` moduledoc and `config.exs`.

## Follow-ups filed (not silently half-fixed)

| ID | Severity | Item | Tracking |
|----|----------|------|----------|
| P10-SEC-01 | Medium | SSRF/private-address policy on Node IPTV/EPG URL imports | Verify in `server/iptv.js` + add Node integration test |
| P10-SEC-02 | Medium | Torrent sidecar grant scope under load | P7 sidecar soak + grant bypass test |
| P10-SEC-03 | Low | In-game moderation beyond chat relay | Future moderation change |
| P10-SEC-04 | Low | Auth rate-limit thresholds under 1k-session soak | `docs/benchmarks/` after task 4.1 |

---

## Honesty gate (section 7 foundation)

- Performance targets (p99 tick < 50 ms, etc.) **must not** be claimed until `docs/benchmarks/` reports exist (tasks 4.x).
- 10,000-session benchmark remains deferred until the 1,000-session profile is measured (task 7.3).
