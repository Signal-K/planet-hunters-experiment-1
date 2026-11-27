#!/usr/bin/env bash
# Build the pinned runtime and split it below Cloudflare's per-asset limit.
set -euo pipefail
cd "$(dirname "$0")/.."
bash scripts/sync-takeon-go-wasm.sh "$1"
cd public/takeon-go
rm -f takeon.wasm.part-* parts.json
split -b 18m -d -a 2 takeon.wasm takeon.wasm.part-
node -e 'const fs = require("fs"); const files = fs.readdirSync(".").filter(f => /^takeon\.wasm\.part-\d+$/.test(f)).sort(); if (!files.length) process.exit(1); fs.writeFileSync("parts.json", JSON.stringify({ files }));'
rm takeon.wasm
