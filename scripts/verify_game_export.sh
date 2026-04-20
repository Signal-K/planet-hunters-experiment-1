#!/bin/bash

# verify_game_export.sh - Checks if the exported game files are older than the Godot source
# Exit code 0: Everything up to date
# Exit code 1: Game files are stale

set -eu

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd -P)"
SCENE_DIR="$ROOT_DIR/scene"
GAME_DIR="$ROOT_DIR/game"

# Find latest modification time in source
LATEST_SRC=$(find "$SCENE_DIR" -type f -not -path '*/.*' -exec stat -f "%m" {} + | sort -rn | head -1)

# Find modification time of current export
if [ ! -f "$GAME_DIR/index.html" ]; then
    echo "⚠️  No Godot export found in $GAME_DIR/"
    exit 1
fi

LATEST_EXPORT=$(stat -f "%m" "$GAME_DIR/index.html")

if [ "$LATEST_SRC" -gt "$LATEST_EXPORT" ]; then
    SRC_TIME=$(date -r "$LATEST_SRC" "+%Y-%m-%d %H:%M:%S")
    EXPORT_TIME=$(date -r "$LATEST_EXPORT" "+%Y-%m-%d %H:%M:%S")
    echo "❌ Godot source was modified since last export!"
    echo "   Latest source change: $SRC_TIME"
    echo "   Latest export:        $EXPORT_TIME"
    echo ""
    echo "Run 'npm run web:build' to update the game export before deploying."
    exit 1
else
    echo "✅ Godot export is up to date."
    exit 0
fi
