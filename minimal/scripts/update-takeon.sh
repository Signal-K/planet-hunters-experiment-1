#!/usr/bin/env bash
# Rebuild TakeOn's engine and re-vendor it into Minimal (KES-530 / SSL-864).
# Usage: minimal/scripts/update-takeon.sh [path-to-takeon]   (default: ../takeon next to this repo)
set -euo pipefail
here="$(cd "$(dirname "$0")/.." && pwd)"
takeon="$(cd "${1:-$here/../../takeon}" && pwd)"
vendor="$here/vendor/takeon"

(cd "$takeon" && npm run build -w @takeon/engine >/dev/null)
packed="$(cd "$takeon/packages/engine" && npm pack --silent --pack-destination "$vendor")"
mv -f "$vendor/$packed" "$vendor/takeon-engine-kes530.tgz"

# The tarball keeps its name and version, so npm would reuse its cached copy:
# reinstall from scratch so the lockfile's integrity follows the new build.
cd "$here"
rm -rf node_modules package-lock.json
npm install --no-audit --no-fund --prefer-online >/dev/null
echo "Vendored @takeon/engine from $(cd "$takeon" && git rev-parse --short HEAD) ($(cd "$takeon" && git status --short | wc -l | tr -d ' ') uncommitted files)"
