#!/usr/bin/env bash
# Build the Go runtime xcframework and copy it into Frameworks/.
# Usage: scripts/sync-xcframework.sh [path-to-takeon-go-checkout]
set -euo pipefail
cd "$(dirname "$0")/.."
GO_REPO="${1:-${TAKEON_GO_REPO:-$HOME/Navigation/takeon-go-runtime}}"
"$GO_REPO/go/scripts/build.sh" ios
rm -rf Frameworks/Takeon.xcframework
mkdir -p Frameworks
cp -R "$GO_REPO/go/dist/Takeon.xcframework" Frameworks/
echo "Synced Frameworks/Takeon.xcframework from $GO_REPO"
# Package.swift decides whether to include the binary target by checking for the
# framework, and SwiftPM caches manifest evaluation: purge so the change is seen.
rm -rf .build
swift package purge-cache
