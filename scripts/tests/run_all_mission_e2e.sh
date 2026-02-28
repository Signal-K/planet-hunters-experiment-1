#!/usr/bin/env bash
set -euo pipefail

GODOT_BIN="${1:-}"
SCENE_DIR="scene"

if [[ -z "$GODOT_BIN" ]]; then
  if [[ -x "/Users/scroobz/godot-src/bin/godot.macos.editor.arm64" ]]; then
    GODOT_BIN="/Users/scroobz/godot-src/bin/godot.macos.editor.arm64"
  else
    GODOT_BIN="/Applications/Godot4.5.app/Contents/MacOS/Godot"
  fi
fi

if [[ ! -x "$GODOT_BIN" ]]; then
  echo "Error: Godot binary not executable at $GODOT_BIN" >&2
  echo "Usage: $0 [/path/to/godot]" >&2
  exit 1
fi

run_test() {
  local test_script="$1"
  local project_user_dir="$HOME/Library/Application Support/Godot/app_userdata/scene"
  mkdir -p "$project_user_dir/logs"
  echo "================================================================"
  echo "Running $test_script"
  echo "================================================================"
  "$GODOT_BIN" --headless --path "$SCENE_DIR" --script "$test_script"
}

run_test "tests/run_tutorial_tests.gd"
run_test "tests/run_structure_tests.gd"
run_test "tests/run_experience_tests.gd"
run_test "tests/run_mission_log_tests.gd"
run_test "tests/run_mission_e2e_flow_tests.gd"

echo "All mission E2E suites passed."
