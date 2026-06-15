#!/bin/bash
set -e

echo "Starting Xvfb display..."
Xvfb :99 -screen 0 1280x720x24 -ac &
export DISPLAY=:99

echo "Starting Next.js standalone server..."
cd /sandbox/.next/standalone
PORT=3000 HOSTNAME=0.0.0.0 node server.js &
SERVER_PID=$!
cd /sandbox

echo "Waiting for server on localhost:3000..."
TRIES=0
until node -e "
var http = require('http');
http.get('http://localhost:3000/', function(r) {
  process.exit(r.statusCode < 500 ? 0 : 1);
}).on('error', function() { process.exit(1); });
" 2>/dev/null; do
  TRIES=$((TRIES + 1))
  if [ "$TRIES" -ge 30 ]; then
    echo "ERROR: Server did not start within 60s"
    kill "$SERVER_PID" 2>/dev/null
    exit 1
  fi
  sleep 2
done

echo "Server ready after ${TRIES} polls. Running Cypress offline suite..."

npx cypress run --config-file cypress.config.ts \
  --spec "cypress/e2e/smoke.cy.ts,cypress/e2e/game-loop.cy.ts" \
  2>&1 | tee /output/sandbox.log
EXIT=${PIPESTATUS[0]}

kill "$SERVER_PID" 2>/dev/null

if [ "$EXIT" -ne 0 ]; then
  printf '[{"severity":"CRITICAL","message":"M1-M3 Cypress E2E suite failed — see sandbox.log"}]' \
    > /output/sandbox_issues.json
fi

exit "$EXIT"
