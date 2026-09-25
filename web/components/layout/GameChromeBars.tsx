'use client'

import type { Screen } from '@/lib/game-types'

type GameChromeBarsProps = {
  screen: Screen
  missionsDone: number
  hasActiveRun: boolean
  onHome: () => void
  onOperations: () => void
  onMarket: () => void
  onMenu: () => void
  menuExpanded?: boolean
}

/**
 * Navigation belongs to the game shell, rather than to the one scene that
 * happened to introduce it.  Both rails deliberately remain small enough to
 * leave an operations screen's contextual control (fire, collect, confirm)
 * unobscured.
 */
export function GameChromeBars({ screen, missionsDone, hasActiveRun, onHome, onOperations, onMarket, onMenu, menuExpanded = false }: GameChromeBarsProps) {
  const onBase = screen === 'hub' || screen === 'hub-subsurface'
  const operationsLabel = hasActiveRun ? 'RESUME' : 'OPS'

  return (
    <>
      <header className="game-chrome-top" data-testid="home-top-bar" aria-label="Game controls">
        <span className="game-chrome-top__readout">OPS {missionsDone}</span>
        {hasActiveRun && <button type="button" className="game-chrome-top__chip" onClick={onOperations}>RUN LIVE</button>}
      </header>
      <nav className="game-chrome-bottom" data-testid="home-bottom-bar" aria-label="Primary navigation">
        <button type="button" data-testid="home-bar-ops" data-coach-id="bottom-tab-missions" onClick={onOperations}>{operationsLabel}</button>
        <button type="button" data-testid="home-bar-hub" aria-current={onBase ? 'page' : undefined} onClick={onHome}>HUB</button>
        <button type="button" data-testid="home-bar-switch" onClick={onOperations} aria-label="Switch operation">« »</button>
        <button type="button" data-testid="home-bar-market" onClick={onMarket}>MARKET</button>
        <button type="button" data-testid="settings-button" aria-label="Open menu" aria-expanded={menuExpanded} onClick={onMenu}>MENU</button>
      </nav>
    </>
  )
}
