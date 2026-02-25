#!/bin/bash
# Clean test runner that filters out harmless warnings

/Applications/Godot4.5.app/Contents/MacOS/Godot --headless --path scene --script tests/run_experience_tests.gd 2>&1 | \
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
