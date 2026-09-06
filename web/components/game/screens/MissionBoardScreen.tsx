'use client'

import { useEffect, useState } from 'react'
import TopBar from '@/components/ui/TopBar'
import { feasibleTargetsFor, FREE_OPS_START_MISSIONS_DONE, isMissionBoardMission, tutorialClientMissionOptions } from '@/lib/data'
import type { DailyClientPool } from '@/lib/data'
import type { Catalog } from '@/lib/catalog'
import { TUTORIAL_COMPACT_CONTENT_TOP, TUTORIAL_MANUAL_CONTENT_TOP } from '@/lib/tutorial-layout'
import { UI_ZONES } from '@/lib/ui-zones'
import StepFooter from '@/components/game/StepFooter'
import MissionBoardCompleteState from '@/components/game/MissionBoardCompleteState'
import { formatCurrency } from '@/lib/format'
import { crewRequirementStatus } from '@/lib/systems/AcademySystem'
import type { CrewMember } from '@/lib/data'
import type { Player } from '@/lib/game-types'
import { filterMissionsForSceneScope } from '@/lib/scene-scope'
import type { SceneScope } from '@/lib/scene-scope'
import { isTutorialMissionInProgress } from '@/lib/mission-flow'
import MissionSceneBackdrop from '@/components/game/screens/MissionSceneBackdrop'
import { ChevronLeft, ChevronRight, RadioTower } from 'lucide-react'

const SHORT_LANDSCAPE_CONTENT_TOP = 142

interface MissionBoardScreenProps {
  onBack: () => void
  onPick: (id: string) => void
  missionsDone: number
  freeOperations: boolean
  hasCoach?: boolean
  coachManual?: boolean
  catalog: Catalog
  clientMissions?: Record<string, number>
  clientCooldowns?: Record<string, number>
  dailyClientPool?: DailyClientPool
  francs?: number
  crew?: CrewMember[]
  player?: Player
  sceneScope?: SceneScope
}

