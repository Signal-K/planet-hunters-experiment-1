'use client'

import { useEffect, useRef, useState } from 'react'
import { GameProvider, useGame } from '@/game-context'
import { ScreenContent } from '@/components/game/GameScreenRouter'
import { LOCATION_SCREENS, type Screen } from '@/lib/game-types'
import FriendsButton from '@/components/game/FriendsButton'
import CommunityButton from '@/components/game/CommunityButton'
import SuiteHopRail from '@/components/game/SuiteHopRail'
import DevShortcuts from '@/components/dev/DevShortcuts'
import FlightPlan from '@/components/game/FlightPlan'
import { currentTrainingTry } from '@/lib/systems/FlightPlanSystem'
import { trainingTryStep } from '@/lib/data/tutorial'
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

  // ?click=testid1,testid2 clicks those [data-testid] elements in order once the screen has mounted,
  // so a post-action state (e.g. a resolved debrief) can be rendered without playing the loop.
  useEffect(() => {
    if (!game.hydrated) return
    const ids = (new URLSearchParams(window.location.search).get('click') ?? '').split(',').filter(Boolean)
    if (!ids.length) return
    let cancelled = false
    ;(async () => {
      for (const id of ids) {
        for (let i = 0; i < 40 && !cancelled; i++) {
          const el = document.querySelector<HTMLElement>(`[data-testid="${id}"]`)
          if (el) { el.click(); break }
          await new Promise(r => setTimeout(r, 150))
        }
        await new Promise(r => setTimeout(r, 400))
      }
      document.querySelectorAll<HTMLElement>('.screen-scroll').forEach(el => { el.scrollTop = 0 })
    })()
    return () => { cancelled = true }
  }, [game.hydrated])

  // ?chrome=1 mounts the Base overlays (DEV badge, Friends, Hub, suite rail) so their overlaps can be checked.
  const [chrome, setChrome] = useState(false)
  const [signed, setSigned] = useState(false)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setChrome(params.get('chrome') === '1')
    setSigned(params.get('signed') === '1')
  }, [])
  // ?plan=1 mounts the live Flight Plan strip (same step lookup as the live shell) so an objective can be asserted.
  const [plan, setPlan] = useState(false)
  useEffect(() => { setPlan(new URLSearchParams(window.location.search).get('plan') === '1') }, [])
  const activeTry = currentTrainingTry(game.player.flightPlan)
  const planStep = plan && activeTry ? trainingTryStep(activeTry, game.screen) : undefined
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
              {(game.screen === 'hub' || game.screen === 'launchpad') && (
                <button type="button" className="settings-cog" data-testid="settings-button" aria-label="Settings">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" /></svg>
                </button>
              )}
              {game.screen === 'hub' && <><FriendsButton onClick={() => {}} /><CommunityButton onClick={() => {}} /></>}
              {(game.screen === 'hub' || game.screen === 'launchpad') && <SuiteHopRail signedIn={signed} />}
            </>
          )}
          <div className="game-screen-area">
            {game.hydrated && <ScreenContent screen={game.screen} game={game} onboardingActive={false} />}
          </div>
          {planStep && <FlightPlan key={planStep.id} stepIndex={['mining', 'scan', 'part'].indexOf(planStep.try)} step={planStep} total={3} onSkip={() => {}} />}
        </div>
      </div>
    </main>
  )
}

export default function StageClient() {
  return <GameProvider urlSync={false}><Stage /></GameProvider>
}
