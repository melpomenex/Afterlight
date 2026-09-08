# Benchmark — hot-room-50

**Status:** measured
**Recorded:** 2026-09-08T06:18:18.865Z
**Duration:** 11452 ms

## Scenario parameters

```json
{
  "version": "1",
  "description": "Hot room — 50 occupants in one wire room",
  "sessions": 50,
  "rooms": [
    "market"
  ],
  "rampMs": 2000,
  "soakMs": 3000,
  "movementBursts": 5,
  "moverRatio": 0.4,
  "consumeHz": 10,
  "wsUrl": "ws://127.0.0.1:4000/ws"
}
```

## Hardware

- Host: system (linux/x64)
- CPU: AMD Ryzen 9 5900X 12-Core Processor × 24
- RAM: 22.9 GB

## Software versions

- Node: v22.22.1
- Scenario config version: 1
- Elixir/OTP/PostgreSQL: _record from deployment when running full soak_
- LiveView sessions: 0 (LiveView not mounted — Channels-only soak until UI migration lands)

## Latencies

- Join: p50 11 ms · p95 52 ms · p99 106 ms (n=50)
- Frame interval: p50 101 ms · p95 105 ms · p99 5465 ms (n=1750)
- Tick consume lag: p50 56 ms · p95 104 ms · p99 106 ms (n=1786)
- Durable ack: _no samples_

## Payload sizes (JSON frames, bytes)

n=4400 · p50 169 · p95 7107 · p99 7112

## Error definitions

| Code | Definition |
| --- | --- |
| `rejection` | Server `error` frame with a documented reason (room_unavailable, superseded, etc.) |
| `drop` | Client dropped a `presence_update` due to backpressure (`maxUnread` exceeded) |
| `timeout` | Scenario step exceeded its wait deadline |
| `stale_revision` | Durable command rejected because `expected_revision` lagged authority |
| `stale_epoch` | Binary/rt frame discarded because room epoch advanced |
| `overload` | Pool/mailbox overload rejection before command execution |

## Counters

```json
{}
```

## Server telemetry (Prometheus scrape)

