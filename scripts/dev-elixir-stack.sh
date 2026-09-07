#!/usr/bin/env bash
# Boot the post-P11 dev stack: Node specialty sidecar (:3001) + Phoenix gateway (:4000) + Vite (:5173).
# Node is NOT game authority — it serves torrent/IRC HTTP, theater uploads, and transitional WS relay
# for domains not yet handled in Phoenix (see Gateway.Router @node_relay_types).
# Requires: npm deps, mix deps, Postgres on localhost:5433 (see server_elixir/README.md).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -f "$HOME/.local/afterlight-beam/env.sh" ]]; then
  # shellcheck source=/dev/null
  source "$HOME/.local/afterlight-beam/env.sh"
fi

cleanup() {
  trap - EXIT INT TERM
  [[ -n "${NODE_PID:-}" ]] && kill "$NODE_PID" 2>/dev/null || true
  [[ -n "${PHX_PID:-}" ]] && kill "$PHX_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "→ Node specialty sidecar (port 3001 — torrent/IRC HTTP + transitional relay)…"
export AFTERLIGHT_NODE_DURABLE_READ_ONLY=1
npm run server &
NODE_PID=$!

echo "→ Phoenix gateway (port 4000)…"
(
  cd server_elixir
  export PHX_SERVER=true
  export PORT=4000
  export AFTERLIGHT_WORLD_OWNER=phoenix
  export AFTERLIGHT_CHAT_OWNER=phoenix
  export AFTERLIGHT_THEATER_OWNER=phoenix
  export AFTERLIGHT_CATALOG_OWNER=phoenix
  export AFTERLIGHT_ECONOMY_OWNER=phoenix
  export AFTERLIGHT_HELLO_OWNER=phoenix
  mix phx.server
) &
PHX_PID=$!

echo "→ Waiting for listeners…"
for i in $(seq 1 60); do
  if curl -sf "http://127.0.0.1:3001/api/health" >/dev/null \
    && curl -sf "http://127.0.0.1:4000/health" >/dev/null 2>&1; then
    break
  fi
  sleep 0.5
done

echo "→ Vite client (Phoenix transport via .env.development)…"
echo "   Open http://localhost:5173 — gateway ws://localhost:4000/ws"
npm run dev:phoenix
