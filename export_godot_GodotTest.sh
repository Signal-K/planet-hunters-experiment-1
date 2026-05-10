#!/bin/bash

set -eu

SCRIPT_NAME="$0"
BASE_DIR="$( cd "$(dirname "$0")" ; pwd -P )"

platform="${1:-}"
preset=""

case "$platform" in
    android)
        preset="Android"
    ;;
    ios)
        preset="iOS"
    ;;
    *)
        echo "Usage: $0 <android|ios>"
        exit 1
esac

EXPORT_PRESETS_FILE="$BASE_DIR/scene/export_presets.cfg"
if [ "$platform" = "android" ] && ! grep -q "name=\"$preset\"" "$EXPORT_PRESETS_FILE"; then
    echo "Error: Android export preset \"$preset\" not found in $EXPORT_PRESETS_FILE"
    echo "Configured presets:"
    grep -E 'name="[^"]+"' "$EXPORT_PRESETS_FILE" | sed -E 's/^[[:space:]]*name="([^"]+)".*$/  - \1/' || true
    echo "Create an Android preset in Godot (Project -> Export) or run iOS/Web exports only."
    exit 2
fi

$BASE_DIR/export_godot.sh --target $BASE_DIR --name Landnam --preset "$preset" --project $BASE_DIR/scene --platform $platform
