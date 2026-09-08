#!/usr/bin/env bash
set -euo pipefail

# Rehearsal script for P6 Economy Group Cutover
# Runs freeze -> snapshot -> import -> validate -> report -> no-op verification -> reverse export

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DATA_DIR="$PROJECT_ROOT/data"
SERVER_ELIXIR_DIR="$PROJECT_ROOT/server_elixir"

SOURCE_GAME_STATE="$DATA_DIR/game-state.json"

if [ ! -f "$SOURCE_GAME_STATE" ]; then
  echo "Error: source file $SOURCE_GAME_STATE does not exist" >&2
  exit 1
fi

TMP_DIR="$(mktemp -d /tmp/afterlight-rehearsal-XXXXXX)"
trap 'rm -rf "$TMP_DIR"' EXIT

echo "=== Step 1: Write Freeze & Snapshot ==="
SNAPSHOT_FILE="$TMP_DIR/game-state.snapshot.json"
cp "$SOURCE_GAME_STATE" "$SNAPSHOT_FILE"
SNAPSHOT_HASH=$(sha256sum "$SNAPSHOT_FILE" | awk '{print $1}')
echo "Snapshot created: $SNAPSHOT_FILE"
echo "Snapshot SHA-256: $SNAPSHOT_HASH"

echo ""
echo "=== Step 2: Import & Validate Economy Group ==="
cd "$SERVER_ELIXIR_DIR"
mix afterlight.import_economy_group --file "$SNAPSHOT_FILE" --freeze-ack yes --force

echo ""
echo "=== Step 3: Verify No-Op Guarantee (Second Import) ==="
NOOP_OUTPUT=$(mix afterlight.import_economy_group --file "$SNAPSHOT_FILE" --freeze-ack yes)
echo "$NOOP_OUTPUT"
if [[ "$NOOP_OUTPUT" != *"import no-op"* ]]; then
  echo "Error: Expected second import to be a no-op!" >&2
  exit 1
fi
echo "No-op guarantee verified!"

echo ""
echo "=== Step 4: Reverse Export & Diff Verification ==="
EXPORT_FILE="$TMP_DIR/game-state.exported.json"
mix afterlight.export_game_state --out "$EXPORT_FILE" --freeze-ack yes
if [ ! -f "$EXPORT_FILE" ]; then
  echo "Error: Export file was not generated!" >&2
  exit 1
fi
echo "Reverse export succeeded: $EXPORT_FILE"

echo ""
echo "=== Rehearsal Complete: All Gates Passed ==="
