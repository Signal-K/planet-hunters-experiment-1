#!/usr/bin/env bash
# Build the Go Takeon WASM and copy takeon.wasm + wasm_exec.js into public/takeon-go/
# (gitignored build output, ~3.7 MB). Usage: scripts/sync-takeon-go-wasm.sh [takeon-go checkout]
set -euo pipefail
cd "$(dirname "$0")/.."
GO_REPO="${1:-${TAKEON_GO_REPO:-$HOME/Navigation/takeon-go-runtime}}"
rm -f "$GO_REPO/go/dist/wasm_exec.js" # the build script copies it read-only; allow a re-run
"$GO_REPO/go/scripts/build.sh" wasm
mkdir -p public/takeon-go
cp -f "$GO_REPO/go/dist/takeon.wasm" "$GO_REPO/go/dist/wasm_exec.js" public/takeon-go/
echo "Synced public/takeon-go from $GO_REPO. Enable with NEXT_PUBLIC_TAKEON_GO_WASM=1"
