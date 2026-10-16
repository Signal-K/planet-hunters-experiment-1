'use client'

import { type ReactNode, useMemo, useEffect, useRef, useState } from 'react'
import { GameProvider, useGame } from '@/game-context'
import { trainingStepOnPath, trainingTryStep } from '@/lib/data'
import FlightPlan from '@/components/game/FlightPlan'
import UnlockPopup from '@/components/game/UnlockPopup'
import { TutorialCompleteSheet } from '@/components/game/TutorialCompleteSheet'
import { resolveShortcut } from '@/lib/game-shortcuts'
import { AGENCY_TRAINING_POPUP, agencyTrainingStage, agencyTrainingTrack, freeOpsActivities } from '@/lib/systems/AgencyOnboardingSystem'
import { currentTrainingTry } from '@/lib/systems/FlightPlanSystem'
import BackendStatus from '@/components/game/BackendStatus'
import LandnamSyncStatus from '@/components/game/LandnamSyncStatus'
import SurveySheet from '@/components/ui/SurveySheet'
import ToastLayer from '@/components/ui/ToastLayer'
import { notifyFiredAlert } from '@/lib/priceAlertNotify'
import { captureGameEvent, captureScreenView, initPostHog } from '@/lib/posthog'
import DevShortcuts from '@/components/dev/DevShortcuts'
import AuthGateSheet from '@/components/game/AuthGateSheet'
import SettingsSheet from '@/components/game/SettingsSheet'
import FriendsSheet from '@/components/game/FriendsSheet'
import CommunityHubSheet from '@/components/game/CommunityHubSheet'
import SuiteHopRail from '@/components/game/SuiteHopRail'
import TerritoryClaimPopup from '@/components/game/TerritoryClaimPopup'
import { isSurveySafeScreen } from '@/lib/survey-gating'
import { LOCATION_SCREENS, type Screen } from '@/lib/game-types'
import { HubWorldBackground } from '@/components/game/hub/HubWorldBackground'
import { useTimeOfDay } from '@/lib/hooks/useTimeOfDay'
import { ScreenContent } from '@/components/game/GameScreenRouter'
import { useHelpOpen } from '@/lib/help/open-state'
import { useCoreLoopAnalytics } from '@/lib/hooks/useCoreLoopAnalytics'
import { OPEN_FRIENDS_EVENT, OPEN_SETTINGS_EVENT } from '@/lib/mining/openChrome'