```json
{
  "afterlight_durable_import_queue_depth": 0,
  "afterlight_durable_outbox_depth": 2,
  "afterlight_durable_outbox_age_ms": 690,
  "afterlight_room_reconnect_count{room=\"theater\"}": 1,
  "afterlight_room_join_latency_bucket{room=\"market\",le=\"1\"}": 50,
  "afterlight_room_join_latency_bucket{room=\"market\",le=\"5\"}": 50,
  "afterlight_room_join_latency_bucket{room=\"market\",le=\"10\"}": 50,
  "afterlight_room_join_latency_bucket{room=\"market\",le=\"25\"}": 50,
  "afterlight_room_join_latency_bucket{room=\"market\",le=\"50\"}": 50,
  "afterlight_room_join_latency_bucket{room=\"market\",le=\"100\"}": 50,
  "afterlight_room_join_latency_bucket{room=\"market\",le=\"250\"}": 50,
  "afterlight_room_join_latency_bucket{room=\"market\",le=\"500\"}": 50,
  "afterlight_room_join_latency_bucket{room=\"market\",le=\"1000\"}": 50,
  "afterlight_room_join_latency_bucket{room=\"market\",le=\"2500\"}": 50,
  "afterlight_room_join_latency_bucket{room=\"market\",le=\"5000\"}": 50,
  "afterlight_room_join_latency_bucket{room=\"market\",le=\"10000\"}": 50,
  "afterlight_room_join_latency_bucket{room=\"market\",le=\"+Inf\"}": 50,
  "afterlight_room_join_latency_sum{room=\"market\"}": 0.00016600000000000013,
  "afterlight_room_join_latency_count{room=\"market\"}": 50,
  "afterlight_room_join_latency_bucket{room=\"theater\",le=\"1\"}": 9,
  "afterlight_room_join_latency_bucket{room=\"theater\",le=\"5\"}": 9,
  "afterlight_room_join_latency_bucket{room=\"theater\",le=\"10\"}": 9,
  "afterlight_room_join_latency_bucket{room=\"theater\",le=\"25\"}": 9,
  "afterlight_room_join_latency_bucket{room=\"theater\",le=\"50\"}": 9,
  "afterlight_room_join_latency_bucket{room=\"theater\",le=\"100\"}": 9,
  "afterlight_room_join_latency_bucket{room=\"theater\",le=\"250\"}": 9,
  "afterlight_room_join_latency_bucket{room=\"theater\",le=\"500\"}": 9,
  "afterlight_room_join_latency_bucket{room=\"theater\",le=\"1000\"}": 9,
  "afterlight_room_join_latency_bucket{room=\"theater\",le=\"2500\"}": 9,
  "afterlight_room_join_latency_bucket{room=\"theater\",le=\"5000\"}": 9,
  "afterlight_room_join_latency_bucket{room=\"theater\",le=\"10000\"}": 9,
  "afterlight_room_join_latency_bucket{room=\"theater\",le=\"+Inf\"}": 9,
  "afterlight_room_join_latency_sum{room=\"theater\"}": 0.000063,
  "afterlight_room_join_latency_count{room=\"theater\"}": 9,
  "afterlight_movement_coalesced_count{room=\"theater\"}": 3,
  "afterlight_movement_coalesced_count{room=\"market\"}": 35,
  "afterlight_room_tick_duration_bucket{room=\"theater\",le=\"1\"}": 3,
  "afterlight_room_tick_duration_bucket{room=\"theater\",le=\"5\"}": 3,
  "afterlight_room_tick_duration_bucket{room=\"theater\",le=\"10\"}": 3,
  "afterlight_room_tick_duration_bucket{room=\"theater\",le=\"25\"}": 3,
  "afterlight_room_tick_duration_bucket{room=\"theater\",le=\"50\"}": 3,
  "afterlight_room_tick_duration_bucket{room=\"theater\",le=\"100\"}": 3,
  "afterlight_room_tick_duration_bucket{room=\"theater\",le=\"250\"}": 3,
  "afterlight_room_tick_duration_bucket{room=\"theater\",le=\"500\"}": 3,
  "afterlight_room_tick_duration_bucket{room=\"theater\",le=\"1000\"}": 3,
  "afterlight_room_tick_duration_bucket{room=\"theater\",le=\"2500\"}": 3,
  "afterlight_room_tick_duration_bucket{room=\"theater\",le=\"5000\"}": 3,
  "afterlight_room_tick_duration_bucket{room=\"theater\",le=\"10000\"}": 3,
  "afterlight_room_tick_duration_bucket{room=\"theater\",le=\"+Inf\"}": 3,
  "afterlight_room_tick_duration_sum{room=\"theater\"}": 0,
  "afterlight_room_tick_duration_count{room=\"theater\"}": 3,
  "afterlight_room_tick_duration_bucket{room=\"market\",le=\"1\"}": 35,
  "afterlight_room_tick_duration_bucket{room=\"market\",le=\"5\"}": 35,
  "afterlight_room_tick_duration_bucket{room=\"market\",le=\"10\"}": 35,
  "afterlight_room_tick_duration_bucket{room=\"market\",le=\"25\"}": 35,
  "afterlight_room_tick_duration_bucket{room=\"market\",le=\"50\"}": 35,
  "afterlight_room_tick_duration_bucket{room=\"market\",le=\"100\"}": 35,
  "afterlight_room_tick_duration_bucket{room=\"market\",le=\"250\"}": 35,
  "afterlight_room_tick_duration_bucket{room=\"market\",le=\"500\"}": 35,
  "afterlight_room_tick_duration_bucket{room=\"market\",le=\"1000\"}": 35,
  "afterlight_room_tick_duration_bucket{room=\"market\",le=\"2500\"}": 35,
  "afterlight_room_tick_duration_bucket{room=\"market\",le=\"5000\"}": 35,
  "afterlight_room_tick_duration_bucket{room=\"market\",le=\"10000\"}": 35,
  "afterlight_room_tick_duration_bucket{room=\"market\",le=\"+Inf\"}": 35,
  "afterlight_room_tick_duration_sum{room=\"market\"}": 0,
  "afterlight_room_tick_duration_count{room=\"market\"}": 35,
  "afterlight_room_mailbox_depth{room=\"market\"}": 0,
  "afterlight_room_mailbox_depth{room=\"theater\"}": 0,
  "afterlight_room_roster_size{room=\"market\"}": 23,
  "afterlight_room_roster_size{room=\"theater\"}": 2,
  "afterlight_room_count": 2,
  "afterlight_gateway_sockets_connected": 25,
  "vm_total_run_queue_lengths_io": 0,
  "vm_total_run_queue_lengths_cpu": 0,
  "vm_total_run_queue_lengths_total": 0,
  "vm_memory_total": 346620.14400000003,
  "afterlight_repo_query_idle_time_bucket{le=\"1\"}": 46,
  "afterlight_repo_query_idle_time_bucket{le=\"5\"}": 1238,
  "afterlight_repo_query_idle_time_bucket{le=\"10\"}": 1529,
  "afterlight_repo_query_idle_time_bucket{le=\"25\"}": 2043,
  "afterlight_repo_query_idle_time_bucket{le=\"50\"}": 2211,
  "afterlight_repo_query_idle_time_bucket{le=\"100\"}": 2633,
  "afterlight_repo_query_idle_time_bucket{le=\"250\"}": 2962,
  "afterlight_repo_query_idle_time_bucket{le=\"500\"}": 3042,
  "afterlight_repo_query_idle_time_bucket{le=\"1000\"}": 3201,
  "afterlight_repo_query_idle_time_bucket{le=\"2500\"}": 3211,
  "afterlight_repo_query_idle_time_bucket{le=\"5000\"}": 3211,
  "afterlight_repo_query_idle_time_bucket{le=\"10000\"}": 3211,
  "afterlight_repo_query_idle_time_bucket{le=\"+Inf\"}": 3211,
  "afterlight_repo_query_idle_time_sum": 265117.824028,
  "afterlight_repo_query_idle_time_count": 3211,
  "afterlight_repo_query_queue_time_bucket{le=\"1\"}": 3198,
  "afterlight_repo_query_queue_time_bucket{le=\"5\"}": 3209,
  "afterlight_repo_query_queue_time_bucket{le=\"10\"}": 3211,
  "afterlight_repo_query_queue_time_bucket{le=\"25\"}": 3211,
  "afterlight_repo_query_queue_time_bucket{le=\"50\"}": 3211,
  "afterlight_repo_query_queue_time_bucket{le=\"100\"}": 3211,
  "afterlight_repo_query_queue_time_bucket{le=\"250\"}": 3211,
  "afterlight_repo_query_queue_time_bucket{le=\"500\"}": 3211,
  "afterlight_repo_query_queue_time_bucket{le=\"1000\"}": 3211,
  "afterlight_repo_query_queue_time_bucket{le=\"2500\"}": 3211,
  "afterlight_repo_query_queue_time_bucket{le=\"5000\"}": 3211,
  "afterlight_repo_query_queue_time_bucket{le=\"10000\"}": 3211,
  "afterlight_repo_query_queue_time_bucket{le=\"+Inf\"}": 3211,
  "afterlight_repo_query_queue_time_sum": 143.47966599999992,
  "afterlight_repo_query_queue_time_count": 3211,
  "afterlight_repo_query_query_time_bucket{le=\"1\"}": 3456,
  "afterlight_repo_query_query_time_bucket{le=\"5\"}": 4000,
  "afterlight_repo_query_query_time_bucket{le=\"10\"}": 4040,
  "afterlight_repo_query_query_time_bucket{le=\"25\"}": 4051,
  "afterlight_repo_query_query_time_bucket{le=\"50\"}": 4053,
  "afterlight_repo_query_query_time_bucket{le=\"100\"}": 4107,
  "afterlight_repo_query_query_time_bucket{le=\"250\"}": 4112,
  "afterlight_repo_query_query_time_bucket{le=\"500\"}": 4113,
  "afterlight_repo_query_query_time_bucket{le=\"1000\"}": 4113,
  "afterlight_repo_query_query_time_bucket{le=\"2500\"}": 4113,
  "afterlight_repo_query_query_time_bucket{le=\"5000\"}": 4113,
  "afterlight_repo_query_query_time_bucket{le=\"10000\"}": 4113,
  "afterlight_repo_query_query_time_bucket{le=\"+Inf\"}": 4113,
  "afterlight_repo_query_query_time_sum": 6559.559517,
  "afterlight_repo_query_query_time_count": 4113,
  "afterlight_repo_query_decode_time_bucket{le=\"1\"}": 3633,
  "afterlight_repo_query_decode_time_bucket{le=\"5\"}": 3633,
  "afterlight_repo_query_decode_time_bucket{le=\"10\"}": 3633,
  "afterlight_repo_query_decode_time_bucket{le=\"25\"}": 3633,
  "afterlight_repo_query_decode_time_bucket{le=\"50\"}": 3633,
  "afterlight_repo_query_decode_time_bucket{le=\"100\"}": 3633,
  "afterlight_repo_query_decode_time_bucket{le=\"250\"}": 3633,
  "afterlight_repo_query_decode_time_bucket{le=\"500\"}": 3633,
  "afterlight_repo_query_decode_time_bucket{le=\"1000\"}": 3633,
  "afterlight_repo_query_decode_time_bucket{le=\"2500\"}": 3633,
  "afterlight_repo_query_decode_time_bucket{le=\"5000\"}": 3633,
  "afterlight_repo_query_decode_time_bucket{le=\"10000\"}": 3633,
  "afterlight_repo_query_decode_time_bucket{le=\"+Inf\"}": 3633,
  "afterlight_repo_query_decode_time_sum": 5.4786690000000045,
  "afterlight_repo_query_decode_time_count": 3633,
  "afterlight_repo_query_total_time_bucket{le=\"1\"}": 3436,
  "afterlight_repo_query_total_time_bucket{le=\"5\"}": 3997,
  "afterlight_repo_query_total_time_bucket{le=\"10\"}": 4038,
  "afterlight_repo_query_total_time_bucket{le=\"25\"}": 4051,
  "afterlight_repo_query_total_time_bucket{le=\"50\"}": 4053,
  "afterlight_repo_query_total_time_bucket{le=\"100\"}": 4107,
  "afterlight_repo_query_total_time_bucket{le=\"250\"}": 4112,
  "afterlight_repo_query_total_time_bucket{le=\"500\"}": 4113,
  "afterlight_repo_query_total_time_bucket{le=\"1000\"}": 4113,
  "afterlight_repo_query_total_time_bucket{le=\"2500\"}": 4113,
  "afterlight_repo_query_total_time_bucket{le=\"5000\"}": 4113,
  "afterlight_repo_query_total_time_bucket{le=\"10000\"}": 4113,
  "afterlight_repo_query_total_time_bucket{le=\"+Inf\"}": 4113,
  "afterlight_repo_query_total_time_sum": 6708.517852000001,
  "afterlight_repo_query_total_time_count": 4113,
  "phoenix_channel_handled_in_duration_bucket{event=\"join_room\",le=\"1\"}": 0,
  "phoenix_channel_handled_in_duration_bucket{event=\"join_room\",le=\"5\"}": 43,
  "phoenix_channel_handled_in_duration_bucket{event=\"join_room\",le=\"10\"}": 49,
  "phoenix_channel_handled_in_duration_bucket{event=\"join_room\",le=\"25\"}": 50,
  "phoenix_channel_handled_in_duration_bucket{event=\"join_room\",le=\"50\"}": 50,
  "phoenix_channel_handled_in_duration_bucket{event=\"join_room\",le=\"100\"}": 57,
  "phoenix_channel_handled_in_duration_bucket{event=\"join_room\",le=\"250\"}": 57,
  "phoenix_channel_handled_in_duration_bucket{event=\"join_room\",le=\"500\"}": 59,
  "phoenix_channel_handled_in_duration_bucket{event=\"join_room\",le=\"1000\"}": 59,
  "phoenix_channel_handled_in_duration_bucket{event=\"join_room\",le=\"2500\"}": 59,
  "phoenix_channel_handled_in_duration_bucket{event=\"join_room\",le=\"5000\"}": 59,
  "phoenix_channel_handled_in_duration_bucket{event=\"join_room\",le=\"10000\"}": 59,
  "phoenix_channel_handled_in_duration_bucket{event=\"join_room\",le=\"+Inf\"}": 59,
  "phoenix_channel_handled_in_duration_sum{event=\"join_room\"}": 1243.6950259999999,
  "phoenix_channel_handled_in_duration_count{event=\"join_room\"}": 59,
  "phoenix_channel_handled_in_duration_bucket{event=\"hello\",le=\"1\"}": 0,
  "phoenix_channel_handled_in_duration_bucket{event=\"hello\",le=\"5\"}": 0,
  "phoenix_channel_handled_in_duration_bucket{event=\"hello\",le=\"10\"}": 0,
  "phoenix_channel_handled_in_duration_bucket{event=\"hello\",le=\"25\"}": 0,
  "phoenix_channel_handled_in_duration_bucket{event=\"hello\",le=\"50\"}": 0,
  "phoenix_channel_handled_in_duration_bucket{event=\"hello\",le=\"100\"}": 45,
  "phoenix_channel_handled_in_duration_bucket{event=\"hello\",le=\"250\"}": 53,
  "phoenix_channel_handled_in_duration_bucket{event=\"hello\",le=\"500\"}": 53,
  "phoenix_channel_handled_in_duration_bucket{event=\"hello\",le=\"1000\"}": 53,
  "phoenix_channel_handled_in_duration_bucket{event=\"hello\",le=\"2500\"}": 53,
  "phoenix_channel_handled_in_duration_bucket{event=\"hello\",le=\"5000\"}": 53,
  "phoenix_channel_handled_in_duration_bucket{event=\"hello\",le=\"10000\"}": 53,
  "phoenix_channel_handled_in_duration_bucket{event=\"hello\",le=\"+Inf\"}": 53,
  "phoenix_channel_handled_in_duration_sum{event=\"hello\"}": 4798.436245000001,
  "phoenix_channel_handled_in_duration_count{event=\"hello\"}": 53,
  "phoenix_channel_handled_in_duration_bucket{event=\"iptv_list_get\",le=\"1\"}": 0,
  "phoenix_channel_handled_in_duration_bucket{event=\"iptv_list_get\",le=\"5\"}": 0,
  "phoenix_channel_handled_in_duration_bucket{event=\"iptv_list_get\",le=\"10\"}": 0,
  "phoenix_channel_handled_in_duration_bucket{event=\"iptv_list_get\",le=\"25\"}": 0,
  "phoenix_channel_handled_in_duration_bucket{event=\"iptv_list_get\",le=\"50\"}": 2,
  "phoenix_channel_handled_in_duration_bucket{event=\"iptv_list_get\",le=\"100\"}": 2,
  "phoenix_channel_handled_in_duration_bucket{event=\"iptv_list_get\",le=\"250\"}": 2,
  "phoenix_channel_handled_in_duration_bucket{event=\"iptv_list_get\",le=\"500\"}": 2,
  "phoenix_channel_handled_in_duration_bucket{event=\"iptv_list_get\",le=\"1000\"}": 2,
  "phoenix_channel_handled_in_duration_bucket{event=\"iptv_list_get\",le=\"2500\"}": 2,
  "phoenix_channel_handled_in_duration_bucket{event=\"iptv_list_get\",le=\"5000\"}": 2,
  "phoenix_channel_handled_in_duration_bucket{event=\"iptv_list_get\",le=\"10000\"}": 2,
  "phoenix_channel_handled_in_duration_bucket{event=\"iptv_list_get\",le=\"+Inf\"}": 2,
  "phoenix_channel_handled_in_duration_sum{event=\"iptv_list_get\"}": 71.796945,
  "phoenix_channel_handled_in_duration_count{event=\"iptv_list_get\"}": 2,
  "phoenix_channel_handled_in_duration_bucket{event=\"movement\",le=\"1\"}": 853,
  "phoenix_channel_handled_in_duration_bucket{event=\"movement\",le=\"5\"}": 853,
  "phoenix_channel_handled_in_duration_bucket{event=\"movement\",le=\"10\"}": 853,
  "phoenix_channel_handled_in_duration_bucket{event=\"movement\",le=\"25\"}": 853,
  "phoenix_channel_handled_in_duration_bucket{event=\"movement\",le=\"50\"}": 853,
  "phoenix_channel_handled_in_duration_bucket{event=\"movement\",le=\"100\"}": 853,
  "phoenix_channel_handled_in_duration_bucket{event=\"movement\",le=\"250\"}": 853,
  "phoenix_channel_handled_in_duration_bucket{event=\"movement\",le=\"500\"}": 853,
  "phoenix_channel_handled_in_duration_bucket{event=\"movement\",le=\"1000\"}": 853,
  "phoenix_channel_handled_in_duration_bucket{event=\"movement\",le=\"2500\"}": 853,
  "phoenix_channel_handled_in_duration_bucket{event=\"movement\",le=\"5000\"}": 853,
  "phoenix_channel_handled_in_duration_bucket{event=\"movement\",le=\"10000\"}": 853,
  "phoenix_channel_handled_in_duration_bucket{event=\"movement\",le=\"+Inf\"}": 853,
  "phoenix_channel_handled_in_duration_sum{event=\"movement\"}": 10.815673000000007,
  "phoenix_channel_handled_in_duration_count{event=\"movement\"}": 853,
  "phoenix_channel_joined_duration_bucket{le=\"1\"}": 53,
  "phoenix_channel_joined_duration_bucket{le=\"5\"}": 53,
  "phoenix_channel_joined_duration_bucket{le=\"10\"}": 53,
  "phoenix_channel_joined_duration_bucket{le=\"25\"}": 53,
  "phoenix_channel_joined_duration_bucket{le=\"50\"}": 53,
  "phoenix_channel_joined_duration_bucket{le=\"100\"}": 53,
  "phoenix_channel_joined_duration_bucket{le=\"250\"}": 53,
  "phoenix_channel_joined_duration_bucket{le=\"500\"}": 53,
  "phoenix_channel_joined_duration_bucket{le=\"1000\"}": 53,
  "phoenix_channel_joined_duration_bucket{le=\"2500\"}": 53,
  "phoenix_channel_joined_duration_bucket{le=\"5000\"}": 53,
  "phoenix_channel_joined_duration_bucket{le=\"10000\"}": 53,
  "phoenix_channel_joined_duration_bucket{le=\"+Inf\"}": 53,
  "phoenix_channel_joined_duration_sum": 10.205719,
  "phoenix_channel_joined_duration_count": 53,
  "phoenix_socket_connected_duration_bucket{le=\"1\"}": 0,
  "phoenix_socket_connected_duration_bucket{le=\"5\"}": 0,
  "phoenix_socket_connected_duration_bucket{le=\"10\"}": 37,
  "phoenix_socket_connected_duration_bucket{le=\"25\"}": 47,
  "phoenix_socket_connected_duration_bucket{le=\"50\"}": 51,
  "phoenix_socket_connected_duration_bucket{le=\"100\"}": 53,
  "phoenix_socket_connected_duration_bucket{le=\"250\"}": 53,
  "phoenix_socket_connected_duration_bucket{le=\"500\"}": 53,
  "phoenix_socket_connected_duration_bucket{le=\"1000\"}": 53,
  "phoenix_socket_connected_duration_bucket{le=\"2500\"}": 53,
  "phoenix_socket_connected_duration_bucket{le=\"5000\"}": 53,
  "phoenix_socket_connected_duration_bucket{le=\"10000\"}": 53,
  "phoenix_socket_connected_duration_bucket{le=\"+Inf\"}": 53,
  "phoenix_socket_connected_duration_sum": 717.1430749999998,
  "phoenix_socket_connected_duration_count": 53,
  "phoenix_router_dispatch_stop_duration_bucket{route=\"/health\",le=\"1\"}": 1,
  "phoenix_router_dispatch_stop_duration_bucket{route=\"/health\",le=\"5\"}": 1,
  "phoenix_router_dispatch_stop_duration_bucket{route=\"/health\",le=\"10\"}": 1,
  "phoenix_router_dispatch_stop_duration_bucket{route=\"/health\",le=\"25\"}": 1,
  "phoenix_router_dispatch_stop_duration_bucket{route=\"/health\",le=\"50\"}": 1,
  "phoenix_router_dispatch_stop_duration_bucket{route=\"/health\",le=\"100\"}": 1,
  "phoenix_router_dispatch_stop_duration_bucket{route=\"/health\",le=\"250\"}": 1,
  "phoenix_router_dispatch_stop_duration_bucket{route=\"/health\",le=\"500\"}": 1,
  "phoenix_router_dispatch_stop_duration_bucket{route=\"/health\",le=\"1000\"}": 1,
  "phoenix_router_dispatch_stop_duration_bucket{route=\"/health\",le=\"2500\"}": 1,
  "phoenix_router_dispatch_stop_duration_bucket{route=\"/health\",le=\"5000\"}": 1,
  "phoenix_router_dispatch_stop_duration_bucket{route=\"/health\",le=\"10000\"}": 1,
  "phoenix_router_dispatch_stop_duration_bucket{route=\"/health\",le=\"+Inf\"}": 1,
  "phoenix_router_dispatch_stop_duration_sum{route=\"/health\"}": 0.102952,
  "phoenix_router_dispatch_stop_duration_count{route=\"/health\"}": 1,
  "phoenix_router_dispatch_stop_duration_bucket{route=\"/api/auth/guest\",le=\"1\"}": 52,
  "phoenix_router_dispatch_stop_duration_bucket{route=\"/api/auth/guest\",le=\"5\"}": 54,
  "phoenix_router_dispatch_stop_duration_bucket{route=\"/api/auth/guest\",le=\"10\"}": 54,
  "phoenix_router_dispatch_stop_duration_bucket{route=\"/api/auth/guest\",le=\"25\"}": 54,
  "phoenix_router_dispatch_stop_duration_bucket{route=\"/api/auth/guest\",le=\"50\"}": 54,
  "phoenix_router_dispatch_stop_duration_bucket{route=\"/api/auth/guest\",le=\"100\"}": 54,
  "phoenix_router_dispatch_stop_duration_bucket{route=\"/api/auth/guest\",le=\"250\"}": 54,
  "phoenix_router_dispatch_stop_duration_bucket{route=\"/api/auth/guest\",le=\"500\"}": 54,
  "phoenix_router_dispatch_stop_duration_bucket{route=\"/api/auth/guest\",le=\"1000\"}": 54,
  "phoenix_router_dispatch_stop_duration_bucket{route=\"/api/auth/guest\",le=\"2500\"}": 54,
  "phoenix_router_dispatch_stop_duration_bucket{route=\"/api/auth/guest\",le=\"5000\"}": 54,
  "phoenix_router_dispatch_stop_duration_bucket{route=\"/api/auth/guest\",le=\"10000\"}": 54,
  "phoenix_router_dispatch_stop_duration_bucket{route=\"/api/auth/guest\",le=\"+Inf\"}": 54,
  "phoenix_router_dispatch_stop_duration_sum{route=\"/api/auth/guest\"}": 23.963684999999998,
  "phoenix_router_dispatch_stop_duration_count{route=\"/api/auth/guest\"}": 54
}
```

## Acceptance targets

| Target | Threshold | Measured | Status |
| --- | --- | --- | --- |
| Room tick lag (client consume) | p99 < 50 ms | 106 ms | MISS |
| Durable ack (same-region) | p95 < 250 ms | — ms | NOT EVALUATED |
| Mailbox/memory monotonic growth | none over soak | no monotonic growth observed | PASS |
| Zero duplicated economic effects | 0 duplicates | 0 duplicates | PASS |
