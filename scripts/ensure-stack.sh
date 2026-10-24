#!/usr/bin/env bash
# Idempotent "make sure the dev stack is up". Safe to call from every session: it never restarts a healthy stack,
# and a lock stops two sessions starting it at once (that overlap caused the port-8091 clash and dead preview tabs).
set -uo pipefail
cd "$(dirname "$0")/.."
PORT="${LANDNAM_WEB_PORT:-4320}"
healthy() { curl -fsS -m 3 "http://127.0.0.1:${PORT}/api/backend-health" >/dev/null 2>&1; }
if healthy; then echo "Landnam stack already up on :${PORT}"; exit 0; fi
LOCK=/tmp/landnam-ensure.lock
if ! mkdir "$LOCK" 2>/dev/null; then
  # Another session is starting it; wait for that rather than starting a second one.
  for _ in $(seq 1 60); do healthy && { echo "Landnam stack up on :${PORT}"; exit 0; }; sleep 2; done
  echo "Another session is starting the stack and it is not healthy yet. See /tmp/landnam-make-up.log" >&2; exit 1
fi
trap 'rmdir "$LOCK"' EXIT
make up >/tmp/landnam-make-up.log 2>&1
for _ in $(seq 1 60); do healthy && { echo "Landnam stack up on :${PORT}"; exit 0; }; sleep 2; done
echo "Stack did not become healthy. See /tmp/landnam-make-up.log" >&2; exit 1
