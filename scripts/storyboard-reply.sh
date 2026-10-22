#!/usr/bin/env bash
# Agent reply shown in the storyboard comment thread.   scripts/storyboard-reply.sh "On it: moving the gauge up" [comment-id]
FILE="${STORYBOARD_COMMENTS_FILE:-${STORYBOARD_DIR:-$(cd "$(dirname "$0")/.." && pwd)/web/.storyboard}/comments.jsonl}"
mkdir -p "$(dirname "$FILE")"
node -e 'const [f,text,re]=process.argv.slice(1);require("fs").appendFileSync(f,JSON.stringify({id:"a"+Date.now().toString(36),at:new Date().toISOString(),from:"agent",text,re:re||""})+"\n")' "$FILE" "$1" "${2:-}"
