#!/usr/bin/env bash
set -euo pipefail

# integrate_and_run_godot_tests.sh
# Run GDScript-based tests for Supabase integration.
# Usage:
#   ./scripts/integrate_and_run_godot_tests.sh [/path/to/godot/binary]
# or set GODOT_BIN env var before running.

# Try to find Godot binary
GODOT_BIN=${1:-${GODOT_BIN:-}}

# Common locations to check for Godot
if [ -z "$GODOT_BIN" ]; then
  for candidate in \
    "/Users/scroobz/godot-src/bin/godot.macos.editor.arm64" \
    "$(which godot 2>/dev/null || true)" \
    "/Applications/Godot.app/Contents/MacOS/Godot" \
    "$HOME/godot-src/bin/godot.macos.editor.arm64"; do
    if [ -x "$candidate" ]; then
      GODOT_BIN="$candidate"
      break
    fi
  done
fi

if [ -z "$GODOT_BIN" ] || [ ! -x "$GODOT_BIN" ]; then
  echo "Error: Godot binary not found. Usage: $0 /path/to/godot" >&2
  echo "Or set GODOT_BIN environment variable." >&2
  exit 2
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SCENE_DIR="$PROJECT_ROOT/scene"
TEST_RUNNER="res://tests/SupabaseTestRunner.gd"

if [ ! -f "$SCENE_DIR/tests/SupabaseTestRunner.gd" ]; then
  echo "Error: SupabaseTestRunner.gd not found in $SCENE_DIR/tests/" >&2
  exit 3
fi

echo "=========================================="
echo "Supabase Integration Tests"
echo "=========================================="
echo "Godot binary: $GODOT_BIN"
echo "Project path: $SCENE_DIR"
echo "Test runner:  $TEST_RUNNER"
echo "=========================================="
echo ""

# Run the GDScript test runner
"$GODOT_BIN" --headless --path "$SCENE_DIR" --script "$TEST_RUNNER"

echo ""
echo "Test run complete." 
