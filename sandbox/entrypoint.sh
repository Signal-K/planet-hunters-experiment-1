#!/usr/bin/env bash
# Sandbox entrypoint — drives full M1→M2→M3→Free-Ops flow with VNC access.
# Outputs screenshots + reports to /output.
set -euo pipefail

OUTPUT_DIR="${OUTPUT_DIR:-/output}"
DISPLAY_NUM="${DISPLAY_NUM:-:99}"
VNC_PORT="${VNC_PORT:-5900}"
NOVNC_PORT="${NOVNC_PORT:-6080}"
GODOT_BIN="${GODOT_BIN:-/usr/local/bin/godot}"
PROJECT_PATH="${PROJECT_PATH:-/app/scene}"

mkdir -p "$OUTPUT_DIR"

# ── Virtual framebuffer ───────────────────────────────────────────────────────
echo "[sandbox] Starting Xvfb on display $DISPLAY_NUM"
Xvfb "$DISPLAY_NUM" -screen 0 1280x720x24 -ac +extension GLX &
XVFB_PID=$!
export DISPLAY="$DISPLAY_NUM"
sleep 2

# ── VNC ───────────────────────────────────────────────────────────────────────
echo "[sandbox] Starting x11vnc on port $VNC_PORT"
x11vnc -display "$DISPLAY_NUM" -nopw -listen 0.0.0.0 -rfbport "$VNC_PORT" \
  -shared -forever -bg -quiet
echo "[sandbox] VNC available at vnc://localhost:$VNC_PORT"

# ── noVNC web viewer ─────────────────────────────────────────────────────────
echo "[sandbox] Starting noVNC on port $NOVNC_PORT"
/opt/novnc/utils/novnc_proxy \
  --vnc "localhost:$VNC_PORT" \
  --listen "$NOVNC_PORT" &
echo "[sandbox] Browser VNC at http://localhost:$NOVNC_PORT/vnc.html"

# ── Godot import pass ─────────────────────────────────────────────────────────
echo "[sandbox] Running Godot import pass..."
GODOT_DISABLE_ZIVA_AGENT=1 \
GALLIUM_DRIVER=softpipe \
MESA_GL_VERSION_OVERRIDE=3.3 \
MESA_GLSL_VERSION_OVERRIDE=330 \
  "$GODOT_BIN" --headless --path "$PROJECT_PATH" --editor --quit 2>/dev/null || true

# ── Run sandbox scene ─────────────────────────────────────────────────────────
echo "[sandbox] Running MissionSandbox..."
GODOT_DISABLE_ZIVA_AGENT=1 \
GALLIUM_DRIVER=softpipe \
MESA_GL_VERSION_OVERRIDE=3.3 \
MESA_GLSL_VERSION_OVERRIDE=330 \
SANDBOX_OUTPUT_DIR="$OUTPUT_DIR" \
  "$GODOT_BIN" --path "$PROJECT_PATH" \
    --scene res://tests/sandbox/MissionSandbox.tscn \
    2>&1 | tee "$OUTPUT_DIR/godot.log"

EXIT_CODE=${PIPESTATUS[0]}

# ── Copy user:// output to /output ────────────────────────────────────────────
USER_DATA_DIR="${HOME}/.local/share/godot/app_userdata/Landnám"
if [ -d "$USER_DATA_DIR/sandbox_screenshots" ]; then
  cp -r "$USER_DATA_DIR/sandbox_screenshots/." "$OUTPUT_DIR/screenshots/" 2>/dev/null || true
fi
for f in sandbox_report.md sandbox_manifest.json sandbox_issues.json; do
  [ -f "$USER_DATA_DIR/$f" ] && cp "$USER_DATA_DIR/$f" "$OUTPUT_DIR/" || true
done

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "════════════════════════════════════════"
echo " Sandbox run complete — exit $EXIT_CODE"
echo " Output: $OUTPUT_DIR"
if [ -f "$OUTPUT_DIR/sandbox_issues.json" ]; then
  CRITICAL=$(grep -c '"severity":"CRITICAL"' "$OUTPUT_DIR/sandbox_issues.json" || echo 0)
  WARN=$(grep -c '"severity":"WARNING"' "$OUTPUT_DIR/sandbox_issues.json" || echo 0)
  echo " Issues: $CRITICAL critical, $WARN warnings"
fi
echo "════════════════════════════════════════"

kill "$XVFB_PID" 2>/dev/null || true
exit "$EXIT_CODE"