function GameChrome({ children }: { children: ReactNode }) {
  const game = useGame()
  const arrivalScheduledFor = useRef<number | null>(null)
  const returnScheduledKey = useRef<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [friendsOpen, setFriendsOpen] = useState(false)
  const [communityOpen, setCommunityOpen] = useState(false)
  const { phase: backdropSkyPhase } = useTimeOfDay()

  useCoreLoopAnalytics(game.screen, game.player.flightPlan)

  // Keep third-party analytics script injection out of React hydration. See
  // GameApp's equivalent effect for the legacy route shell.
  useEffect(() => {
    initPostHog()
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

  // SSL-342: this shell serves every live /game/* route, so the per-screen
  // pageview has to fire here; the legacy GameApp copy only covers the ship
  // customizer.
  useEffect(() => {
    captureScreenView(game.screen)
  }, [game.screen])

  // Schedule push notification when transit starts
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
          scheduledFor: Date.now() + 1000,
          title: mission ? `${mission.title} — RETURNED` : 'ROCKET RETURNED',
          body: target ? `Your rocket has returned from ${target.name}. Cargo is ready for debrief.` : 'Your rocket has returned to Earth.',
        }),
      })
    }
    void schedule().catch(() => {})
  }, [game.screen, game.player.arrivalAt, game.mission, game.target])

  // Schedule return notification when debrief is reached
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

  // The game state changes synchronously, while the URL follows in a client
  // navigation. Render the persistent scene from that state so route segment
  // replacement cannot tear down and recreate the background between steps.
  const currentScreen = game.screen
  const activeTry = currentTrainingTry(game.player.flightPlan)
  const flightStep = activeTry
    ? trainingTryStep(activeTry, currentScreen, { returning: !!game.player.returningToEarth })
    : undefined
  const coach = useMemo(() => {
    // A Menu Replay re-arms its try even after Free Ops, when the tutorial flag is off.
    // The training tries stay on offer as an optional guide after Free Ops opens (SSL-611: no required path) until done or skipped.
    const guideOffered = agencyTrainingStage(game.player) !== 'free-ops'
    const routeCoach = (!game.player.freeOperations && game.tutorial) || game.player.flightPlan?.replayTry || guideOffered ? flightStep ?? null : null
    if (currentScreen === 'hub' && game.subsurfaceView) return null
    // The Launchpad mission chooser is a modal owned by the current scene.
    // Hide the coach while it is open so onboarding copy never sits over, or
    // points back at, the control the player is already using.
    if (settingsOpen || friendsOpen || communityOpen || game.popup || game.authGateOpen || (currentScreen === 'launchpad' && game.launchpadMissionMenuOpen)) return null
    return routeCoach
  }, [communityOpen, flightStep, friendsOpen, game.authGateOpen, game.launchpadMissionMenuOpen, game.player, game.player.flightPlan?.replayTry, game.player.freeOperations, game.popup, game.subsurfaceView, game.tutorial, settingsOpen])

  const coachIndex = flightStep ? ['mining', 'scan', 'part'].indexOf(flightStep.try) : -1
  // Only the required-looking onboarding (not the optional guide) changes the hub's own copy.
  const onboardingActive = !!coach && (!game.player.freeOperations || !!game.player.flightPlan?.replayTry)

  // SSL-432: the 8s hint waits while a help sheet or "Show me" run is open and
  // restarts its clock when help closes.
  const helpOpen = useHelpOpen()
  useEffect(() => {
    if (!coach) return
    game.startFlightPlan()
    if (helpOpen) return
    const timer = window.setTimeout(() => game.showFlightPlanHint(), 8_000)
    return () => window.clearTimeout(timer)
  }, [coach?.id, currentScreen, helpOpen])

  // SSL-342: per-step training analytics for the live shell (mirrors GameApp).
  // Fires only when the active step itself changes.
  useEffect(() => {
    if (!coach) return
    captureGameEvent('tutorial_step_started', {
      step_id: coach.id,
      screen: coach.screen,
      step_index: coachIndex,
      total_steps: 3,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coach?.id])

  const resumeOperations = () => {
    if (game.player.activeMission) {
      const phase = game.player.missionPhase
      game.go(phase === 'survey' ? 'rover-survey' : phase === 'mining' ? 'mining' : phase === 'debrief' ? 'debrief' : 'transit')
      return
    }
    game.goToMissions()
  }

  const currentNav = ['missions', 'targets'].includes(currentScreen)
    ? 'missions'
    : currentScreen === 'mission-history' ? 'mission-history' : currentScreen === 'instrument-hub' || currentScreen === 'galaxy' ? 'instrument-hub' : currentScreen === 'fab' ? 'fab' : currentScreen === 'skills' ? 'skills' : 'hub'
  // Price alerts fire when a spot price reaches the target, including as supply pressure recovers over time.
  const hasPriceAlerts = (game.player.priceAlerts ?? []).some(a => a.firedAt == null)
  const checkPriceAlerts = game.checkPriceAlerts
  useEffect(() => {
    if (!hasPriceAlerts) return
    checkPriceAlerts()
    const timer = window.setInterval(checkPriceAlerts, 30_000)
    return () => window.clearInterval(timer)
  }, [hasPriceAlerts, checkPriceAlerts, game.player.dailyEconomySnapshot])
  const notifiedAlerts = useRef<Set<string>>(new Set((game.player.priceAlerts ?? []).filter(a => a.firedAt != null).map(a => `${a.id}:${a.firedAt}`)))
  useEffect(() => {
    for (const alert of game.player.priceAlerts ?? []) {
      if (alert.firedAt == null) continue
      const key = `${alert.id}:${alert.firedAt}`
      if (notifiedAlerts.current.has(key)) continue
      notifiedAlerts.current.add(key)
      notifyFiredAlert(alert)
    }
  }, [game.player.priceAlerts])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const action = resolveShortcut(event)
      if (action === 'close-tray') {
        setSettingsOpen(false); setFriendsOpen(false); setCommunityOpen(false)
        if (currentScreen === 'market' || currentScreen === 'hub-subsurface' || currentScreen === 'mission-history') game.goBack('hub')
      } else if (action === 'open-market') {
        if (game.player.freeOperations) game.go('market')
      } else if (action === 'switch-operation') {
        resumeOperations()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [game, resumeOperations, currentScreen])
  // Location screens (physical places in the game world, and the mission-run
  // sequence through them) own the full viewport instead of sitting inside
  // the generic desktop device-card — that boxed treatment is for menus
  // (Missions, Skills, ...) and reads as a modal over the game
  // itself when applied to a place the player is actually standing in.
  // See LOCATION_SCREENS.
  const isImmersiveEarthBaseRoute = LOCATION_SCREENS.has(currentScreen as Screen)

  return (
    <main className="game-stage" aria-label="Landnam game">
      {/* Boxed/menu screens (Mission Board, Skills, Debrief, ...)
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
      <div className={`portrait-canvas ${isImmersiveEarthBaseRoute ? 'portrait-canvas--full-page' : ''} ${currentScreen === 'mining' ? 'portrait-canvas--mining' : ''}`}>
        {/* Everything that belongs to the game area, overlays included, is
            positioned inside this stage so it can never land on the shared
            nav — a bottom row in portrait, a left rail on landscape phones. */}
        <div className="game-stage-main">
          <LandnamSyncStatus />
          <DevShortcuts />
          {/* Suite return rail (SSL-296): hop back to the SSC garden / Spectra. */}
          {currentScreen === 'launchpad' && !game.launchpadMissionMenuOpen && !game.subsurfaceView && !game.authGateOpen && (
            <SuiteHopRail signedIn={!!game.authUserId} />
          )}

          {/* The route page remains mounted below as a URL/state synchronizer,
              but the visible game tree belongs to this persistent layout. */}
          <div className="game-screen-area">
            {!game.authGateOpen && (
              <ScreenContent screen={game.screen} game={game} onboardingActive={onboardingActive} />
            )}
          </div>
        <BackendStatus />
        <div className="flight-plan-slot" data-testid="flight-plan-slot">
        {/* The intro's own heading already says what to do; the strip would sit over it. */}
        {coach && !game.popup && !game.authGateOpen && game.screen !== 'intro' && (
          <FlightPlan
            key={coach.id}
            stepIndex={coachIndex}
              step={coach}
            total={3}
            hidden={game.player.flightPlan?.hidden}
            onHiddenChange={hidden => game.setPlayer(player => ({ ...player, flightPlan: { ...(player.flightPlan ?? { completed: {} }), hidden } }))}
            screen={currentScreen}
            offPath={'try' in coach && !trainingStepOnPath(coach, currentScreen)}
            hint={activeTry && game.player.flightPlan?.hintShownFor === activeTry ? coach.hint : undefined}
            go={'try' in coach && coach.screen === '*' && game.screen === 'hub'
              ? (coach.try === 'part' ? { label: 'Open Hangar', run: () => game.go('hangar') }
                : coach.try === 'scan' ? { label: 'Open Galaxy', run: () => game.go('galaxy') } : undefined)
              : undefined}
            onSkip={() => {
              captureGameEvent('tutorial_skipped', {
                step_id: coach.id,
                screen: coach.screen,
                step_index: coachIndex,
                total_steps: 3,
              })
              game.skipFlightPlan()
            }}
          />
        )}
        </div>
          {children}

          <ToastLayer toasts={game.toasts} onDismiss={game.dismissToast} />
          <SurveySheet blockWhile={!!game.popup || !!coach || !!game.pendingTerritoryClaimFor || !isSurveySafeScreen(currentScreen)} />

        </div>

        {(game.popup === 'tutorial-complete' || game.popup === AGENCY_TRAINING_POPUP) && !game.authGateOpen && (
          <TutorialCompleteSheet
            track={agencyTrainingTrack(game.player)}
            activities={freeOpsActivities(game.player)}
            mode={game.popup === AGENCY_TRAINING_POPUP ? 'review' : 'handoff'}
            onChoose={activity => {
              captureGameEvent('free_ops_activity_chosen', { activity: activity.id, source: game.popup })
              // SSL-342: the handoff sheet shows once, when Free Ops opens, so a
              // choice made from it (not the later 'review' replay) is the
              // player's first exercise of agency.
              if (game.popup === 'tutorial-complete') captureGameEvent('free_ops_first_choice', { activity: activity.id })
              game.setPopup(null)
              if (activity.screen === 'missions') game.goToMissions()
              else if (activity.screen === 'launchpad') game.openLaunchpad()
              else game.go(activity.screen)
            }}
            onClose={() => game.setPopup(null)}
          />
        )}
        {game.popup && game.popup !== 'tutorial-complete' && game.popup !== AGENCY_TRAINING_POPUP && currentScreen !== 'market' && !game.authGateOpen && (
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

export default function GameLayoutClient({ children }: { children: ReactNode }) {
  return (
    <GameProvider>
      <GameChrome>{children}</GameChrome>
    </GameProvider>
  )
}
