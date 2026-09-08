// Bridge between the standalone /demo sandbox (KES-264) and the real game.
//
// The demo route deliberately never touches game-context, useGameLoop, or
// PocketBase — it's a local-only sandbox playable before/without signing in.
// On completion, if the player happens to already be authenticated in this
// browser, it leaves a note here instead of writing anywhere itself; the
// real game applies the bonus through its normal setPlayer/save path the
// next time it boots (see applyPendingDemoBonus in game-context.tsx), so the
// bonus goes through the same validation/persistence every other player
// change does.

export type DemoTrack = 'mining' | 'citizen-science'

export const DEMO_BONUS_PENDING_KEY = 'landnam-demo-bonus-pending'
export const DEMO_BONUS_FRANCS = 500

interface PendingDemoBonus {
  track: DemoTrack
  claimedAt: number
}

export function markDemoBonusPending(track: DemoTrack) {
  try {
    localStorage.setItem(DEMO_BONUS_PENDING_KEY, JSON.stringify({ track, claimedAt: Date.now() }))
  } catch {
    // Best-effort — a blocked/full localStorage just means no bonus note;
    // the demo itself still completes fine.
  }
}

export function readPendingDemoBonus(): PendingDemoBonus | null {
  try {
    const raw = localStorage.getItem(DEMO_BONUS_PENDING_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed?.track !== 'mining' && parsed?.track !== 'citizen-science') return null
    return parsed
  } catch {
    return null
  }
}

export function clearPendingDemoBonus() {
  try {
    localStorage.removeItem(DEMO_BONUS_PENDING_KEY)
  } catch {
    // ignore
  }
}
