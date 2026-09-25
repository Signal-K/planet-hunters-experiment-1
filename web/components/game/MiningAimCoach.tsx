'use client'

import { useEffect, useState } from 'react'

// SSL-307: the mining laser is a timing game, not point-and-aim — the ship's
// fire point is fixed while the ore field drifts underneath it. Nothing on
// screen said so. This is a one-time, non-blocking hint (persisted in
// localStorage, same convention as the other screen-local coaches) shown on a
// player's first mining run. It dismisses itself the first time the laser
// fires, or via its own button.
const STORAGE_KEY = 'landnam_mining_aim_coach_seen_v1'

export function useMiningAimCoach() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(STORAGE_KEY)) setVisible(true)
    } catch {
      // localStorage unavailable (private mode, etc.) — just skip the hint
    }
  }, [])

  function dismiss() {
    setVisible(false)
    try { window.localStorage.setItem(STORAGE_KEY, '1') } catch { /* ignore */ }
  }

  return { visible, dismiss }
}

export default function MiningAimCoach({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div
      data-testid="mining-aim-coach"
      style={{
        position: 'absolute',
        top: 56, left: 'var(--ln-s-4)', right: 'var(--ln-s-4)', zIndex: 45,
        margin: '0 auto', maxWidth: 420,
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '8px 12px',
        borderRadius: 12,
        background: 'linear-gradient(160deg, rgba(16,16,18,0.96), rgba(11,11,13,0.96))',
        border: '1.5px solid var(--ln-cyan-border)',
        boxShadow: '0 12px 34px rgba(0,0,0,0.45)',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', color: 'var(--ln-cyan)', textTransform: 'uppercase' }}>
          Mission Coach · Timing Shot
        </div>
        <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 12, color: 'var(--ln-text-dim)', lineHeight: 1.35, marginTop: 4 }}>
          You can&apos;t aim the laser. It always fires straight down from your ship while the ore field drifts past. Wait for an ore vein to line up under the ship, then FIRE LASER.
        </div>
      </div>
      <button
        type="button"
        data-testid="mining-aim-coach-dismiss"
        onClick={onDismiss}
        style={{
          minHeight: 44, padding: '0 12px', flexShrink: 0,
          fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase',
          color: 'var(--ln-cyan-bright)', background: 'var(--ln-cyan-soft)', border: '1px solid var(--ln-cyan-border)', borderRadius: 8, cursor: 'pointer',
        }}
      >
        Got It
      </button>
    </div>
  )
}
