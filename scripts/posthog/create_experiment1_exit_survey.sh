#!/usr/bin/env bash
set -euo pipefail

# Create the Landnám external survey in PostHog.
# Required (Vercel names supported first):
#   Posthog_Personal_Token=phx_...
#   Posthog_Project_ID=<numeric id>
# Backward-compatible aliases:
#   POSTHOG_PERSONAL_API_KEY=phx_...
#   POSTHOG_PROJECT_ID=<numeric id>
# Optional:
#   POSTHOG_API_HOST=https://us.posthog.com

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PAYLOAD_PATH="$ROOT_DIR/scripts/posthog/experiment1_exit_survey.json"

if [[ ! -f "$PAYLOAD_PATH" ]]; then
  echo "Payload file not found: $PAYLOAD_PATH" >&2
  exit 1
fi

POSTHOG_PERSONAL_API_KEY="${Posthog_Personal_Token:-${POSTHOG_PERSONAL_API_KEY:-}}"
POSTHOG_PROJECT_ID="${Posthog_Project_ID:-${POSTHOG_PROJECT_ID:-}}"
POSTHOG_API_HOST="${Posthog_API_Host:-${POSTHOG_API_HOST:-https://us.posthog.com}}"

if [[ -z "${POSTHOG_PERSONAL_API_KEY:-}" ]]; then
  echo "Missing Posthog_Personal_Token (or POSTHOG_PERSONAL_API_KEY)." >&2
  exit 1
fi

if [[ -z "${POSTHOG_PROJECT_ID:-}" ]]; then
  echo "Missing Posthog_Project_ID (or POSTHOG_PROJECT_ID)." >&2
  exit 1
fi

API_URL="${POSTHOG_API_HOST%/}/api/projects/${POSTHOG_PROJECT_ID}/surveys/"

echo "Creating survey on: $API_URL"
RESPONSE_FILE="$(mktemp)"
HTTP_CODE="$(curl -sS -o "$RESPONSE_FILE" -w "%{http_code}" \
  -X POST "$API_URL" \
  -H "Authorization: Bearer ${POSTHOG_PERSONAL_API_KEY}" \
  -H "Content-Type: application/json" \
  --data @"$PAYLOAD_PATH")"

if [[ "$HTTP_CODE" -lt 200 || "$HTTP_CODE" -ge 300 ]]; then
  echo "PostHog API request failed (HTTP $HTTP_CODE)." >&2
  cat "$RESPONSE_FILE" >&2
  rm -f "$RESPONSE_FILE"
  exit 1
fi

echo "Survey created successfully."
node -e "const fs=require('fs');const r=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));console.log('id:',r.id||'(unknown)');console.log('name:',r.name||'(unknown)');if(r.id){console.log('external link: https://us.posthog.com/external_surveys/'+r.id)}" "$RESPONSE_FILE"
rm -f "$RESPONSE_FILE"
