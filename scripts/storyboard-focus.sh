#!/usr/bin/env bash
# Tell the live storyboard (/game/storyboard) which scenes you are working on; they get an EDITING highlight.
#   scripts/storyboard-focus.sh mining debrief --note "SSL-562 laser gauge"
#   scripts/storyboard-focus.sh --clear
FILE="${STORYBOARD_FOCUS_FILE:-/tmp/landnam-focus.json}"
[ "${1:-}" = "--clear" ] && { rm -f "$FILE"; echo cleared; exit 0; }
ids=(); note=""
while [ $# -gt 0 ]; do case "$1" in --note) note="$2"; shift 2;; *) ids+=("$1"); shift;; esac; done
node -e 'const [f,n,...ids]=process.argv.slice(1);require("fs").writeFileSync(f,JSON.stringify({scenes:ids,note:n}))' "$FILE" "$note" "${ids[@]}"
echo "focus: ${ids[*]} ${note:+($note)}"
