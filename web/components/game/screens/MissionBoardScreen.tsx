'use client'

import { useEffect, useState } from 'react'
import TopBar from '@/components/ui/TopBar'
import { feasibleTargetsFor, FREE_OPS_START_MISSIONS_DONE, isMissionBoardMission, tutorialClientMissionOptions } from '@/lib/data'
import type { DailyClientPool } from '@/lib/data'
import type { Client, Mission } from '@/lib/data'
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
import ClientMark from '@/components/ui/ClientMark'

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
        <div className="mission-dispatch-site" data-testid="mission-board-section-client">
          <div className="mission-dispatch-title">
            <span>Earth base relay</span>
            <strong>{freeOperations ? 'Client requests' : 'Incoming contracts'}</strong>
            <small>{cardModels.filter(contract => contract.unlocked).length} signals live · select a relay to commit</small>
          </div>
          <div className="mission-signal-rail">
            {cardModels.map((contract, index) => (
              <MissionDispatchSignal
                key={contract.mission.id}
                contract={contract}
                selected={contract.mission.id === effectivePreviewId}
                startBlocked={tutorialMissionInProgress}
                startBlockedLabel={missionStartBlockedLabel}
                onPreview={() => setPreviewId(contract.mission.id)}
                onPick={() => { if (!tutorialMissionInProgress) onPick(contract.mission.id) }}
                index={index}
              />
            ))}
          </div>
          <aside className="mission-dispatch-dock" aria-live="polite">
          {previewModel ? (
            <>
              <div className="mission-dispatch-dock__label">Selected uplink</div>
              <div className="mission-dispatch-dock__title">{previewModel.mission.title}</div>
              <div className="mission-dispatch-dock__client">{previewModel.client?.name ?? 'Earth base operation'}</div>
              <div className="mission-dispatch-dock__brief">{previewModel.mission.brief}</div>
              <div className="mission-dispatch-dock__metrics">
                <span>{previewModel.targetCount} targets</span>
                <span>{Object.values(previewModel.mission.requires.minerals).reduce((total, amount) => total + amount, 0)}U cargo</span>
                <span className="mission-dispatch-dock__payout">{formatCurrency(previewModel.displayPayout, { compact: true })}</span>
              </div>
              {previewModel.crewStatus && <div className="mission-dispatch-dock__warning">Crew · {previewModel.crewStatus}</div>}
              <button
                type="button"
                data-testid={`mission-detail-cta-${previewModel.mission.id}`}
                disabled={!previewModel.unlocked || tutorialMissionInProgress}
                onClick={() => { if (!tutorialMissionInProgress) onPick(previewModel.mission.id) }}
                className="mission-dispatch-dock__cta"
              >
                {tutorialMissionInProgress ? missionStartBlockedLabel : `Lock contract · ${previewModel.targetCount} targets`}
              </button>
            </>
          ) : <div className="mission-dispatch-dock__empty">No active client signal from this location.</div>}
          </aside>
        </div>
      </div>
      <StepFooter
        step="Mission"
        description={available.length === 0 ? 'No client requests are available from this location.' : freeOperations ? 'Client work only. Your own operations remain in Launchpad.' : `Lock a client contract to open Target, Rocket, and Launch for L${missionsDone + 1}.`}
      />
    </div>
  )
}

function MissionDispatchSignal({
  contract,
  selected,
  startBlocked,
  startBlockedLabel,
  onPreview,
  onPick,
  index,
}: {
  contract: { mission: Mission; client: Client | null; targetCount: number; displayPayout: number; unlocked: boolean; cardState: 'available' | 'locked'; lockedDetail?: string; isHighlighted?: boolean; routeLabel?: string; crewStatus?: string; crewReady: boolean }
  selected: boolean
  startBlocked: boolean
  startBlockedLabel: string
  onPreview: () => void
  onPick: () => void
  index: number
}) {
  const disabled = !contract.unlocked || startBlocked
  return (
    <button
      type="button"
      data-testid={`mission-card-${contract.mission.id}`}
      data-mission-id={contract.mission.id}
      className={`mission-dispatch-signal${selected ? ' is-selected' : ''}${disabled ? ' is-disabled' : ''}`}
      aria-pressed={selected}
      aria-disabled={disabled}
      onMouseEnter={onPreview}
      onFocus={onPreview}
      onClick={() => { onPreview(); if (!disabled) onPick() }}
    >
      <span className="mission-dispatch-signal__index">{String(index + 1).padStart(2, '0')}</span>
      <ClientMark initial={contract.client?.initial ?? 'OP'} color={contract.client?.color ?? 'var(--ln-cyan)'} uiRole={contract.client?.uiRole ?? 'starter'} clientId={contract.client?.id} size={40} />
      <span className="mission-dispatch-signal__body">
        <strong>{contract.mission.title}</strong>
        <small>{contract.client?.name ?? 'Earth base operation'} · {contract.targetCount} targets</small>
        <em>{contract.routeLabel ?? contract.mission.difficulty}</em>
      </span>
      <span className="mission-dispatch-signal__pay">{formatCurrency(contract.displayPayout, { compact: true })}</span>
      <span data-testid={`mission-card-${contract.mission.id}-cta`} className="mission-dispatch-signal__action">{disabled ? (startBlocked ? startBlockedLabel : contract.lockedDetail ?? 'Locked') : 'Lock ›'}</span>
    </button>
  )
}
