'use client'

import { useMemo, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { GameProvider, useGame } from '@/game-context'
import { M1_STEPS, M2_STEPS, M3_STEPS } from '@/lib/data'
import { FREE_OPS_START_MISSIONS_DONE } from '@/lib/data/mission-generator'
import type { Screen } from '@/lib/game-types'
import { ScreenContent } from '@/components/game/GameScreenRouter'
import TutorialCoach from '@/components/game/TutorialCoach'
import MissionTicker from '@/components/game/MissionTicker'
import UnlockPopup from '@/components/game/UnlockPopup'
import BottomTabBar from '@/components/layout/BottomTabBar'
import BackendStatus from '@/components/game/BackendStatus'
import LandnamSyncStatus from '@/components/game/LandnamSyncStatus'
import { PushOptIn } from '@/components/game/PushOptIn'
import FeedbackButton from '@/components/ui/FeedbackButton'
import SurveySheet from '@/components/ui/SurveySheet'
import ToastLayer from '@/components/ui/ToastLayer'
import { initPostHog, captureScreenView } from '@/lib/posthog'
import { SURVEY_SAFE_SCREENS } from '@/lib/survey-gating'
import DevShortcuts from '@/components/dev/DevShortcuts'
import AuthGateSheet from '@/components/game/AuthGateSheet'
import SettingsSheet from '@/components/game/SettingsSheet'
import FriendsButton from '@/components/game/FriendsButton'
import FriendsSheet from '@/components/game/FriendsSheet'
import TakeOnPwaPreload from '@/components/takeon/TakeOnPwaPreload'
import { UI_ZONES } from '@/lib/ui-zones'

function GameCanvas() {
  const game = useGame()
  const router = useRouter()
  const arrivalScheduledFor = useRef<number | null>(null)
  const returnScheduledKey = useRef<string | null>(null)
  const priorScreenRef = useRef<Screen | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [friendsOpen, setFriendsOpen] = useState(false)

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
      if (!('serviceWorker' in navigator)) return
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
    void schedule()
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
      if (!('serviceWorker' in navigator)) return
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
    void schedule()
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
    if (game.subsurfaceView || settingsOpen || friendsOpen || game.popup || game.authGateOpen) return null
    return activeCoach
  }, [coachSteps, friendsOpen, game.authGateOpen, game.doneSteps, game.popup, game.screen, game.subsurfaceView, settingsOpen])

  const coachIndex = coach ? coachSteps.findIndex(step => step.id === coach.id) : -1
  const hasCoach = !!coach

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

  function goFromNav(id: string) {
    if (id === 'missions') {
      game.goToMissions()
      return
    }
    if (id === 'fab') {
      if (!game.player.freeOperations) {
        game.go('hub')
        return
      }
      // The Build tab is an entry point, not a resume button. Clear any
      // completed/stale mission context so it opens the Free Ops chooser.
      game.setMissionId(null)
      game.setTargetId(null)
      game.go('fab')
      return
    }
    if (id === 'market') {
      game.go('market')
      return
    }
    if (id === 'skills') {
      game.go('skills')
      return
    }
    game.go(id as Screen)
  }

  const currentNav = game.screen === 'missions' || game.screen === 'targets'
    ? 'missions'
    : game.screen === 'mission-history' ? 'mission-history' : game.screen === 'galaxy' ? 'galaxy' : game.screen === 'fab' ? 'fab' : game.screen === 'skills' ? 'skills' : 'hub'
  const showHub = game.screen === 'hub' || (game.screen === 'market' && !game.player.freeOperations)
  const showNav = (showHub || ['missions', 'skills', 'targets', 'mission-history'].includes(game.screen)) && !(game.screen === 'targets' && hasCoach)
  const showFeedback = game.screen === 'hub'
    && !game.subsurfaceView
    && !game.popup
    && !game.authGateOpen

  const surveyBlocked = !!coach
    || !!game.popup
    || !SURVEY_SAFE_SCREENS.includes(game.screen)

  return (
    <main className="game-stage" aria-label="Landnam game">
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
        {/* Utility controls live in the top command cluster. Keeping them out
            of the ground dock prevents the mission status row and bottom nav
            from becoming their accidental hit target at narrow widths. */}
        {game.screen === 'hub' && !game.subsurfaceView && (
          <button
            data-testid="settings-button"
            aria-label="Settings"
            onClick={() => setSettingsOpen(true)}
            style={{
              position: 'absolute', top: 56, right: 12, zIndex: 22,
              width: 34, height: 34, borderRadius: 999, cursor: 'pointer',
              display: 'grid', placeItems: 'center', padding: 0,
              background: 'var(--hub-panel, #080d18)',
              border: '1.5px solid var(--hub-outline, rgba(255,255,255,0.55))',
              color: 'var(--hub-cyan, #6cd4ff)',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
          </button>
        )}
        {game.screen === 'hub' && !game.subsurfaceView && !game.authGateOpen && (
          <FriendsButton onClick={() => setFriendsOpen(true)} />
        )}
        <DevShortcuts />
        <div className="game-screen-area">
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
        {showFeedback && <FeedbackButton />}
        <SurveySheet blockWhile={surveyBlocked} />
        {showNav && <BottomTabBar current={currentNav} onNav={goFromNav} />}

        {coach && !game.authGateOpen && (
          <TutorialCoach
            key={coach.id}
            stepIndex={coachIndex}
            steps={coachSteps}
            step={coach}
            total={coachSteps.length}
            onManualNext={game.coachManualNext}
            onSkip={() => game.skipTutorial(coachSteps.map(s => s.id))}
          />
        )}
        {game.popup && game.screen !== 'market' && !game.authGateOpen && (
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
            onContinue={game.continueWithEmail}
            otpPending={game.authGateOtpId !== null}
            onVerifyOtp={game.verifyOtp}
          />
        )}
      </div>

      {/* No desktop sidebar. The redesign's goal was for desktop not to need
          one — the Earth Base's structures and action rail are the menu, so a
          permanent nav rail is redundant chrome. Settings moved to the small
          corner button above; everything else routes through the base. */}
      {settingsOpen && <SettingsSheet onClose={() => setSettingsOpen(false)} />}
      {friendsOpen && <FriendsSheet onClose={() => setFriendsOpen(false)} />}
    </main>
  )
}

export default function GameApp() {
  return <GameProvider><GameCanvas /></GameProvider>
}
