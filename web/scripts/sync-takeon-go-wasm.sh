#!/usr/bin/env bash
# Build the Go Takeon WASM and copy takeon.wasm + wasm_exec.js into public/takeon-go/
# (gitignored build output). Usage: scripts/sync-takeon-go-wasm.sh [takeon checkout]
set -euo pipefail
cd "$(dirname "$0")/.."
GO_REPO="${1:-${TAKEON_GO_REPO:-$(cd .. && pwd)/../takeon}}"
if [ ! -f "$GO_REPO/go/scripts/build.sh" ]; then
  echo "Takeon checkout not found at $GO_REPO. Pass its path or set TAKEON_GO_REPO." >&2
  echo "For the moon profiles use the codex/kes-551-procedural-locations branch." >&2
  exit 1
fi
if ! command -v go >/dev/null 2>&1; then
  echo "Go is required; use the version specified by $GO_REPO/go/go.mod." >&2
  exit 1
fi
rm -f "$GO_REPO/go/dist/wasm_exec.js" # the build script copies it read-only; allow a re-run
"$GO_REPO/go/scripts/build.sh" wasm
mkdir -p public/takeon-go
cp -f "$GO_REPO/go/dist/takeon.wasm" "$GO_REPO/go/dist/wasm_exec.js" public/takeon-go/
echo "Synced public/takeon-go from $GO_REPO. For descent previews, start with NEXT_PUBLIC_TAKEON_SOLAR_PREVIEW=1."
