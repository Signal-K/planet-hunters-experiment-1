'use client'

import { type ReactNode, useMemo, useEffect, useRef } from 'react'
import { GameProvider, useGame } from '@/game-context'
import { M1_STEPS, M2_STEPS, M3_STEPS } from '@/lib/data'
import { FREE_OPS_START_MISSIONS_DONE } from '@/lib/data/mission-generator'
import TutorialCoach from '@/components/game/TutorialCoach'
import UnlockPopup from '@/components/game/UnlockPopup'
import { TutorialCompleteSheet } from '@/components/game/TutorialCompleteSheet'
import BackendStatus from '@/components/game/BackendStatus'
import LandnamSyncStatus from '@/components/game/LandnamSyncStatus'
import { PushOptIn } from '@/components/game/PushOptIn'
import SurveySheet from '@/components/ui/SurveySheet'
import ToastLayer from '@/components/ui/ToastLayer'
import { captureGameEvent, captureScreenView, initPostHog } from '@/lib/posthog'
import { routeSegmentForScreen } from '@/lib/game-route'
import DevShortcuts from '@/components/dev/DevShortcuts'
import GateLanding from '@/components/game/landing/GateLanding'
import ShellSheets from '@/components/game/ShellSheets'
import TakeOnPwaPreload from '@/components/takeon/TakeOnPwaPreload'
import TerritoryClaimPopup from '@/components/game/TerritoryClaimPopup'
import { UI_ZONES } from '@/lib/ui-zones'
import { isSurveySafeScreen } from '@/lib/survey-gating'
import { ScreenContent } from '@/components/game/GameScreenRouter'
import { returnNotification, type ReturnNotification } from '@/lib/return-notification'