export default function MissionBoardScreen({ onBack, onPick, missionsDone, freeOperations, hasCoach, coachManual = false, catalog, francs, crew = [], player, sceneScope = { kind: 'earth-base', id: 'earth-base', label: 'Base' } }: MissionBoardScreenProps) {
  const { missions: MISSIONS, clients: CLIENTS, targets, parts } = catalog
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [shortLandscape, setShortLandscape] = useState(false)
  useEffect(() => {
    const media = window.matchMedia('(orientation: landscape) and (max-width: 1023px) and (max-height: 600px)')
    const update = () => setShortLandscape(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  const sequence = missionsDone + 1
  // Tutorial runs are deliberately single-threaded: finish the authored
  // mission before accepting another contract. Free Ops remains repeatable;
  // completing a run clears activeMission and exposes the next request.
  const tutorialMissionInProgress = isTutorialMissionInProgress(freeOperations, !!player?.activeMission)
  const missionStartBlockedLabel = 'Finish current mission'

  // Free Ops lists the catalog's available client work. The authoritative
  // client/market day will later supply this catalog; do not generate a
  // player-local daily board or add per-client cooldown gates here.
  const rawAvailable = MISSIONS.filter(m => {
    if (!isMissionBoardMission(m, freeOperations)) return false
    if (m.client && !CLIENTS[m.client]) return false
    return freeOperations || m.sequence === sequence
  })

  const available = filterMissionsForSceneScope(rawAvailable, sceneScope, targets, !freeOperations)

  // Never advertise a contract that the current catalog or unlocked rocket
  // parts cannot complete. This is deliberately applied before the board
  // renders, not only when the player reaches Target Picker: an impossible
  // card is already a broken contract from the player's perspective.
  const feasibleCandidates = available.filter(mission => feasibleTargetsFor(
    mission,
    targets,
    parts,
    missionsDone,
    player?.launchpadUpgraded ?? false,
    player?.unlockedSkillNodes ?? [],
  ).length > 0)
  const tutorialOptionIds = new Set(freeOperations
    ? feasibleCandidates.map(mission => mission.id)
    : tutorialClientMissionOptions(feasibleCandidates, sequence).map(mission => mission.id))
  const feasibleAvailable = feasibleCandidates.filter(mission => tutorialOptionIds.has(mission.id))

  const onboardingComplete = !freeOperations && feasibleAvailable.length === 0 && missionsDone >= FREE_OPS_START_MISSIONS_DONE

  if (onboardingComplete) {
    return <MissionBoardCompleteState onBack={onBack} />
  }

  // Never show locked/future missions during onboarding. Free Ops stays a
  // straightforward catalog of client work rather than a per-player slot list.
  const missionList = feasibleAvailable.filter(mission => isMissionBoardMission(mission, freeOperations))
  const firstValidIdx = missionList.findIndex(m => {
    if (m.jointProject && (francs ?? 0) < m.jointProject.playerCost) return false
    const ctr = m.client ? CLIENTS[m.client] : null
    if (m.client && !ctr) return false
    const cr = freeOperations || m.sequence === sequence
    return cr && (freeOperations || available.some(item => item.id === m.id))
  })
  const cardModels = missionList
    .map((m, idx) => {
      const client = m.client ? CLIENTS[m.client] : null
      if (m.client && !client) return null
      const isStoryMission = m.tag === 'STORY' && !m.deliveryTargetId
      const clientReady = freeOperations || m.sequence === sequence
      const jointFundingReady = !m.jointProject || (francs ?? 0) >= m.jointProject.playerCost
      const unlocked = clientReady && jointFundingReady && (freeOperations || available.some(item => item.id === m.id))
      const mTargets = feasibleTargetsFor(m, targets, parts, missionsDone, player?.launchpadUpgraded ?? false, player?.unlockedSkillNodes ?? [])
      const displayPayout = m.payout.francs
      const isHighlighted = hasCoach && idx === firstValidIdx
      const cardState = !unlocked ? 'locked' as const
        : 'available' as const
      const lockedDetail = !jointFundingReady
        ? `Needs ${formatCurrency(m.jointProject!.playerCost)} co-funding`
        : !clientReady
          ? (client ? `L${client.unlockTier}` : 'Locked')
          : m.sequence <= missionsDone
            ? 'Completed'
            : m.unlockAt
      const routeLabel = m.deliveryTargetId
        ? `${targets.find(t => t.id === m.targetId)?.name ?? m.targetId} → ${targets.find(t => t.id === m.deliveryTargetId)?.name ?? m.deliveryTargetId}`
        : undefined
      const crewStatus = crewRequirementStatus(m.requires.crew, crew)
      return {
        mission: m, client, targetCount: mTargets.length, displayPayout,
        unlocked, isStoryMission, cardState, lockedDetail, isHighlighted, routeLabel,
        crewStatus: m.requires.crew
          ? player?.shipCustomizerParts?.['crew-module'] === 'crew-quarters-t1'
            ? crewStatus.reason
            : 'Crew Quarters required · research and fit in Hangar'
          : undefined,
        crewReady: crewStatus.met && player?.shipCustomizerParts?.['crew-module'] === 'crew-quarters-t1',
      }
    })
    .filter((c): c is NonNullable<typeof c> => c !== null)

  // STS-582 makes this a client-only surface in Free Ops. Owned flights are
  // filtered above and live under Launchpad → Your Program instead.
  const effectivePreviewId = previewId ?? cardModels.find(c => c.unlocked)?.mission.id ?? cardModels[0]?.mission.id ?? null
  const previewModel = cardModels.find(c => c.mission.id === effectivePreviewId) ?? null
  const selectedIndex = Math.max(0, cardModels.findIndex(c => c.mission.id === effectivePreviewId))
  const selectRelativeSignal = (offset: number) => {
    if (cardModels.length === 0) return
    const nextIndex = (selectedIndex + offset + cardModels.length) % cardModels.length
    setPreviewId(cardModels[nextIndex]?.mission.id ?? null)
  }
  const contentTop = hasCoach
    ? (coachManual ? TUTORIAL_MANUAL_CONTENT_TOP : TUTORIAL_COMPACT_CONTENT_TOP)
    : 82

  return (
    <div className="mission-setup-screen mission-setup-screen--scene mission-setup-screen--mission" style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div className="mission-setup-scene-background" aria-hidden="true"><MissionSceneBackdrop /></div>
      <TopBar
        eyebrow={freeOperations ? `${sceneScope.label.toUpperCase()} · FREE OPS` : `${sceneScope.label.toUpperCase()} · L${missionsDone + 1}`}
        title="Mission Dispatch"
        onBack={onBack}
        scene
        levelBadge={`LV. ${missionsDone + 1}`}
        francs={francs}
      />
      <div className={`mission-dispatch-content${hasCoach ? ' mission-dispatch-content--coach' : ''}${shortLandscape ? ' mission-dispatch-content--short' : ''}`} data-ui-zone={UI_ZONES.screenContent} style={{ paddingTop: shortLandscape ? SHORT_LANDSCAPE_CONTENT_TOP : contentTop }}>
        <div className="mission-relay-yard" data-testid="mission-board-section-client">
          <img className="mission-relay-yard__hangar" src="/game/assets/base/hangar_flat.png" alt="" aria-hidden="true" />
          <img className="mission-relay-yard__launchpad" src="/game/assets/base/launchpad_flat.png" alt="" aria-hidden="true" />
          {previewModel ? (
            <div className="mission-relay-yard__console" aria-live="polite">
              <button
                type="button"
                className="mission-relay-yard__cycle"
                aria-label="Previous client signal"
                onClick={() => selectRelativeSignal(-1)}
              >
                <ChevronLeft size={24} />
              </button>
              <div
                className="mission-relay-yard__station"
                data-testid={`mission-card-${previewModel.mission.id}`}
                data-mission-id={previewModel.mission.id}
              >
                <div className="mission-relay-yard__station-label"><RadioTower size={16} /> Client relay · {String(selectedIndex + 1).padStart(2, '0')} / {String(cardModels.length).padStart(2, '0')}</div>
                <img src="/parts/comms_relay_t1.png" alt="" aria-hidden="true" />
                <div className="mission-relay-yard__contract">
                  <strong>{previewModel.mission.title}</strong>
                  <span>{previewModel.client?.name ?? 'Earth base operation'}</span>
                  <small>{previewModel.targetCount} reachable targets · {Object.values(previewModel.mission.requires.minerals).reduce((total, amount) => total + amount, 0)}U cargo · <b>{formatCurrency(previewModel.displayPayout, { compact: true })}</b></small>
                </div>
              </div>
              <button
                type="button"
                className="mission-relay-yard__cycle"
                aria-label="Next client signal"
                onClick={() => selectRelativeSignal(1)}
              >
                <ChevronRight size={24} />
              </button>
              <div className="mission-relay-yard__commit">
                <p>{previewModel.mission.brief}</p>
                {previewModel.crewStatus && <span>CREW · {previewModel.crewStatus}</span>}
                <button
                  type="button"
                  data-testid={`mission-detail-cta-${previewModel.mission.id}`}
                  data-mission-card-cta={`mission-card-${previewModel.mission.id}-cta`}
                  disabled={!previewModel.unlocked || tutorialMissionInProgress}
                  onClick={() => { if (!tutorialMissionInProgress) onPick(previewModel.mission.id) }}
                >
                  {tutorialMissionInProgress ? missionStartBlockedLabel : `Lock contract · ${previewModel.targetCount} targets`}
                </button>
              </div>
            </div>
          ) : <div className="mission-relay-yard__empty">No active client signal from this location.</div>}
        </div>
      </div>
      <StepFooter
        step="Mission"
        description={available.length === 0 ? 'No client requests are available from this location.' : freeOperations ? 'Client work only. Your own operations remain in Launchpad.' : `Lock a client contract to open Target, Rocket, and Launch for L${missionsDone + 1}.`}
      />
    </div>
  )
}
