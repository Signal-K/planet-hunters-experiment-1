'use client'

import { type ReactNode, useMemo, useEffect, useRef, useState } from 'react'
import { GameProvider, useGame } from '@/game-context'
import { M1_STEPS, M2_STEPS, M3_STEPS } from '@/lib/data'
import { FREE_OPS_START_MISSIONS_DONE } from '@/lib/data/mission-generator'
import TutorialCoach from '@/components/game/TutorialCoach'
import UnlockPopup from '@/components/game/UnlockPopup'
import { TutorialCompleteSheet } from '@/components/game/TutorialCompleteSheet'
import BottomTabBar from '@/components/layout/BottomTabBar'
import BackendStatus from '@/components/game/BackendStatus'
import LandnamSyncStatus from '@/components/game/LandnamSyncStatus'
import { PushOptIn } from '@/components/game/PushOptIn'
import FeedbackButton from '@/components/ui/FeedbackButton'
import SurveySheet from '@/components/ui/SurveySheet'
import ToastLayer from '@/components/ui/ToastLayer'
import { initPostHog } from '@/lib/posthog'
import DevShortcuts from '@/components/dev/DevShortcuts'
import AuthGateSheet from '@/components/game/AuthGateSheet'
import SettingsSheet from '@/components/game/SettingsSheet'
import FriendsButton from '@/components/game/FriendsButton'
import FriendsSheet from '@/components/game/FriendsSheet'
import CommunityButton from '@/components/game/CommunityButton'
import CommunityHubSheet from '@/components/game/CommunityHubSheet'
import SuiteHopRail from '@/components/game/SuiteHopRail'
import TakeOnPwaPreload from '@/components/takeon/TakeOnPwaPreload'
import TerritoryClaimPopup from '@/components/game/TerritoryClaimPopup'
import { UI_ZONES } from '@/lib/ui-zones'
import { isSurveySafeScreen } from '@/lib/survey-gating'
import { LOCATION_SCREENS, type Screen } from '@/lib/game-types'
import { HubWorldBackground } from '@/components/game/hub/HubWorldBackground'
import { useTimeOfDay } from '@/lib/hooks/useTimeOfDay'
import { ScreenContent } from '@/components/game/GameScreenRouter'
import { returnNotification, type ReturnNotification } from '@/lib/return-notification'

