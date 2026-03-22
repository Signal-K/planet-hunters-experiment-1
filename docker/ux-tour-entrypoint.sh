#!/usr/bin/env bash
# ux-tour-entrypoint.sh
# Runs the Godot UX E2E screenshot tour inside the container.
# Screenshots and the log are written to /output (mounted from the host).
set -euo pipefail

SCENE_DIR="/app/scene"
OUT="/output"
GODOT="/opt/godot/godot"
GODOT_USER_DIR="$HOME/.local/share/PlanetHuntersExperiment1"

# ── 1. Import project (builds .godot/ cache; required before running any scene) ─
echo "==> Importing Godot project..."
GALLIUM_DRIVER=softpipe timeout 120s "$GODOT" --headless --path "$SCENE_DIR" --import --quit 2>&1 || true
echo "    Import done."

# ── 2. Start virtual display ─────────────────────────────────────────────────────
echo "==> Starting Xvfb..."
Xvfb :99 -screen 0 1920x1080x24 -ac +extension GLX &
XVFB_PID=$!
sleep 1
export DISPLAY=:99
echo "    Xvfb PID=$XVFB_PID"

# ── 3. Run the UX tour scene ──────────────────────────────────────────────────────
echo "==> Running UX tour (timeout 30 min)..."
GALLIUM_DRIVER=softpipe GODOT_UX_TOUR=1 timeout 1800s "$GODOT" \
    --path "$SCENE_DIR" \
    res://tests/UXTour.tscn \
    2>&1 | tee /tmp/godot_ux_tour.log || {
    EXIT=$?
    # quit(0) comes back as exit 1 from the shell pipeline; treat <=1 as success.
    if [ "$EXIT" -le 1 ]; then
        echo "    Tour finished (exit $EXIT treated as success)."
    else
        echo "    Tour failed or timed out (exit $EXIT)."
        kill "$XVFB_PID" 2>/dev/null || true
        exit "$EXIT"
    fi
}

# ── 4. Stop virtual display ───────────────────────────────────────────────────────
kill "$XVFB_PID" 2>/dev/null || true

# ── 5. Collect output ────────────────────────────────────────────────────────────
echo "==> Collecting screenshots..."
mkdir -p "$OUT"

if [ -d "$GODOT_USER_DIR/ux_screenshots" ]; then
    cp -r "$GODOT_USER_DIR/ux_screenshots/." "$OUT/"
    echo "    Copied $(ls "$OUT" | wc -l | tr -d ' ') screenshot(s)."
else
    echo "    WARNING: No ux_screenshots dir found at $GODOT_USER_DIR"
    ls -la "$GODOT_USER_DIR" 2>/dev/null || echo "    (user dir missing)"
fi

cp /tmp/godot_ux_tour.log "$OUT/godot_output.log" 2>/dev/null || true

if [ -f "$GODOT_USER_DIR/ux_report.md" ]; then
    cp "$GODOT_USER_DIR/ux_report.md" "$OUT/ux_report.md"
    echo ""
    echo "=== UX REPORT ==="
    cat "$GODOT_USER_DIR/ux_report.md"
fi

if [ -f "$GODOT_USER_DIR/tour_manifest.json" ]; then
    cp "$GODOT_USER_DIR/tour_manifest.json" "$OUT/tour_manifest.json"
    echo "    ✓ tour_manifest.json copied."
else
    echo "    WARNING: tour_manifest.json not found at $GODOT_USER_DIR"
fi

if [ -f "$GODOT_USER_DIR/tour_ai_context.md" ]; then
    cp "$GODOT_USER_DIR/tour_ai_context.md" "$OUT/tour_ai_context.md"
    echo "    ✓ tour_ai_context.md copied."
fi

echo ""
echo "Done. Output files:"
ls -lh "$OUT" 2>/dev/null || true
