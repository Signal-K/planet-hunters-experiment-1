#!/usr/bin/env node
// Pre-push guard: ensures no test/development state is accidentally committed.
// Invoked by .githooks/pre-push with "check-push" argument.

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const command = process.argv[2]

function fail(message) {
  console.error(`\n❌ pre-push blocked: ${message}\n`)
  process.exit(1)
}

function stagedFiles() {
  try {
    return execSync('git diff --cached --name-only', { encoding: 'utf8' }).split('\n').filter(Boolean)
  } catch {
    return []
  }
}

function committedChangedFiles() {
  try {
    return execSync('git diff HEAD~1 --name-only', { encoding: 'utf8' }).split('\n').filter(Boolean)
  } catch {
    return []
  }
}

if (command === 'check-push') {
  // Refuse to push if a .env or .env.local is about to be sent to the remote.
  const sensitivePatterns = [/^\.env$/, /^\.env\.local$/, /^\.env\.production/]
  const changed = committedChangedFiles()
  for (const file of changed) {
    if (sensitivePatterns.some(p => p.test(path.basename(file)))) {
      fail(`Sensitive env file detected in commit: ${file}`)
    }
  }

  // Warn if hardcoded test emails are found in web source (non-blocking, informational).
  try {
    const result = execSync(
      'grep -r --include="*.ts" --include="*.tsx" -l "test@example.com\\|testuser@" web/src web/app web/lib 2>/dev/null || true',
      { encoding: 'utf8', cwd: path.resolve(__dirname, '..') },
    ).trim()
    if (result) {
      console.warn(`⚠️  Possible hardcoded test email in: ${result.replace(/\n/g, ', ')}`)
    }
  } catch {
    // grep not found or no matches — ignore
  }

  console.log('✅ pre-push check passed')
  process.exit(0)
}

// Unknown command — pass through to avoid blocking unrelated hooks.
process.exit(0)
