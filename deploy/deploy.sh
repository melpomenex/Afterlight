#!/usr/bin/env bash
# Full production deploy: backend (remote VM) then frontend (Vercel).
# Usage (from repo root): bash deploy/deploy.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== Afterlight production deploy ==="
bash deploy/remote-deploy.sh
bash deploy/vercel-deploy.sh
echo "=== Deploy complete ==="
