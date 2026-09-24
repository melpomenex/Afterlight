#!/usr/bin/env bash
# Remote deploy for Afterlight (Phoenix + Node sidecar + Postgres) on remote host.
#
# Usage (from repo root):
#   AFTERLIGHT_DEPLOY_HOST=user@host bash deploy/remote-deploy.sh
#
# Configuration via environment variables:
#   AFTERLIGHT_DEPLOY_HOST=user@host     # Deployment SSH target (e.g. user@example.com)
#   DEPLOY_HOST=user@host                # Fallback alias for AFTERLIGHT_DEPLOY_HOST
#   AFTERLIGHT_DEPLOY_USER=user          # User on deployment host (default: parsed from HOST)
#   DEPLOY_PASS='…'                      # Optional password auth via sshpass (omit when SSH key works)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOST="${AFTERLIGHT_DEPLOY_HOST:-${DEPLOY_HOST:-}}"

if [[ -z "$HOST" ]]; then
  echo "error: AFTERLIGHT_DEPLOY_HOST (or DEPLOY_HOST) must be set (e.g. export AFTERLIGHT_DEPLOY_HOST=user@deploy-host)" >&2
  exit 1
fi

REMOTE_DIR=/opt/afterlight/game
REMOTE_USER="${AFTERLIGHT_DEPLOY_USER:-${HOST%%@*}}"

run_ssh() {
  if [[ -n "${DEPLOY_PASS:-}" ]]; then
    sshpass -p "$DEPLOY_PASS" ssh -o StrictHostKeyChecking=no "$HOST" "$@"
  else
    ssh -o BatchMode=yes "$HOST" "$@"
  fi
}

run_rsync() {
  local -a rsync_args=(-az --delete
    --exclude node_modules --exclude server_elixir/deps --exclude server_elixir/_build
    --exclude .git --exclude dist --exclude benchmarks --exclude serviceradar
    # deploy/.env exists only on the VM (gitignored secrets). Without this
    # exclude, --delete removes it EVERY deploy, the env-regen step mints a
    # fresh POSTGRES_PASSWORD (and rotates SECRET_KEY_BASE etc.), and the
    # stack runs with a broken DB until the ALTER USER heal lands — the
    # recurring invalid_password storm that killed activity sessions
    # mid-join. Preserve it: AGENTS.md "do not delete or overwrite
    # deploy/.env on the VM".
    --exclude deploy/.env --exclude .env --exclude .env.production
    "$ROOT/" "$HOST:$REMOTE_DIR/")
  if [[ -n "${DEPLOY_PASS:-}" ]]; then
    sshpass -p "$DEPLOY_PASS" rsync "${rsync_args[@]}"
  else
    rsync "${rsync_args[@]}"
  fi
}

sudo_remote() {
  if [[ -n "${DEPLOY_PASS:-}" ]]; then
    run_ssh "echo '$DEPLOY_PASS' | sudo -S $*"
  else
    run_ssh "sudo $*"
  fi
}

echo "→ Syncing repo to $HOST:$REMOTE_DIR"
run_ssh "mkdir -p $REMOTE_DIR"
sudo_remote "mkdir -p /opt/afterlight && chown -R ${REMOTE_USER}:${REMOTE_USER} /opt/afterlight"
run_rsync

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
# Postgres data volume keeps the init password; resync when the container is recreated.
PW=$(grep ^POSTGRES_PASSWORD= .env | cut -d= -f2-)
docker compose --env-file .env exec -T postgres psql -U afterlight -d afterlight_prod -c "ALTER USER afterlight WITH PASSWORD '$PW';" 2>/dev/null || true
docker compose --env-file .env restart phoenix 2>/dev/null || true
sleep 8
docker compose --env-file .env ps
REMOTE

echo "→ Tailscale funnel (public HTTPS/WSS)"
FUNNEL_URL=$(run_ssh bash <<'REMOTE'
set -euo pipefail
sudo tailscale funnel reset 2>/dev/null || true
sudo tailscale funnel --bg --https=443 http://127.0.0.1:4000 >/dev/null 2>&1 || sudo tailscale funnel --bg 4000 >/dev/null 2>&1 || true
DNS=$(tailscale status --json | python3 -c "import sys,json; print(json.load(sys.stdin).get('Self',{}).get('DNSName','').rstrip('.'))")
echo "https://$DNS"
REMOTE
)

echo ""
echo "Backend URL: $FUNNEL_URL"
echo "VITE_WS_URL=${FUNNEL_URL/https:\/\//wss:\/\/}/ws"
echo ""
echo "Deploy frontend: bash deploy/vercel-deploy.sh"
