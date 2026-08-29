'use client'

import React from 'react'
import TopBar from '@/components/ui/TopBar'
import { ACADEMY_INTRO_MISSION_ID, partitionByOwner } from '@/lib/data'
import { ROCKET_MODELS } from '@/lib/data/rockets'
import { SATELLITE_MODELS } from '@/lib/data/satellites'
import type { Catalog } from '@/lib/catalog'
import type { Player } from '@/lib/game-types'
import { academyAffinityUnlocked } from '@/lib/systems/AcademySystem'
import { UI_ZONES } from '@/lib/ui-zones'
import styles from './LaunchpadOverviewScreen.module.css'
import AvailableActionsPanel, { type AvailableAction } from '@/components/game/AvailableActionsPanel'
import { installableSkillNodes, unplacedUnlockedStructures } from '@/lib/available-actions'

interface LaunchpadOverviewScreenProps {
  onBack: () => void
  onPick: (id: string) => void
  onViewContracts: () => void
  onFocusPad: () => void
  onOpenHangar: () => void
  onOpenSubsurface?: () => void
  onOpenBuild: () => void
  onOpenAcademy: () => void
  onOpenSkills: () => void
  missionsDone: number
  freeOperations: boolean
  catalog: Catalog
  player: Player
  selectedRocketName?: string
  francs?: number
}

function ActionCard({
  eyebrow,
  title,
  detail,
  action,
  onClick,
  testId,
}: {
  eyebrow: string
  title: string
  detail: string
  action: string
  onClick: () => void
  testId: string
}) {
  return (
    <button className={styles.actionCard} data-testid={testId} onClick={onClick}>
      <span className={styles.actionCopy}>
        <span className={styles.cardEyebrow}>{eyebrow}</span>
        <strong>{title}</strong>
        <span className={styles.cardDetail}>{detail}</span>
      </span>
      <span className={styles.cardAction}>{action} ›</span>
    </button>
  )
}

function ownProgramOperation(catalog: Catalog, player: Player, freeOperations: boolean) {
  const { own } = partitionByOwner(catalog.missions, mission => mission)
  const sequence = player.missionsDone + 1
  const operations = own.filter(mission => freeOperations || mission.sequence === sequence)
  return operations.find(mission => {
    if (mission.id !== ACADEMY_INTRO_MISSION_ID) return true
    const academyUnlocked = academyAffinityUnlocked(player) || !!player.academyResearched || player.placed.includes('astronaut-academy')
    const academyCompleted = player.placed.includes('astronaut-academy') && (player.crew ?? []).some(member =>
      member.crewClass === 'astronaut' && member.selfTrained && member.specialisations.length > 0,
    )
    return academyUnlocked && !academyCompleted
  })
}

