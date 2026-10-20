'use client'

import { useState, type ReactNode } from 'react'
import { useOptionalGame } from '@/game-context'
import { MINERAL_META } from '@/lib/data'

/** The cube chip in the shared HUD: opens the base stash, with a shortcut to sell it. */
export function StashChip({ testId, className = 'scene-chip', children }: { testId: string; className?: string; children?: ReactNode }) {
  const game = useOptionalGame()
  const [open, setOpen] = useState(false)
  const entries = Object.entries(game?.player.stash ?? {}).filter(([, n]) => n > 0)
  const units = entries.reduce((sum, [, n]) => sum + n, 0)
  if (!game) return <span className={className} data-testid={testId} aria-label="Stash">{children}</span>
  return (
    <>
      <button type="button" className={className} data-testid={testId} aria-label={`Stash ${units} units. Open stash`} aria-expanded={open} style={{ cursor: 'pointer', pointerEvents: 'auto' }} onClick={() => setOpen(o => !o)}>
        {children ?? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" />
            <path d="M12 12l8-4.5M12 12v9M12 12L4 7.5" />
          </svg>
        )}
        {units > 0 ? <b style={{ marginLeft: 6 }}>{units}</b> : null}
      </button>
      {open && (
        <div className="mining-hold stash-hold" role="region" aria-label="Stash" data-testid="stash-panel">
          <div className="mining-hold__title">Stash · {units}</div>
          {entries.length === 0 ? <div className="mining-hold__empty">Empty. Mine something first.</div> : null}
          {entries.map(([id, n]) => (
            <div className="mining-hold__row" key={id}><span>{MINERAL_META[id]?.name ?? id} ×{n}</span></div>
          ))}
          {entries.length > 0 ? (
            <div className="mining-hold__row"><button type="button" data-testid="stash-sell" onClick={() => { setOpen(false); game.go('market') }}>Sell at Marketplace</button></div>
          ) : null}
        </div>
      )}
    </>
  )
}
