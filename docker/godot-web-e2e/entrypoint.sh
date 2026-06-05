#!/usr/bin/env bash
set -euo pipefail

mkdir -p "$WEB_BUILD_DIR" "$E2E_OUTPUT_DIR"
rm -rf "$WEB_BUILD_DIR"/*

echo "[web-e2e] Checking editor compile path"
"$GODOT_BIN" --headless --editor --path "$PROJECT_PATH" --quit-after 12 \
  > "$E2E_OUTPUT_DIR/editor-check.log" 2>&1 || {
    cat "$E2E_OUTPUT_DIR/editor-check.log"
    exit 1
  }
if grep -E "Parse Error|Compile Error|Failed to load script|Preload file .* does not exist" "$E2E_OUTPUT_DIR/editor-check.log"; then
  cat "$E2E_OUTPUT_DIR/editor-check.log"
  exit 1
fi

echo "[web-e2e] Exporting Godot Web build"
"$GODOT_BIN" --headless --path "$PROJECT_PATH" --export-debug Web "$WEB_BUILD_DIR/index.html" \
  > "$E2E_OUTPUT_DIR/export.log" 2>&1 || {
    cat "$E2E_OUTPUT_DIR/export.log"
    exit 1
  }
if grep -E "Parse Error|Compile Error|Failed to load script|Preload file .* does not exist" "$E2E_OUTPUT_DIR/export.log"; then
  cat "$E2E_OUTPUT_DIR/export.log"
  exit 1
fi

echo "[web-e2e] Serving exported build"
python3 -m http.server 8080 --directory "$WEB_BUILD_DIR" \
  > "$E2E_OUTPUT_DIR/server.log" 2>&1 &
SERVER_PID=$!
trap 'kill "$SERVER_PID" 2>/dev/null || true' EXIT

echo "[web-e2e] Running Playwright browser clickthrough"
node /app/scripts/e2e/web_canvas_flow.mjs
