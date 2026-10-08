'use client'

import { useEffect, useRef } from 'react'
import { GameProvider, useGame } from '@/game-context'
import { ScreenContent } from '@/components/game/GameScreenRouter'
import { LOCATION_SCREENS, type Screen } from '@/lib/game-types'
import FriendsButton from '@/components/game/FriendsButton'
import CommunityButton from '@/components/game/CommunityButton'
import SuiteHopRail from '@/components/game/SuiteHopRail'
import DevShortcuts from '@/components/dev/DevShortcuts'
import { HubWorldBackground } from '@/components/game/hub/HubWorldBackground'

// Minimal shell: same wrapper classes as the live game so CSS matches, but none
// of the loop machinery (Flight Plan, auth gate, tickers, sync, analytics).
function Stage() {
  const game = useGame()
  const patched = useRef(false)

  useEffect(() => {
    if (!game.hydrated || patched.current) return
    patched.current = true
    const raw = new URLSearchParams(window.location.search).get('patch')
    if (!raw) return
    try {
      const patch = JSON.parse(raw)
      game.setPlayer(p => ({ ...p, ...patch }))
    } catch { /* bad patch JSON: render the unpatched fixture */ }
  }, [game, game.hydrated])

  // ?chrome=1 mounts the Base overlays (DEV badge, Friends, Hub, suite rail) so their overlaps can be checked.
  const chrome = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('chrome') === '1'
  const immersive = LOCATION_SCREENS.has(game.screen as Screen)

  return (
    <main className="game-stage" aria-label="Landnam stage" data-stage-ready={game.hydrated ? 'true' : 'false'} data-stage-screen={game.screen}>
      {!immersive && (
        <div className="game-stage-backdrop" aria-hidden="true" style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden' }}>
          <HubWorldBackground phase="day" />
        </div>
      )}
      <div className={`portrait-canvas ${immersive ? 'portrait-canvas--full-page' : ''} ${game.screen === 'mining' ? 'portrait-canvas--mining' : ''}`}>
        <div className="game-stage-main">
          {chrome && (
            <>
              <DevShortcuts />
              {game.screen === 'hub' && <><FriendsButton onClick={() => {}} /><CommunityButton onClick={() => {}} /></>}
              {(game.screen === 'hub' || game.screen === 'launchpad') && <SuiteHopRail signedIn={false} />}
            </>
          )}
          <div className="game-screen-area">
            {game.hydrated && <ScreenContent screen={game.screen} game={game} onboardingActive={false} />}
          </div>
        </div>
      </div>
    </main>
  )
}

export default function StageClient() {
  return <GameProvider urlSync={false}><Stage /></GameProvider>
}
