#!/usr/bin/env bash
# Boot the Elixir gateway dev stack: Node shadow (:3001) + Phoenix (:4000) + Vite (:5173).
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

echo "→ Node shadow server (port 3001)…"
npm run server &
NODE_PID=$!

echo "→ Phoenix gateway (port 4000)…"
(
  cd server_elixir
  export PHX_SERVER=true
  export PORT=4000
  export AFTERLIGHT_WORLD_OWNER=phoenix
  export AFTERLIGHT_CHAT_OWNER=phoenix
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
