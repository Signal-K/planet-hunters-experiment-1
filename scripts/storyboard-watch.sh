#!/usr/bin/env bash
# Stream reviewer comments from the storyboard, one line each, for an agent's Monitor tool.
FILE="${STORYBOARD_COMMENTS_FILE:-${STORYBOARD_DIR:-$(cd "$(dirname "$0")/.." && pwd)/web/.storyboard}/comments.jsonl}"
mkdir -p "$(dirname "$FILE")"; touch "$FILE"
tail -n0 -F "$FILE" | grep --line-buffered '"from":"user"'
