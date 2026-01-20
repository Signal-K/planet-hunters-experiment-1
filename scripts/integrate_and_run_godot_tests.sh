#!/usr/bin/env bash
set -euo pipefail

# integrate_and_run_godot_tests.sh
# Copy the C++ test header into a Godot engine source checkout, include it in tests/test_main.cpp,
# build the engine with tests enabled, and run the test runner against this project.
# Usage:
#   ./scripts/integrate_and_run_godot_tests.sh /path/to/godot/source
# or set GODOT_SRC env var before running.

GODOT_SRC=${1:-${GODOT_SRC:-}}
if [ -z "$GODOT_SRC" ]; then
  echo "Error: Godot source path not provided. Usage: $0 /path/to/godot" >&2
  exit 2
fi

PROJECT_ROOT=$(pwd)
TEST_HEADER=scene/tests/test_supabase_net.h

if [ ! -f "$TEST_HEADER" ]; then
  echo "Error: $TEST_HEADER not found in project. Run from project root." >&2
  exit 3
fi

echo "Godot src: $GODOT_SRC"
echo "Project root: $PROJECT_ROOT"

DEST_TESTS_DIR="$GODOT_SRC/tests"

if [ ! -d "$DEST_TESTS_DIR" ]; then
  echo "Error: $DEST_TESTS_DIR not found. Ensure this is a Godot engine source tree." >&2
  exit 4
fi

echo "Copying $TEST_HEADER -> $DEST_TESTS_DIR/"
cp "$TEST_HEADER" "$DEST_TESTS_DIR/"

MAIN_CPP="$GODOT_SRC/tests/test_main.cpp"
BACKUP="$MAIN_CPP.bak_$(date +%s)"
if [ ! -f "$MAIN_CPP" ]; then
  echo "Warning: $MAIN_CPP not found. You may need to include the test manually." >&2
else
  echo "Backing up $MAIN_CPP -> $BACKUP"
  cp "$MAIN_CPP" "$BACKUP"

  # Insert include for our test header near other includes. Use awk to avoid fragile sed edits.
  if ! grep -q "#include \"test_supabase_net.h\"" "$MAIN_CPP"; then
    echo "Adding #include \"test_supabase_net.h\" to $MAIN_CPP"
    awk 'BEGIN{printed=0} { print; if (!printed && /#include/ && NR>1) { print "#include \"test_supabase_net.h\""; printed=1 } }' "$BACKUP" > "$MAIN_CPP"
  else
    echo "Include already present in $MAIN_CPP"
  fi
fi

echo "Building Godot with tests enabled (this may take a long time)"
cd "$GODOT_SRC"

# Example macOS build command; adjust platform/target as needed.
echo "Running: scons platform=osx tools=yes tests=yes target=debug -j$(sysctl -n hw.ncpu)"
scons platform=osx tools=yes tests=yes target=debug -j$(sysctl -n hw.ncpu)

echo "Build finished. Locating test binary..."
BIN=$(ls -1 bin/*tools*.64 2>/dev/null | head -n1 || true)
if [ -z "$BIN" ]; then
  echo "Could not locate Godot test binary under bin/. Adjust binary name in the script." >&2
  exit 5
fi

echo "Running tests: $BIN --test --path $PROJECT_ROOT --source-file='*test_supabase_net*' --success"
"$BIN" --test --path "$PROJECT_ROOT" --source-file="*test_supabase_net*" --success

echo "Done. If tests failed, inspect the output above. Restoring original test_main.cpp if needed." 
