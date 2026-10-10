#!/usr/bin/env bash
# SSL-507 native evidence: launch catalog scenes in the booted iOS Simulator and save PNGs.
# Usage: scripts/native-evidence.sh [scene ...]   (default: hub-phone debrief-phone). `-scene list` shows the index.
# Needs an installed build of com.atlasskyventures.sslandnam on a booted simulator. No device is driven.
set -euo pipefail
OUT="$(cd "$(dirname "$0")/.." && pwd)/tests/.out/native"
mkdir -p "$OUT"
for scene in "${@:-hub-phone debrief-phone}"; do
  for s in $scene; do
    xcrun simctl terminate booted com.atlasskyventures.sslandnam >/dev/null 2>&1 || true
    xcrun simctl launch booted com.atlasskyventures.sslandnam -scene "$s" >/dev/null
    sleep 2
    xcrun simctl io booted screenshot "$OUT/$s.png"
    echo "wrote $OUT/$s.png"
  done
done
