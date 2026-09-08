#!/bin/bash
set -euo pipefail

repo_root=$(cd "$(dirname "$0")/.." && pwd)
test_root=$(mktemp -d)
server_pids=()
trap 'for pid in "${server_pids[@]}"; do kill "$pid" 2>/dev/null || true; done; wait 2>/dev/null || true; rm -rf "$test_root"' EXIT

for port in 18090 18091; do
  python3 - "$test_root/deletes.log" "$port" <<'PY' &
import json
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

log_path = Path(sys.argv[1])
port = int(sys.argv[2])

class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_args):
        pass

    def send_json(self, payload, status=200):
        body = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        if self.path.endswith("/_superusers/auth-with-password"):
            self.send_json({"token": "test-token"})
            return
        self.send_json({"error": "unexpected POST"}, 404)

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path.endswith("/api/health"):
            self.send_json({"message": "API is healthy."})
            return
        if parsed.path.endswith("/api/collections/users/records"):
            filtered = "filter" in parse_qs(parsed.query)
            users = [{"id": "keep-user", "email": "liam@skinetics.tech"}]
            if not filtered:
                users.append({"id": "throw-user", "email": "throwaway@example.test"})
            self.send_json({"items": users})
            return
        if parsed.path.endswith("/api/collections/game_states/records"):
            self.send_json({"items": [
                {"id": "keep-state", "user": "keep-user"},
                {"id": "throw-state", "user": "throw-user"},
            ]})
            return
        self.send_json({"error": "unexpected GET"}, 404)

    def do_DELETE(self):
        with log_path.open("a", encoding="utf-8") as log:
            log.write(f"{port} {self.path}\n")
        self.send_json({})

HTTPServer(("127.0.0.1", port), Handler).serve_forever()
PY
  server_pids+=("$!")
done

for port in 18090 18091; do
  for _ in $(seq 1 20); do
    curl -sf "http://127.0.0.1:${port}/api/health" >/dev/null && break
    sleep 0.1
  done
done

HOME="$test_root" \
SHARED_PB_URL_OVERRIDE=http://127.0.0.1:18090 \
LANDNAM_PB_URL_OVERRIDE=http://127.0.0.1:18091 \
bash "$repo_root/scripts/reset-dev-data.sh"

expected=$'18090 /api/collections/game_states/records/throw-state\n18090 /api/collections/users/records/throw-user\n18091 /api/collections/game_states/records/throw-state\n18091 /api/collections/users/records/throw-user'
actual=$(sort "$test_root/deletes.log")
if [ "$actual" != "$(printf '%s\n' "$expected" | sort)" ]; then
  echo "Unexpected delete set:" >&2
  printf '%s\n' "$actual" >&2
  exit 1
fi

if rg -n "keep-user|keep-state" "$test_root/deletes.log"; then
  echo "Protected account or save was deleted" >&2
  exit 1
fi

echo "reset-dev-data safety test passed"
