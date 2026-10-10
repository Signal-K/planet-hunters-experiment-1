'use client'

import type { Screen } from '@/lib/game-types'
import { UI_ZONES } from '@/lib/ui-zones'

type GameChromeBarsProps = {
  onOperations: () => void
  onMarket: () => void
  onMenu: () => void
  menuExpanded?: boolean
  trainingProgress?: number
}

/** The shared bar mounts on every screen except the intro and the full-screen
 * rover field (SSL-485: scene plus hotbar only), and stays out of the way while
 * the auth gate owns the page. */
export function mountsSharedChrome(screen: Screen, authGateOpen: boolean): boolean {
  return screen !== 'intro' && screen !== 'rover-mining' && !authGateOpen
}

/**
 * Navigation belongs to the game shell, rather than to the one scene that
 * happened to introduce it. The dock is an in-flow row below the screen area
 * (see `.game-chrome-bottom` in globals.css), so it can never sit on top of
 * an operations screen's contextual control (fire, collect, confirm), and it
 * stays limited to the loop switch, Market and Menu instead of duplicating
 * Base and operations destinations (SSL-451).
 */
export function GameChromeBars({ onOperations, onMarket, onMenu, menuExpanded = false, trainingProgress }: GameChromeBarsProps) {
  return (
    <nav className="game-chrome-bottom" data-ui-zone={UI_ZONES.bottomNav} data-testid="home-bottom-bar" aria-label="Primary navigation">
      <button type="button" data-testid="home-bar-switch" data-beacon="bottom-tab-missions" onClick={onOperations} aria-label="Switch operation">« »</button>
      <button type="button" data-testid="home-bar-market" onClick={onMarket}>MARKET</button>
      <button type="button" data-testid="settings-button" aria-label="Open menu" aria-expanded={menuExpanded} onClick={onMenu}>MENU{trainingProgress !== undefined && <><span className="game-chrome-bottom__training-dot" aria-hidden="true" /><span className="game-chrome-bottom__training-chip">{trainingProgress}/3</span></>}</button>
    </nav>
  )
}
