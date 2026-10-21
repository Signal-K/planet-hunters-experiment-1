#!/usr/bin/env bash
# Render native SceneCatalog fixtures to PNG on an already-booted iOS Simulator (headless, no window)
# and copy them to $SNAPSHOT_DIR (default web/.storyboard/snap) where /game/storyboard and the Scene Studio pick them up.
#   scripts/native-shots.sh                       every scene
#   scripts/native-shots.sh hub-phone mining-phone only these SceneCatalog ids
# Env: SIM_ID (simulator udid; default: first booted iPhone).
set -euo pipefail
REPO="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO/native"
OUT="${SNAPSHOT_DIR:-$REPO/web/.storyboard/snap}"; mkdir -p "$OUT"
SIM_ID="${SIM_ID:-$(xcrun simctl list devices booted | grep -m1 iPhone | sed -E 's/.*\(([0-9A-F-]{36})\).*/\1/')}"
[ -n "$SIM_ID" ] || { echo "No booted iPhone simulator. Boot one: xcrun simctl boot <name>" >&2; exit 1; }
IDS="$(IFS=,; echo "$*")"
STAMP="$(mktemp)"
TEST_RUNNER_SCENE="$IDS" xcodebuild test -project Landnam.xcodeproj -scheme Landnam \
  -destination "platform=iOS Simulator,id=$SIM_ID" -derivedDataPath /tmp/landnam-derived \
  -only-testing:LandnamTests/SnapshotTests/catalog\(\) CODE_SIGNING_ALLOWED=NO > /tmp/landnam-native-shots.log 2>&1 \
  || { tail -20 /tmp/landnam-native-shots.log; exit 1; }
DATA="$(xcrun simctl get_app_container "$SIM_ID" com.atlasskyventures.sslandnam data)"
# Only PNGs written by this run (newer than the stamp), so stale or other agents' files are not copied.
n=0; while IFS= read -r f; do cp "$f" "$OUT/"; n=$((n+1)); done < <(find "$DATA/tmp" -maxdepth 1 -name '*.png' -newer "$STAMP" 2>/dev/null)
rm -f "$STAMP"
echo "Copied $n snapshots to $OUT"
