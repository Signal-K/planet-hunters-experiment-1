#!/usr/bin/env bash
# Idempotent "make sure the dev stack is up". Safe to call from every session: it never restarts a healthy stack,
# and a lock stops two sessions starting it at once (that overlap caused the port-8091 clash and dead preview tabs).
set -uo pipefail
cd "$(dirname "$0")/.."
PORT="${LANDNAM_WEB_PORT:-4320}"
healthy() { curl -fsS -m 3 "http://127.0.0.1:${PORT}/api/backend-health" >/dev/null 2>&1; }
# The solar-system map draws its planet globes with the Takeon Go/WASM runtime. Without this gitignored build the
# globes stay as empty grey discs, which looks like a lighting bug but is a missing asset.
if [ ! -f web/public/takeon-go/takeon.wasm ]; then
  echo "WARNING: web/public/takeon-go is missing, so map planets render as grey discs." >&2
  echo "  Fix: git -C <takeon> worktree add ../takeon-kes551 origin/codex/kes-551-procedural-locations && TAKEON_GO_REPO=../takeon-kes551 npm --prefix web run sync:solar" >&2
fi
if healthy; then echo "Landnam stack already up on :${PORT}"; exit 0; fi
LOCK=/tmp/landnam-ensure.lock
if ! mkdir "$LOCK" 2>/dev/null; then
  # Another session is starting it; wait for that rather than starting a second one.
  for _ in $(seq 1 180); do healthy && { echo "Landnam stack up on :${PORT}"; exit 0; }; sleep 2; done
  echo "Another session is starting the stack and it is not healthy yet. See /tmp/landnam-make-up.log" >&2; exit 1
fi
trap 'rmdir "$LOCK"' EXIT
if [ -f ../docker-compose.yml ] && docker info >/dev/null 2>&1; then
  make up >/tmp/landnam-make-up.log 2>&1
else
  # No parent ~/Navigation checkout or no Docker (cloud sessions): run the self-contained local stack.
  nohup scripts/dev-local.sh >/tmp/landnam-make-up.log 2>&1 &
fi
# A cold cloud container first downloads the Go toolchain and modules (several minutes), so wait up to 6 minutes.
for _ in $(seq 1 180); do healthy && { echo "Landnam stack up on :${PORT}"; exit 0; }; sleep 2; done
echo "Stack did not become healthy. Last lines of /tmp/landnam-make-up.log:" >&2
tail -5 /tmp/landnam-make-up.log >&2
grep -q "go: downloading go" /tmp/landnam-make-up.log 2>/dev/null && echo "The Go toolchain is still downloading; run this again in a minute." >&2
exit 1
