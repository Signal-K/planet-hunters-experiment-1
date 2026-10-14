'use client'

import { useMemo, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { GameProvider, useGame } from '@/game-context'
import { storageLessonDoneSteps, storageLessonSteps, trainingCoachSteps } from '@/lib/data'
import type { Screen } from '@/lib/game-types'
import { ScreenContent } from '@/components/game/GameScreenRouter'
import FlightPlan from '@/components/game/FlightPlan'
import MissionTicker from '@/components/game/MissionTicker'
import UnlockPopup from '@/components/game/UnlockPopup'
import { TutorialCompleteSheet } from '@/components/game/TutorialCompleteSheet'
import { agencyTrainingStage, agencyTrainingTrack, freeOpsActivities } from '@/lib/systems/AgencyOnboardingSystem'
import BackendStatus from '@/components/game/BackendStatus'
import LandnamSyncStatus from '@/components/game/LandnamSyncStatus'
import SurveySheet from '@/components/ui/SurveySheet'
import ToastLayer from '@/components/ui/ToastLayer'
import { initPostHog, captureScreenView, captureGameEvent } from '@/lib/posthog'
import { OPEN_FRIENDS_EVENT, OPEN_SETTINGS_EVENT } from '@/lib/mining/openChrome'
import { SURVEY_SAFE_SCREENS } from '@/lib/survey-gating'
import DevShortcuts from '@/components/dev/DevShortcuts'
import AuthGateSheet from '@/components/game/AuthGateSheet'
import SettingsSheet from '@/components/game/SettingsSheet'
import FriendsSheet from '@/components/game/FriendsSheet'
import CommunityHubSheet from '@/components/game/CommunityHubSheet'
import TakeOnPwaPreload from '@/components/takeon/TakeOnPwaPreload'
import { useCoreLoopAnalytics } from '@/lib/hooks/useCoreLoopAnalytics'
import { applyStoredOrientation } from '@/lib/orientation'

function GameCanvas() {
  const game = useGame()
  const router = useRouter()
  const arrivalScheduledFor = useRef<number | null>(null)
  const returnScheduledKey = useRef<string | null>(null)
  const priorScreenRef = useRef<Screen | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [friendsOpen, setFriendsOpen] = useState(false)
  const [hubOpen, setHubOpen] = useState(false)

  useCoreLoopAnalytics(game.screen, game.player.flightPlan)

  // PostHog injects recorder/survey scripts. Initialising during module
  // evaluation can let those scripts mutate the document while React is
  // still hydrating, producing a real production hydration mismatch. Run it
  // after the first client commit instead.
  useEffect(() => {
    initPostHog()
  }, [])

  useEffect(() => {
    applyStoredOrientation()
  }, [])

  useEffect(() => {
    const openSettings = () => setSettingsOpen(true)
    const openFriends = () => setFriendsOpen(true)
    window.addEventListener(OPEN_SETTINGS_EVENT, openSettings)
    window.addEventListener(OPEN_FRIENDS_EVENT, openFriends)
    return () => {
      window.removeEventListener(OPEN_SETTINGS_EVENT, openSettings)
      window.removeEventListener(OPEN_FRIENDS_EVENT, openFriends)
    }
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

  // SSL-576: the storage lesson follows the first missions alongside Free Ops.
  const storageSteps = useMemo(() => storageLessonSteps(game.player, game.doneSteps), [game.player, game.doneSteps])
  const coachSteps = useMemo(() => {
    if (storageSteps.length) return storageSteps
    if (!game.tutorial || game.player.freeOperations) return []
    return trainingCoachSteps(agencyTrainingStage(game.player))
  }, [game.player, game.tutorial, storageSteps])
  const coachDone = useMemo(
    () => (storageSteps.length ? storageLessonDoneSteps(game.player, game.doneSteps) : game.doneSteps),
    [game.player, game.doneSteps, storageSteps],
  )

  const coach = useMemo(() => {
    const activeCoach = coachSteps.find(step => step.screen === game.screen && !coachDone[step.id]) ?? null
    // The Launchpad mission chooser is a modal owned by the current scene.
    // Hide the coach while it is open so onboarding copy never sits over, or
    // points back at, the control the player is already using.
    if (game.subsurfaceView || settingsOpen || friendsOpen || hubOpen || game.popup || game.authGateOpen || (game.screen === 'launchpad' && game.launchpadMissionMenuOpen)) return null
    return activeCoach
  }, [coachSteps, coachDone, friendsOpen, hubOpen, game.authGateOpen, game.launchpadMissionMenuOpen, game.popup, game.screen, game.subsurfaceView, settingsOpen])

  const coachIndex = coach ? coachSteps.findIndex(step => step.id === coach.id) : -1
  const onboardingActive = !!coach

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
        <LandnamSyncStatus />
        <DevShortcuts />
        <div
          className="game-screen-area"
          style={{ pointerEvents: game.hydrated ? 'auto' : 'none' }}
        >
          {/* Gated the same way as [screen]/page.tsx — see STS-624. */}
          {!game.authGateOpen && (
            <ScreenContent screen={game.screen} game={game} onboardingActive={onboardingActive} onBackFromHangar={() => {
              game.returnFromHangar()
              if (window.location.pathname.includes('/game/ship-customizer')) {
                router.replace('/game')
              }
            }} />
          )}
        </div>
        <BackendStatus />
          {coach && !game.authGateOpen && (
            <FlightPlan
              stepIndex={coachIndex}
              step={coach}
              total={coachSteps.length}
              go={coach.manual ? { label: coach.cta || 'Got it', run: () => game.completeStep(coach.id) } : undefined}
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

        <ToastLayer toasts={game.toasts} onDismiss={game.dismissToast} />
        {!coach && !game.popup && !game.authGateOpen && (
          <MissionTicker player={game.player} screen={game.screen} onResume={game.go} />
        )}
        <SurveySheet blockWhile={surveyBlocked} />

        {game.popup === 'tutorial-complete' && !game.authGateOpen && (
          <TutorialCompleteSheet
            track={agencyTrainingTrack(game.player)}
            activities={freeOpsActivities(game.player)}
            onChoose={activity => { game.setPopup(null); activity.screen === 'missions' ? game.goToMissions() : game.go(activity.screen) }}
            onClose={() => game.setPopup(null)}
          />
        )}
        {game.popup && game.popup !== 'tutorial-complete' && game.screen !== 'market' && !game.authGateOpen && (
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
        {game.authGateOpen && (
          <AuthGateSheet
            error={game.authGateError}
            onSignIn={game.signInFromGate}
            onCreateAccount={game.createAccountFromGate}
          />
        )}
      </div>

      {/* No desktop sidebar. The redesign's goal was for desktop not to need
          one — the Earth Base's structures and action rail are the menu, so a
          permanent nav rail is redundant chrome. Settings moved to the small
          corner button above; everything else routes through the base. */}
      {settingsOpen && <SettingsSheet onClose={() => setSettingsOpen(false)} />}
      {friendsOpen && <FriendsSheet onClose={() => setFriendsOpen(false)} />}
      {hubOpen && <CommunityHubSheet onClose={() => setHubOpen(false)} />}
    </main>
  )
}

export default function GameApp() {
  return <GameProvider><GameCanvas /></GameProvider>
}
