#!/bin/bash

set -eu

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd -P)"
SCENE_DIR="${SCENE_DIR:-$ROOT_DIR/scene}"
OUTPUT_DIR="${OUTPUT_DIR:-$ROOT_DIR/electron-dist/godot-web}"
PRESET="${PRESET:-Web}"
EXPORT_PRESETS_FILE="$SCENE_DIR/export_presets.cfg"
GODOT_USER_DIR="${GODOT_USER_DIR:-/tmp/godot}"

GODOT_EDITOR="${GODOT_EDITOR:-}"
GODOT=""

if [ -n "$GODOT_EDITOR" ] && [ -x "$GODOT_EDITOR" ]; then
  GODOT="$GODOT_EDITOR"
else
  for candidate in \
    "/Applications/Godot.app/Contents/MacOS/Godot" \
    "/Applications/Godot4.5.app/Contents/MacOS/Godot" \
    "/Applications/Godot4.app/Contents/MacOS/Godot" \
    "/usr/local/bin/godot"; do
    if [ -x "$candidate" ]; then
      GODOT="$candidate"
      break
    fi
  done
fi

if [ -z "$GODOT" ] || [ ! -x "$GODOT" ]; then
  echo "Error: Godot executable not found."
  echo "Set GODOT_EDITOR to your Godot binary path."
  exit 1
fi

if [ ! -f "$EXPORT_PRESETS_FILE" ]; then
  echo "Error: Missing export preset config: $EXPORT_PRESETS_FILE"
  exit 1
fi

if ! grep -q "name=\"$PRESET\"" "$EXPORT_PRESETS_FILE"; then
  echo "Error: Export preset \"$PRESET\" not found in $EXPORT_PRESETS_FILE"
  exit 1
fi

mkdir -p "$OUTPUT_DIR"
mkdir -p "$GODOT_USER_DIR"

echo "=== Export Godot for Electron ==="
echo "Godot:      $GODOT"
echo "Scene dir:  $SCENE_DIR"
echo "Output dir: $OUTPUT_DIR"
echo "Preset:     $PRESET"
echo "User dir:   $GODOT_USER_DIR"

GODOT_USER_DIR="$GODOT_USER_DIR" "$GODOT" \
  --headless \
  --path "$SCENE_DIR" \
  --export-release "$PRESET" "$OUTPUT_DIR/index.html"

if [ ! -f "$OUTPUT_DIR/index.html" ]; then
  echo "Error: Missing exported file: $OUTPUT_DIR/index.html"
  exit 1
fi

echo "Export complete:"
find "$OUTPUT_DIR" -maxdepth 1 -type f | sed 's#^#  - #'
