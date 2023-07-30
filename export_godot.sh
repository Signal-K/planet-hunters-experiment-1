#!/bin/bash

# Godot Export Script for React Native Godot
# Supports both iOS (PCK format) and Android (folder format)
# Usage: ./export_godot.sh --target ./ios --project ./project --name GodotTest --preset iOS --platform ios

set -eu

SCRIPT_NAME="$0"
BASE_DIR="$( cd "$(dirname "$0")" ; pwd -P )"

target_base_dir=""
project_dir=""
name=""
preset=""
platform="ios"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

GODOT="/Applications/Godot.app/Contents/MacOS/Godot"
GODOT_EDITOR="${GODOT_EDITOR:-}"
if [ "$GODOT_EDITOR" != "" ] && [ -x "$GODOT_EDITOR" ]
then
    GODOT="$GODOT_EDITOR"
fi

if [ ! -x "$GODOT" ]
then
    echo -e "${RED}Error: Could not find Godot Editor binary${NC}"
    echo "Please install Godot or set the GODOT_EDITOR environment variable:"
    echo "  export GODOT_EDITOR=/path/to/godot"
    exit 1
fi

function usage() {
    echo -e "${YELLOW}Godot Export Script${NC}"
    echo ""
    echo "Usage: $SCRIPT_NAME [--target <dir>] [--project <dir>] [--name <name>] [--preset <preset>] [--platform <ios|android>]"
    echo ""
    echo "Examples:"
    echo "  # Export iOS as PCK file:"
    echo "  $0 --target ./ios --project ./project --name GodotTest --preset iOS --platform ios"
    echo ""
    echo "  # Export Android as folder:"
    echo "  $0 --target ./android/app/src/main/assets --project ./project --name main --preset Android --platform android"
    exit 1
}

while [ "${1:-}" != "" ]
do
    case "$1" in
        --target)
            shift
            target_base_dir="${1:-}"
        ;;
        --project)
            shift
            project_dir="${1:-}"
        ;;
        --name)
            shift
            name="${1:-}"
        ;;
        --preset)
            shift
            preset="${1:-}"
        ;;
        --platform)
            shift
            platform="${1:-}"
        ;;
        *)
        usage
        ;;
    esac
    shift
done

if [ "$project_dir" = "" ] || [ "$target_base_dir" = "" ] || [ "$preset" = "" ] || [ "$name" = "" ]
then
    usage
fi

echo -e "${GREEN}=== Godot Export ===${NC}"
echo "Platform:    $platform"
echo "Godot:       $GODOT"
echo "Project:     $project_dir"
echo "Target:      $target_base_dir"
echo "Name:        $name"
echo "Preset:      $preset"
echo ""

# Import project resources
echo -e "${YELLOW}Importing project resources...${NC}"
"$GODOT" --headless --path "$project_dir" --import
"$GODOT" --headless --path "$project_dir" --import

if [ "$platform" = "ios" ]
then
    echo -e "${YELLOW}Exporting iOS as PCK file...${NC}"
    mkdir -p "$target_base_dir"
    OUTPUT_FILE="$target_base_dir/${name}.pck"
    "$GODOT" --headless --path "$project_dir" --export-pack "$preset" "$OUTPUT_FILE"
    
    if [ -f "$OUTPUT_FILE" ]
    then
        FILE_SIZE=$(du -h "$OUTPUT_FILE" | cut -f1)
        echo -e "${GREEN}✓ iOS export successful${NC}"
        echo "  Output: $OUTPUT_FILE ($FILE_SIZE)"
    else
        echo -e "${RED}✗ iOS export failed${NC}"
        exit 1
    fi
    
elif [ "$platform" = "android" ]
then
    echo -e "${YELLOW}Exporting Android as folder...${NC}"
    mkdir -p "$target_base_dir"
    TARGET_DIR="$target_base_dir/${name}"
    ZIP_FILE="$target_base_dir/${name}.zip"
    
    # Export as zip first
    "$GODOT" --headless --path "$project_dir" --export-pack "$preset" "$ZIP_FILE"
    
    # Extract to folder
    rm -rf "$TARGET_DIR"
    mkdir -p "$TARGET_DIR"
    cd "$TARGET_DIR"
    unzip -q "$ZIP_FILE"
    rm -f "$ZIP_FILE"
    
    FILE_COUNT=$(find "$TARGET_DIR" -type f | wc -l)
    DIR_SIZE=$(du -sh "$TARGET_DIR" | cut -f1)
    echo -e "${GREEN}✓ Android export successful${NC}"
    echo "  Output: $TARGET_DIR/"
    echo "  Files: $FILE_COUNT"
    echo "  Size: $DIR_SIZE"
else
    echo -e "${RED}Error: Unsupported platform: $platform${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}Export complete!${NC}"
