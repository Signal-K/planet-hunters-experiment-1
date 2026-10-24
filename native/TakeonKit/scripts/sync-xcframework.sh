#!/usr/bin/env bash
# Build the Go runtime xcframework and copy it into Frameworks/.
# Usage: scripts/sync-xcframework.sh [path-to-takeon-go-checkout]
#
# Calls gomobile with explicit architectures rather than `build.sh ios`: the bare
# `-target iossimulator,macos` form emits arm64 only on Apple silicon hosts, which
# breaks generic Simulator builds and Intel Macs at link time.
set -euo pipefail
cd "$(dirname "$0")/.."
GO_REPO="${1:-${TAKEON_GO_REPO:-$HOME/Navigation/takeon}}"
export PATH="$PATH:$(go env GOPATH)/bin"
OUT="$PWD/Frameworks/Takeon.xcframework.new"
rm -rf "$OUT"; mkdir -p Frameworks
(cd "$GO_REPO/go" && gomobile bind \
  -target ios/arm64,iossimulator/arm64,iossimulator/amd64,macos/arm64,macos/amd64 \
  -o "$OUT" ./mobile)
scripts/verify-xcframework.sh "$OUT"
rm -rf Frameworks/Takeon.xcframework
mv "$OUT" Frameworks/Takeon.xcframework
echo "Synced Frameworks/Takeon.xcframework from $GO_REPO"
# Package.swift decides whether to include the binary target by checking for the
# framework, and SwiftPM caches manifest evaluation: purge so the change is seen.
rm -rf .build
swift package purge-cache