export default function LaunchpadOverviewScreen({
  onBack,
  onPick,
  onViewContracts,
  onFocusPad,
  onOpenHangar,
  onOpenSubsurface,
  onOpenBuild,
  onOpenAcademy,
  onOpenSkills,
  missionsDone,
  freeOperations,
  catalog,
  player,
  selectedRocketName,
  francs,
}: LaunchpadOverviewScreenProps) {
  const clearedRockets = ROCKET_MODELS.filter(model => !model.locked && missionsDone >= model.missionsRequired)
  const nextOperation = ownProgramOperation(catalog, player, freeOperations)
  const ownMiningOperation = freeOperations
    ? catalog.missions.find(mission => mission.tag === 'FREE OPS' && !mission.client && !mission.payload && !mission.construction)
    : undefined
  const infrastructureOperation = freeOperations
    ? catalog.missions.find(mission => mission.payload?.type === 'satellite'
      || mission.payload?.type === 'deep-space-survey'
      || mission.payload?.type === 'scan-station-commission')
      ?? catalog.missions.find(mission => mission.construction?.structureKind
        ? !player.placed.includes(mission.construction.structureKind)
        : false)
    : undefined
  const nextStructure = unplacedUnlockedStructures(player)[0]
  const installableSkills = installableSkillNodes(player)
  const availableActions: AvailableAction[] = []
  if (ownMiningOperation) availableActions.push({ id: 'create-mission', kind: 'mission', eyebrow: 'OWN PROGRAM', title: 'Create a mining mission', detail: 'Choose a target and run the haul yourself.', cta: 'Create mission', onClick: () => onPick(ownMiningOperation.id), primary: true, testId: 'launchpad-overview-create-mission-btn' })
  if (infrastructureOperation) availableActions.push({ id: 'launch-infrastructure', kind: 'infrastructure', eyebrow: 'PERSONAL INFRASTRUCTURE', title: 'Launch your next instrument', detail: 'Put a satellite or remote facility into service.', cta: 'Launch', onClick: () => onPick(infrastructureOperation.id), primary: true, testId: 'launchpad-overview-launch-infrastructure-btn' })
  if (nextStructure) availableActions.push({ id: `build-${nextStructure.id}`, kind: 'structure', eyebrow: 'NEW STRUCTURE', title: `Build ${nextStructure.name}`, detail: 'A new structure is unlocked; review its cost and choose a plot.', cta: 'Open build', onClick: onOpenBuild, testId: 'launchpad-overview-build-structure-btn' })
  if (!player.academyResearched && academyAffinityUnlocked(player)) availableActions.push({ id: 'research-academy', kind: 'research', eyebrow: 'ACADEMY UNLOCKED', title: 'Research Astronaut Academy', detail: 'Two trusted clients have opened the training facility path.', cta: 'Research', onClick: onOpenAcademy, testId: 'launchpad-overview-research-academy-btn' })
  if (player.placed.includes('astronaut-academy') && !player.crewModuleResearched) availableActions.push({ id: 'research-crew-module', kind: 'research', eyebrow: 'ACADEMY RESEARCH', title: 'Research crew quarters', detail: 'Develop the module that lets larger hulls carry crew.', cta: 'Open academy', onClick: onOpenAcademy, testId: 'launchpad-overview-research-crew-btn' })
  if (freeOperations && installableSkills.length > 0) availableActions.push({ id: 'research-skills', kind: 'research', eyebrow: 'RESEARCH AVAILABLE', title: `${installableSkills.length} skill upgrade${installableSkills.length === 1 ? '' : 's'}`, detail: `${player.skillPoints ?? 0} SP can be allocated to the program.`, cta: 'Research', onClick: onOpenSkills, testId: 'launchpad-overview-research-skills-btn' })
  const status = player.activeMission ? 'IN FLIGHT' : player.pendingLaunch ? 'LAUNCH READY' : 'PAD READY'
  const vehicle = selectedRocketName ?? clearedRockets[0]?.name ?? 'NO VEHICLE'

  return (
    <div className={`game-screen theme-blueprint ${styles.screen}`} data-testid="launchpad-ui-screen">
      <TopBar eyebrow="EARTH BASE · LAUNCHPAD" title="Your Program" onBack={onBack} francs={francs} solid />

      <div className={styles.content} data-ui-zone={UI_ZONES.screenContent}>
        <header className={styles.header}>
          <div>
            <span className={styles.kicker}>LAUNCHPAD CONTROL / PROGRAM OPERATIONS</span>
            <h2>Launchpad control</h2>
            <p>Manage the next launch from the program console. The physical pad is available as a separate scene focus.</p>
          </div>
          <div className={styles.statusReadout}>
            <span>PAD STATUS</span>
            <strong>{status}</strong>
            <small>{clearedRockets.length} CLEARED VEHICLES · {player.transitSatelliteLaunchedAt ? SATELLITE_MODELS.length : 0}/{SATELLITE_MODELS.length} SATELLITES</small>
          </div>
        </header>

        {availableActions.length > 0 && <AvailableActionsPanel actions={availableActions} className={styles.availableActions} />}

        <div className={styles.grid}>
          <section className={styles.panel} aria-labelledby="launchpad-program-heading">
            <div className={styles.panelHeader}>
              <div>
                <span className={styles.kicker}>OWN PROGRAM</span>
                <h3 id="launchpad-program-heading">Next operation</h3>
              </div>
              <span className={styles.panelCode}>OPS {String(player.missionsDone + 1).padStart(2, '0')}</span>
            </div>
            {nextOperation ? (
              <div className={styles.operationBody}>
                <div className={styles.operationMark} aria-hidden="true">OP</div>
                <div className={styles.operationCopy}>
                  <strong>{nextOperation.title}</strong>
                  <span>{nextOperation.brief}</span>
                </div>
                <button className={styles.primaryAction} data-testid="launchpad-ui-start-operation-btn" onClick={() => onPick(nextOperation.id)}>START OPERATION</button>
              </div>
            ) : (
              <p className={styles.emptyState}>No own-program operation is queued. Client contracts remain available from the Mission Board.</p>
            )}
          </section>

          <section className={styles.panel} aria-labelledby="launchpad-status-heading">
            <div className={styles.panelHeader}>
              <div>
                <span className={styles.kicker}>PHYSICAL FACILITY</span>
                <h3 id="launchpad-status-heading">Launchpad status</h3>
              </div>
              <span className={styles.online}><i /> ONLINE</span>
            </div>
            <p className={styles.panelCopy}>Inspect the ground installation, launch tower, and near-field pad composition.</p>
            <button className={styles.secondaryAction} data-testid="launchpad-ui-focus-pad-btn" onClick={onFocusPad}>FOCUS LAUNCHPAD SCENE</button>
          </section>

          <ActionCard
            eyebrow="ROCKET FLEET"
            title={vehicle}
            detail={`${clearedRockets.length} cleared vehicle${clearedRockets.length === 1 ? '' : 's'} in registry`}
            action={player.pendingLaunch ? 'Inspect launch' : 'Open hangar'}
            onClick={onOpenHangar}
            testId="launchpad-ui-open-hangar-btn"
          />
          <ActionCard
            eyebrow="CLIENT OPERATIONS"
            title="Mission Board"
            detail="Browse contracts and choose the next client objective."
            action="Open contracts"
            onClick={onViewContracts}
            testId="launchpad-ui-open-contracts-btn"
          />
          {onOpenSubsurface && (
            <ActionCard
              eyebrow="BASE INFRASTRUCTURE"
              title="Subsurface"
              detail="Open the excavation deck beneath Earth Base."
              action="Open deck"
              onClick={onOpenSubsurface}
              testId="launchpad-ui-open-subsurface-btn"
            />
          )}
        </div>
      </div>

      <footer className={styles.footer} data-ui-zone={UI_ZONES.bottomActions}>
        <span><i /> FULL LAUNCHPAD UI</span>
        <span>SCENE FOCUS IS SEPARATE</span>
        <button className={styles.footerAction} onClick={onFocusPad}>FOCUS PAD</button>
      </footer>
    </div>
  )
}
