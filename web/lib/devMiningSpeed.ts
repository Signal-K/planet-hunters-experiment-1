// Local-only QA aid: multiplies mining terrain scroll so rendered-play checks
// don't spend minutes waiting on ore. `?miningSpeed=0.1` runs the ground at a tenth
// speed, slow enough to hit a moving deposit by hand through the scene driver.
// Opt in with `?miningSpeed=10` (cached in
// sessionStorage for the tab); `?miningSpeed=off` clears it. Inert unless the
// build is `next dev` AND the page is on a loopback host, so it can never
// change play on staging or production.
const KEY = 'landnam.dev.miningSpeed'
const MAX = 10
const MIN = 0.05
const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]'])

export function devMiningSpeedMultiplier(): number {
  if (process.env.NODE_ENV !== 'development') return 1
  if (typeof window === 'undefined' || !LOOPBACK.has(window.location.hostname)) return 1
  try {
    const param = new URLSearchParams(window.location.search).get('miningSpeed')
    if (param === 'off') window.sessionStorage.removeItem(KEY)
    else if (param) window.sessionStorage.setItem(KEY, param)
    const n = Number(window.sessionStorage.getItem(KEY))
    return Number.isFinite(n) && n > 0 && n !== 1 ? Math.min(Math.max(n, MIN), MAX) : 1
  } catch {
    return 1
  }
}
