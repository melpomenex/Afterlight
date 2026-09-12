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

# Browser-origin handshake smoke (fix-theater-streaming-after-elixir-cutover
# D1): when the gateway rejects the Vite origin, the game presents as an
# endless "reconnecting" loop and the theater never streams. Fail the boot
# loudly here instead. PHX_CHECK_ORIGIN=false skips the check by design.
if [[ "${PHX_CHECK_ORIGIN:-}" != "false" ]]; then
  echo "→ Smoke check: WebSocket upgrade from the Vite dev origin…"
  SMOKE_ORIGIN="http://localhost:5173"
  SMOKE_TOKEN="$(curl -sf -m 10 -X POST "http://127.0.0.1:4000/api/auth/guest" \
    -H "Content-Type: application/json" -H "Origin: $SMOKE_ORIGIN" \
    -d '{"guestId":"stack-smoke","nickname":"StackSmoke"}' \
    | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{console.log(JSON.parse(d).token||'')}catch{console.log('')}})" || true)"
  if [[ -z "$SMOKE_TOKEN" ]]; then
    echo "✗ Guest auth through the gateway failed — check the Phoenix log. Aborting before Vite starts."
    exit 1
  fi
  SMOKE_CODE="$(curl -s -o /dev/null --http1.1 -m 8 -w "%{http_code}" \
    "http://127.0.0.1:4000/ws/websocket?vsn=2.0.0&token=$SMOKE_TOKEN" \
    -H "Connection: Upgrade" -H "Upgrade: websocket" \
    -H "Sec-WebSocket-Key: c3RhY2stc21va2UtaGFuZHNob3c=" -H "Sec-WebSocket-Version: 13" \
    -H "Origin: $SMOKE_ORIGIN" || true)"
  if [[ "$SMOKE_CODE" != "101" ]]; then
    echo "✗ WebSocket upgrade from $SMOKE_ORIGIN answered HTTP $SMOKE_CODE (want 101)."
    echo "  The gateway's check_origin list does not include the dev client origin —"
    echo "  see AfterlightWeb.OriginConfig / PHX_CHECK_ORIGIN in server_elixir/config/runtime.exs."
    exit 1
  fi
  echo "   ✓ $SMOKE_ORIGIN upgrades to the gateway (101)"
fi

echo "→ Vite client (Phoenix transport via .env.development)…"
echo "   Open http://localhost:5173 — gateway ws://localhost:4000/ws"
npm run dev:phoenix
