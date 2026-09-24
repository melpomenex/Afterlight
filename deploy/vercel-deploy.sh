#!/usr/bin/env bash
# Production frontend deploy to Vercel (project: afterlight).
#
# Usage (from repo root):
#   bash deploy/vercel-deploy.sh
#
# Optional overrides:
#   BACKEND_URL=https://<DEPLOY_HOST>   # auto-detected via SSH when omitted
#   AFTERLIGHT_DEPLOY_HOST=user@host     # remote host to query backend URL from
#   VERCEL_PROJECT=afterlight            # default
#   VERCEL_SCOPE='…'                     # optional Vercel team/user scope
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

HOST="${AFTERLIGHT_DEPLOY_HOST:-${DEPLOY_HOST:-}}"
PROJECT="${VERCEL_PROJECT:-afterlight}"
SCOPE="${VERCEL_SCOPE:-}"

if [[ -z "${BACKEND_URL:-}" ]]; then
  if [[ -z "$HOST" ]]; then
    echo "error: BACKEND_URL (e.g. https://backend.example.com) or AFTERLIGHT_DEPLOY_HOST must be set" >&2
    exit 1
  fi
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

EXTRA_ARGS=()
if [[ -n "$SCOPE" ]]; then
  EXTRA_ARGS+=(--scope "$SCOPE")
fi

npx vercel deploy --prod --yes \
  --build-env "VITE_WS_URL=$WS_URL" \
  --build-env "VITE_TRANSPORT=phoenix" \
  "${EXTRA_ARGS[@]}" \
  --project "$PROJECT"
