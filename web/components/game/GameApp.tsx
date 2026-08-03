'use client'

import { useMemo, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { GameProvider, useGame } from '@/game-context'
import { M1_STEPS, M2_STEPS, M3_STEPS } from '@/lib/data'
import type { Screen } from '@/lib/game-types'
import { ScreenContent } from '@/components/game/GameScreenRouter'
import TutorialCoach from '@/components/game/TutorialCoach'
import MissionTicker from '@/components/game/MissionTicker'
import SaveProgressPrompt from '@/components/game/SaveProgressPrompt'
import UnlockPopup from '@/components/game/UnlockPopup'
import BottomTabBar from '@/components/layout/BottomTabBar'
import BackendStatus from '@/components/game/BackendStatus'
import LandnamSyncStatus from '@/components/game/LandnamSyncStatus'
import { PushOptIn } from '@/components/game/PushOptIn'
import ContentUpdateNotice from '@/components/game/ContentUpdateNotice'
import FeedbackButton from '@/components/ui/FeedbackButton'
import SurveySheet from '@/components/ui/SurveySheet'
import ToastLayer from '@/components/ui/ToastLayer'
import { initPostHog } from '@/lib/posthog'
import DevShortcuts from '@/components/dev/DevShortcuts'
import AuthGateSheet from '@/components/game/AuthGateSheet'
import SettingsSheet from '@/components/game/SettingsSheet'
import SettingsButton from '@/components/game/SettingsButton'
import TerritoryClaimPopup from '@/components/game/TerritoryClaimPopup'
import { UI_ZONES } from '@/lib/ui-zones'

if (typeof window !== 'undefined') initPostHog()

function GameCanvas() {
  const game = useGame()
  const router = useRouter()
  const arrivalScheduledFor = useRef<number | null>(null)
  const returnScheduledKey = useRef<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)

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
    if (!game.tutorial) return []
    if (game.player.missionsDone === 0) return M1_STEPS
    if (game.player.missionsDone === 1) return M2_STEPS
    if (game.player.missionsDone === 2) return M3_STEPS
    return []
  }, [game.player.missionsDone, game.tutorial])

  const coach = useMemo(() => {
    return coachSteps.find(step => step.screen === game.screen && !game.doneSteps[step.id]) ?? null
  }, [coachSteps, game.doneSteps, game.screen])

  const coachIndex = coach ? coachSteps.findIndex(step => step.id === coach.id) : -1
  const hasCoach = !!coach

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
    : game.screen === 'galaxy' ? 'galaxy' : game.screen === 'fab' ? 'fab' : game.screen === 'skills' ? 'skills' : 'hub'
  const showHub = game.screen === 'hub' || (game.screen === 'market' && !game.player.freeOperations)
  const showNav = (showHub || ['missions', 'skills', 'targets'].includes(game.screen)) && !(game.screen === 'targets' && hasCoach)
  const showFeedback = ['hub', 'missions', 'market', 'hangar', 'skills'].includes(game.screen)
    && !showNav
    && !game.popup
    && !game.upgradePromptOpen
    && !game.authGateOpen

  // Allowlist, not a blocklist — surveys should only ever appear in a scene
  // AFTER an action (a genuine "resting" screen), never while a player is
  // mid-setup or mid-execution of a mission. A blocklist of "screens to
  // avoid" rots exactly like the target/mineral bypass did earlier: miss one
  // screen (targets, rocket-buy) and a survey slides up mid-setup again the
  // moment the player leaves the one screen that WAS blocked (e.g. debrief).
  const SURVEY_SAFE_SCREENS: Screen[] = ['hub', 'missions', 'market', 'hangar', 'skills', 'galaxy', 'refinery']
  const surveyBlocked = !!coach
    || !!game.popup
    || !SURVEY_SAFE_SCREENS.includes(game.screen)

  return (
    <main className="game-stage" aria-label="Landnam game">
      <div className="portrait-canvas">
        <BackendStatus />
        <LandnamSyncStatus />
        {/* Mission alerts have a reserved desktop slot to the left of the
            horizontal resource HUD. They are hidden at compact widths rather
            than wrapping over progression controls. */}
        {game.player.freeOperations && game.screen === 'hub' && (
          <div data-ui-zone={UI_ZONES.ambientPrompt} className="hub-push-opt-in">
            <PushOptIn userId={game.authUserId ?? undefined} />
          </div>
        )}
        {/* Settings — previously only reachable from the desktop sidebar's
            gear. Small corner affordance so removing that rail doesn't strand
            it. Hub only, so it never sits over gameplay chrome. */}
        {game.screen === 'hub' && (
          <SettingsButton onClick={() => setSettingsOpen(true)} />
        )}
        <DevShortcuts />
        <div className="game-screen-area">
          {/* Gated the same way as [screen]/page.tsx — see STS-624. */}
          {!game.authGateOpen && (
            <ScreenContent screen={game.screen} game={game} hasCoach={hasCoach} onBackFromHangar={() => {
              game.go('hub')
              if (window.location.pathname.includes('/game/ship-customizer')) {
                router.replace('/game')
              }
            }} />
          )}
        </div>

        <ToastLayer toasts={game.toasts} onDismiss={game.dismissToast} />
        {!coach && !game.popup && !game.upgradePromptOpen && !game.authGateOpen && (
          <MissionTicker player={game.player} screen={game.screen} onResume={game.go} />
        )}
        {showFeedback && <FeedbackButton />}
        {['hub', 'missions', 'launchpad'].includes(game.screen) && (
          <ContentUpdateNotice
            player={game.player}
            blocked={surveyBlocked || game.upgradePromptOpen || game.authGateOpen}
            onNavigate={screen => game.go(screen)}
          />
        )}
        <SurveySheet blockWhile={surveyBlocked} />
        {showNav && <BottomTabBar current={currentNav} onNav={goFromNav} />}

        {coach && (
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
        {game.popup && game.screen !== 'market' && (
          <UnlockPopup
            kind={game.popup}
            onClose={() => {
              const popup = game.popup
              if (popup === 'loan') {
                game.acceptLoan()
                return
              }
              game.setPopup(null)
              if (popup === 'sr2') {
                game.go('hub')
              }
              if (popup === 'ship-customizer') {
                game.go('hangar')
              }
            }}
            onDismiss={game.popup === 'loan' ? () => game.setPopup(null) : undefined}
          />
        )}
        {game.upgradePromptOpen && !game.popup && (
          <SaveProgressPrompt onUpgrade={game.upgradeAccount} onDismiss={game.dismissUpgradePrompt} />
        )}
        {game.authGateOpen && (
          <AuthGateSheet
            error={game.authGateError}
            onSignIn={game.signInFromGate}
            onCreateAccount={game.createAccountFromGate}
            onSkip={game.skipAuthGate}
          />
        )}
        {game.pendingTerritoryClaimFor && (
          <TerritoryClaimPopup
            targetId={game.pendingTerritoryClaimFor.targetId}
            clientId={game.pendingTerritoryClaimFor.clientId}
            onDismiss={game.clearTerritoryClaimPopup}
          />
        )}
      </div>

      {/* No desktop sidebar. The redesign's goal was for desktop not to need
          one — the Earth Base's structures and action rail are the menu, so a
          permanent nav rail is redundant chrome. Settings moved to the small
          corner button above; everything else routes through the base. */}
      {settingsOpen && <SettingsSheet onClose={() => setSettingsOpen(false)} />}
    </main>
  )
}

export default function GameApp() {
  return <GameProvider><GameCanvas /></GameProvider>
}
