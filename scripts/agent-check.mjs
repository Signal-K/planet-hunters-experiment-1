#!/usr/bin/env node
// Read-only, offline preflight. No installs, service starts, builds or global edits.
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
const root = resolve(import.meta.dirname, '..');
let failures = 0;
const check = (ok, message) => { console.log(`${ok ? 'OK' : 'FAIL'} ${message}`); if (!ok) failures++; };
const read = file => readFileSync(resolve(root, file), 'utf8');
const canonical = read('AGENTS.md');
check(read('CLAUDE.md').trim() === '@AGENTS.md' || read('CLAUDE.md') === canonical, 'CLAUDE.md imports or matches canonical AGENTS.md');
for (const file of ['web/AGENTS.md', 'web/CLAUDE.md', 'native/AGENTS.md', 'native/CLAUDE.md', 'shared/AGENTS.md', 'shared/CLAUDE.md', 'pocketbase/AGENTS.md', 'pocketbase/CLAUDE.md', '.github/copilot-instructions.md']) {
  check(existsSync(resolve(root, file)) && read(file).includes('AGENTS.md'), `${file} points to canonical instructions`);
}
check(Number(process.versions.node.split('.')[0]) >= 24, 'Node.js 24+');
const branch = spawnSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8', timeout: 3000 });
check(branch.status === 0 && branch.stdout.trim() === 'cycle/4', 'working on cycle/4');
check(existsSync(resolve(root, 'web/node_modules/.bin/next')), 'web dependencies installed (otherwise: cd web && npm ci)');
for (const command of ['swift', 'xcodebuild']) {
  const probe = spawnSync('/usr/bin/which', [command], { encoding: 'utf8', timeout: 3000 });
  console.log(`${probe.status === 0 ? 'AVAILABLE' : 'UNAVAILABLE'} ${command}${probe.status === 0 ? '' : ' (native checks require a macOS/Xcode host)'}`);
}
const tokens = spawnSync(process.execPath, ['scripts/sync-shared.mjs', '--check'], { cwd: root, stdio: 'inherit', timeout: 10000 });
check(tokens.status === 0, 'shared web/native palette is current');
console.log('Next: read the active Linear ticket; implement web then iOS; use the Simple Browser scene check. This preflight is not gameplay proof.');
process.exitCode = failures ? 1 : 0;
