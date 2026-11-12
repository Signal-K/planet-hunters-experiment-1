// Writes public/martians/config.js for Haphazard Martians, the separate game
// (Signal-K/Bad-Martians) served at playlandnam.space/martians/ until it has
// its own domain. Run before the build so the deploy's Clerk key reaches it.
// Both values are public. The game itself is built and copied in from that
// repo with its scripts/build-landnam.sh; nothing here changes Landnam.
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const config = {
  api: process.env.NEXT_PUBLIC_SHARED_PB_URL?.trim() || 'https://signal-k-starsailors.fly.dev',
  clerk: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() || '',
  shareAuth: 'pocketbase_auth', // Landnam's pocketbase-js auth: signed in there is signed in here
  wasm: 'game.wasm.gz',
  wasmGzip: true,
  sw: '/sw.js', // Landnam's worker, which caches /martians/ for offline play; the game's own would delete Landnam's caches
}
const out = fileURLToPath(new URL('../public/martians/config.js', import.meta.url))
writeFileSync(out, `// Written by web/scripts/martians-config.mjs at deploy.\nwindow.HM_CONFIG = ${JSON.stringify(config)};\n`)
console.log(`martians config: api ${config.api}, sign-in ${config.clerk ? 'clerk' : 'password'}`)
