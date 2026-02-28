#!/bin/bash
# Clean test runner that filters out harmless warnings

set -u

GODOT_USER_DIR="${GODOT_USER_DIR:-/tmp/godot-test-user-$$}"
mkdir -p "$GODOT_USER_DIR/logs"
GODOT_BIN="${GODOT_BIN:-/Users/scroobz/godot-src/bin/godot.macos.editor.arm64}"
if [ ! -x "$GODOT_BIN" ]; then
  GODOT_BIN="/Applications/Godot4.5.app/Contents/MacOS/Godot"
fi

GODOT_USER_DIR="$GODOT_USER_DIR" "$GODOT_BIN" --headless --user-data-dir "$GODOT_USER_DIR" --path scene --script tests/run_experience_tests.gd 2>&1 | \
  grep -v "add_theme_style_override" | \
  grep -v "at: add_theme_style_override" | \
  grep -v "GDScript backtrace (most recent call first):" | \
  grep -v "^\s*\[" | \
  grep -v "Condition \"p_style.is_null()\"" | \
  grep -v "RIDs of type \"CanvasItem\" were leaked" | \
  grep -v "at: _free_rids" | \
  grep -v "ObjectDB instances leaked" | \
  grep -v "at: cleanup" | \
  grep -v "resources still in use at exit" | \
  grep -v "at: clear"

exit ${PIPESTATUS[0]}
