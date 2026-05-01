#!/bin/bash

set -eu

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd -P)"
SCENE_DIR="${SCENE_DIR:-$ROOT_DIR/scene}"
OUTPUT_DIR="${OUTPUT_DIR:-$ROOT_DIR/electron-dist/godot-web}"
PRESET="${PRESET:-Web}"
EXPORT_PRESETS_FILE="$SCENE_DIR/export_presets.cfg"
TEMP_GODOT_USER_DIR=""

if [ -n "${GODOT_USER_DIR:-}" ]; then
  GODOT_USER_DIR="$GODOT_USER_DIR"
else
  TEMP_GODOT_USER_DIR="$(mktemp -d "${TMPDIR:-/tmp}/planet-hunters-godot-export.XXXXXX")"
  GODOT_USER_DIR="$TEMP_GODOT_USER_DIR"
fi

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

cleanup() {
  if [ -n "$TEMP_GODOT_USER_DIR" ] && [ -d "$TEMP_GODOT_USER_DIR" ]; then
    rm -rf "$TEMP_GODOT_USER_DIR"
  fi
}

trap cleanup EXIT

patch_web_canvas_sizing() {
  local export_html="$1"
  if [ ! -f "$export_html" ]; then
    return
  fi
  node - "$export_html" <<'EOF'
const fs = require("fs");
const filePath = process.argv[2];
const html = fs.readFileSync(filePath, "utf8");
const needle = `html, body, #canvas {
\tmargin: 0;
\tpadding: 0;
\tborder: 0;
}`;
const replacement = `html, body, #canvas {
\tmargin: 0;
\tpadding: 0;
\tborder: 0;
\twidth: 100%;
\theight: 100%;
\tmin-width: 100%;
\tmin-height: 100%;
}`;
const canvasNeedle = `#canvas {
\tdisplay: block;
}`;
const canvasReplacement = `#canvas {
\tdisplay: block;
\twidth: 100% !important;
\theight: 100% !important;
}`;
let next = html.replace(needle, replacement);
next = next.replace(canvasNeedle, canvasReplacement);
if (next !== html) {
  fs.writeFileSync(filePath, next);
}
EOF
}

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

patch_web_canvas_sizing "$OUTPUT_DIR/index.html"

if [ ! -f "$OUTPUT_DIR/index.html" ]; then
  echo "Error: Missing exported file: $OUTPUT_DIR/index.html"
  exit 1
fi

echo "Export complete:"
find "$OUTPUT_DIR" -maxdepth 1 -type f | sed 's#^#  - #'
