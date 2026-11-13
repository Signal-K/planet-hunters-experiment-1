#!/usr/bin/env bash
# Build the shared checkout's Go core for its portable Swift package.
set -euo pipefail
cd "$(dirname "$0")/.."
TAKEON_SOURCE="${1:-${TAKEON_PACKAGE_PATH:-${TAKEON_GO_REPO:-../../../takeon}}}"
TAKEON_SOURCE="$(cd "$TAKEON_SOURCE" && pwd)"
(cd "$TAKEON_SOURCE" && TAKEON_IOS_TARGETS=ios/arm64,iossimulator/arm64,iossimulator/amd64 go/scripts/build.sh ios)
TAKEON_PACKAGE_PATH="$TAKEON_SOURCE" swift package reset
printf 'Shared Takeon core built at %s/go/dist/Takeon.xcframework\n' "$TAKEON_SOURCE"
printf 'Build Landnam with TAKEON_PACKAGE_PATH=%s\n' "$TAKEON_SOURCE"
