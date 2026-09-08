# Benchmark — hot-room-100

**Status:** measured
**Recorded:** 2026-09-08T06:18:41.938Z
**Duration:** 15160 ms

## Scenario parameters

```json
{
  "version": "1",
  "description": "Hot room — 100 occupants",
  "sessions": 100,
  "rooms": [
    "market"
  ],
  "rampMs": 2000,
  "soakMs": 3000,
  "movementBursts": 5,
  "moverRatio": 0.35,
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

- Join: p50 10 ms · p95 12 ms · p99 14 ms (n=100)
- Frame interval: p50 105 ms · p95 179 ms · p99 7386 ms (n=3400)
- Tick consume lag: p50 32 ms · p95 108 ms · p99 113 ms (n=3500)
- Durable ack: _no samples_

## Payload sizes (JSON frames, bytes)

n=13967 · p50 169 · p95 14153 · p99 14160

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
  "afterlight_durable_outbox_depth": 5,
  "afterlight_durable_outbox_age_ms": 520,
  "afterlight_room_reconnect_count{room=\"theater\"}": 2,
  "afterlight_room_join_latency_bucket{room=\"market\",le=\"1\"}": 150,
  "afterlight_room_join_latency_bucket{room=\"market\",le=\"5\"}": 150,
  "afterlight_room_join_latency_bucket{room=\"market\",le=\"10\"}": 150,
  "afterlight_room_join_latency_bucket{room=\"market\",le=\"25\"}": 150,
  "afterlight_room_join_latency_bucket{room=\"market\",le=\"50\"}": 150,
  "afterlight_room_join_latency_bucket{room=\"market\",le=\"100\"}": 150,
  "afterlight_room_join_latency_bucket{room=\"market\",le=\"250\"}": 150,
  "afterlight_room_join_latency_bucket{room=\"market\",le=\"500\"}": 150,
  "afterlight_room_join_latency_bucket{room=\"market\",le=\"1000\"}": 150,
  "afterlight_room_join_latency_bucket{room=\"market\",le=\"2500\"}": 150,
  "afterlight_room_join_latency_bucket{room=\"market\",le=\"5000\"}": 150,
  "afterlight_room_join_latency_bucket{room=\"market\",le=\"10000\"}": 150,
  "afterlight_room_join_latency_bucket{room=\"market\",le=\"+Inf\"}": 150,
  "afterlight_room_join_latency_sum{room=\"market\"}": 0.00045299999999999984,
  "afterlight_room_join_latency_count{room=\"market\"}": 150,
  "afterlight_room_join_latency_bucket{room=\"theater\",le=\"1\"}": 16,
  "afterlight_room_join_latency_bucket{room=\"theater\",le=\"5\"}": 16,
  "afterlight_room_join_latency_bucket{room=\"theater\",le=\"10\"}": 16,
  "afterlight_room_join_latency_bucket{room=\"theater\",le=\"25\"}": 16,
  "afterlight_room_join_latency_bucket{room=\"theater\",le=\"50\"}": 16,
  "afterlight_room_join_latency_bucket{room=\"theater\",le=\"100\"}": 16,
  "afterlight_room_join_latency_bucket{room=\"theater\",le=\"250\"}": 16,
  "afterlight_room_join_latency_bucket{room=\"theater\",le=\"500\"}": 16,
  "afterlight_room_join_latency_bucket{room=\"theater\",le=\"1000\"}": 16,
  "afterlight_room_join_latency_bucket{room=\"theater\",le=\"2500\"}": 16,
  "afterlight_room_join_latency_bucket{room=\"theater\",le=\"5000\"}": 16,
  "afterlight_room_join_latency_bucket{room=\"theater\",le=\"10000\"}": 16,
  "afterlight_room_join_latency_bucket{room=\"theater\",le=\"+Inf\"}": 16,
  "afterlight_room_join_latency_sum{room=\"theater\"}": 0.000088,
  "afterlight_room_join_latency_count{room=\"theater\"}": 16,
  "afterlight_movement_coalesced_count{room=\"theater\"}": 7,
  "afterlight_movement_coalesced_count{room=\"market\"}": 69,
  "afterlight_room_tick_duration_bucket{room=\"theater\",le=\"1\"}": 7,
  "afterlight_room_tick_duration_bucket{room=\"theater\",le=\"5\"}": 7,
  "afterlight_room_tick_duration_bucket{room=\"theater\",le=\"10\"}": 7,
  "afterlight_room_tick_duration_bucket{room=\"theater\",le=\"25\"}": 7,
  "afterlight_room_tick_duration_bucket{room=\"theater\",le=\"50\"}": 7,
  "afterlight_room_tick_duration_bucket{room=\"theater\",le=\"100\"}": 7,
  "afterlight_room_tick_duration_bucket{room=\"theater\",le=\"250\"}": 7,
  "afterlight_room_tick_duration_bucket{room=\"theater\",le=\"500\"}": 7,
  "afterlight_room_tick_duration_bucket{room=\"theater\",le=\"1000\"}": 7,
  "afterlight_room_tick_duration_bucket{room=\"theater\",le=\"2500\"}": 7,
  "afterlight_room_tick_duration_bucket{room=\"theater\",le=\"5000\"}": 7,
  "afterlight_room_tick_duration_bucket{room=\"theater\",le=\"10000\"}": 7,
  "afterlight_room_tick_duration_bucket{room=\"theater\",le=\"+Inf\"}": 7,
  "afterlight_room_tick_duration_sum{room=\"theater\"}": 0.000003,
  "afterlight_room_tick_duration_count{room=\"theater\"}": 7,
  "afterlight_room_tick_duration_bucket{room=\"market\",le=\"1\"}": 69,
  "afterlight_room_tick_duration_bucket{room=\"market\",le=\"5\"}": 69,
  "afterlight_room_tick_duration_bucket{room=\"market\",le=\"10\"}": 69,
  "afterlight_room_tick_duration_bucket{room=\"market\",le=\"25\"}": 69,
  "afterlight_room_tick_duration_bucket{room=\"market\",le=\"50\"}": 69,
  "afterlight_room_tick_duration_bucket{room=\"market\",le=\"100\"}": 69,
  "afterlight_room_tick_duration_bucket{room=\"market\",le=\"250\"}": 69,
  "afterlight_room_tick_duration_bucket{room=\"market\",le=\"500\"}": 69,
  "afterlight_room_tick_duration_bucket{room=\"market\",le=\"1000\"}": 69,
  "afterlight_room_tick_duration_bucket{room=\"market\",le=\"2500\"}": 69,
  "afterlight_room_tick_duration_bucket{room=\"market\",le=\"5000\"}": 69,
  "afterlight_room_tick_duration_bucket{room=\"market\",le=\"10000\"}": 69,
  "afterlight_room_tick_duration_bucket{room=\"market\",le=\"+Inf\"}": 69,
  "afterlight_room_tick_duration_sum{room=\"market\"}": 0.00012900000000000002,
  "afterlight_room_tick_duration_count{room=\"market\"}": 69,
  "afterlight_room_mailbox_depth{room=\"market\"}": 0,
  "afterlight_room_mailbox_depth{room=\"theater\"}": 0,
  "afterlight_room_roster_size{room=\"market\"}": 97,
  "afterlight_room_roster_size{room=\"theater\"}": 2,
  "afterlight_room_count": 2,
  "afterlight_gateway_sockets_connected": 100,
  "vm_total_run_queue_lengths_io": 0,
  "vm_total_run_queue_lengths_cpu": 0,
  "vm_total_run_queue_lengths_total": 0,
  "vm_memory_total": 368.181,
  "afterlight_repo_query_idle_time_bucket{le=\"1\"}": 884,
  "afterlight_repo_query_idle_time_bucket{le=\"5\"}": 6350,
  "afterlight_repo_query_idle_time_bucket{le=\"10\"}": 7249,
  "afterlight_repo_query_idle_time_bucket{le=\"25\"}": 8593,
  "afterlight_repo_query_idle_time_bucket{le=\"50\"}": 9375,
  "afterlight_repo_query_idle_time_bucket{le=\"100\"}": 10607,
  "afterlight_repo_query_idle_time_bucket{le=\"250\"}": 11054,
  "afterlight_repo_query_idle_time_bucket{le=\"500\"}": 11184,
  "afterlight_repo_query_idle_time_bucket{le=\"1000\"}": 11486,
  "afterlight_repo_query_idle_time_bucket{le=\"2500\"}": 11496,
  "afterlight_repo_query_idle_time_bucket{le=\"5000\"}": 11496,
  "afterlight_repo_query_idle_time_bucket{le=\"10000\"}": 11496,
  "afterlight_repo_query_idle_time_bucket{le=\"+Inf\"}": 11496,
  "afterlight_repo_query_idle_time_sum": 522655.48314599996,
  "afterlight_repo_query_idle_time_count": 11496,
  "afterlight_repo_query_queue_time_bucket{le=\"1\"}": 11485,
  "afterlight_repo_query_queue_time_bucket{le=\"5\"}": 11499,
  "afterlight_repo_query_queue_time_bucket{le=\"10\"}": 11502,
  "afterlight_repo_query_queue_time_bucket{le=\"25\"}": 11502,
  "afterlight_repo_query_queue_time_bucket{le=\"50\"}": 11502,
  "afterlight_repo_query_queue_time_bucket{le=\"100\"}": 11502,
  "afterlight_repo_query_queue_time_bucket{le=\"250\"}": 11502,
  "afterlight_repo_query_queue_time_bucket{le=\"500\"}": 11502,
  "afterlight_repo_query_queue_time_bucket{le=\"1000\"}": 11502,
  "afterlight_repo_query_queue_time_bucket{le=\"2500\"}": 11502,
  "afterlight_repo_query_queue_time_bucket{le=\"5000\"}": 11502,
  "afterlight_repo_query_queue_time_bucket{le=\"10000\"}": 11502,
  "afterlight_repo_query_queue_time_bucket{le=\"+Inf\"}": 11502,
  "afterlight_repo_query_queue_time_sum": 317.3297869999998,
  "afterlight_repo_query_queue_time_count": 11502,
  "afterlight_repo_query_query_time_bucket{le=\"1\"}": 12416,
  "afterlight_repo_query_query_time_bucket{le=\"5\"}": 13831,
  "afterlight_repo_query_query_time_bucket{le=\"10\"}": 13882,
  "afterlight_repo_query_query_time_bucket{le=\"25\"}": 13902,
  "afterlight_repo_query_query_time_bucket{le=\"50\"}": 13923,
  "afterlight_repo_query_query_time_bucket{le=\"100\"}": 14068,
  "afterlight_repo_query_query_time_bucket{le=\"250\"}": 14073,
  "afterlight_repo_query_query_time_bucket{le=\"500\"}": 14074,
  "afterlight_repo_query_query_time_bucket{le=\"1000\"}": 14074,
  "afterlight_repo_query_query_time_bucket{le=\"2500\"}": 14074,
  "afterlight_repo_query_query_time_bucket{le=\"5000\"}": 14074,
  "afterlight_repo_query_query_time_bucket{le=\"10000\"}": 14074,
  "afterlight_repo_query_query_time_bucket{le=\"+Inf\"}": 14074,
  "afterlight_repo_query_query_time_sum": 15589.913767000002,
  "afterlight_repo_query_query_time_count": 14074,
  "afterlight_repo_query_decode_time_bucket{le=\"1\"}": 12703,
  "afterlight_repo_query_decode_time_bucket{le=\"5\"}": 12704,
  "afterlight_repo_query_decode_time_bucket{le=\"10\"}": 12704,
  "afterlight_repo_query_decode_time_bucket{le=\"25\"}": 12704,
  "afterlight_repo_query_decode_time_bucket{le=\"50\"}": 12704,
  "afterlight_repo_query_decode_time_bucket{le=\"100\"}": 12704,
  "afterlight_repo_query_decode_time_bucket{le=\"250\"}": 12704,
  "afterlight_repo_query_decode_time_bucket{le=\"500\"}": 12704,
  "afterlight_repo_query_decode_time_bucket{le=\"1000\"}": 12704,
  "afterlight_repo_query_decode_time_bucket{le=\"2500\"}": 12704,
  "afterlight_repo_query_decode_time_bucket{le=\"5000\"}": 12704,
  "afterlight_repo_query_decode_time_bucket{le=\"10000\"}": 12704,
  "afterlight_repo_query_decode_time_bucket{le=\"+Inf\"}": 12704,
  "afterlight_repo_query_decode_time_sum": 16.10084800000001,
  "afterlight_repo_query_decode_time_count": 12704,
  "afterlight_repo_query_total_time_bucket{le=\"1\"}": 12410,
  "afterlight_repo_query_total_time_bucket{le=\"5\"}": 13852,
  "afterlight_repo_query_total_time_bucket{le=\"10\"}": 13903,
  "afterlight_repo_query_total_time_bucket{le=\"25\"}": 13928,
  "afterlight_repo_query_total_time_bucket{le=\"50\"}": 13948,
  "afterlight_repo_query_total_time_bucket{le=\"100\"}": 14094,
  "afterlight_repo_query_total_time_bucket{le=\"250\"}": 14099,
  "afterlight_repo_query_total_time_bucket{le=\"500\"}": 14100,
  "afterlight_repo_query_total_time_bucket{le=\"1000\"}": 14100,
  "afterlight_repo_query_total_time_bucket{le=\"2500\"}": 14100,
  "afterlight_repo_query_total_time_bucket{le=\"5000\"}": 14100,
  "afterlight_repo_query_total_time_bucket{le=\"10000\"}": 14100,
  "afterlight_repo_query_total_time_bucket{le=\"+Inf\"}": 14100,
  "afterlight_repo_query_total_time_sum": 15963.285805000001,
  "afterlight_repo_query_total_time_count": 14100,
  "phoenix_channel_handled_in_duration_bucket{event=\"join_room\",le=\"1\"}": 0,
  "phoenix_channel_handled_in_duration_bucket{event=\"join_room\",le=\"5\"}": 140,
  "phoenix_channel_handled_in_duration_bucket{event=\"join_room\",le=\"10\"}": 149,
  "phoenix_channel_handled_in_duration_bucket{event=\"join_room\",le=\"25\"}": 150,
  "phoenix_channel_handled_in_duration_bucket{event=\"join_room\",le=\"50\"}": 150,
  "phoenix_channel_handled_in_duration_bucket{event=\"join_room\",le=\"100\"}": 164,
  "phoenix_channel_handled_in_duration_bucket{event=\"join_room\",le=\"250\"}": 164,
  "phoenix_channel_handled_in_duration_bucket{event=\"join_room\",le=\"500\"}": 166,
  "phoenix_channel_handled_in_duration_bucket{event=\"join_room\",le=\"1000\"}": 166,
  "phoenix_channel_handled_in_duration_bucket{event=\"join_room\",le=\"2500\"}": 166,
  "phoenix_channel_handled_in_duration_bucket{event=\"join_room\",le=\"5000\"}": 166,
  "phoenix_channel_handled_in_duration_bucket{event=\"join_room\",le=\"10000\"}": 166,
  "phoenix_channel_handled_in_duration_bucket{event=\"join_room\",le=\"+Inf\"}": 166,
  "phoenix_channel_handled_in_duration_sum{event=\"join_room\"}": 1981.78885,
  "phoenix_channel_handled_in_duration_count{event=\"join_room\"}": 166,
  "phoenix_channel_handled_in_duration_bucket{event=\"hello\",le=\"1\"}": 0,
  "phoenix_channel_handled_in_duration_bucket{event=\"hello\",le=\"5\"}": 0,
  "phoenix_channel_handled_in_duration_bucket{event=\"hello\",le=\"10\"}": 0,
  "phoenix_channel_handled_in_duration_bucket{event=\"hello\",le=\"25\"}": 0,
  "phoenix_channel_handled_in_duration_bucket{event=\"hello\",le=\"50\"}": 0,
  "phoenix_channel_handled_in_duration_bucket{event=\"hello\",le=\"100\"}": 147,
  "phoenix_channel_handled_in_duration_bucket{event=\"hello\",le=\"250\"}": 156,
  "phoenix_channel_handled_in_duration_bucket{event=\"hello\",le=\"500\"}": 156,
  "phoenix_channel_handled_in_duration_bucket{event=\"hello\",le=\"1000\"}": 156,
  "phoenix_channel_handled_in_duration_bucket{event=\"hello\",le=\"2500\"}": 156,
  "phoenix_channel_handled_in_duration_bucket{event=\"hello\",le=\"5000\"}": 156,
  "phoenix_channel_handled_in_duration_bucket{event=\"hello\",le=\"10000\"}": 156,
  "phoenix_channel_handled_in_duration_bucket{event=\"hello\",le=\"+Inf\"}": 156,
  "phoenix_channel_handled_in_duration_sum{event=\"hello\"}": 12413.982001000002,
  "phoenix_channel_handled_in_duration_count{event=\"hello\"}": 156,
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
  "phoenix_channel_handled_in_duration_bucket{event=\"movement\",le=\"1\"}": 2407,
  "phoenix_channel_handled_in_duration_bucket{event=\"movement\",le=\"5\"}": 2407,
  "phoenix_channel_handled_in_duration_bucket{event=\"movement\",le=\"10\"}": 2407,
  "phoenix_channel_handled_in_duration_bucket{event=\"movement\",le=\"25\"}": 2407,
  "phoenix_channel_handled_in_duration_bucket{event=\"movement\",le=\"50\"}": 2407,
  "phoenix_channel_handled_in_duration_bucket{event=\"movement\",le=\"100\"}": 2407,
  "phoenix_channel_handled_in_duration_bucket{event=\"movement\",le=\"250\"}": 2407,
  "phoenix_channel_handled_in_duration_bucket{event=\"movement\",le=\"500\"}": 2407,
  "phoenix_channel_handled_in_duration_bucket{event=\"movement\",le=\"1000\"}": 2407,
  "phoenix_channel_handled_in_duration_bucket{event=\"movement\",le=\"2500\"}": 2407,
  "phoenix_channel_handled_in_duration_bucket{event=\"movement\",le=\"5000\"}": 2407,
  "phoenix_channel_handled_in_duration_bucket{event=\"movement\",le=\"10000\"}": 2407,
  "phoenix_channel_handled_in_duration_bucket{event=\"movement\",le=\"+Inf\"}": 2407,
  "phoenix_channel_handled_in_duration_sum{event=\"movement\"}": 31.118182000000008,
  "phoenix_channel_handled_in_duration_count{event=\"movement\"}": 2407,
  "phoenix_channel_joined_duration_bucket{le=\"1\"}": 156,
  "phoenix_channel_joined_duration_bucket{le=\"5\"}": 156,
  "phoenix_channel_joined_duration_bucket{le=\"10\"}": 156,
  "phoenix_channel_joined_duration_bucket{le=\"25\"}": 156,
  "phoenix_channel_joined_duration_bucket{le=\"50\"}": 156,
  "phoenix_channel_joined_duration_bucket{le=\"100\"}": 156,
  "phoenix_channel_joined_duration_bucket{le=\"250\"}": 156,
  "phoenix_channel_joined_duration_bucket{le=\"500\"}": 156,
  "phoenix_channel_joined_duration_bucket{le=\"1000\"}": 156,
  "phoenix_channel_joined_duration_bucket{le=\"2500\"}": 156,
  "phoenix_channel_joined_duration_bucket{le=\"5000\"}": 156,
  "phoenix_channel_joined_duration_bucket{le=\"10000\"}": 156,
  "phoenix_channel_joined_duration_bucket{le=\"+Inf\"}": 156,
  "phoenix_channel_joined_duration_sum": 25.132443000000002,
  "phoenix_channel_joined_duration_count": 156,
  "phoenix_socket_connected_duration_bucket{le=\"1\"}": 0,
  "phoenix_socket_connected_duration_bucket{le=\"5\"}": 0,
  "phoenix_socket_connected_duration_bucket{le=\"10\"}": 135,
  "phoenix_socket_connected_duration_bucket{le=\"25\"}": 150,
  "phoenix_socket_connected_duration_bucket{le=\"50\"}": 154,
  "phoenix_socket_connected_duration_bucket{le=\"100\"}": 156,
  "phoenix_socket_connected_duration_bucket{le=\"250\"}": 156,
  "phoenix_socket_connected_duration_bucket{le=\"500\"}": 156,
  "phoenix_socket_connected_duration_bucket{le=\"1000\"}": 156,
  "phoenix_socket_connected_duration_bucket{le=\"2500\"}": 156,
  "phoenix_socket_connected_duration_bucket{le=\"5000\"}": 156,
  "phoenix_socket_connected_duration_bucket{le=\"10000\"}": 156,
  "phoenix_socket_connected_duration_bucket{le=\"+Inf\"}": 156,
  "phoenix_socket_connected_duration_sum": 1578.606424,
  "phoenix_socket_connected_duration_count": 156,
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
  "phoenix_router_dispatch_stop_duration_bucket{route=\"/api/auth/guest\",le=\"1\"}": 155,
  "phoenix_router_dispatch_stop_duration_bucket{route=\"/api/auth/guest\",le=\"5\"}": 157,
  "phoenix_router_dispatch_stop_duration_bucket{route=\"/api/auth/guest\",le=\"10\"}": 157,
  "phoenix_router_dispatch_stop_duration_bucket{route=\"/api/auth/guest\",le=\"25\"}": 157,
  "phoenix_router_dispatch_stop_duration_bucket{route=\"/api/auth/guest\",le=\"50\"}": 157,
  "phoenix_router_dispatch_stop_duration_bucket{route=\"/api/auth/guest\",le=\"100\"}": 157,
  "phoenix_router_dispatch_stop_duration_bucket{route=\"/api/auth/guest\",le=\"250\"}": 157,
  "phoenix_router_dispatch_stop_duration_bucket{route=\"/api/auth/guest\",le=\"500\"}": 157,
  "phoenix_router_dispatch_stop_duration_bucket{route=\"/api/auth/guest\",le=\"1000\"}": 157,
  "phoenix_router_dispatch_stop_duration_bucket{route=\"/api/auth/guest\",le=\"2500\"}": 157,
  "phoenix_router_dispatch_stop_duration_bucket{route=\"/api/auth/guest\",le=\"5000\"}": 157,
  "phoenix_router_dispatch_stop_duration_bucket{route=\"/api/auth/guest\",le=\"10000\"}": 157,
  "phoenix_router_dispatch_stop_duration_bucket{route=\"/api/auth/guest\",le=\"+Inf\"}": 157,
  "phoenix_router_dispatch_stop_duration_sum{route=\"/api/auth/guest\"}": 52.646319999999974,
  "phoenix_router_dispatch_stop_duration_count{route=\"/api/auth/guest\"}": 157
}
```

## Acceptance targets

| Target | Threshold | Measured | Status |
| --- | --- | --- | --- |
| Room tick lag (client consume) | p99 < 50 ms | 113 ms | MISS |
| Durable ack (same-region) | p95 < 250 ms | — ms | NOT EVALUATED |
| Mailbox/memory monotonic growth | none over soak | no monotonic growth observed | PASS |
| Zero duplicated economic effects | 0 duplicates | 0 duplicates | PASS |
