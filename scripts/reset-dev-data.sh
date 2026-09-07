#!/bin/bash
# reset-dev-data.sh — purge local test data while preserving the persistent dev account
# Safe to run while the servers are up. No-ops gracefully if a server is unreachable.
# This is intentionally manual. It must never be installed as a scheduled job.
#
# The protected account is resolved by email on each backend before any delete is
# attempted. If it cannot be found, the script fails closed. To intentionally
# purge a backend without that account, use ALLOW_UNPROTECTED_RESET=1.

SHARED_URL="${SHARED_PB_URL_OVERRIDE:-http://localhost:8090}"
LANDNAM_URL="${LANDNAM_PB_URL_OVERRIDE:-http://localhost:8091}"
SUPERUSER_EMAIL="liam@skinetics.tech"
SUPERUSER_PASSWORD="ThisIsATestPassword"
PROTECTED_EMAIL="liam@skinetics.tech"
LOG="$HOME/Library/Logs/landnam-dev-reset.log"

mkdir -p "$(dirname "$LOG")"
log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG"; }

assert_local_url() {
  case "$1" in
    http://localhost:*|http://127.0.0.1:*) ;;
    *)
      echo "Refusing non-local PocketBase URL: $1" >&2
      exit 1
      ;;
  esac
}

assert_local_url "$SHARED_URL"
assert_local_url "$LANDNAM_URL"

find_protected_user_id() {
  local url=$1 token=$2
  local filter
  filter=$(python3 -c 'import json,sys; print(json.dumps("email = " + json.dumps(sys.argv[1])))' "$PROTECTED_EMAIL")
  curl -sfG "${url}/api/collections/users/records" \
    -H "Authorization: ${token}" \
    --data-urlencode "filter=${filter}" \
    --data-urlencode "perPage=2" \
    --data-urlencode "skipTotal=1" \
    | python3 -c "import sys,json; print((json.load(sys.stdin).get('items') or [{}])[0].get('id',''))" 2>/dev/null
}

delete_users_except() {
  local url=$1 token=$2 protected_id=$3
  local ids
  ids=$(curl -sf "${url}/api/collections/users/records?perPage=500&skipTotal=1" \
    -H "Authorization: ${token}" \
    | python3 -c "import sys,json; [print(r['id']) for r in json.load(sys.stdin).get('items', [])]" 2>/dev/null)
  [ -z "$ids" ] && { log "  users: empty"; return; }
  local n=0
  while IFS= read -r id; do
    if [ "$id" = "$protected_id" ]; then
      log "  users: preserved ${PROTECTED_EMAIL} (${id})"
      continue
    fi
    curl -sf -X DELETE "${url}/api/collections/users/records/${id}" \
      -H "Authorization: ${token}" > /dev/null && ((n++))
  done <<< "$ids"
  log "  users: deleted ${n}"
}

delete_game_states_except_user() {
  local url=$1 token=$2 protected_id=$3
  local records
  records=$(curl -sf "${url}/api/collections/game_states/records?perPage=500&skipTotal=1" \
    -H "Authorization: ${token}" \
    | python3 -c "import sys,json; [print(r['id'] + '\\t' + r.get('user','')) for r in json.load(sys.stdin).get('items', [])]" 2>/dev/null)
  [ -z "$records" ] && { log "  game_states: empty"; return; }
  local n=0
  while IFS=$'\t' read -r id user_id; do
    if [ "$user_id" = "$protected_id" ]; then
      log "  game_states: preserved save for ${PROTECTED_EMAIL} (${id})"
      continue
    fi
    curl -sf -X DELETE "${url}/api/collections/game_states/records/${id}" \
      -H "Authorization: ${token}" > /dev/null && ((n++))
  done <<< "$records"
  log "  game_states: deleted ${n}"
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
  local protected_id
  protected_id=$(find_protected_user_id "$url" "$token")
  if [ -z "$protected_id" ] && [ "${ALLOW_UNPROTECTED_RESET:-0}" != "1" ]; then
    log "${name}: protected account ${PROTECTED_EMAIL} not found — refusing destructive reset"
    return 1
  fi
  if [ -z "$protected_id" ]; then
    log "${name}: explicit unprotected reset enabled"
    delete_game_states_except_user "$url" "$token" "__no_protected_user__"
    delete_users_except "$url" "$token" "__no_protected_user__"
    return
  fi
  delete_game_states_except_user "$url" "$token" "$protected_id"
  delete_users_except "$url" "$token" "$protected_id"
}

log "=== dev reset start (protected: ${PROTECTED_EMAIL}) ==="
reset_backend "landnam" "$LANDNAM_URL"
landnam_status=$?
reset_backend "shared"  "$SHARED_URL"
shared_status=$?
log "=== done ==="
[ "$landnam_status" -eq 0 ] && [ "$shared_status" -eq 0 ]
