#!/usr/bin/env bash
# Re-creates the four in-game micro-surveys in PostHog.
# Use this if surveys need to be recreated (e.g. on a new project).
# After running, update MICRO_SURVEY_IDS in react-shell.js with the returned IDs.
#
# Required env vars (Vercel names supported first):
#   Posthog_Personal_Token=phx_...   or  POSTHOG_PERSONAL_API_KEY=phx_...
#   Posthog_Project_ID=<number>      or  POSTHOG_PROJECT_ID=<number>
# Optional:
#   POSTHOG_API_HOST=https://us.posthog.com

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SURVEYS_DIR="$ROOT_DIR/scripts/posthog"

POSTHOG_PERSONAL_API_KEY="${Posthog_Personal_Token:-${POSTHOG_PERSONAL_API_KEY:-}}"
POSTHOG_PROJECT_ID="${Posthog_Project_ID:-${POSTHOG_PROJECT_ID:-}}"
POSTHOG_API_HOST="${Posthog_API_Host:-${POSTHOG_API_HOST:-https://us.posthog.com}}"

if [[ -z "${POSTHOG_PERSONAL_API_KEY:-}" ]]; then
  echo "Missing Posthog_Personal_Token (or POSTHOG_PERSONAL_API_KEY)." >&2; exit 1
fi
if [[ -z "${POSTHOG_PROJECT_ID:-}" ]]; then
  echo "Missing Posthog_Project_ID (or POSTHOG_PROJECT_ID)." >&2; exit 1
fi

API_URL="${POSTHOG_API_HOST%/}/api/projects/${POSTHOG_PROJECT_ID}/surveys/"

create_survey() {
  local label="$1"
  local payload_file="$2"
  echo "Creating: $label"
  local tmp
  tmp="$(mktemp)"
  local code
  code="$(curl -sS -o "$tmp" -w "%{http_code}" \
    -X POST "$API_URL" \
    -H "Authorization: Bearer ${POSTHOG_PERSONAL_API_KEY}" \
    -H "Content-Type: application/json" \
    --data @"$payload_file")"
  if [[ "$code" -lt 200 || "$code" -ge 300 ]]; then
    echo "  ERROR (HTTP $code):" >&2; cat "$tmp" >&2; rm -f "$tmp"; return 1
  fi
  node -e "
    const r=JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'));
    console.log('  id:', r.id||'(unknown)');
  " "$tmp"
  rm -f "$tmp"
}

create_survey "contractor"  "$SURVEYS_DIR/micro_survey_contractor.json"
create_survey "mining"      "$SURVEYS_DIR/micro_survey_mining.json"
create_survey "science"     "$SURVEYS_DIR/micro_survey_science.json"
create_survey "progression" "$SURVEYS_DIR/micro_survey_progression.json"
create_survey "launch"      "$SURVEYS_DIR/micro_survey_launch.json"
create_survey "pwa_install" "$SURVEYS_DIR/micro_survey_pwa_install.json"
create_survey "m4_complete" "$SURVEYS_DIR/micro_survey_m4_complete.json"
create_survey "return_visit" "$SURVEYS_DIR/micro_survey_return_visit.json"
create_survey "level_up"    "$SURVEYS_DIR/micro_survey_level_up.json"
create_survey "planet_found" "$SURVEYS_DIR/micro_survey_planet_found.json"
create_survey "difficulty"  "$SURVEYS_DIR/micro_survey_difficulty.json"

echo ""
echo "Done. Copy the IDs above into MICRO_SURVEY_IDS in react-shell.js."
