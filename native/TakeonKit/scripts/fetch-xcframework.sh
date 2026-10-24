#!/usr/bin/env bash
# Download the pinned Go runtime xcframework release into Frameworks/.
# Usage: scripts/fetch-xcframework.sh   (use sync-xcframework.sh to build from a takeon checkout instead)
set -euo pipefail
cd "$(dirname "$0")/.."
# Bump both together when the runtime changes: built by takeon go/scripts/build.sh ios on orbit/go-runtime.
TAG=go-runtime-bcf79f9-universal
SHA256=abe79ecb0edbbf6eb0afae968d54743df61128dd4753fa8d53d597f606bb9f9c
URL="https://github.com/Signal-K/takeon/releases/download/$TAG/Takeon.xcframework.zip"
tmp="$(mktemp -d)"; trap 'rm -rf "${tmp:?}"' EXIT
curl -fsSL "$URL" -o "$tmp/Takeon.xcframework.zip"
echo "$SHA256  $tmp/Takeon.xcframework.zip" | shasum -a 256 -c -
ditto -x -k "$tmp/Takeon.xcframework.zip" "$tmp/out"
# Warn (not fail) if the release lacks a destination we build for: an arm64-only release still
# works on Apple-silicon Simulators, but a generic Simulator or Intel build fails at link time.
scripts/verify-xcframework.sh "$tmp/out/Takeon.xcframework" || \
  echo "WARNING: release $TAG is missing slices. Run scripts/sync-xcframework.sh to build a universal one." >&2
rm -rf Frameworks/Takeon.xcframework
mkdir -p Frameworks
mv "$tmp/out/Takeon.xcframework" Frameworks/
echo "Fetched Frameworks/Takeon.xcframework ($TAG)"
# Package.swift decides whether to include the binary target by checking for the
# framework, and SwiftPM caches manifest evaluation: purge so the change is seen.
rm -rf .build
swift package purge-cache
