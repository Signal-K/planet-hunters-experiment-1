'use client'

import { useMemo, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { GameProvider, useGame } from '@/game-context'
import { M1_STEPS, M2_STEPS, M3_STEPS } from '@/lib/data'
import { FREE_OPS_START_MISSIONS_DONE } from '@/lib/data/mission-generator'
import type { Screen } from '@/lib/game-types'
import { ScreenContent } from '@/components/game/GameScreenRouter'
import TutorialCoach from '@/components/game/TutorialCoach'
import MissionTicker from '@/components/game/MissionTicker'
import UnlockPopup from '@/components/game/UnlockPopup'
import { TutorialCompleteSheet } from '@/components/game/TutorialCompleteSheet'
import BackendStatus from '@/components/game/BackendStatus'
import LandnamSyncStatus from '@/components/game/LandnamSyncStatus'
import { PushOptIn } from '@/components/game/PushOptIn'
import SurveySheet from '@/components/ui/SurveySheet'
import ToastLayer from '@/components/ui/ToastLayer'
import { initPostHog, captureScreenView, captureGameEvent } from '@/lib/posthog'
import { SURVEY_SAFE_SCREENS } from '@/lib/survey-gating'
import DevShortcuts from '@/components/dev/DevShortcuts'
import GateLanding from '@/components/game/landing/GateLanding'
import TakeOnPwaPreload from '@/components/takeon/TakeOnPwaPreload'
import { UI_ZONES } from '@/lib/ui-zones'
import ShellSheets from '@/components/game/ShellSheets'

function GameCanvas() {
  const game = useGame()
  const router = useRouter()
  const arrivalScheduledFor = useRef<number | null>(null)
  const returnScheduledKey = useRef<string | null>(null)
  const priorScreenRef = useRef<Screen | null>(null)

  // PostHog injects recorder/survey scripts. Initialising during module
  // evaluation can let those scripts mutate the document while React is
  // still hydrating, producing a real production hydration mismatch. Run it
  // after the first client commit instead.
  useEffect(() => {
    initPostHog()
  }, [])

  // The game is a single-page SPA — `screen` changes without a real
  // navigation, so PostHog needs a manual pageview per screen to power
  // Paths/Funnels/Trends the same way a multi-page site gets for free.
  useEffect(() => {
    captureScreenView(game.screen)
  }, [game.screen])

  // When a timed transit starts, schedule a push notification.
  useEffect(() => {
    const arrivalAt = game.player.arrivalAt
    if (game.screen !== 'transit' || !arrivalAt) return
    if (arrivalScheduledFor.current === arrivalAt) return
    arrivalScheduledFor.current = arrivalAt

    async function schedule() {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (!sub) return
      const mission = game.mission
      const target = game.target
      await fetch('/api/push/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          keys: sub.toJSON().keys,
          scheduledFor: arrivalAt,
          title: mission ? `${mission.title} — ARRIVED` : 'ROCKET ARRIVED',
          body: target ? `Your rocket has reached ${target.name}. Time to mine.` : 'Your rocket has arrived at its destination.',
        }),
      })
    }
    void schedule().catch(() => {})
  }, [game.screen, game.player.arrivalAt, game.mission, game.target])

  // Current gameplay returns immediately when mining completes; schedule that return alert
  // from the debrief transition so closed browsers still receive the Earth-return copy.
  useEffect(() => {
    if (game.screen !== 'debrief' || !game.lastCargo) return
    const mission = game.mission
    const target = game.target
    const key = `${mission?.id ?? 'mission'}:${target?.id ?? 'target'}:${JSON.stringify(game.lastCargo)}`
    if (returnScheduledKey.current === key) return
    returnScheduledKey.current = key

    async function schedule() {
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
          scheduledFor: Date.now() + 1000,
          title: mission ? `${mission.title} — RETURNED` : 'ROCKET RETURNED',
          body: target ? `Your rocket has returned from ${target.name}. Cargo is ready for debrief.` : 'Your rocket has returned to Earth.',
        }),
      })
    }
    void schedule().catch(() => {})
  }, [game.screen, game.lastCargo, game.mission, game.target])

  const coachSteps = useMemo(() => {
    if (!game.tutorial || game.player.missionsDone >= FREE_OPS_START_MISSIONS_DONE) return []
    if (game.player.missionsDone === 0) return M1_STEPS
    if (game.player.missionsDone === 1) return M2_STEPS
    if (game.player.missionsDone === 2) return M3_STEPS
    return []
  }, [game.player.missionsDone, game.tutorial])

  const coach = useMemo(() => {
    const activeCoach = coachSteps.find(step => step.screen === game.screen && !game.doneSteps[step.id]) ?? null
    // The Launchpad mission chooser is a modal owned by the current scene.
    // Hide the coach while it is open so onboarding copy never sits over, or
    // points back at, the control the player is already using.
    if (game.subsurfaceView || game.shellSheet || game.popup || game.authGateOpen || (game.screen === 'launchpad' && game.launchpadMissionMenuOpen)) return null
    return activeCoach
  }, [coachSteps, game.authGateOpen, game.doneSteps, game.launchpadMissionMenuOpen, game.popup, game.screen, game.shellSheet, game.subsurfaceView])

  const coachIndex = coach ? coachSteps.findIndex(step => step.id === coach.id) : -1
  const hasCoach = !!coach

  // No onboarding-step-level analytics existed before — only the
  // mission-level events (mission_completed etc). Without per-step coverage
  // there's no way to see where inside M1/M2/M3 players actually stall.
  useEffect(() => {
    if (!coach) return
    captureGameEvent('tutorial_step_started', {
      step_id: coach.id,
      screen: coach.screen,
      step_index: coachIndex,
      total_steps: coachSteps.length,
    })
    // Only re-fire when the active step itself changes, not on every
    // re-render that keeps the same coach step.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coach?.id])

  // A status toast belongs to the action that caused it. Keeping it mounted
  // after a screen change made Earth-recovery and payout messages obscure the
  // next mission setup, especially on portrait mobile.
  useEffect(() => {
    if (priorScreenRef.current === null) {
      priorScreenRef.current = game.screen
      return
    }
    if (priorScreenRef.current === game.screen) return
    priorScreenRef.current = game.screen
    game.toasts.forEach(toast => game.dismissToast(toast.id))
  }, [game.dismissToast, game.screen, game.toasts])

  const surveyBlocked = !!coach
    || !!game.popup
    || !SURVEY_SAFE_SCREENS.includes(game.screen)

  return (
    <main
      className="game-stage"
      aria-label="Landnam game"
      aria-busy={!game.hydrated}
      data-game-hydrated={game.hydrated ? 'true' : 'false'}
    >
      <TakeOnPwaPreload />
      <div className="portrait-canvas">
        <BackendStatus />
        <LandnamSyncStatus />
        {/* Mission alerts have a reserved desktop slot to the left of the
            horizontal resource HUD. They are hidden at compact widths rather
            than wrapping over progression controls. */}
        {game.player.freeOperations && game.screen === 'hub' && !game.subsurfaceView && (
          <div data-ui-zone={UI_ZONES.ambientPrompt} className="hub-push-opt-in">
            <PushOptIn userId={game.authUserId ?? undefined} />
          </div>
        )}
        <DevShortcuts />
        <div
          className="game-screen-area"
          style={{ pointerEvents: game.hydrated ? 'auto' : 'none' }}
        >
          {/* Gated the same way as [screen]/page.tsx — see STS-624. */}
          {!game.authGateOpen && (
            <ScreenContent screen={game.screen} game={game} hasCoach={hasCoach} onBackFromHangar={() => {
              game.returnFromHangar()
              if (window.location.pathname.includes('/game/ship-customizer')) {
                router.replace('/game')
              }
            }} />
          )}
        </div>

        <ToastLayer toasts={game.toasts} onDismiss={game.dismissToast} />
        {!coach && !game.popup && !game.authGateOpen && (
          <MissionTicker player={game.player} screen={game.screen} onResume={game.go} />
        )}
        <SurveySheet blockWhile={surveyBlocked} />

        {coach && !game.authGateOpen && (
          <TutorialCoach
            key={coach.id}
            stepIndex={coachIndex}
            steps={coachSteps}
            step={coach}
            total={coachSteps.length}
            onManualNext={game.coachManualNext}
            onSkip={() => {
              // Distinct from a step being completed in the normal flow —
              // this is the player bailing out of onboarding entirely, which
              // mission_completed/tutorial_step_started alone can't surface.
              captureGameEvent('tutorial_skipped', {
                step_id: coach?.id ?? null,
                screen: coach?.screen ?? null,
                step_index: coachIndex,
                total_steps: coachSteps.length,
              })
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
              game.setPopup(null)
              if (popup === 'sr2') {
                game.go('hub')
              }
              if (popup === 'ship-customizer') {
                game.go('hangar')
              }
            }}
          />
        )}
        {game.authGateOpen && <GateLanding />}
      </div>

      {/* No desktop sidebar. The redesign's goal was for desktop not to need
          one — the Earth Base's structures and action rail are the menu, so a
          permanent nav rail is redundant chrome. Settings moved to the small
          corner button above; everything else routes through the base. */}
      {!game.authGateOpen && <ShellSheets />}
    </main>
  )
}

export default function GameApp() {
  return <GameProvider><GameCanvas /></GameProvider>
}
