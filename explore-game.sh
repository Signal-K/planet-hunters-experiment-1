#!/usr/bin/env bash
# Landnám — playthrough. Run: bash explore-game.sh
# Requires: brew install cliclick

PROJ="/Users/scroobz/Navigation/Native/planet-hunters-experiment-1"
SCENE="$PROJ/scene"
GODOT="/Applications/Godot4.5.app/Contents/MacOS/Godot"
SHOTS="$PROJ/game-exploration-screenshots"
USERDATA="$HOME/Library/Application Support/Godot/app_userdata/scene"

mkdir -p "$SHOTS"; rm -f "$SHOTS"/*.png "$SHOTS"/*.md 2>/dev/null || true
IDX=0; LOG="$SHOTS/_log.md"

log()  { echo "$*" | tee -a "$LOG"; }
shot() { local n; n="$(printf '%03d' $IDX)-${1}.png"; ((IDX++)); screencapture -x "$SHOTS/$n"; log "📸 $n"; }
p()    { sleep "$1"; }

if ! command -v cliclick &>/dev/null; then
  echo "ERROR: cliclick not found. Run: brew install cliclick"
  exit 1
fi

# Click at absolute screen coords (real HID events — Godot can see these)
click() {
  local x=$1 y=$2 label=${3:-}
  [[ -n "$label" ]] && log "  🖱  ($x,$y) — $label"
  cliclick c:"$x,$y"
}

# Get Godot window bounds via Swift CGWindowList
get_bounds() {
  local raw
  raw=$(swift - 2>/dev/null << 'SWIFT'
import Cocoa
let opts = CGWindowListOption(arrayLiteral: .optionOnScreenOnly)
if let list = CGWindowListCopyWindowInfo(opts, kCGNullWindowID) as? [[String:Any]] {
  for w in list {
    if (w[kCGWindowOwnerName as String] as? String) == "Godot" {
      if let b = w[kCGWindowBounds as String] as? [String:Any],
         let ww = b["Width"] as? CGFloat, ww > 200 {
        let x = b["X"] as? CGFloat ?? 0
        let y = b["Y"] as? CGFloat ?? 0
        let hh = b["Height"] as? CGFloat ?? 0
        print("\(Int(x)),\(Int(y)),\(Int(ww)),\(Int(hh))")
        break
      }
    }
  }
}
SWIFT
  )
  if [[ -n "$raw" ]]; then
    IFS=',' read -r WIN_X WIN_Y WIN_W WIN_H <<< "$raw"
    export WIN_X WIN_Y WIN_W WIN_H
    log "  Window: x=$WIN_X y=$WIN_Y ${WIN_W}×${WIN_H}"
  else
    WIN_X=0; WIN_Y=23; WIN_W=1280; WIN_H=720
    export WIN_X WIN_Y WIN_W WIN_H
    log "  Window: fallback ${WIN_W}×${WIN_H}"
  fi
}

# Click at percentage of game viewport (0-100 each axis)
# Viewport excludes: titlebar (~28px top), bottom nav (~55px)
click_pct() {
  local rx=$1 ry=$2 label=${3:-}
  local vt=$(( WIN_Y + 28 ))
  local vh=$(( WIN_H - 28 - 55 ))
  local x=$(( WIN_X + WIN_W * rx / 100 ))
  local y=$(( vt + vh * ry / 100 ))
  click "$x" "$y" "$label"
}

# ── 0. Setup ──────────────────────────────────────────────────────────────────
log "# Landnám — New User Playthrough"
log "$(date -u)"
pkill -x Godot 2>/dev/null || true; p 2
[ -d "$USERDATA" ] && { rm -f "$USERDATA"/*.cfg "$USERDATA"/*.json 2>/dev/null; log "Saves cleared"; }

# ── 1. Launch ──────────────────────────────────────────────────────────────────
log "## 1. Launch (fresh save)"
"$GODOT" --path "$SCENE" --resolution 1280x720 > /tmp/godot.log 2>&1 &
GPID=$!; log "PID: $GPID"
p 8
osascript -e 'tell application "Godot" to activate'; p 1
get_bounds; shot "01-startup"

# ── 2. Tutorial M1 — Quick Base Tour ─────────────────────────────────────────
# Step 1/10: Click Control Station (right side, ~75% x, ~65% y of viewport)
log "## 2. Tutorial M1: Quick Base Tour"
log "Step 1 — Control Station"
p 2; get_bounds
click_pct 76 65 "control-station"
p 3; shot "02-after-control-station"

# Step 2+: panel opens, click through it. Usually a close/next button top-right of panel.
log "Step 2 — panel open, click next/close"
get_bounds; click_pct 85 15 "panel-close-topright"; p 2
shot "03-step2"

# Steps 3-10: click the highlighted element each time, then close panel
for step in $(seq 3 10); do
  log "Step $step"
  get_bounds
  # Click the "click here" target (varies per step — scan common positions)
  click_pct 76 65 "step${step}-target-a"; p 1
  click_pct 50 50 "step${step}-target-b"; p 1
  click_pct 30 55 "step${step}-target-c"; p 1
  click_pct 85 15 "step${step}-close";    p 2
  shot "04-step$step"
done

p 2; shot "05-post-tutorial"

# ── 3. New Mission ────────────────────────────────────────────────────────────
log "## 3. User clicks New Mission"
get_bounds
# New Mission button: rightmost item in bottom nav, ~93% x, bottom 30px
NX=$(( WIN_X + WIN_W * 93 / 100 ))
NY=$(( WIN_Y + WIN_H - 28 ))
click "$NX" "$NY" "new-mission-btn"
p 3; shot "06-new-mission"

# ── 4. Mission list — pick first mission ─────────────────────────────────────
log "## 4. Mission list — select first mission"
get_bounds
click_pct 50 25 "mission-item-1"; p 2; shot "07-mission-selected"
click_pct 80 85 "launch-btn";     p 2; shot "08-launch-clicked"

# ── 5. In-flight / orbit scene ───────────────────────────────────────────────
log "## 5. Watching for rocket launch / transit"
for i in $(seq 1 8); do
  p 5; get_bounds
  shot "09-inflight-t$((i*5))s"
  log "  log: $(tail -2 /tmp/godot.log | tr '\n' '|')"
  # tap center occasionally
  (( i % 3 == 0 )) && click_pct 50 50 "tap"
done

# ── 6. Mining scene interactions ──────────────────────────────────────────────
log "## 6. Mining scene — try to mine"
get_bounds
click_pct 50 50 "mine-center";  p 2
click_pct 70 60 "mine-right";   p 2
click_pct 30 60 "mine-left";    p 2
shot "10-mining"
for i in $(seq 1 4); do
  p 5; shot "11-mining-t$((i*5))s"
  click_pct 50 50 "mine-tap-$i"; p 1
done

# ── 7. Return / debrief ───────────────────────────────────────────────────────
log "## 7. Return home / debrief"
get_bounds
click_pct 85 85 "return-btn"; p 3; shot "12-return"
click_pct 50 50 "debrief-close"; p 2; shot "13-debrief"
p 5; shot "14-back-at-base"

# ── 8. Summary / stuck notes ─────────────────────────────────────────────────
log "## Summary"
log "Total screenshots: $IDX"
log "Godot log (last 30):"
tail -30 /tmp/godot.log >> "$LOG"
echo "✅ Done — $IDX screenshots in $SHOTS"
