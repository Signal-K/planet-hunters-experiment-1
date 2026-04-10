#!/usr/bin/env bash
# loan-debt-tour-entrypoint.sh
# Runs the standalone Loan Debt Tour (zero-balance → loan dialog → accept/decline).
# Screenshots and report are written to /output.
set -euo pipefail

SCENE_SRC="/app/scene"
SCENE_DIR="/tmp/scene"
OUT="/output"
GODOT="/opt/godot/godot"
GODOT_USER_DIR="$HOME/.local/share/PlanetHuntersExperiment1"

rm -rf "$SCENE_DIR"
cp -a "$SCENE_SRC" "$SCENE_DIR"

ZIVA_GDEXT="$SCENE_DIR/addons/ziva_agent/ziva_agent.gdextension"
if [ -f "$ZIVA_GDEXT" ] && ! find "$SCENE_DIR/addons/ziva_agent/bin" -type f -name '*.so' 2>/dev/null | grep -q .; then
    echo "==> Disabling ziva_agent GDExtension..."
    rm -rf "$SCENE_DIR/addons/ziva_agent"
    rm -f "$SCENE_DIR/.godot/extension_list.cfg"
fi

echo "==> Importing Godot project..."
GALLIUM_DRIVER=softpipe timeout 120s "$GODOT" --headless --audio-driver Dummy \
    --path "$SCENE_DIR" --import --quit 2>&1 || true
echo "    Import done."

echo "==> Starting Xvfb..."
Xvfb :99 -screen 0 1920x1080x24 -ac +extension GLX &
XVFB_PID=$!
sleep 1
export DISPLAY=:99
echo "    Xvfb PID=$XVFB_PID"

echo "==> Running Loan Debt Tour..."
GALLIUM_DRIVER=softpipe timeout 300s "$GODOT" \
    --audio-driver Dummy \
    --path "$SCENE_DIR" \
    res://tests/LoanDebtTour.tscn \
    2>&1 | tee /tmp/loan_debt_tour.log || {
    EXIT=$?
    if [ "$EXIT" -le 1 ]; then
        echo "    Tour finished (exit $EXIT treated as success)."
    else
        echo "    Tour failed (exit $EXIT)."
        kill "$XVFB_PID" 2>/dev/null || true
        exit "$EXIT"
    fi
}

kill "$XVFB_PID" 2>/dev/null || true

echo "==> Collecting output..."
mkdir -p "$OUT"

SHOT_DIR="$GODOT_USER_DIR/ux_screenshots/loan_debt_tour"
if [ -d "$SHOT_DIR" ]; then
    cp -r "$SHOT_DIR/." "$OUT/"
    echo "    Copied $(ls "$OUT" | wc -l) screenshot(s)."
else
    echo "    WARNING: No loan_debt_tour screenshots at $SHOT_DIR"
    ls "$GODOT_USER_DIR" 2>/dev/null || echo "    (user dir missing)"
fi

cp /tmp/loan_debt_tour.log "$OUT/loan_debt_tour.log" 2>/dev/null || true

if [ -f "$GODOT_USER_DIR/loan_debt_report.md" ]; then
    cp "$GODOT_USER_DIR/loan_debt_report.md" "$OUT/loan_debt_report.md"
    echo ""
    echo "=== LOAN DEBT TOUR REPORT ==="
    cat "$GODOT_USER_DIR/loan_debt_report.md"
fi

echo ""
echo "Done. Output:"
ls -lh "$OUT" 2>/dev/null || true
