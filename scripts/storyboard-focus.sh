#!/usr/bin/env bash
# Tell the live storyboard (/game/storyboard) what you are working on: it shows that one scene, the Linear ticket and a description.
#   scripts/storyboard-focus.sh mining --ticket SSL-562 --title "Laser gauge" --desc "What and why, one or two sentences"
#   scripts/storyboard-focus.sh --clear
DIR="${STORYBOARD_DIR:-/tmp/landnam-sb}"; FILE="${STORYBOARD_FOCUS_FILE:-$DIR/focus.json}"
mkdir -p "$DIR"
[ "${1:-}" = "--clear" ] && { echo '{}' > "$FILE"; echo cleared; exit 0; }
ids=(); note=""; ticket=""; title=""; desc=""
while [ $# -gt 0 ]; do case "$1" in
  --note) note="$2"; shift 2;; --ticket) ticket="$2"; shift 2;; --title) title="$2"; shift 2;; --desc) desc="$2"; shift 2;;
  *) ids+=("$1"); shift;; esac; done
node -e 'const [f,note,ticket,title,description,...scenes]=process.argv.slice(1);require("fs").writeFileSync(f,JSON.stringify({scenes,note,ticket,title,description}))' "$FILE" "$note" "$ticket" "$title" "$desc" "${ids[@]}"
echo "focus: ${ids[*]} ${ticket:+[$ticket]} ${title}"
