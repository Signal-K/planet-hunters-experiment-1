#!/usr/bin/env bash
# Build the shared source pin instead of fetching the retired runtime release.
set -euo pipefail
exec "$(dirname "$0")/sync-xcframework.sh" "$@"
