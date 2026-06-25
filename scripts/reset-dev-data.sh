#!/bin/bash
# reset-dev-data.sh — wipes all user accounts and game states from local PocketBase dev instances
# Safe to run while the servers are up. No-ops gracefully if a server is unreachable.
# Scheduled daily via ~/Library/LaunchAgents/dev.landnam.daily-reset.plist
# Idempotent: skips if already ran today (so RunAtLoad catch-up fires don't double-reset).

SHARED_URL="http://localhost:8090"
LANDNAM_URL="http://localhost:8091"
SUPERUSER_EMAIL="liam@skinetics.tech"
SUPERUSER_PASSWORD="ThisIsATestPassword"
LOG="$HOME/Library/Logs/landnam-dev-reset.log"
STAMP="$HOME/.cache/landnam-dev-reset-last-run"

mkdir -p "$(dirname "$LOG")" "$(dirname "$STAMP")"
log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG"; }

# Skip if we already ran today (handles RunAtLoad re-fires on every login)
TODAY=$(date '+%Y-%m-%d')
if [ -f "$STAMP" ] && [ "$(cat "$STAMP")" = "$TODAY" ]; then
  exit 0
fi

delete_all() {
  local url=$1 token=$2 collection=$3
  local ids
  ids=$(curl -sf "${url}/api/collections/${collection}/records?perPage=500&skipTotal=1" \
    -H "Authorization: ${token}" \
    | python3 -c "import sys,json; [print(r['id']) for r in json.load(sys.stdin).get('items', [])]" 2>/dev/null)
  [ -z "$ids" ] && { log "  ${collection}: empty"; return; }
  local n=0
  while IFS= read -r id; do
    curl -sf -X DELETE "${url}/api/collections/${collection}/records/${id}" \
      -H "Authorization: ${token}" > /dev/null && ((n++))
  done <<< "$ids"
  log "  ${collection}: deleted ${n}"
}

reset_backend() {
  local name=$1 url=$2
  if ! curl -sf --max-time 3 "${url}/api/health" > /dev/null 2>&1; then
    log "${name} (${url}): unreachable — skipped"
    return
  fi
  local resp token
  resp=$(curl -sf -X POST "${url}/api/collections/_superusers/auth-with-password" \
    -H "Content-Type: application/json" \
    -d "{\"identity\":\"${SUPERUSER_EMAIL}\",\"password\":\"${SUPERUSER_PASSWORD}\"}")
  token=$(echo "$resp" | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))" 2>/dev/null)
  if [ -z "$token" ]; then
    log "${name}: auth failed"
    return
  fi
  log "${name}: connected"
  delete_all "$url" "$token" "game_states"
  delete_all "$url" "$token" "users"
}

log "=== dev reset start ==="
reset_backend "landnam" "$LANDNAM_URL"
reset_backend "shared"  "$SHARED_URL"

# Write stamp only after attempting reset (even if some backends were down)
echo "$TODAY" > "$STAMP"
log "=== done ==="
