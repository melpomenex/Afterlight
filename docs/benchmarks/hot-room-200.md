# Benchmark — hot-room-200

**Status:** measured
**Recorded:** 2026-09-08T06:19:02.083Z
**Duration:** 27054 ms

## Scenario parameters

```json
{
  "version": "1",
  "description": "Hot room — 200 occupants",
  "sessions": 200,
  "rooms": [
    "market"
  ],
  "rampMs": 3000,
  "soakMs": 4000,
  "movementBursts": 5,
  "moverRatio": 0.3,
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

- Join: p50 10 ms · p95 16 ms · p99 17 ms (n=200)
- Frame interval: p50 117 ms · p95 161 ms · p99 13615 ms (n=8000)
- Tick consume lag: p50 51 ms · p95 161 ms · p99 182 ms (n=8051)
- Durable ack: _no samples_

## Payload sizes (JSON frames, bytes)

n=48600 · p50 169 · p95 28364 · p99 28371

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
  "afterlight_durable_outbox_depth": 9,
  "afterlight_durable_outbox_age_ms": 961,
  "afterlight_room_reconnect_count{room=\"theater\"}": 2,
  "afterlight_room_join_latency_bucket{room=\"market\",le=\"1\"}": 350,
  "afterlight_room_join_latency_bucket{room=\"market\",le=\"5\"}": 350,
  "afterlight_room_join_latency_bucket{room=\"market\",le=\"10\"}": 350,
  "afterlight_room_join_latency_bucket{room=\"market\",le=\"25\"}": 350,
  "afterlight_room_join_latency_bucket{room=\"market\",le=\"50\"}": 350,
  "afterlight_room_join_latency_bucket{room=\"market\",le=\"100\"}": 350,
  "afterlight_room_join_latency_bucket{room=\"market\",le=\"250\"}": 350,
  "afterlight_room_join_latency_bucket{room=\"market\",le=\"500\"}": 350,
  "afterlight_room_join_latency_bucket{room=\"market\",le=\"1000\"}": 350,
  "afterlight_room_join_latency_bucket{room=\"market\",le=\"2500\"}": 350,
  "afterlight_room_join_latency_bucket{room=\"market\",le=\"5000\"}": 350,
  "afterlight_room_join_latency_bucket{room=\"market\",le=\"10000\"}": 350,
  "afterlight_room_join_latency_bucket{room=\"market\",le=\"+Inf\"}": 350,
  "afterlight_room_join_latency_sum{room=\"market\"}": 0.0011980000000000003,
  "afterlight_room_join_latency_count{room=\"market\"}": 350,
  "afterlight_room_join_latency_bucket{room=\"theater\",le=\"1\"}": 19,
  "afterlight_room_join_latency_bucket{room=\"theater\",le=\"5\"}": 19,
  "afterlight_room_join_latency_bucket{room=\"theater\",le=\"10\"}": 19,
  "afterlight_room_join_latency_bucket{room=\"theater\",le=\"25\"}": 19,
  "afterlight_room_join_latency_bucket{room=\"theater\",le=\"50\"}": 19,
  "afterlight_room_join_latency_bucket{room=\"theater\",le=\"100\"}": 19,
  "afterlight_room_join_latency_bucket{room=\"theater\",le=\"250\"}": 19,
  "afterlight_room_join_latency_bucket{room=\"theater\",le=\"500\"}": 19,
  "afterlight_room_join_latency_bucket{room=\"theater\",le=\"1000\"}": 19,
  "afterlight_room_join_latency_bucket{room=\"theater\",le=\"2500\"}": 19,
  "afterlight_room_join_latency_bucket{room=\"theater\",le=\"5000\"}": 19,
  "afterlight_room_join_latency_bucket{room=\"theater\",le=\"10000\"}": 19,
  "afterlight_room_join_latency_bucket{room=\"theater\",le=\"+Inf\"}": 19,
  "afterlight_room_join_latency_sum{room=\"theater\"}": 0.000126,
  "afterlight_room_join_latency_count{room=\"theater\"}": 19,
  "afterlight_movement_coalesced_count{room=\"theater\"}": 9,
  "afterlight_movement_coalesced_count{room=\"market\"}": 109,
  "afterlight_room_tick_duration_bucket{room=\"theater\",le=\"1\"}": 9,
  "afterlight_room_tick_duration_bucket{room=\"theater\",le=\"5\"}": 9,
  "afterlight_room_tick_duration_bucket{room=\"theater\",le=\"10\"}": 9,
  "afterlight_room_tick_duration_bucket{room=\"theater\",le=\"25\"}": 9,
  "afterlight_room_tick_duration_bucket{room=\"theater\",le=\"50\"}": 9,
  "afterlight_room_tick_duration_bucket{room=\"theater\",le=\"100\"}": 9,
  "afterlight_room_tick_duration_bucket{room=\"theater\",le=\"250\"}": 9,
  "afterlight_room_tick_duration_bucket{room=\"theater\",le=\"500\"}": 9,
  "afterlight_room_tick_duration_bucket{room=\"theater\",le=\"1000\"}": 9,
  "afterlight_room_tick_duration_bucket{room=\"theater\",le=\"2500\"}": 9,
  "afterlight_room_tick_duration_bucket{room=\"theater\",le=\"5000\"}": 9,
  "afterlight_room_tick_duration_bucket{room=\"theater\",le=\"10000\"}": 9,
  "afterlight_room_tick_duration_bucket{room=\"theater\",le=\"+Inf\"}": 9,
  "afterlight_room_tick_duration_sum{room=\"theater\"}": 0.000003,
  "afterlight_room_tick_duration_count{room=\"theater\"}": 9,
  "afterlight_room_tick_duration_bucket{room=\"market\",le=\"1\"}": 109,
  "afterlight_room_tick_duration_bucket{room=\"market\",le=\"5\"}": 109,
  "afterlight_room_tick_duration_bucket{room=\"market\",le=\"10\"}": 109,
  "afterlight_room_tick_duration_bucket{room=\"market\",le=\"25\"}": 109,
  "afterlight_room_tick_duration_bucket{room=\"market\",le=\"50\"}": 109,
  "afterlight_room_tick_duration_bucket{room=\"market\",le=\"100\"}": 109,
  "afterlight_room_tick_duration_bucket{room=\"market\",le=\"250\"}": 109,
  "afterlight_room_tick_duration_bucket{room=\"market\",le=\"500\"}": 109,
  "afterlight_room_tick_duration_bucket{room=\"market\",le=\"1000\"}": 109,
  "afterlight_room_tick_duration_bucket{room=\"market\",le=\"2500\"}": 109,
  "afterlight_room_tick_duration_bucket{room=\"market\",le=\"5000\"}": 109,
  "afterlight_room_tick_duration_bucket{room=\"market\",le=\"10000\"}": 109,
  "afterlight_room_tick_duration_bucket{room=\"market\",le=\"+Inf\"}": 109,
  "afterlight_room_tick_duration_sum{room=\"market\"}": 0.0007029999999999998,
  "afterlight_room_tick_duration_count{room=\"market\"}": 109,
  "afterlight_room_mailbox_depth{room=\"market\"}": 0,
  "afterlight_room_mailbox_depth{room=\"theater\"}": 0,
  "afterlight_room_roster_size{room=\"market\"}": 186,
  "afterlight_room_roster_size{room=\"theater\"}": 2,
  "afterlight_room_count": 2,
  "afterlight_gateway_sockets_connected": 189,
  "vm_total_run_queue_lengths_io": 0,
  "vm_total_run_queue_lengths_cpu": 0,
  "vm_total_run_queue_lengths_total": 0,
  "vm_memory_total": 866685.856,
  "afterlight_repo_query_idle_time_bucket{le=\"1\"}": 4033,
  "afterlight_repo_query_idle_time_bucket{le=\"5\"}": 22792,
  "afterlight_repo_query_idle_time_bucket{le=\"10\"}": 24524,
  "afterlight_repo_query_idle_time_bucket{le=\"25\"}": 27905,
  "afterlight_repo_query_idle_time_bucket{le=\"50\"}": 29834,
  "afterlight_repo_query_idle_time_bucket{le=\"100\"}": 32667,
  "afterlight_repo_query_idle_time_bucket{le=\"250\"}": 33173,
  "afterlight_repo_query_idle_time_bucket{le=\"500\"}": 33377,
  "afterlight_repo_query_idle_time_bucket{le=\"1000\"}": 33750,
  "afterlight_repo_query_idle_time_bucket{le=\"2500\"}": 33760,
  "afterlight_repo_query_idle_time_bucket{le=\"5000\"}": 33760,
  "afterlight_repo_query_idle_time_bucket{le=\"10000\"}": 33760,
  "afterlight_repo_query_idle_time_bucket{le=\"+Inf\"}": 33760,
  "afterlight_repo_query_idle_time_sum": 822680.0805669993,
  "afterlight_repo_query_idle_time_count": 33760,
  "afterlight_repo_query_queue_time_bucket{le=\"1\"}": 33725,
  "afterlight_repo_query_queue_time_bucket{le=\"5\"}": 33752,
  "afterlight_repo_query_queue_time_bucket{le=\"10\"}": 33759,
  "afterlight_repo_query_queue_time_bucket{le=\"25\"}": 33760,
  "afterlight_repo_query_queue_time_bucket{le=\"50\"}": 33760,
  "afterlight_repo_query_queue_time_bucket{le=\"100\"}": 33760,
  "afterlight_repo_query_queue_time_bucket{le=\"250\"}": 33760,
  "afterlight_repo_query_queue_time_bucket{le=\"500\"}": 33760,
  "afterlight_repo_query_queue_time_bucket{le=\"1000\"}": 33760,
  "afterlight_repo_query_queue_time_bucket{le=\"2500\"}": 33760,
  "afterlight_repo_query_queue_time_bucket{le=\"5000\"}": 33760,
  "afterlight_repo_query_queue_time_bucket{le=\"10000\"}": 33760,
  "afterlight_repo_query_queue_time_bucket{le=\"+Inf\"}": 33760,
  "afterlight_repo_query_queue_time_sum": 760.7060289999988,
  "afterlight_repo_query_queue_time_count": 33760,
  "afterlight_repo_query_query_time_bucket{le=\"1\"}": 35810,
  "afterlight_repo_query_query_time_bucket{le=\"5\"}": 38969,
  "afterlight_repo_query_query_time_bucket{le=\"10\"}": 39163,
  "afterlight_repo_query_query_time_bucket{le=\"25\"}": 39191,
  "afterlight_repo_query_query_time_bucket{le=\"50\"}": 39224,
  "afterlight_repo_query_query_time_bucket{le=\"100\"}": 39559,
  "afterlight_repo_query_query_time_bucket{le=\"250\"}": 39564,
  "afterlight_repo_query_query_time_bucket{le=\"500\"}": 39566,
  "afterlight_repo_query_query_time_bucket{le=\"1000\"}": 39566,
  "afterlight_repo_query_query_time_bucket{le=\"2500\"}": 39566,
  "afterlight_repo_query_query_time_bucket{le=\"5000\"}": 39566,
  "afterlight_repo_query_query_time_bucket{le=\"10000\"}": 39566,
  "afterlight_repo_query_query_time_bucket{le=\"+Inf\"}": 39566,
  "afterlight_repo_query_query_time_sum": 34250.94689200002,
  "afterlight_repo_query_query_time_count": 39566,
  "afterlight_repo_query_decode_time_bucket{le=\"1\"}": 36361,
  "afterlight_repo_query_decode_time_bucket{le=\"5\"}": 36362,
  "afterlight_repo_query_decode_time_bucket{le=\"10\"}": 36362,
  "afterlight_repo_query_decode_time_bucket{le=\"25\"}": 36362,
  "afterlight_repo_query_decode_time_bucket{le=\"50\"}": 36362,
  "afterlight_repo_query_decode_time_bucket{le=\"100\"}": 36362,
  "afterlight_repo_query_decode_time_bucket{le=\"250\"}": 36362,
  "afterlight_repo_query_decode_time_bucket{le=\"500\"}": 36362,
  "afterlight_repo_query_decode_time_bucket{le=\"1000\"}": 36362,
  "afterlight_repo_query_decode_time_bucket{le=\"2500\"}": 36362,
  "afterlight_repo_query_decode_time_bucket{le=\"5000\"}": 36362,
  "afterlight_repo_query_decode_time_bucket{le=\"10000\"}": 36362,
  "afterlight_repo_query_decode_time_bucket{le=\"+Inf\"}": 36362,
  "afterlight_repo_query_decode_time_sum": 39.83849000000025,
  "afterlight_repo_query_decode_time_count": 36362,
  "afterlight_repo_query_total_time_bucket{le=\"1\"}": 35780,
  "afterlight_repo_query_total_time_bucket{le=\"5\"}": 38959,
  "afterlight_repo_query_total_time_bucket{le=\"10\"}": 39158,
  "afterlight_repo_query_total_time_bucket{le=\"25\"}": 39194,
  "afterlight_repo_query_total_time_bucket{le=\"50\"}": 39226,
  "afterlight_repo_query_total_time_bucket{le=\"100\"}": 39562,
  "afterlight_repo_query_total_time_bucket{le=\"250\"}": 39567,
  "afterlight_repo_query_total_time_bucket{le=\"500\"}": 39569,
  "afterlight_repo_query_total_time_bucket{le=\"1000\"}": 39569,
  "afterlight_repo_query_total_time_bucket{le=\"2500\"}": 39569,
  "afterlight_repo_query_total_time_bucket{le=\"5000\"}": 39569,
  "afterlight_repo_query_total_time_bucket{le=\"10000\"}": 39569,
  "afterlight_repo_query_total_time_bucket{le=\"+Inf\"}": 39569,
  "afterlight_repo_query_total_time_sum": 35052.59145099999,
  "afterlight_repo_query_total_time_count": 39569,
  "phoenix_channel_handled_in_duration_bucket{event=\"join_room\",le=\"1\"}": 0,
  "phoenix_channel_handled_in_duration_bucket{event=\"join_room\",le=\"5\"}": 312,
  "phoenix_channel_handled_in_duration_bucket{event=\"join_room\",le=\"10\"}": 348,
  "phoenix_channel_handled_in_duration_bucket{event=\"join_room\",le=\"25\"}": 350,
  "phoenix_channel_handled_in_duration_bucket{event=\"join_room\",le=\"50\"}": 350,
  "phoenix_channel_handled_in_duration_bucket{event=\"join_room\",le=\"100\"}": 366,
  "phoenix_channel_handled_in_duration_bucket{event=\"join_room\",le=\"250\"}": 366,
  "phoenix_channel_handled_in_duration_bucket{event=\"join_room\",le=\"500\"}": 369,
  "phoenix_channel_handled_in_duration_bucket{event=\"join_room\",le=\"1000\"}": 369,
  "phoenix_channel_handled_in_duration_bucket{event=\"join_room\",le=\"2500\"}": 369,
  "phoenix_channel_handled_in_duration_bucket{event=\"join_room\",le=\"5000\"}": 369,
  "phoenix_channel_handled_in_duration_bucket{event=\"join_room\",le=\"10000\"}": 369,
  "phoenix_channel_handled_in_duration_bucket{event=\"join_room\",le=\"+Inf\"}": 369,
  "phoenix_channel_handled_in_duration_sum{event=\"join_room\"}": 3367.245724,
  "phoenix_channel_handled_in_duration_count{event=\"join_room\"}": 369,
  "phoenix_channel_handled_in_duration_bucket{event=\"hello\",le=\"1\"}": 0,
  "phoenix_channel_handled_in_duration_bucket{event=\"hello\",le=\"5\"}": 0,
  "phoenix_channel_handled_in_duration_bucket{event=\"hello\",le=\"10\"}": 0,
  "phoenix_channel_handled_in_duration_bucket{event=\"hello\",le=\"25\"}": 0,
  "phoenix_channel_handled_in_duration_bucket{event=\"hello\",le=\"50\"}": 0,
  "phoenix_channel_handled_in_duration_bucket{event=\"hello\",le=\"100\"}": 346,
  "phoenix_channel_handled_in_duration_bucket{event=\"hello\",le=\"250\"}": 356,
  "phoenix_channel_handled_in_duration_bucket{event=\"hello\",le=\"500\"}": 356,
  "phoenix_channel_handled_in_duration_bucket{event=\"hello\",le=\"1000\"}": 356,
  "phoenix_channel_handled_in_duration_bucket{event=\"hello\",le=\"2500\"}": 356,
  "phoenix_channel_handled_in_duration_bucket{event=\"hello\",le=\"5000\"}": 356,
  "phoenix_channel_handled_in_duration_bucket{event=\"hello\",le=\"10000\"}": 356,
  "phoenix_channel_handled_in_duration_bucket{event=\"hello\",le=\"+Inf\"}": 356,
  "phoenix_channel_handled_in_duration_sum{event=\"hello\"}": 27572.53042000001,
  "phoenix_channel_handled_in_duration_count{event=\"hello\"}": 356,
  "phoenix_channel_handled_in_duration_bucket{event=\"iptv_list_get\",le=\"1\"}": 0,
  "phoenix_channel_handled_in_duration_bucket{event=\"iptv_list_get\",le=\"5\"}": 0,
  "phoenix_channel_handled_in_duration_bucket{event=\"iptv_list_get\",le=\"10\"}": 0,
  "phoenix_channel_handled_in_duration_bucket{event=\"iptv_list_get\",le=\"25\"}": 0,
  "phoenix_channel_handled_in_duration_bucket{event=\"iptv_list_get\",le=\"50\"}": 4,
  "phoenix_channel_handled_in_duration_bucket{event=\"iptv_list_get\",le=\"100\"}": 4,
  "phoenix_channel_handled_in_duration_bucket{event=\"iptv_list_get\",le=\"250\"}": 4,
  "phoenix_channel_handled_in_duration_bucket{event=\"iptv_list_get\",le=\"500\"}": 4,
  "phoenix_channel_handled_in_duration_bucket{event=\"iptv_list_get\",le=\"1000\"}": 4,
  "phoenix_channel_handled_in_duration_bucket{event=\"iptv_list_get\",le=\"2500\"}": 4,
  "phoenix_channel_handled_in_duration_bucket{event=\"iptv_list_get\",le=\"5000\"}": 4,
  "phoenix_channel_handled_in_duration_bucket{event=\"iptv_list_get\",le=\"10000\"}": 4,
  "phoenix_channel_handled_in_duration_bucket{event=\"iptv_list_get\",le=\"+Inf\"}": 4,
  "phoenix_channel_handled_in_duration_sum{event=\"iptv_list_get\"}": 153.447045,
  "phoenix_channel_handled_in_duration_count{event=\"iptv_list_get\"}": 4,
  "phoenix_channel_handled_in_duration_bucket{event=\"movement\",le=\"1\"}": 5509,
  "phoenix_channel_handled_in_duration_bucket{event=\"movement\",le=\"5\"}": 5509,
  "phoenix_channel_handled_in_duration_bucket{event=\"movement\",le=\"10\"}": 5509,
  "phoenix_channel_handled_in_duration_bucket{event=\"movement\",le=\"25\"}": 5509,
  "phoenix_channel_handled_in_duration_bucket{event=\"movement\",le=\"50\"}": 5509,
  "phoenix_channel_handled_in_duration_bucket{event=\"movement\",le=\"100\"}": 5509,
  "phoenix_channel_handled_in_duration_bucket{event=\"movement\",le=\"250\"}": 5509,
  "phoenix_channel_handled_in_duration_bucket{event=\"movement\",le=\"500\"}": 5509,
  "phoenix_channel_handled_in_duration_bucket{event=\"movement\",le=\"1000\"}": 5509,
  "phoenix_channel_handled_in_duration_bucket{event=\"movement\",le=\"2500\"}": 5509,
  "phoenix_channel_handled_in_duration_bucket{event=\"movement\",le=\"5000\"}": 5509,
  "phoenix_channel_handled_in_duration_bucket{event=\"movement\",le=\"10000\"}": 5509,
  "phoenix_channel_handled_in_duration_bucket{event=\"movement\",le=\"+Inf\"}": 5509,
  "phoenix_channel_handled_in_duration_sum{event=\"movement\"}": 70.89143000000003,
  "phoenix_channel_handled_in_duration_count{event=\"movement\"}": 5509,
  "phoenix_channel_joined_duration_bucket{le=\"1\"}": 356,
  "phoenix_channel_joined_duration_bucket{le=\"5\"}": 356,
  "phoenix_channel_joined_duration_bucket{le=\"10\"}": 356,
  "phoenix_channel_joined_duration_bucket{le=\"25\"}": 356,
  "phoenix_channel_joined_duration_bucket{le=\"50\"}": 356,
  "phoenix_channel_joined_duration_bucket{le=\"100\"}": 356,
  "phoenix_channel_joined_duration_bucket{le=\"250\"}": 356,
  "phoenix_channel_joined_duration_bucket{le=\"500\"}": 356,
  "phoenix_channel_joined_duration_bucket{le=\"1000\"}": 356,
  "phoenix_channel_joined_duration_bucket{le=\"2500\"}": 356,
  "phoenix_channel_joined_duration_bucket{le=\"5000\"}": 356,
  "phoenix_channel_joined_duration_bucket{le=\"10000\"}": 356,
  "phoenix_channel_joined_duration_bucket{le=\"+Inf\"}": 356,
  "phoenix_channel_joined_duration_sum": 53.298086,
  "phoenix_channel_joined_duration_count": 356,
  "phoenix_socket_connected_duration_bucket{le=\"1\"}": 0,
  "phoenix_socket_connected_duration_bucket{le=\"5\"}": 0,
  "phoenix_socket_connected_duration_bucket{le=\"10\"}": 312,
  "phoenix_socket_connected_duration_bucket{le=\"25\"}": 350,
  "phoenix_socket_connected_duration_bucket{le=\"50\"}": 354,
  "phoenix_socket_connected_duration_bucket{le=\"100\"}": 356,
  "phoenix_socket_connected_duration_bucket{le=\"250\"}": 356,
  "phoenix_socket_connected_duration_bucket{le=\"500\"}": 356,
  "phoenix_socket_connected_duration_bucket{le=\"1000\"}": 356,
  "phoenix_socket_connected_duration_bucket{le=\"2500\"}": 356,
  "phoenix_socket_connected_duration_bucket{le=\"5000\"}": 356,
  "phoenix_socket_connected_duration_bucket{le=\"10000\"}": 356,
  "phoenix_socket_connected_duration_bucket{le=\"+Inf\"}": 356,
  "phoenix_socket_connected_duration_sum": 3352.6327290000004,
  "phoenix_socket_connected_duration_count": 356,
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
  "phoenix_router_dispatch_stop_duration_bucket{route=\"/api/auth/guest\",le=\"1\"}": 355,
  "phoenix_router_dispatch_stop_duration_bucket{route=\"/api/auth/guest\",le=\"5\"}": 357,
  "phoenix_router_dispatch_stop_duration_bucket{route=\"/api/auth/guest\",le=\"10\"}": 357,
  "phoenix_router_dispatch_stop_duration_bucket{route=\"/api/auth/guest\",le=\"25\"}": 357,
  "phoenix_router_dispatch_stop_duration_bucket{route=\"/api/auth/guest\",le=\"50\"}": 357,
  "phoenix_router_dispatch_stop_duration_bucket{route=\"/api/auth/guest\",le=\"100\"}": 357,
  "phoenix_router_dispatch_stop_duration_bucket{route=\"/api/auth/guest\",le=\"250\"}": 357,
  "phoenix_router_dispatch_stop_duration_bucket{route=\"/api/auth/guest\",le=\"500\"}": 357,
  "phoenix_router_dispatch_stop_duration_bucket{route=\"/api/auth/guest\",le=\"1000\"}": 357,
  "phoenix_router_dispatch_stop_duration_bucket{route=\"/api/auth/guest\",le=\"2500\"}": 357,
  "phoenix_router_dispatch_stop_duration_bucket{route=\"/api/auth/guest\",le=\"5000\"}": 357,
  "phoenix_router_dispatch_stop_duration_bucket{route=\"/api/auth/guest\",le=\"10000\"}": 357,
  "phoenix_router_dispatch_stop_duration_bucket{route=\"/api/auth/guest\",le=\"+Inf\"}": 357,
  "phoenix_router_dispatch_stop_duration_sum{route=\"/api/auth/guest\"}": 108.68861099999998,
  "phoenix_router_dispatch_stop_duration_count{route=\"/api/auth/guest\"}": 357
}
```

## Acceptance targets

| Target | Threshold | Measured | Status |
| --- | --- | --- | --- |
| Room tick lag (client consume) | p99 < 50 ms | 182 ms | MISS |
| Durable ack (same-region) | p95 < 250 ms | — ms | NOT EVALUATED |
| Mailbox/memory monotonic growth | none over soak | no monotonic growth observed | PASS |
| Zero duplicated economic effects | 0 duplicates | 0 duplicates | PASS |
