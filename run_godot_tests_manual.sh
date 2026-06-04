#!/usr/bin/env bash
set -euo pipefail

# run_godot_tests_manual.sh
# Run all Godot test suites in headless mode.

# Try to find Godot binary
GODOT_BIN=${1:-${GODOT_BIN:-}}

if [ -z "$GODOT_BIN" ]; then
  for candidate in \
    "/Users/scroobz/godot-src/bin/godot.macos.editor.arm64" \
    "$(which godot 2>/dev/null || true)" \
    "/Applications/Godot.app/Contents/MacOS/Godot" \
    "godot"; do
    if [ -x "$candidate" ]; then
      GODOT_BIN="$candidate"
      break
    fi
  done
fi

if [ -z "$GODOT_BIN" ] || ! command -v "$GODOT_BIN" &> /dev/null && [ ! -x "$GODOT_BIN" ]; then
  echo "Error: Godot binary not found. Usage: $0 /path/to/godot" >&2
  exit 2
fi

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
SCENE_DIR="$PROJECT_ROOT/scene"
TEST_FILES=(
  "res://tests/run_tutorial_tests.gd"
  "res://tests/run_mission_e2e_flow_tests.gd"
  "res://tests/run_narrative_paths_tests.gd"
  "res://tests/run_debug_jump_tests.gd"
  "res://tests/run_sync_tests.gd"
)

echo "=========================================="
echo "Landnám Godot Test Runner"
echo "=========================================="
echo "Godot: $GODOT_BIN"
echo "Path:  $SCENE_DIR"
echo "=========================================="
echo ""

FAILED=0

for test_file in "${TEST_FILES[@]}"; do
  echo "------------------------------------------"
  echo "🏃 Running: $test_file"
  echo "------------------------------------------"
  
  if "$GODOT_BIN" --headless --path "$SCENE_DIR" --script "$test_file"; then
    echo -e "\033[0;32m✓ Passed: $test_file\033[0m"
  else
    echo -e "\033[0;31m✗ Failed: $test_file\033[0m"
    FAILED=$((FAILED + 1))
  fi
  echo ""
done

echo "=========================================="
if [ "$FAILED" -eq 0 ]; then
  echo -e "\033[0;32mALL GODOT TESTS PASSED\033[0m"
  exit 0
else
  echo -e "\033[0;31m$FAILED SUITE(S) FAILED\033[0m"
  exit 1
fi
