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
 * happened to introduce it. The dock is an in-flow row below the screen area
 * (see `.game-chrome-bottom` in globals.css), so it can never sit on top of
 * an operations screen's contextual control (fire, collect, confirm), and it
 * carries the program readout instead of a second floating header chip that
 * collided with each screen's own title (SSL-21).
 */
export function GameChromeBars({ screen, missionsDone, hasActiveRun, onHome, onOperations, onMarket, onMenu, menuExpanded = false }: GameChromeBarsProps) {
  const onBase = screen === 'hub' || screen === 'hub-subsurface'
  const operationsLabel = hasActiveRun ? 'RESUME' : 'OPS'

  return (
    <nav className="game-chrome-bottom" data-testid="home-bottom-bar" aria-label="Primary navigation">
      <span className="game-chrome-bottom__readout" data-testid="home-ops-readout">OPS {missionsDone}</span>
      <button type="button" data-testid="home-bar-ops" data-coach-id="bottom-tab-missions" onClick={onOperations}>{operationsLabel}</button>
      <button type="button" data-testid="home-bar-hub" aria-current={onBase ? 'page' : undefined} onClick={onHome}>HUB</button>
      <button type="button" data-testid="home-bar-switch" onClick={onOperations} aria-label="Switch operation">« »</button>
      <button type="button" data-testid="home-bar-market" onClick={onMarket}>MARKET</button>
      <button type="button" data-testid="settings-button" aria-label="Open menu" aria-expanded={menuExpanded} onClick={onMenu}>MENU</button>
    </nav>
  )
}