function GameChrome({ children }: { children: ReactNode }) {
  const game = useGame()
  const returnScheduledFor = useRef<number | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [friendsOpen, setFriendsOpen] = useState(false)
  const [communityOpen, setCommunityOpen] = useState(false)
  const { phase: backdropSkyPhase } = useTimeOfDay()

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
    if (settingsOpen || friendsOpen || communityOpen || game.popup || game.authGateOpen || (currentScreen === 'launchpad' && game.launchpadMissionMenuOpen)) return null
    return routeCoach
  }, [coachSteps, communityOpen, currentScreen, friendsOpen, game.authGateOpen, game.doneSteps, game.launchpadMissionMenuOpen, game.popup, game.subsurfaceView, settingsOpen])

  const coachIndex = coach ? coachSteps.findIndex(step => step.id === coach.id) : -1
  const hasCoach = !!coach

  // The Mission → Target → Rocket → Launch flow owns one stable frame. The
  // bottom navigation would reserve a different amount of viewport height on
  // the Mission step and make that frame jump when the player advances.
  const showNav = ['hub', 'skills', 'mission-history'].includes(currentScreen)
  const showFeedback = currentScreen === 'hub'
    && !game.subsurfaceView
    && !game.popup
    && !game.authGateOpen

  function goFromNav(id: string) {
    if (id === 'missions') { game.goToMissions(); return }
    if (id === 'fab') { game.go(game.mission && game.target ? 'fab' : 'missions'); return }
    if (id === 'market') { game.go('market'); return }
    if (id === 'skills') { game.go('skills'); return }
    game.go(id as Parameters<typeof game.go>[0])
  }

  const currentNav = ['missions', 'targets'].includes(currentScreen)
    ? 'missions'
    : currentScreen === 'mission-history' ? 'mission-history' : currentScreen === 'instrument-hub' || currentScreen === 'galaxy' ? 'instrument-hub' : currentScreen === 'fab' ? 'fab' : currentScreen === 'skills' ? 'skills' : 'hub'
  // Location screens (physical places in the game world, and the mission-run
  // sequence through them) own the full viewport instead of sitting inside
  // the generic desktop device-card — that boxed treatment is for menus
  // (Missions, Market, Skills, ...) and reads as a modal over the game
  // itself when applied to a place the player is actually standing in.
  // See LOCATION_SCREENS.
  const isImmersiveEarthBaseRoute = LOCATION_SCREENS.has(currentScreen as Screen)

  return (
    <main className="game-stage" aria-label="Landnam game">
      {/* Boxed/menu screens (Mission Board, Market, Skills, Debrief, ...)
          leave real margin around the device-card on desktop — that used to
          be a flat neutral gradient, which read as a blank grey void behind
          the modal instead of the game continuing underneath it. Earth Base
          is the one location every player always has (the de facto home),
          so it stands in as "the world behind the modal" for every boxed
          screen rather than trying to track and re-render whichever
          specific screen the player was on before navigating into a menu.
          Fully covered by `.portrait-canvas--full-page` on location screens,
          so no conditional render needed. */}
      {!isImmersiveEarthBaseRoute && (
        <div
          className="game-stage-backdrop"
          aria-hidden="true"
          style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden' }}
        >
          <HubWorldBackground phase={backdropSkyPhase} />
        </div>
      )}
      {/* No-op unless running as an installed PWA; warms the Takeon/Pixi
          chunks so Surface Ops works offline (see web/vendor/takeon/README.md). */}
      <TakeOnPwaPreload />
      <div className={`portrait-canvas ${isImmersiveEarthBaseRoute ? 'portrait-canvas--full-page' : ''}`}>
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
        {currentScreen !== 'intro' && !game.authGateOpen && (
          <button
            data-testid="settings-button"
            aria-label="Open menu"
            aria-expanded={settingsOpen}
            onClick={() => setSettingsOpen(true)}
            className="game-menu-button"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
            <span>Menu</span>
          </button>
        )}

        {/* Friends and Community corner buttons (KES-83, KES-233). Hub only. */}
        {currentScreen === 'hub' && !game.subsurfaceView && !game.authGateOpen && (
          <>
            <FriendsButton onClick={() => setFriendsOpen(true)} />
            <CommunityButton onClick={() => setCommunityOpen(true)} />
          </>
        )}

        {/* Suite return rail (SSL-296): hop back to the SSC garden / Spectra. */}
        {(currentScreen === 'hub' || currentScreen === 'launchpad') && !game.subsurfaceView && !game.authGateOpen && (
          <SuiteHopRail signedIn={!!game.authUserId} />
        )}

        {/* The route page remains mounted below as a URL/state synchronizer,
            but the visible game tree belongs to this persistent layout. */}
        <div className="game-screen-area">
          {!game.authGateOpen && (
            <ScreenContent screen={game.screen} game={game} hasCoach={hasCoach} />
          )}
        </div>
        {children}

        <ToastLayer toasts={game.toasts} onDismiss={game.dismissToast} />
        {showFeedback && <FeedbackButton />}
        <SurveySheet blockWhile={!!game.popup || !!coach || !!game.pendingTerritoryClaimFor || !isSurveySafeScreen(currentScreen)} />
        {showNav && <BottomTabBar current={currentNav} onNav={goFromNav} />}

        {coach && !game.popup && !game.authGateOpen && (
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
        {game.popup && game.popup !== 'tutorial-complete' && currentScreen !== 'market' && !game.authGateOpen && (
          <UnlockPopup
            kind={game.popup}
            onClose={() => {
              const popup = game.popup
              if (popup === 'loan') { game.acceptLoan(); return }
              game.setPopup(null)
              if (popup === 'sr2') game.go('hub')
              if (popup === 'ship-customizer') game.go('hangar')
            }}
            onDismiss={game.popup === 'loan' ? () => game.setPopup(null) : undefined}
          />
        )}
        {game.authGateOpen && (
          <AuthGateSheet
            error={game.authGateError}
            onSignIn={game.signInFromGate}
            onCreateAccount={game.createAccountFromGate}
          />
        )}
        {game.pendingTerritoryClaimFor && !game.authGateOpen && (
          <TerritoryClaimPopup
            targetId={game.pendingTerritoryClaimFor.targetId}
            clientId={game.pendingTerritoryClaimFor.clientId}
            onDismiss={game.clearTerritoryClaimPopup}
          />
        )}
      </div>

      {settingsOpen && <SettingsSheet onClose={() => setSettingsOpen(false)} />}
      {friendsOpen && <FriendsSheet onClose={() => setFriendsOpen(false)} />}
      {communityOpen && <CommunityHubSheet onClose={() => setCommunityOpen(false)} />}
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
