#!/bin/bash

# Godot Export Script for Desktop and Mobile
# Exports the Godot project to multiple platforms: Web (Electron), iOS, and Android
# Usage: ./export_godot_all.sh [--platforms web,ios,android] [--output-base <dir>]

set -eu

SCRIPT_NAME="$0"
BASE_DIR="$( cd "$(dirname "$0")" ; pwd -P )"

# Default settings
PLATFORMS="web,ios"
OUTPUT_BASE_DIR="$BASE_DIR"
SCENE_DIR="${SCENE_DIR:-$BASE_DIR/scene}"
PROJECT_DIR="${PROJECT_DIR:-$BASE_DIR/scene}"
EXPORT_PRESETS_FILE="$PROJECT_DIR/export_presets.cfg"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

GODOT=""
GODOT_EDITOR="${GODOT_EDITOR:-}"

# Prefer explicit env var if provided and executable
if [ "$GODOT_EDITOR" != "" ] && [ -x "$GODOT_EDITOR" ]; then
    GODOT="$GODOT_EDITOR"
else
    # Try common macOS install locations
    for p in \
        "/Applications/Godot.app/Contents/MacOS/Godot" \
        "/Applications/Godot4.5.app/Contents/MacOS/Godot" \
        "/Applications/Godot4.app/Contents/MacOS/Godot" \
        "/usr/local/bin/godot"; do
        if [ -x "$p" ]; then
            GODOT="$p"
            break
        fi
    done
fi

if [ ! -x "$GODOT" ]; then
    echo -e "${RED}Error: Could not find Godot Editor binary${NC}"
    echo "Please install Godot or set the GODOT_EDITOR environment variable."
    echo "Example: export GODOT_EDITOR=/Applications/Godot4.5.app/Contents/MacOS/Godot"
    exit 1
fi

function usage() {
    echo -e "${YELLOW}Godot Export Script - All Platforms${NC}"
    echo ""
    echo "Usage: $SCRIPT_NAME [--platforms <list>] [--output-base <dir>] [--scene <dir>] [--project <dir>]"
    echo ""
    echo "Platforms (must be configured in export_presets.cfg):"
    echo "  web         - Web (HTML5/Electron) export"
    echo "  ios         - iOS export (PCK file)"
    echo "  android     - Android export (folder) [requires Android preset]"
    echo ""
    echo "Default platforms: web,ios"
    echo ""
    echo "Examples:"
    echo "  # Export default platforms (web and iOS)"
    echo "  $0"
    echo ""
    echo "  # Export only web"
    echo "  $0 --platforms web"
    echo ""
    echo "  # Export to custom output directory"
    echo "  $0 --output-base /path/to/output"
    exit 1
}

while [ "${1:-}" != "" ]
do
    case "$1" in
        --platforms)
            shift
            PLATFORMS="${1:-}"
        ;;
        --output-base)
            shift
            OUTPUT_BASE_DIR="${1:-}"
        ;;
        --scene)
            shift
            SCENE_DIR="${1:-}"
        ;;
        --project)
            shift
            PROJECT_DIR="${1:-}"
        ;;
        -h|--help)
            usage
        ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            usage
        ;;
    esac
    shift
done

# Validate directories
if [ ! -d "$PROJECT_DIR" ]; then
    echo -e "${RED}Error: Project directory not found: $PROJECT_DIR${NC}"
    exit 1
fi

if [ ! -d "$OUTPUT_BASE_DIR" ]; then
    echo -e "${RED}Error: Output base directory not found: $OUTPUT_BASE_DIR${NC}"
    exit 1
fi

echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${GREEN}Godot Multi-Platform Export${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo "Godot:          $GODOT"
echo "Project:        $PROJECT_DIR"
echo "Output Base:    $OUTPUT_BASE_DIR"
echo "Platforms:      $PLATFORMS"
echo ""

# Import project resources once
echo -e "${YELLOW}Importing project resources...${NC}"
"$GODOT" --headless --path "$PROJECT_DIR" --import
"$GODOT" --headless --path "$PROJECT_DIR" --import
echo ""

# Parse platforms
IFS=',' read -ra PLATFORM_ARRAY <<< "$PLATFORMS"

preset_exists() {
    local preset="$1"
    if [ ! -f "$EXPORT_PRESETS_FILE" ]; then
        return 1
    fi
    grep -q "name=\"$preset\"" "$EXPORT_PRESETS_FILE"
}

export_web() {
    echo -e "${BLUE}───────────────────────────────────────${NC}"
    echo -e "${YELLOW}Exporting Web (HTML5/Electron)...${NC}"
    echo -e "${BLUE}───────────────────────────────────────${NC}"
    
    OUTPUT_DIR="$OUTPUT_BASE_DIR/electron-dist/godot-web"
    PRESET="Web"
    GODOT_USER_DIR="${GODOT_USER_DIR:-/tmp/godot}"
    
    if [ ! -f "$EXPORT_PRESETS_FILE" ]; then
        echo -e "${RED}✗ Export presets file not found: $EXPORT_PRESETS_FILE${NC}"
        return 1
    fi
    
    if ! preset_exists "$PRESET"; then
        echo -e "${RED}✗ Export preset \"$PRESET\" not found in $EXPORT_PRESETS_FILE${NC}"
        return 1
    fi
    
    mkdir -p "$OUTPUT_DIR"
    mkdir -p "$GODOT_USER_DIR"
    
    echo "Output dir: $OUTPUT_DIR"
    echo "Preset:     $PRESET"
    
    GODOT_USER_DIR="$GODOT_USER_DIR" "$GODOT" \
        --headless \
        --path "$PROJECT_DIR" \
        --export-release "$PRESET" "$OUTPUT_DIR/index.html"
    
    if [ ! -f "$OUTPUT_DIR/index.html" ]; then
        echo -e "${RED}✗ Web export failed${NC}"
        return 1
    fi
    
    FILE_COUNT=$(find "$OUTPUT_DIR" -type f | wc -l)
    DIR_SIZE=$(du -sh "$OUTPUT_DIR" | cut -f1)
    echo -e "${GREEN}✓ Web export successful${NC}"
    echo "  Output: $OUTPUT_DIR/"
    echo "  Files: $FILE_COUNT"
    echo "  Size: $DIR_SIZE"
    echo ""
    return 0
}

export_ios() {
    echo -e "${BLUE}───────────────────────────────────────${NC}"
    echo -e "${YELLOW}Exporting iOS (PCK)...${NC}"
    echo -e "${BLUE}───────────────────────────────────────${NC}"
    
    TARGET_DIR="$OUTPUT_BASE_DIR/ios"
    PRESET="iOS"
    NAME="GodotTest"

    if ! preset_exists "$PRESET"; then
        echo -e "${RED}✗ Export preset \"$PRESET\" not found in $EXPORT_PRESETS_FILE${NC}"
        return 1
    fi
    
    mkdir -p "$TARGET_DIR"
    OUTPUT_FILE="$TARGET_DIR/${NAME}.pck"
    
    echo "Output dir: $TARGET_DIR"
    echo "Preset:     $PRESET"
    echo "Output:     $OUTPUT_FILE"
    
    "$GODOT" --headless --path "$PROJECT_DIR" --export-pack "$PRESET" "$OUTPUT_FILE"
    
    if [ ! -f "$OUTPUT_FILE" ]; then
        echo -e "${RED}✗ iOS export failed${NC}"
        return 1
    fi
    
    FILE_SIZE=$(du -h "$OUTPUT_FILE" | cut -f1)
    echo -e "${GREEN}✓ iOS export successful${NC}"
    echo "  Output: $OUTPUT_FILE"
    echo "  Size: $FILE_SIZE"
    echo ""
    return 0
}

export_android() {
    echo -e "${BLUE}───────────────────────────────────────${NC}"
    echo -e "${YELLOW}Exporting Android (Folder)...${NC}"
    echo -e "${BLUE}───────────────────────────────────────${NC}"
    
    TARGET_DIR="$OUTPUT_BASE_DIR/android/app/src/main/assets"
    PRESET="Android"
    NAME="main"

    if ! preset_exists "$PRESET"; then
        echo -e "${YELLOW}⚠ Android preset \"$PRESET\" not found in $EXPORT_PRESETS_FILE; skipping Android export.${NC}"
        return 2
    fi
    
    mkdir -p "$TARGET_DIR"
    OUTPUT_FOLDER="$TARGET_DIR/${NAME}"
    ZIP_FILE="$TARGET_DIR/${NAME}_temp.zip"
    
    echo "Output dir: $TARGET_DIR"
    echo "Preset:     $PRESET"
    echo "Output:     $OUTPUT_FOLDER/"
    
    # Export as zip first
    "$GODOT" --headless --path "$PROJECT_DIR" --export-pack "$PRESET" "$ZIP_FILE"
    
    if [ ! -f "$ZIP_FILE" ]; then
        echo -e "${RED}✗ Android export failed (zip creation)${NC}"
        return 1
    fi
    
    # Extract to folder
    rm -rf "$OUTPUT_FOLDER"
    mkdir -p "$OUTPUT_FOLDER"
    unzip -q "$ZIP_FILE" -d "$OUTPUT_FOLDER"
    rm -f "$ZIP_FILE"
    
    FILE_COUNT=$(find "$OUTPUT_FOLDER" -type f | wc -l)
    DIR_SIZE=$(du -sh "$OUTPUT_FOLDER" | cut -f1)
    echo -e "${GREEN}✓ Android export successful${NC}"
    echo "  Output: $OUTPUT_FOLDER/"
    echo "  Files: $FILE_COUNT"
    echo "  Size: $DIR_SIZE"
    echo ""
    return 0
}

# Track success/failure
SUCCESS=0
FAILED=0
SKIPPED=0

# Execute exports for requested platforms
for platform in "${PLATFORM_ARRAY[@]}"; do
    platform=$(echo "$platform" | xargs) # Trim whitespace
    
    case "$platform" in
        web)
            if export_web; then
                ((SUCCESS++))
            else
                ((FAILED++))
            fi
        ;;
        ios)
            if export_ios; then
                ((SUCCESS++))
            else
                ((FAILED++))
            fi
        ;;
        android)
            if export_android; then
                ((SUCCESS++))
            else
                rc=$?
                if [ "$rc" -eq 2 ]; then
                    ((SKIPPED++))
                else
                    ((FAILED++))
                fi
            fi
        ;;
        *)
            echo -e "${RED}Unknown platform: $platform${NC}"
            ((FAILED++))
        ;;
    esac
done

# Summary
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${GREEN}Export Summary${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo "Successful: $SUCCESS"
echo "Failed:     $FAILED"
echo "Skipped:    $SKIPPED"

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All exports completed successfully!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some exports failed${NC}"
    exit 1
fi
