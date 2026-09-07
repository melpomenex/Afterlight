#!/usr/bin/env bash
# Remote deploy for Afterlight (Phoenix + Node sidecar + Postgres) on remote VM.
# Usage (from repo root):
#   DEPLOY_PASS='…' bash deploy/remote-deploy.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOST="${DEPLOY_HOST:-<DEPLOY_USER>@<DEPLOY_HOST>}"
PASS="${DEPLOY_PASS:?Set DEPLOY_PASS}"
REMOTE_DIR=/opt/afterlight/game

run_ssh() {
  sshpass -p "$PASS" ssh -o StrictHostKeyChecking=no "$HOST" "$@"
}

echo "→ Syncing repo to $HOST:$REMOTE_DIR"
run_ssh "echo '$PASS' | sudo -S mkdir -p $REMOTE_DIR && sudo chown -R <DEPLOY_USER>:<DEPLOY_USER> /opt/afterlight"
sshpass -p "$PASS" rsync -az --delete \
  --exclude node_modules --exclude server_elixir/deps --exclude server_elixir/_build \
  --exclude .git --exclude dist --exclude benchmarks --exclude serviceradar \
  "$ROOT/" "$HOST:$REMOTE_DIR/"

echo "→ Writing production env (if missing)"
run_ssh bash <<'REMOTE'
set -euo pipefail
cd /opt/afterlight/game/deploy
if [[ ! -f .env ]]; then
  POSTGRES_PASSWORD=$(openssl rand -hex 16)
  SECRET_KEY_BASE=$(openssl rand -hex 32)
  AFTERLIGHT_TOKEN_SECRET=$(openssl rand -hex 32)
  AFTERLIGHT_BOUNDARY_SECRET=$(openssl rand -hex 24)
  cat > .env <<EOF
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
SECRET_KEY_BASE=$SECRET_KEY_BASE
AFTERLIGHT_TOKEN_SECRET=$AFTERLIGHT_TOKEN_SECRET
AFTERLIGHT_BOUNDARY_SECRET=$AFTERLIGHT_BOUNDARY_SECRET
EOF
  chmod 600 .env
fi
REMOTE

echo "→ Building and starting stack"
run_ssh bash <<'REMOTE'
set -euo pipefail
cd /opt/afterlight/game/deploy
docker compose --env-file .env build
docker compose --env-file .env up -d
sleep 12
docker compose --env-file .env ps
REMOTE

echo "→ Tailscale funnel (public HTTPS/WSS)"
FUNNEL_URL=$(run_ssh bash <<REMOTE
set -euo pipefail
echo '$PASS' | sudo -S tailscale funnel reset 2>/dev/null || true
echo '$PASS' | sudo -S tailscale funnel --bg --https=443 http://127.0.0.1:4000 2>/dev/null || echo '$PASS' | sudo -S tailscale funnel --bg 4000
DNS=\$(tailscale status --json | python3 -c "import sys,json; print(json.load(sys.stdin).get('Self',{}).get('DNSName','').rstrip('.'))")
echo "https://\$DNS"
REMOTE
)

echo "Backend URL: $FUNNEL_URL"
echo "Set VITE_WS_URL=${FUNNEL_URL/https:\/\//wss:}/ws for Vercel production."
