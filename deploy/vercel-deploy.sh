#!/usr/bin/env bash
# Production frontend deploy to Vercel (project: afterlight).
#
# Usage (from repo root):
#   bash deploy/vercel-deploy.sh
#
# Optional overrides:
#   BACKEND_URL=https://….ts.net   # auto-detected from remote VM when omitted
#   VERCEL_PROJECT=afterlight      # default
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

HOST="${DEPLOY_HOST:-<DEPLOY_USER>@<DEPLOY_HOST>}"
PROJECT="${VERCEL_PROJECT:-afterlight}"

if [[ -z "${BACKEND_URL:-}" ]]; then
  echo "→ Reading backend URL from $HOST"
  BACKEND_URL=$(ssh -o BatchMode=yes "$HOST" \
    "tailscale status --json | python3 -c \"import sys,json; print('https://' + json.load(sys.stdin).get('Self',{}).get('DNSName','').rstrip('.'))\"")
fi

if [[ -z "$BACKEND_URL" || "$BACKEND_URL" == "https://" ]]; then
  echo "error: could not determine BACKEND_URL; set it explicitly" >&2
  exit 1
fi

WS_URL="${BACKEND_URL/https:\/\//wss:\/\/}/ws"
echo "→ Backend: $BACKEND_URL"
echo "→ VITE_WS_URL=$WS_URL"
echo "→ VITE_TRANSPORT=phoenix"

npx vercel deploy --prod --yes \
  --build-env "VITE_WS_URL=$WS_URL" \
  --build-env "VITE_TRANSPORT=phoenix" \
  --scope <VERCEL_SCOPE> \
  --project "$PROJECT"
