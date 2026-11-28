'use client'

import { hasAgencyUnlock } from '@/lib/agency/construction-translation'
import { scienceAccessPlayer } from '@/lib/agency/community'

import { rocketPadLevel } from '@/lib/data/rockets'
import { addStamp } from '@/lib/research/stamps'
import { useEffect, useState, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import { requestConsensus } from '@/lib/community/client'
import type { ConsensusProject, ConsensusQueueItem, ConsensusReadout } from '@/lib/community/consensus'
import type { PendingConsensusReview } from '@/components/game/screens/CommunityConsensus'
import { useGame } from '@/game-context'
import { ROCKET_MODELS, rocketDisplayForConfig, rocketModelForConfig, } from '@/lib/data'
import { agencyRocket } from '@/lib/rockets'
import { currentTrainingTry } from '@/lib/systems/FlightPlanSystem'
import type { Screen } from '@/lib/game-types'
// IntroScreen and HubScreen are the two most likely first paints (cold start
// and post-onboarding default), so they stay in the main bundle. Every other
// screen below is code-split with next/dynamic — the switch below only ever
// renders one of them at a time, so there's no reason to ship all ~20
// screens' JS on the very first load.
import IntroScreen from '@/components/game/screens/IntroScreen'
import { FLIGHT_ASSET_URLS } from '@/lib/offline/flight-assets'
import { SurfaceSiloPanel } from '@/components/game/hub/SurfaceSiloPanel'
import BaseNextFlight from '@/components/game/hub/BaseNextFlight'
import { STARTER_BASE_PLACED, STARTER_BASE_PLOTS } from '@/lib/data/starter-base'
import HubScreen from '@/components/game/screens/HubScreen'

const ScreenLoading = () => (
  <div className="game-screen-loading" role="status" aria-label="Loading screen">
    <span>LOADING</span>
  </div>
)

const loadMissionSetupRoutes = () => import('@/components/game/MissionSetupRoutes')
const loadMissionOperationRoutes = () => import('@/components/game/MissionOperationRoutes')
const loadMissionPlannerScreen = () => import('@/components/game/screens/MissionPlannerScreen')
const loadLaunchpadScreen = () => import('@/components/game/screens/LaunchpadScreen')
const loadInstrumentHubScreen = () => import('@/components/game/screens/InstrumentHubScreen')
const loadTessDiscoveryScreen = () => import('@/components/game/screens/TessDiscoveryScreen')
const loadRadioMeteorScreen = () => import('@/components/game/screens/RadioMeteorScreen')
const loadProbeScanScreen = () => import('@/components/game/screens/ProbeScanScreen')
const loadSaturnStormSearchScreen = () => import('@/components/game/screens/SaturnStormSearchScreen')
const loadAsteroidDiscoveryScreen = () => import('@/components/game/screens/AsteroidDiscoveryScreen')
const loadMissionHistoryScreen = () => import('@/components/game/screens/MissionHistoryScreen')
const loadCommunityResearchScreen = () => import('@/components/game/screens/CommunityResearchScreen')
const loadNarrativeLedgerScreen = () => import('@/components/game/screens/NarrativeLedgerScreen')

// Every lazy screen chunk. The hub imports all of them once while online so
// the service worker can keep them; otherwise a screen first opened offline
// has no script to load and renders blank.
const ALL_SCREEN_LOADERS = [
  loadMissionSetupRoutes, loadMissionOperationRoutes,
  loadMissionPlannerScreen, loadLaunchpadScreen, loadInstrumentHubScreen, loadTessDiscoveryScreen,
  loadRadioMeteorScreen, loadProbeScanScreen, loadSaturnStormSearchScreen, loadAsteroidDiscoveryScreen,
  loadMissionHistoryScreen, loadCommunityResearchScreen, loadNarrativeLedgerScreen,
]

const MissionSetupRoutes = dynamic(loadMissionSetupRoutes, { loading: ScreenLoading })
const MissionOperationRoutes = dynamic(loadMissionOperationRoutes, { loading: ScreenLoading })
const MissionPlannerScreen = dynamic(loadMissionPlannerScreen, { loading: ScreenLoading })
const LaunchpadScreen = dynamic(loadLaunchpadScreen, { loading: ScreenLoading })
const InstrumentHubScreen = dynamic(loadInstrumentHubScreen, { loading: ScreenLoading })
const TessDiscoveryScreen = dynamic(loadTessDiscoveryScreen, { loading: ScreenLoading })
const RadioMeteorScreen = dynamic(loadRadioMeteorScreen, { loading: ScreenLoading })
const ProbeWatchScreen = dynamic(() => import('@/components/game/screens/ProbeWatchScreen'), { loading: ScreenLoading })
const ProbeScanScreen = dynamic(loadProbeScanScreen, { loading: ScreenLoading })
const SaturnStormSearchScreen = dynamic(loadSaturnStormSearchScreen, { loading: ScreenLoading })
const AsteroidDiscoveryScreen = dynamic(loadAsteroidDiscoveryScreen, { loading: ScreenLoading })
const MissionHistoryScreen = dynamic(loadMissionHistoryScreen, { loading: ScreenLoading })
const CommunityResearchScreen = dynamic(loadCommunityResearchScreen, { loading: ScreenLoading })
const NarrativeLedgerScreen = dynamic(loadNarrativeLedgerScreen, { loading: ScreenLoading })
import { enqueueSurvey } from '@/lib/surveys'
import { requestMissionBoardEvent, requestMissionBoardSite, requestMissionBoardTab } from '@/lib/mission-board-nav'
import { requestMiningPlan, requestSurveyPlan } from '@/lib/mission-planner-nav'
import { TRAINING_TESS_CANDIDATE, VISUAL_ASTEROID_CANDIDATE, VISUAL_TESS_CANDIDATE } from '@/lib/visual-fixtures'
import { captureGameEvent } from '@/lib/posthog'
import { dismissHubPrompt } from '@/lib/hub-prompts'
import type { InstrumentSignal } from '@/lib/systems/InstrumentFeedSystem'
import {
  DEEP_SPACE_TELESCOPE_INSTRUMENT_ID,
  SATURN_IMAGER_INSTRUMENT_ID,
  TRANSIT_TELESCOPE_INSTRUMENT_ID,
  instrumentDigestDateKey,
  markInstrumentDigestNotified,
} from '@/lib/systems/InstrumentFeedSystem'
import { missionResumeScreen } from '@/lib/mission-resume'
import { resolveRun } from '@/lib/systems/RunRecovery'
import { isSettledMissionRun } from '@/lib/systems/MissionRunLifecycle'
import { surfaceForScreen } from '@/lib/screen-layouts'
import { SurfaceLayout } from '@/components/layout/frame/ScreenLayouts'
import SceneTransition from '@/components/game/SceneTransition'
import { useResearchPassport } from '@/lib/research/useResearchPassport'
import { withPassportRewards } from '@/lib/research/passport'
import { useCommunityResearch } from '@/lib/research/useCommunityResearch'
import { withCommunityBonus } from '@/lib/research/marketplace'
import { SkyPointingScreen } from '@/components/game/screens/SkyPointing'
import { chainNextScreen, liveShowerChain, receiverEventId } from '@/lib/orionids/chain'
import { skyEventNow } from '@/lib/data'
import { isDevLauncherEnabled } from '@/lib/devAccess'
import { agencySummary } from '@/lib/agency/programme'
import { choosePath, claimResearchReward, onlineTelescopes, pointTelescope, telescopesNeedingPointing, type InstrumentPointing } from '@/lib/research/paths'
export { VALID_SCREENS } from '@/lib/game-screens'

// Shared per-screen render map — the single source of truth for "which
// component renders for game.screen". Used by both the URL-synced
// (main)/[screen] route and the standalone ship-customizer dev route, which
// otherwise diverged silently (each bugfix had to be ported twice).
type ScreenContentProps = {
  screen: Screen
  game: ReturnType<typeof useGame>
  onboardingActive: boolean
  /** The coach strip is on screen; hub callouts wait so two guides never compete. */
  coachVisible?: boolean
  /** Overrides HangarScreen's onBack; falls back to the remembered entry scene. */
  onBackFromHangar?: () => void
}

// SSL-441: every scene change fades through a void veil instead of hard-cutting.
export function ScreenContent(props: ScreenContentProps) {
  return (
    <SceneTransition sceneKey={props.screen}>
      {/* SSL-35 / SSL-452: every screen renders inside the shared frame,
          labelled with the layout type its route maps to in GAME_ROUTES. */}
      <SurfaceLayout surface={surfaceForScreen(props.screen)}>
        <ScreenBody {...props} />
      </SurfaceLayout>
    </SceneTransition>
  )
}

function ScreenBody({
  screen,
  game,
  onboardingActive,
  coachVisible,
  onBackFromHangar,
}: ScreenContentProps) {
  // Launch sequence state lives here so it's scoped to the fab screen
  // Dev-only: `?launchscene=1` mounts the launch sequence so it can be rendered headless.
  const [launchPending, setLaunchPending] = useState(() =>
    process.env.NODE_ENV !== 'production' && typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('launchscene'))
  const [inspectSignal, setInspectSignal] = useState<InstrumentSignal | null>(null)
  // SSL-746: a review in progress, and the reviewer's own finished run waiting to be compared.
  const [reviewTarget, setReviewTarget] = useState<ConsensusQueueItem | null>(null)
  const [pointingTarget, setPointingTarget] = useState<InstrumentPointing>('transit')
  const [pointingStep, setPointingStep] = useState(0)
  const [pendingReview, setPendingReview] = useState<PendingConsensusReview | null>(null)
  // One way out of every instrument screen: reviews go back to where they started, everything else to the Data hub.
  // The inspected subject is dropped with it so the next door does not open on a stale one.
  const leaveInstrument = (project: ConsensusQueueItem['project']) => {
    const reviewing = reviewTarget?.project === project
    setReviewTarget(null)
    setInspectSignal(null)
    if (reviewing) game.goBack()
    else game.go('instrument-hub')
  }

  /** SSL-746: a finished readout either asks for consensus, or (in review mode) answers the review. */
  const shareReadout = (project: ConsensusProject, subjectId: string, readout: ConsensusReadout) => {
    if (reviewTarget?.project === project) {
      setPendingReview({ requestId: reviewTarget.id, project, subjectId, ownReadout: readout })
      setReviewTarget(null)
      setInspectSignal(null)
      return game.go('community-research')
    }
    requestConsensus(project, subjectId, readout)
      .then(() => game.addToast('Asked the community to check it. See Community research > Review.', 'ok'))
      .catch(() => game.addToast('Could not send the request. Check your connection.', 'warn'))
  }
  const passport = useResearchPassport(['hub', 'community-research', 'rocket-workshop'].includes(screen), game.player.researchStamps, game.authUserId)
  useEffect(() => { if (passport.data) game.setPlayer(current => withPassportRewards(current, passport.data)) }, [passport.data]) // eslint-disable-line react-hooks/exhaustive-deps
  const communityResearch = useCommunityResearch(screen === 'hub' || screen === 'instrument-hub' || screen === 'community-research')

  // SSL-685: when the server says the month's goal is reached, the Exchange and fuel reward lives on the player until the month ends.
  useEffect(() => {
    if (communityResearch?.reachedAt == null) return
    game.setPlayer(current => withCommunityBonus(current, communityResearch))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [communityResearch])

  useEffect(() => {
    if (screen !== 'hub') return
    const warmCommonDestinations = () => {
      const seen = new Set(performance.getEntriesByType('resource').map(entry => entry.name))
      void Promise.allSettled(ALL_SCREEN_LOADERS.map(load => load())).then(() => {
        const controller = navigator.serviceWorker?.controller
        if (!controller) return
        const urls = performance.getEntriesByType('resource')
          .map(entry => entry.name)
          .filter(url => !seen.has(url))
          .filter(url => { try { return new URL(url).pathname.startsWith('/_next/static/') } catch { return false } })
        controller.postMessage({ type: 'CACHE_URLS', urls: [...FLIGHT_ASSET_URLS, ...urls] })
      })
    }
    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number
      cancelIdleCallback?: (id: number) => void
    }
    if (idleWindow.requestIdleCallback) {
      const idleId = idleWindow.requestIdleCallback(warmCommonDestinations, { timeout: 1500 })
      return () => idleWindow.cancelIdleCallback?.(idleId)
    }
    const timer = globalThis.setTimeout(warmCommonDestinations, 600)
    return () => globalThis.clearTimeout(timer)
  }, [screen])
  // A saved run whose mission or target is gone shows as a craft in the sky that can never be
  // resumed. Give the live catalog time to arrive, then clear it (no penalty). A run that can be
  // resolved but lost its ids gets them back.
  const gameRef = useRef(game)
  gameRef.current = game
  useEffect(() => {
    if (screen !== 'hub' || !game.hydrated || !game.player.activeMission) return
    const timer = window.setTimeout(() => {
      const now = gameRef.current
      if (!now.player.activeMission || !navigator.onLine) return
      const found = resolveRun(now.player, { missionId: now.missionId, targetId: now.targetId }, now.catalog)
      if (found?.mission && found.target) {
        if (!now.missionId) now.setMissionId(found.missionId)
        if (!now.targetId && found.targetId) now.setTargetId(found.targetId)
        return
      }
      const details = {
        source: 'hub',
        missionId: now.missionId ?? null,
        targetId: now.targetId ?? null,
        runMissionId: now.player.activeMission.id,
        runLabel: now.player.activeMission.label,
        missionPhase: now.player.missionPhase ?? null,
        missionFound: !!found?.mission,
        targetFound: !!found?.target,
        cargoKinds: Object.keys(now.player.miningCargoInProgress ?? {}).length,
      }
      console.warn('mission run unrecoverable, clearing', JSON.stringify(details))
      captureGameEvent('mission_run_discarded', details)
      now.abandonMission({ confirmed: true, waivePenalty: true })
      now.addToast('A mission run that lost its data was cleared.', 'warn')
    }, 12000)
    return () => window.clearTimeout(timer)
  }, [screen, game.hydrated, game.player.activeMission?.id, game.player.missionRunId])
  const handleLaunch = useCallback(() => setLaunchPending(true), [])
  const handleLaunchComplete = useCallback(() => {
    setLaunchPending(false)
    game.onLaunch()
  }, [game.onLaunch])
  const rocketDisplay = rocketDisplayForConfig(game.rocket)
  const transitTarget = game.player.headingToDelivery && game.deliveryTargetId
    ? game.catalog.targets.find(t => t.id === game.deliveryTargetId) ?? game.target
    : game.target
  // Debrief should attribute the Earth-return leg to the ship's last waypoint —
  // for two-leg "mine then deliver" missions that's the delivery target, not
  // the original mining site, otherwise the delivery stop reads as if it never happened.
  const debriefOriginTarget = game.mission?.deliveryTargetId
    ? game.catalog.targets.find(t => t.id === game.mission!.deliveryTargetId) ?? game.target
    : game.target
  const deliveryTargetName = game.mission?.deliveryTargetId
    ? game.catalog.targets.find(t => t.id === game.mission!.deliveryTargetId)?.name
    : undefined
  // For the debrief Route chip specifically: debriefOriginTarget above is
  // deliberately the delivery target (last waypoint), so the Route display
  // needs the actual mining site's name separately, resolved from
  // mission.targetId rather than reusing debriefOriginTarget (KES-352 —
  // this rendered as "deliveryTarget -> deliveryTarget" before this fix).
  const originTargetName = game.mission?.deliveryTargetId
    ? game.catalog.targets.find(t => t.id === game.mission!.targetId)?.name
    : undefined

  // Flight Plan supersedes the retired coach sequence. Keep the contextual
  // mining seam tied to the active try rather than the legacy coach state.
  const trainingMiningTry = currentTrainingTry(game.player.flightPlan) === 'mining'

  useEffect(() => {
    // The Build tab is a Free Ops entry point. Keep the onboarding assembly
    // flow reachable only when it has a real mission context; a bare/deep
    // linked fab route must never show a prefilled rocket.
    if (screen === 'fab' && !game.player.freeOperations && (!game.mission || !game.target)) game.go('hub')
    // A brand-new account has no base yet: send it to the intro (choose a site, then place the launchpad) instead of an empty field
    // whose coach says "Tap the tower". Wait for the remote save first so a returning player on a new device is not sent back.
    if (screen === 'hub' && game.hydrated && game.player.placed.length === 0 && game.player.missionsDone === 0 && !game.player.freeOperations) game.go('intro')
    // Build placement is a valid destination from Hub, Academy, instrument
    // screens, and the Launchpad availability panel. It has its own back
    // action, so a returning player must be allowed to open it and place a
    // newly unlocked structure.
  }, [screen, game.hydrated, game.player.placed.length, game.player.missionsDone, game.player.freeOperations, game.player.hasLanded, game.mission, game.target, game.go])


  switch (screen) {
    case 'intro':
      return (
        <IntroScreen
          onBegin={biome => {
            // A game with no base yet (an old empty save) gets the starter Base now. Nobody places buildings.
            game.setPlayer(current => ({
              ...current,
              ...(biome ? { earthBiome: biome } : {}),
              ...(current.placed.length === 0 ? { placed: [...STARTER_BASE_PLACED], placementPlots: { ...STARTER_BASE_PLOTS } } : {}),
            }))
            // The solar system is the agency's home; Earth opens the Base.
            game.go('missions')
          }}
          returning={game.player.missionsDone > 0 || game.player.placed.length > 0}
          missionsDone={game.player.missionsDone}
          totalEarned={game.player.francs}
          awaitingRemoteState={!game.hydrated || game.awaitingRemoteState}
          savedBiome={game.player.earthBiome}
        />
      )

    case 'hub': {
      const hub = (
        <HubScreen
          nextFlight={onService => <BaseNextFlight game={game} onService={onService} />}
          player={game.player}
          rocketVariant={rocketModelForConfig(game.rocket).tier >= 2 ? 'prospector' : 'explorer'}
          onboardingActive={onboardingActive}
          coachVisible={coachVisible}
          onOpenScene={s => {
            if (s === 'missions') { game.goToMissions(); return }
            if (s === 'launchpad') { game.openLaunchpad(); return }
            game.go(s)
          }}
          onPointTelescope={instrument => { setPointingTarget(instrument); game.go('sky-pointing') }}
          onDismissHubPrompt={key => game.setPlayer(current => dismissHubPrompt(current, key))}
          onFocusBuilding={building => {
            if (building === 'control-station') return game.go('instrument-hub')
            // Mission first: the hangar opens on its rocket choice only once a mission and
            // destination are set up. Otherwise it starts at the contract board.
            if (building === 'hangar') return game.mission && game.target ? game.go('hangar') : game.goToMissions()
            if (building === 'deep-space-telescope') return game.go('asteroid-discovery')
            if (building === 'missions') {
              // Unlike Launchpad below, a run in flight does NOT bounce the
              // player away from the Mission Board — they may reasonably want
              // to browse/plan the next contract while a leg is in flight.
              // The Hub resume banner and MissionTicker already cover getting
              // back into the active mission, so the Board doesn't need to
              // also gate on it (KES-262).
              if (game.player.pendingLaunch) return game.go('fab')
              return game.goToMissions()
            }
            if (building === 'launchpad') {
              // The physical building opens the Launchpad scene even while a
              // mission is active. Resuming flight is an explicit footer
              // action on that scene, not an accidental consequence of
              // clicking the building.
              if (game.player.pendingLaunch) return game.go('fab')
              // The Launchpad building opens the pad scene. Contracts, the
              // program chain and events live on the Mission Board.
              return game.openLaunchpad()
            }
          }}
          onServiceLaunchpad={game.serviceLaunchpad}
          communityResearch={communityResearch}
          onOpenCommunity={() => game.go('community-research')}
          onOpenEvents={eventId => {
            // Open the named event directly; its primary action starts or continues the mission.
            requestMissionBoardEvent(eventId ?? liveShowerChain(Date.now())?.eventId ?? 'orionids-2026')
            game.goToMissions()
          }}
        />
      )
      return hub
    }

    case 'surface-silo':
      return <SurfaceSiloPanel
        stash={game.player.stash}
        agencyLevels={game.player.agencyLevels}
        onClose={() => game.go('hub')}
      />

    case 'mission-history':
      // Mission Log is its own page with its own panel, not a tray over the Base.
      return (
          <MissionHistoryScreen
            records={game.player.completedMissions ?? []}
            clients={game.catalog.clients}
            targets={game.catalog.targets}
            missions={game.catalog.missions}
            player={game.player}
            onNewMission={() => { requestMissionBoardTab('contracts'); game.goToMissions() }}
            onResumeMission={game.player.activeMission ? () => game.go(missionResumeScreen(game.player)) : undefined}
            onBack={() => game.goBack('hub')}
          />
      )

    case 'instrument-hub':
      return (
        <InstrumentHubScreen
          player={game.player}
          communityResearch={communityResearch}
          targets={game.catalog.targets}
          catalog={game.catalog}
          onFollowUp={targetId => { requestSurveyPlan(targetId); game.go('mission-planner') }}
          onStartScan={game.startSurveyScan}
          onResolveScan={game.resolveSurveyScan}
          onBack={() => game.goBack()}
          onBuildGroundTelescope={() => game.buildGroundTelescope()}
          onOpenProgram={() => { requestMissionBoardTab('program'); game.goToMissions() }}
          onDonation={(craft, donate) => game.setPlayer(player => ({ ...player, agencyDonations: { ...player.agencyDonations, [craft]: donate } }))}
          onInspect={signal => {
            setInspectSignal(signal)
            game.go(signal.inspectorScreen)
          }}
          onOpenScreen={screen => game.go(screen)}
          onSnoozePing={() => {
            const dateKey = instrumentDigestDateKey()
            game.setPlayer(player => markInstrumentDigestNotified(
              markInstrumentDigestNotified(
                markInstrumentDigestNotified(player, TRANSIT_TELESCOPE_INSTRUMENT_ID, dateKey),
                DEEP_SPACE_TELESCOPE_INSTRUMENT_ID,
                dateKey,
              ),
              SATURN_IMAGER_INSTRUMENT_ID,
              dateKey,
            ))
          }}
        />
      )

    case 'tess-discovery':
      // Legacy inspector. Telescope tab and post-launch landing use instrument-hub.
      // Inspect still arrives here until the plate owns real TESS verdicts.
      return (
        <TessDiscoveryScreen
          player={scienceAccessPlayer(game.player)}
          inspectSubjectId={inspectSignal?.kind === 'transit' ? inspectSignal.id : undefined}
          visualCandidate={currentTrainingTry(game.player.flightPlan) === 'scan'
            ? TRAINING_TESS_CANDIDATE
            : game.visualFixture === 'tess' ? VISUAL_TESS_CANDIDATE : undefined}
          onBack={() => leaveInstrument('tess')}
          onAgency={() => game.go('hub')}
          onBuildStation={() => game.go('hub')}
          onOpenProgram={() => { requestMissionBoardTab('program'); game.goToMissions() }}
          onSubmit={game.submitTessClassification}
          reviewing={reviewTarget?.project === 'tess'}
          onShareReadout={(subjectId, readout) => shareReadout('tess', subjectId, readout)}
          onReplayTraining={currentTrainingTry(game.player.flightPlan) === 'scan' ? () => game.replayTrainingTry('scan') : undefined}
          onTrainingContinue={() => game.go('hangar')}
        />
      )

    case 'asteroid-discovery':
      return (
        <AsteroidDiscoveryScreen
          player={scienceAccessPlayer(game.player)}
          inspectSubjectId={inspectSignal?.kind === 'deep-space' ? inspectSignal.id : undefined}
          visualCandidate={game.visualFixture === 'asteroid' ? VISUAL_ASTEROID_CANDIDATE : undefined}
          onBack={() => leaveInstrument('asteroid')}
          onLaunchTelescope={() => game.go('launchpad')}
          onSubmit={game.submitAsteroidClassification}
          reviewing={reviewTarget?.project === 'asteroid'}
          onShareReadout={(subjectId, readout) => shareReadout('asteroid', subjectId, readout)}
        />
      )

    case 'saturn-storm-search':
      return (
        <SaturnStormSearchScreen
          player={scienceAccessPlayer(game.player)}
          inspectSubjectId={inspectSignal?.kind === 'saturn' ? inspectSignal.id : undefined}
          onBack={() => leaveInstrument('saturn')}
          onLaunchImager={() => game.go('launchpad')}
          onSubmit={game.submitSaturnClassification}
          reviewing={reviewTarget?.project === 'saturn'}
          onShareReadout={(subjectId, readout) => shareReadout('saturn', subjectId, readout)}
        />
      )

    case 'radio-meteors':
      // SSL-714: real Radio Meteor Zoo spectrograms; boxes are kept on Landnam's side.
      return (
        <RadioMeteorScreen
          player={game.player}
          eventId={receiverEventId(game.player, skyEventNow(isDevLauncherEnabled()))}
          onBack={() => game.goBack()}
          onSubmit={game.submitRadioMeteorClassification}
          onAgency={() => game.go('hub')}
          onResearch={() => game.go('community-research')}
        />
      )

    case 'probe-watch':
      return <ProbeWatchScreen player={game.player} onBack={() => game.goBack()} onSave={observation => game.setPlayer(player => ({ ...player, probeObservations: { ...player.probeObservations, [observation.id]: observation } }))} />

    case 'probe-scan':
      // SSL-773: the survey probes' readings, in the data hub.
      return (
        <ProbeScanScreen
          player={game.player}
          targets={game.catalog.targets}
          onBack={() => game.goBack()}
          onCollect={game.collectProbeData}
          onStartScan={game.startProbeScan}
          onLogSpectrum={game.logProbeSpectrum}
          onHub={() => game.go('hub')}
          onPlanRun={(targetId, runId) => { requestMissionBoardSite('free', targetId, runId); game.goToMissions() }}
          onPlanMineral={(targetId, mineral) => { requestMiningPlan(targetId, mineral); game.go('mission-planner') }}
          onViewContracts={targetId => { requestMissionBoardSite('contracts', targetId); game.goToMissions() }}
        />
      )

    case 'missions':
    case 'targets':
    case 'rocket-buy':
    case 'fab':
      return (
        <MissionSetupRoutes
          screen={screen}
          game={game}
          rocketDisplay={rocketDisplay}
          launchPending={launchPending}
          onTransferToLaunchpad={game.onTransferToLaunchpad}
          onLaunch={handleLaunch}
          onLaunchComplete={handleLaunchComplete}
        />
      )

    case 'flight':
    case 'landing':
    case 'mining':
    case 'delivery':
    case 'debrief':
      if (!transitTarget || !debriefOriginTarget) {
        return (
          <div className="game-screen theme-blueprint" data-testid="mission-operation-recovery" role="status" style={{ display: 'grid', placeItems: 'center', padding: 24 }}>
            <div style={{ maxWidth: 520, padding: 24, color: 'var(--ln-blueprint-ink)', background: 'var(--ln-blueprint-paper)', border: '2px solid var(--ln-blueprint-ink)', textAlign: 'center' }}>
              <p style={{ margin: '0 0 16px' }}>The flight details are still loading.</p>
              <button type="button" onClick={() => game.go('missions')} style={{ minHeight: 44, padding: '0 16px', color: 'var(--ln-blueprint-paper)', background: 'var(--ln-blueprint-blue)', border: '2px solid var(--ln-blueprint-ink)', font: '800 14px var(--ln-font-display)', letterSpacing: '.08em', textTransform: 'uppercase' }}>Back to missions</button>
            </div>
          </div>
        )
      }
      return (
        <MissionOperationRoutes
          screen={screen}
          game={game}
          trainingMiningTry={trainingMiningTry}
          transitTarget={transitTarget}
          debriefOriginTarget={debriefOriginTarget}
          deliveryTargetName={deliveryTargetName}
          originTargetName={originTargetName}
          rocketDisplay={rocketDisplay}
        />
      )

    case 'mission-planner':
      return <MissionPlannerScreen player={game.player} catalog={game.catalog} initialPlan={game.mission?.customPlan}
        onBack={() => game.go('missions')}
        onSave={plan => game.setPlayer(player => ({ ...player, missionPlans: { ...player.missionPlans, [plan.id]: plan } }))}
        onReview={id => game.onPickMission(id)} />
    case 'rocket-workshop':
    case 'hangar': {
      const rocket = agencyRocket(game.player)
      const next = ROCKET_MODELS.find(model => !model.locked && model.tier > rocket.tier)
      return <section className="game-screen theme-blueprint agency-hangar">
        <div>
          <h1>Agency rocket</h1>
          <img src={rocket.img} alt="" />
          <h2>{rocket.name}</h2>
          <p>Capacity {rocket.stats.cargo} · Range {rocket.stats.maxOrbit}</p>
          {next && <p>{next.name} unlocks after {next.missionsRequired} completed missions with launchpad level {rocketPadLevel(next)}. Completed: {game.player.missionsDone}.</p>}
          <button onClick={() => { game.reviewAgencyRocket(); return game.mission && game.target && !game.player.activeMission ? game.go('fab') : game.goToMissions() }}> {game.mission && game.target && !game.player.activeMission ? 'Review mission' : 'Mission Board'}</button>
          <button onClick={onBackFromHangar ?? game.returnFromHangar}>Back</button>
        </div>
      </section>
    }

    case 'sky-pointing':
      return (
        <SkyPointingScreen
          key={`${pointingTarget}:${pointingStep}`}
          player={game.player}
          onOpenData={() => game.go('instrument-hub')}
          start={pointingTarget}
          online={onlineTelescopes(game.player)}
          mapped={game.player.skyMap}
          onCancel={() => game.goBack('hub')}
          onAim={(instrument, aim, sector) => {
            const now = Date.now()
            game.setPlayer(current => pointTelescope(current, instrument, now, aim, sector))
          }}
          onLock={(instrument, aim, sector) => {
            const now = Date.now()
            game.setPlayer(current => pointTelescope(current, instrument, now, aim, sector))
            // Each online telescope is aimed in turn: carry straight on to the next unpointed one.
            const rest = telescopesNeedingPointing(pointTelescope(game.player, instrument, now, aim, sector), now)
            if (rest.length) {
              setPointingTarget(rest[0])
              // The operator may have switched tabs away from the route's starting instrument.
              // Reset its confirmation even when the next instrument is that same starting one.
              setPointingStep(step => step + 1)
            } else game.goBack('hub')
          }}
        />
      )

    case 'community-research':
      return (
        <CommunityResearchScreen
          passportStatus={passport.status}
          onWorkshop={() => game.go('rocket-workshop')}
          player={game.player}
          communityResearch={communityResearch}
          onBack={() => game.goBack('hub')}
          onChoosePath={path => {
            const now = Date.now()
            game.setPlayer(current => choosePath(current, path, now))
            // Liam, 10.11: starting the week's research includes choosing where to look: each online telescope is pointed first.
            const unpointed = telescopesNeedingPointing(game.player, now)
            if (unpointed.length) { setPointingTarget(unpointed[0]); game.go('sky-pointing') }
          }}
          onClaimReward={(step, progress) => game.setPlayer(current => claimResearchReward(current, step, progress, Date.now()))}
          pendingReview={pendingReview}
          onFinishReview={() => { game.setPlayer(current => addStamp(current, 'review', Date.now())); setPendingReview(null) }}
          onStartReview={item => {
            // Each kind opens on its own instrument, on the requester's subject, for the player's own run first.
            const route = {
              tess: { kind: 'transit', instrumentId: 'transit-telescope', inspectorScreen: 'tess-discovery' },
              asteroid: { kind: 'deep-space', instrumentId: 'deep-space-telescope', inspectorScreen: 'asteroid-discovery' },
              saturn: { kind: 'saturn', instrumentId: 'saturn-imager', inspectorScreen: 'saturn-storm-search' },
            }[item.project] as { kind: InstrumentSignal['kind']; instrumentId: InstrumentSignal['instrumentId']; inspectorScreen: InstrumentSignal['inspectorScreen'] }
            setReviewTarget(item)
            setInspectSignal({ id: item.subjectId, title: item.subjectId, subtitle: '', ...route })
            game.go(route.inspectorScreen)
          }}
          onGo={kind => {
            // SSL-714: from mission 3 on, the Orionids step happens on ORI-1, not the mission board.
            // SSL-831: during the Leonids the step opens the run, or LEO-1 once the run is home.
            const chain = liveShowerChain(Date.now())
            if (kind === 'event' && chain && chainNextScreen(game.player, chain) === 'radio-meteors') return game.go('radio-meteors')
            if (kind === 'event' && chain) requestMissionBoardEvent(chain.eventId)
            else if (kind === 'event' && (game.player.orionidsEventStage ?? 0) >= 2) return game.go('radio-meteors')
            else if (kind === 'event') requestMissionBoardEvent('orionids-2026')
            else if (kind === 'probe-observation') return game.go('probe-scan')
            // SSL-852: a craft is launched from the Program tab; a ground telescope is built in the Data hub.
            else if (kind === 'launch') {
              if (!agencySummary(game.player).needsService && agencySummary(game.player).next?.how === 'build' && (hasAgencyUnlock(game.player, 'data-hub') || !!game.player.transitSatelliteLaunchedAt)) return game.go('instrument-hub')
              requestMissionBoardTab('program')
            }
            else if (kind === 'discovery-mission') requestMissionBoardTab('free')
            else if (kind === 'contract-run') requestMissionBoardTab('contracts')
            else if (kind === 'survey') {
              if (Object.keys(game.player.probes ?? {}).length || Object.keys(game.player.agencyCommunity?.surveys ?? {}).length) return game.go('probe-scan')
              requestMissionBoardTab('program')
            }
            else if (kind === 'classification') {
              const hasInstruments = hasAgencyUnlock(game.player, 'data-hub') || !!game.player.transitSatelliteLaunchedAt
              if (hasInstruments) return game.go('instrument-hub')
              requestMissionBoardTab('program')
            }
            game.goToMissions()
          }}
        />
      )

    case 'narrative-ledger':
      return <NarrativeLedgerScreen onBack={() => game.goBack()} />

    case 'launchpad':
      {
        const currentRunKey = game.player.activeMission
          ? (game.player.missionRunId ?? `${game.player.activeMission.id}:${game.player.transitStartedAt ?? 'current'}`)
          : null
        const activeSettled = !!game.player.activeMission && isSettledMissionRun(game.player, {
          runId: game.player.missionRunId,
          missionId: game.player.activeMission.id,
          targetId: game.targetId,
          launchedAt: game.player.transitStartedAt,
        })
        const missionRuns = [
          ...(game.player.activeMission && currentRunKey && !activeSettled ? [{
            key: currentRunKey,
            label: game.player.activeMission.label,
            phase: game.player.missionPhase ?? 'transit',
          }] : []),
          ...(game.player.pausedMissionRuns ?? [])
            .filter(run => !isSettledMissionRun(game.player, {
              runId: run.missionRunId,
              missionId: run.missionId,
              targetId: run.targetId,
              launchedAt: run.transitStartedAt,
            }))
            .map(run => ({
              key: run.key,
              label: run.activeMission.label,
              phase: run.missionPhase ?? 'transit',
            })),
        ]
      return (
        <LaunchpadScreen
          onBack={() => game.goBack()}
          onPick={id => { game.onPickMission(id) }}
          onViewContracts={() => game.goToMissions()}
          onLaunchpadAction={() => {
            if (game.player.pendingLaunch) return game.go('fab')
            game.goToMissions()
          }}
          missionMenuOpen={game.launchpadMissionMenuOpen}
          onMissionMenuOpenChange={game.setLaunchpadMissionMenuOpen}
          onResumeMission={game.player.activeMission && !activeSettled ? () => {
            captureGameEvent('mission_resumed', { mission_phase: game.player.missionPhase ?? 'transit' })
            enqueueSurvey('lnm_resume_mission', 1200)
            game.go(missionResumeScreen(game.player))
          } : undefined}
          missionRuns={missionRuns}
          onResumeMissionRun={key => {
            if (key === currentRunKey) {
              game.go(missionResumeScreen(game.player))
              return
            }
            game.resumeMissionRun(key)
          }}
          onOpenSiloBuild={() => game.go('hub')}
          onOpenControlStation={() => game.go('instrument-hub')}
          onAbandonMission={game.player.activeMission && !activeSettled ? () => game.abandonMission({ confirmed: true }) : undefined}
          missionsDone={game.player.missionsDone}
          freeOperations={game.player.freeOperations}
          hydrated={game.hydrated}
          catalog={game.catalog}
          player={game.player}
          rocketImageSrc={rocketDisplay.img}
          selectedRocketName={rocketDisplay.name}
          mission={game.mission ? { title: game.mission.title } : null}
          target={game.target}
          rocket={game.rocket}
          hasStagedRocket={game.player.stagedRockets?.some(vehicle => vehicle.id === game.player.selectedStagedRocketId && vehicle.location === 'launchpad') ?? false}
          onRequestLaunch={() => {
            const vehicle = game.player.stagedRockets?.find(candidate => candidate.id === game.player.selectedStagedRocketId)
            if (!vehicle || vehicle.location !== 'launchpad') {
              // A default config is only a design preview. Never turn the
              // launch CTA into an implicit rocket purchase.
              game.go('hangar')
              return
            }
            handleLaunch()
          }}
          launching={launchPending}
          onLaunchComplete={handleLaunchComplete}
        />
      )
      }

    default:
      return null
  }
}
