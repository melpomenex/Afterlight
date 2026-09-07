# Dev-specific compile-time overrides. Runtime env reads (gateway URLs,
# secrets, ports) live in runtime.exs.
import Config

# P3 world flip (add-world-room-runtime task 5.1): in dev the world domain
# is routed to the room runtime. `Afterlight.Gateway.config(:routing)` reads
# the routing map as a WHOLE (no per-key merge), so this mirrors the
# config.exs base map with the three world rows flipped to :phoenix —
# `join_room`, `movement`, `emote` are answered by `Afterlight.World` and
# the gateway suppresses Node-emitted `presence_*` frames (design D6).
#
# ROLLBACK / flip-back: set the same three rows back to :node (here or in
# config.exs). That is a pure transport rollback — no durable state moves in
# either direction, transient poses reset (the same reset as a Node restart
# today), and presence suppression toggles off with the SAME row because
# both are keyed on the `join_room` routing entry (design D6/D7). Weather is
# unaffected by either direction: it was never suppressed — Node stays the
# weather writer until the P6 group flip.
config :afterlight, :gateway,
  routing: %{
    "ping" => :terminate_pong,
    "join_room" => :phoenix,
    "movement" => :phoenix,
    "emote" => :phoenix,
    "chat_send" => :phoenix
  }
