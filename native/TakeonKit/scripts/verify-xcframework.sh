#!/usr/bin/env bash
# Fail unless Frameworks/Takeon.xcframework covers every destination Landnam builds for:
# iOS device (arm64), iOS Simulator (arm64 + x86_64, so a generic Simulator build links),
# macOS (arm64 + x86_64). Usage: scripts/verify-xcframework.sh [path-to-xcframework]
set -euo pipefail
cd "$(dirname "$0")/.."
FW="${1:-Frameworks/Takeon.xcframework}"
[ -d "$FW" ] || { echo "missing $FW (run scripts/fetch-xcframework.sh)"; exit 1; }

# platform|variant|required archs
REQUIRED=("ios||arm64" "ios|simulator|arm64 x86_64" "macos||arm64 x86_64")
status=0
for req in "${REQUIRED[@]}"; do
  IFS='|' read -r platform variant archs <<<"$req"
  found=""
  for dir in "$FW"/*/; do
    name="$(basename "$dir")"
    case "$name" in
      ios-*simulator*) [ "$platform" = ios ] && [ "$variant" = simulator ] && found="$dir" ;;
      ios-*)           [ "$platform" = ios ] && [ -z "$variant" ] && found="$dir" ;;
      macos-*)         [ "$platform" = macos ] && found="$dir" ;;
    esac
  done
  label="$platform${variant:+ $variant}"
  if [ -z "$found" ]; then echo "MISSING slice: $label"; status=1; continue; fi
  bin="$found/Takeon.framework/Takeon"
  have="$(lipo -archs "$bin")"
  for a in $archs; do
    case " $have " in *" $a "*) ;; *) echo "MISSING arch $a in $label (has: $have)"; status=1 ;; esac
  done
  [ $status -eq 0 ] && echo "ok  $label: $have"
done
exit $status
