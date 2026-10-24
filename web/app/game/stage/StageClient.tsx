'use client'

import { useEffect, useRef, useState } from 'react'
import { GameProvider, useGame } from '@/game-context'
import { ScreenContent } from '@/components/game/GameScreenRouter'
import OrionidsShowerChrome from '@/components/game/orionids/OrionidsShowerChrome'
import { LOCATION_SCREENS, type Screen } from '@/lib/game-types'
import SuiteHopRail from '@/components/game/SuiteHopRail'
import DevShortcuts from '@/components/dev/DevShortcuts'
import FlightPlan from '@/components/game/FlightPlan'
import { currentTrainingTry } from '@/lib/systems/FlightPlanSystem'
import { trainingTryStep } from '@/lib/data/tutorial'
import { HubWorldBackground } from '@/components/game/hub/HubWorldBackground'
import SettingsSheet from '@/components/game/SettingsSheet'
import FriendsSheet from '@/components/game/FriendsSheet'
import { OPEN_FRIENDS_EVENT, OPEN_SETTINGS_EVENT } from '@/lib/mining/openChrome'
import { SANDBOX_NOW, isSandboxName } from '@/lib/sandbox'

// In the sandbox the base shows the scene, not the player's situation: no clock, no balance, no cargo count.
// `?hud=1` brings them back for a look at how the chrome sits over the scene.
const SANDBOX_CSS = `
[data-stage-sandbox="true"] [data-testid="hub-clock-widget"],
[data-stage-sandbox="true"] [data-testid="hub-francs-chip"],
[data-stage-sandbox="true"] [data-testid="hub-cargo-chip"] { display: none !important; }
`

interface StageMode {
  /** The scene stands on its own: no campaign, no real date, no follow-ups (lib/sandbox.ts). */
  sandbox: boolean
  /** The Orionids event is a thing a scene can show on request; otherwise it only appears in its real window. */
  shower: boolean
  hud: boolean
}

// Minimal shell: same wrapper classes as the live game so CSS matches, but none
// of the loop machinery (Flight Plan, auth gate, tickers, sync, analytics).
function Stage() {
  const game = useGame()
  const patched = useRef(false)
  // Decided in the first effect, which runs before any screen mounts, so a screen never sees the real date first.
  const [mode, setMode] = useState<StageMode | null>(null)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const sandbox = isSandboxName(params.get('preset'))
    const shower = params.get('shower') === '1'
    const w = window as unknown as { __LANDNAM_DEV_NOW?: number; __LANDNAM_FORCE_ORIONIDS?: boolean }
    if (sandbox) {
      w.__LANDNAM_DEV_NOW = SANDBOX_NOW
      // Every screen's first-visit help sheet (ln-help-seen:<topic>) counts as seen. Nothing is written, so it never reaches the real game.
      const read = Storage.prototype.getItem
      Storage.prototype.getItem = function (this: Storage, key: string): string | null {
        return key.startsWith('ln-help-seen:') ? '1' : read.call(this, key)
      }
    }
    if (sandbox && shower) w.__LANDNAM_FORCE_ORIONIDS = true
    setMode({ sandbox, shower, hud: params.get('hud') === '1' })
  }, [])

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
  const [settingsOpen, setSettingsOpen] = useState(false)
  useEffect(() => {
    const open = () => setSettingsOpen(true)
    window.addEventListener(OPEN_SETTINGS_EVENT, open)
    return () => window.removeEventListener(OPEN_SETTINGS_EVENT, open)
  }, [])
  const [friendsOpen, setFriendsOpen] = useState(false)
  useEffect(() => {
    const open = () => setFriendsOpen(true)
    window.addEventListener(OPEN_FRIENDS_EVENT, open)
    return () => window.removeEventListener(OPEN_FRIENDS_EVENT, open)
  }, [])
  const activeTry = currentTrainingTry(game.player.flightPlan)
  const planStep = plan && activeTry
    ? trainingTryStep(activeTry, game.screen, { returning: !!game.player.returningToEarth })
    : undefined
  const immersive = LOCATION_SCREENS.has(game.screen as Screen)

  return (
    <main className="game-stage" aria-label="Landnam stage" data-stage-ready={game.hydrated && mode ? 'true' : 'false'} data-stage-screen={game.screen} data-stage-sandbox={mode?.sandbox ? 'true' : 'false'}>
      {mode?.sandbox && !mode.hud && <style>{SANDBOX_CSS}</style>}
      {!immersive && (
        <div className="game-stage-backdrop" aria-hidden="true" style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden' }}>
          <HubWorldBackground phase="day" />
        </div>
      )}
      <div className={`portrait-canvas ${immersive ? 'portrait-canvas--full-page' : ''} ${game.screen === 'mining' ? 'portrait-canvas--mining' : ''}`}>
        <div className="game-stage-main">
          {mode && (!mode.sandbox || mode.shower) && <OrionidsShowerChrome />}
              {chrome && (
            <>
              <DevShortcuts />
              {game.screen === 'launchpad' && <SuiteHopRail signedIn={signed} />}
            </>
          )}
          <div className="game-screen-area">
            {game.hydrated && mode && <ScreenContent screen={game.screen} game={game} onboardingActive={false} />}
          </div>
          <div className="flight-plan-slot" data-testid="flight-plan-slot">
            {planStep && <FlightPlan key={planStep.id} stepIndex={['mining', 'scan', 'part'].indexOf(planStep.try)} step={planStep} total={3} onSkip={() => {}} />}
          </div>
        </div>
      </div>
      {settingsOpen && <SettingsSheet onClose={() => setSettingsOpen(false)} />}
      {friendsOpen && <FriendsSheet onClose={() => setFriendsOpen(false)} />}
    </main>
  )
}

export default function StageClient() {
  return <GameProvider urlSync={false}><Stage /></GameProvider>
}
