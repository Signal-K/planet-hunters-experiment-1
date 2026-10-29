#!/usr/bin/env bash
# Runs Landnam fully on this machine with no Docker and no sibling repo:
#   shared PocketBase stand-in (pocketbase/cmd/shared-dev)  :8090
#   Landnam PocketBase (pocketbase/)                         :8096
#   web (next dev)                                           :4320
# Data lives in pocketbase/pb_data_shared and pocketbase/pb_data (gitignored).
# Both PocketBase instances get the local superuser that
# web/scripts/seed-dev-presets.ts expects. Ctrl+C stops everything.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SHARED_PORT="${SHARED_PB_PORT:-8090}"
LANDNAM_PORT="${LANDNAM_PB_DEV_PORT:-8096}"
WEB_PORT="${LANDNAM_WEB_PORT:-4320}"
BIN="$ROOT/pocketbase/.bin"
SUPERUSER_EMAIL="liam@skinetics.tech"
SUPERUSER_PASSWORD="ThisIsATestPassword"

pids=()
cleanup() { for pid in "${pids[@]}"; do kill "$pid" 2>/dev/null || true; done; }
trap cleanup EXIT INT TERM

wait_healthy() {
  for _ in $(seq 1 60); do
    curl -sf "http://127.0.0.1:$1/api/health" >/dev/null && return 0
    sleep 0.5
  done
  echo "PocketBase on :$1 did not become healthy" >&2
  exit 1
}

for port in "$SHARED_PORT" "$LANDNAM_PORT" "$WEB_PORT"; do
  if curl -s -o /dev/null "http://127.0.0.1:$port/"; then
    echo "Port $port is already in use; stop that process first (make down stops the Docker stack)." >&2
    exit 1
  fi
done

mkdir -p "$BIN"
(cd "$ROOT/pocketbase" && go build -o "$BIN/shared-dev" ./cmd/shared-dev && go build -o "$BIN/landnam-pb" .)

"$BIN/shared-dev" serve --http="127.0.0.1:$SHARED_PORT" --dir="$ROOT/pocketbase/pb_data_shared" &
pids+=($!)
wait_healthy "$SHARED_PORT"

"$BIN/landnam-pb" superuser upsert "$SUPERUSER_EMAIL" "$SUPERUSER_PASSWORD" --dir="$ROOT/pocketbase/pb_data" >/dev/null
SHARED_PB_URL="http://127.0.0.1:$SHARED_PORT" \
  "$BIN/landnam-pb" serve --http="127.0.0.1:$LANDNAM_PORT" --dir="$ROOT/pocketbase/pb_data" &
pids+=($!)
wait_healthy "$LANDNAM_PORT"

echo "Shared PB:   http://localhost:$SHARED_PORT/_/"
echo "Landnam PB:  http://localhost:$LANDNAM_PORT/_/"
echo "Scenes:      http://localhost:$WEB_PORT/game/stage   (no account, nothing saved; node scripts/scene.mjs list)"
echo "Signed in:   http://localhost:$WEB_PORT/game         (Local: create test account)"
echo "Superuser:   $SUPERUSER_EMAIL / $SUPERUSER_PASSWORD (both)"

cd "$ROOT/web"
PORT="$WEB_PORT" \
NEXT_PUBLIC_SHARED_PB_URL="http://localhost:$SHARED_PORT" \
NEXT_PUBLIC_LANDNAM_PB_URL="http://localhost:$LANDNAM_PORT" \
  npm run dev
