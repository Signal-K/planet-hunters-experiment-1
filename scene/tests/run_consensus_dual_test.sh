#!/usr/bin/env bash
# run_consensus_dual_test.sh
# ──────────────────────────────────────────────────────────────────────────────
# Launches two Godot instances simultaneously on separate Xvfb displays to
# simulate two players (PILOT_ALPHA and PILOT_BETA) each receiving the
# ClassificationConsensusNotification for planet candidate TIC-4501.
#
# Screenshots + reports land in user:// = ~/.local/share/Landnám/
# Each player gets a sub-directory so they don't collide.
#
# Requirements: /tmp/godot (or GODOT_BIN env var), Xvfb
#
# Usage:
#   cd /path/to/planet-hunters-experiment-1
#   bash scene/tests/run_consensus_dual_test.sh
# ──────────────────────────────────────────────────────────────────────────────

set -euo pipefail

GODOT="${GODOT_BIN:-/tmp/godot}"
SCENE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TSCN="res://tests/ConsensusDualTour.tscn"

# Godot 4 user:// path for this project
USER_DIR="$HOME/.local/share/Landnám"

DISPLAY_ALPHA=":95"
DISPLAY_BETA=":100"

echo "═══════════════════════════════════════════════════════"
echo " Landnám — Consensus Dual-Instance Test"
echo " Anomaly: TIC-4501  |  Both players voted: planet"
echo "═══════════════════════════════════════════════════════"
echo ""

# ── Start virtual displays ────────────────────────────────────────────────────
echo "[1/5] Starting Xvfb displays $DISPLAY_ALPHA and $DISPLAY_BETA ..."
pkill -f "Xvfb $DISPLAY_ALPHA" 2>/dev/null || true
pkill -f "Xvfb $DISPLAY_BETA"  2>/dev/null || true
Xvfb "$DISPLAY_ALPHA" -screen 0 1280x720x24 2>/dev/null &
XVFB_ALPHA=$!
Xvfb "$DISPLAY_BETA"  -screen 0 1280x720x24 2>/dev/null &
XVFB_BETA=$!
sleep 0.5

# ── Import project (only needed once, headless) ───────────────────────────────
echo "[2/5] Importing project ..."
DISPLAY="$DISPLAY_ALPHA" "$GODOT" --headless --path "$SCENE_DIR" --import --quit \
    2>&1 | grep -v "xkbcomp\|Could not resolve\|Errors from\|WARNING.*Xkb\|XKEYBOARD" | tail -5

# ── Launch both instances in parallel ────────────────────────────────────────
echo ""
echo "[3/5] Launching PILOT_ALPHA on $DISPLAY_ALPHA ..."
DISPLAY="$DISPLAY_ALPHA" "$GODOT" \
    --path "$SCENE_DIR" \
    "$TSCN" -- --player PILOT_ALPHA \
    2>&1 | grep -v "xkbcomp\|Could not resolve\|Errors from\|libpulse\|ALSA\|could not open\|WARNING.*Xkb" \
    | sed 's/^/  [ALPHA] /' &
PID_ALPHA=$!

echo "[3/5] Launching PILOT_BETA on $DISPLAY_BETA ..."
DISPLAY="$DISPLAY_BETA" "$GODOT" \
    --path "$SCENE_DIR" \
    "$TSCN" -- --player PILOT_BETA \
    2>&1 | grep -v "xkbcomp\|Could not resolve\|Errors from\|libpulse\|ALSA\|could not open\|WARNING.*Xkb" \
    | sed 's/^/  [BETA]  /' &
PID_BETA=$!

# ── Wait for both to finish ───────────────────────────────────────────────────
echo ""
echo "[4/5] Both instances running in parallel — waiting ..."
set +e
wait "$PID_ALPHA"; EXIT_ALPHA=$?
wait "$PID_BETA";  EXIT_BETA=$?
set -e

# ── Teardown displays ─────────────────────────────────────────────────────────
kill "$XVFB_ALPHA" "$XVFB_BETA" 2>/dev/null || true

# ── Results ───────────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════"
echo "[5/5] Results"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "  PILOT_ALPHA exit code : $EXIT_ALPHA"
echo "  PILOT_BETA  exit code : $EXIT_BETA"
echo ""

# Print reports from user:// dir
for PLAYER in alpha beta; do
    REPORT="$USER_DIR/consensus_dual_report_pilot_${PLAYER}.md"
    if [ -f "$REPORT" ]; then
        echo "── ${PLAYER^^} Report ──────────────────────────────────"
        cat "$REPORT"
        echo ""
    else
        echo "── ${PLAYER^^} Report NOT FOUND: $REPORT"
        echo ""
    fi
done

# List screenshots
echo "── Screenshots ──────────────────────────────────────"
find "$USER_DIR/ux_screenshots/consensus_dual" -name "*.png" 2>/dev/null | sort | while read -r f; do
    echo "  $f"
done

echo ""
if [ "$EXIT_ALPHA" -eq 0 ] && [ "$EXIT_BETA" -eq 0 ]; then
    echo "✓ Both players received the consensus notification — test PASSED."
    exit 0
else
    echo "✗ One or more instances reported issues — test FAILED."
    exit 1
fi