function GameChrome({ children }: { children: ReactNode }) {
  const game = useGame()
  const returnScheduledFor = useRef<number | null>(null)

  // PostHog injects recorder/survey scripts. Initialising during module
  // evaluation can let those scripts mutate the document while React is
  // still hydrating, producing a real production hydration mismatch. Run it
  // after the first client commit instead.
  useEffect(() => {
    initPostHog()
  }, [])

  // Schedule the "rocket returned" push when the Earth-return leg starts, for
  // the moment that leg actually lands. The rocket returns from the delivery
  // stop on two-leg jobs, otherwise from the mining target.
  useEffect(() => {
    const notice = returnNotification({
      arrivalAt: game.player.arrivalAt,
      returningToEarth: game.player.returningToEarth,
      missionTitle: game.mission?.title,
      originName: (game.mission?.deliveryTargetId
        ? game.catalog.targets.find(t => t.id === game.mission?.deliveryTargetId)
        : game.target)?.name,
    })
    if (game.screen !== 'transit' || !notice) return
    if (returnScheduledFor.current === notice.scheduledFor) return
    returnScheduledFor.current = notice.scheduledFor

    async function schedule(payload: ReturnNotification) {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (!sub) return
      await fetch('/api/push/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          keys: sub.toJSON().keys,
          ...payload,
        }),
      })
    }
    void schedule(notice).catch(() => {})
  }, [game.screen, game.player.arrivalAt, game.player.returningToEarth, game.mission, game.target, game.catalog.targets])

  const coachSteps = useMemo(() => {
    if (!game.tutorial || game.player.missionsDone >= FREE_OPS_START_MISSIONS_DONE) return []
    if (game.player.missionsDone === 0) return M1_STEPS
    if (game.player.missionsDone === 1) return M2_STEPS
    if (game.player.missionsDone === 2) return M3_STEPS
    return []
  }, [game.player.missionsDone, game.tutorial])

  // The game state changes synchronously, while the URL follows in a client
  // navigation. Render the persistent scene from that state so route segment
  // replacement cannot tear down and recreate the background between steps.
  const currentScreen = game.screen
  const coach = useMemo(() => {
    const routeCoach = coachSteps.find(step => step.screen === currentScreen && !game.doneSteps[step.id]) ?? null
    if (currentScreen === 'hub' && game.subsurfaceView) return null
    // The Launchpad mission chooser is a modal owned by the current scene.
    // Hide the coach while it is open so onboarding copy never sits over, or
    // points back at, the control the player is already using.
    if (game.shellSheet || game.popup || game.authGateOpen || (currentScreen === 'launchpad' && game.launchpadMissionMenuOpen)) return null
    return routeCoach
  }, [coachSteps, currentScreen, game.authGateOpen, game.doneSteps, game.launchpadMissionMenuOpen, game.popup, game.shellSheet, game.subsurfaceView])

  const coachIndex = coach ? coachSteps.findIndex(step => step.id === coach.id) : -1
  const hasCoach = !!coach

  // SSL-351: the SPA never navigates, so PostHog's own pageview capture is
  // off (lib/posthog.ts). Report each screen the player lands on instead.
  useEffect(() => {
    if (!game.hydrated) return
    captureScreenView(currentScreen, `/game/${routeSegmentForScreen(currentScreen)}`)
  }, [currentScreen, game.hydrated])

  // SSL-351: per-step onboarding analytics. These lived in the retired
  // GameApp shell and were lost with it (SSL-75), so none ever reached
  // PostHog from the live shell. `started` fires when the active step
  // changes; `completed` when the step that was showing is marked done.
  const trackedCoach = useRef<{ id: number; screen: string; index: number } | null>(null)
  useEffect(() => {
    let previous = trackedCoach.current
    if (previous && previous.id !== coach?.id && game.doneSteps[previous.id]) {
      captureGameEvent('tutorial_step_completed', {
        tutorial: 'onboarding',
        step_id: previous.id,
        screen: previous.screen,
        step_index: previous.index,
        total_steps: coachSteps.length,
      })
      previous = null
    }
    if (coach && previous?.id !== coach.id) {
      captureGameEvent('tutorial_step_started', {
        tutorial: 'onboarding',
        step_id: coach.id,
        screen: coach.screen,
        step_index: coachIndex,
        total_steps: coachSteps.length,
      })
    }
    // A step hidden behind a popup or sheet is still the tracked step.
    trackedCoach.current = coach ? { id: coach.id, screen: coach.screen, index: coachIndex } : previous
    // Only re-evaluate when the active step or the done set changes, not on
    // every render that keeps the same coach step.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coach?.id, game.doneSteps])

  return (
    <main className="game-stage" aria-label="Landnam game">
      {/* No-op unless running as an installed PWA; warms the Takeon/Pixi
          chunks so Surface Ops works offline (see web/vendor/takeon/README.md). */}
      <TakeOnPwaPreload />
      {/* SSL-35: every screen sits on the shared full-page frame. The old
          boxed desktop device-card for menu screens (and the blurred Earth
          Base backdrop behind it) is retired; see lib/screen-layouts.ts. */}
      <div className="portrait-canvas portrait-canvas--full-page">
        <BackendStatus />
        <LandnamSyncStatus />
        {/* Mission alerts have a reserved desktop slot to the left of the
            horizontal resource HUD. They are hidden at compact widths rather
            than wrapping over progression controls. Base-surface only — Hub
            renders Subsurface as a slide within the same 'hub' route rather
            than a real navigation (see game.subsurfaceView), so the screen
            check alone can't tell the two apart. */}
        {game.player.freeOperations && currentScreen === 'hub' && !game.subsurfaceView && (
          <div data-ui-zone={UI_ZONES.ambientPrompt} className="hub-push-opt-in">
            <PushOptIn userId={game.authUserId ?? undefined} />
          </div>
        )}
        <DevShortcuts />

        {/* Account access belongs to the shared shell, not to one scene. A
            player can leave the Hub for mission setup, flight, or debrief,
            so this remains available across every gameplay route. */}
        {/* SSL-35: Menu lives in Home's bottom bar. The old corner Menu pill
            sat on top of every other screen's header at phone width. */}

        {/* The route page remains mounted below as a URL/state synchronizer,
            but the visible game tree belongs to this persistent layout. */}
        <div className="game-screen-area">
          {!game.authGateOpen && (
            <ScreenContent screen={game.screen} game={game} hasCoach={hasCoach} />
          )}
        </div>
        {children}

        <ToastLayer toasts={game.toasts} onDismiss={game.dismissToast} />
        <SurveySheet blockWhile={!!game.popup || !!coach || !!game.pendingTerritoryClaimFor || !isSurveySafeScreen(currentScreen)} />

        {coach && !game.popup && !game.authGateOpen && (
          <TutorialCoach
            key={coach.id}
            stepIndex={coachIndex}
            steps={coachSteps}
            step={coach}
            total={coachSteps.length}
            onManualNext={game.coachManualNext}
            onSkip={() => {
              captureGameEvent('tutorial_skipped', {
                tutorial: 'onboarding',
                step_id: coach.id,
                screen: coach.screen,
                step_index: coachIndex,
                total_steps: coachSteps.length,
              })
              // A skipped step is not a completed one.
              trackedCoach.current = null
              game.skipTutorial(coachSteps.map(s => s.id))
            }}
          />
        )}

        {game.popup === 'tutorial-complete' && !game.authGateOpen && (
          <TutorialCompleteSheet
            onDone={focuses => {
              game.setPlayer(player => ({ ...player, programFocuses: focuses }))
              game.setPopup(null)
            }}
            onBuildSilo={focuses => {
              game.setPlayer(player => ({ ...player, programFocuses: focuses }))
              game.setPopup(null)
              game.go('build')
            }}
          />
        )}
        {game.popup && game.popup !== 'tutorial-complete' && game.shellSheet !== 'market' && !game.authGateOpen && (
          <UnlockPopup
            kind={game.popup}
            onClose={() => {
              const popup = game.popup
              if (popup === 'loan') { game.acceptLoan(); return }
              game.setPopup(null)
              if (popup === 'sr2') game.go('hub')
            }}
            onDismiss={game.popup === 'loan' ? () => game.setPopup(null) : undefined}
          />
        )}
        {game.authGateOpen && <GateLanding />}
        {game.pendingTerritoryClaimFor && !game.authGateOpen && (
          <TerritoryClaimPopup
            targetId={game.pendingTerritoryClaimFor.targetId}
            clientId={game.pendingTerritoryClaimFor.clientId}
            onDismiss={game.clearTerritoryClaimPopup}
          />
        )}
      </div>

      {!game.authGateOpen && <ShellSheets />}
    </main>
  )
}

export default function GameLayout({ children }: { children: ReactNode }) {
  return (
    <GameProvider>
      <GameChrome>{children}</GameChrome>
    </GameProvider>
  )
}
