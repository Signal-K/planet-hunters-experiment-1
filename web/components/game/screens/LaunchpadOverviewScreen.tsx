'use client'

import React from 'react'
import { ACADEMY_INTRO_MISSION_ID, partitionByOwner } from '@/lib/data'
import { ROCKET_MODELS } from '@/lib/data/rockets'
import { SATELLITE_MODELS } from '@/lib/data/satellites'
import { compatibleTargetsFor } from '@/lib/data/targets'
import type { Catalog } from '@/lib/catalog'
import type { Player } from '@/lib/game-types'
import { UI_ZONES } from '@/lib/ui-zones'
import TopBar from '@/components/ui/TopBar'
import styles from './LaunchpadOverviewScreen.module.css'
import { unplacedUnlockedStructures } from '@/lib/available-actions'

interface LaunchpadOverviewScreenProps {
  onBack: () => void
  onPick: (id: string) => void
  onViewContracts: () => void
  onFocusPad: () => void
  onOpenHangar: () => void
  onOpenBuild: () => void
  onResumeMission?: () => void
  onViewMissionLog?: () => void
  missionsDone: number
  freeOperations: boolean
  catalog: Catalog
  player: Player
  selectedRocketName?: string
  francs?: number
}

interface AvailableStructure {
  title: string
  detail: string
  onClick: () => void
}

function ActionCard({
  eyebrow,
  title,
  detail,
  action,
  onClick,
  testId,
  legacyTestId,
}: {
  eyebrow: string
  title: string
  detail: string
  action: string
  onClick: () => void
  testId: string
  legacyTestId?: string
}) {
  return (
    <button className={styles.actionCard} data-testid={testId} onClick={onClick}>
      <span className={styles.actionCopy} data-testid={legacyTestId}>
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
  const operations = own
    .filter(mission => freeOperations || mission.sequence === sequence)
    .filter(mission => mission.id !== ACADEMY_INTRO_MISSION_ID)
  // Prefer an operation with at least one target the player can currently
  // pick, so the aggregate action never routes to a dead-end (e.g. a
  // construction mission with no in-range site) while a mission tied to an
  // actual discovery sits unreached further down the list.
  return (
    operations.find(mission => compatibleTargetsFor(mission, catalog.targets).length > 0) ??
    operations[0]
  )
}

function AvailableNow({ action }: { action: AvailableStructure }) {
  return (
    <section className={styles.availableActions} data-testid="launchpad-available-now" aria-labelledby="available-actions-heading">
      <div className={styles.availableHeader}>
        <div>
          <span className={styles.kicker}><i /> AVAILABLE NOW</span>
          <h3 id="available-actions-heading">Program action</h3>
        </div>
        <span className={styles.panelCode}>01 OPEN</span>
      </div>
      <button className={styles.availableAction} onClick={action.onClick} data-testid="launchpad-overview-build-structure-btn">
        <span className={styles.operationMark} aria-hidden="true">+</span>
        <span className={styles.actionCopy}>
          <span className={styles.cardEyebrow}>NEW STRUCTURE</span>
          <strong>{action.title}</strong>
          <span className={styles.cardDetail}>{action.detail}</span>
        </span>
        <span className={styles.cardAction}>OPEN BUILD ›</span>
      </button>
    </section>
  )
}

export default function LaunchpadOverviewScreen({
  onBack,
  onPick,
  onViewContracts,
  onFocusPad,
  onOpenHangar,
  onOpenBuild,
  onResumeMission,
  onViewMissionLog,
  missionsDone,
  freeOperations,
  catalog,
  player,
  selectedRocketName,
  francs,
}: LaunchpadOverviewScreenProps) {
  const clearedRockets = ROCKET_MODELS.filter(model => !model.locked && missionsDone >= model.missionsRequired)
  const nextOperation = ownProgramOperation(catalog, player, freeOperations)
  const nextStructure = unplacedUnlockedStructures(player)[0]
  const status = player.activeMission ? 'IN FLIGHT' : player.pendingLaunch ? 'LAUNCH READY' : 'PAD READY'
  const vehicle = selectedRocketName ?? clearedRockets[0]?.name ?? 'NO VEHICLE'

  return (
    <div className={`game-screen theme-deep ${styles.screen}`} data-testid="launchpad-ui-screen">
      <TopBar eyebrow="BASE · LAUNCHPAD" title="Your Program" onBack={onBack} francs={francs} solid />

      <div className={styles.content} data-ui-zone={UI_ZONES.screenContent}>
        <header className={styles.header}>
          <div>
            <span className={styles.kicker}>LAUNCHPAD CONTROL / PROGRAM OPERATIONS</span>
            <h2>Launchpad control</h2>
            <p>Manage the next launch from the program console.</p>
          </div>
          <div className={styles.statusReadout}>
            <span>PAD STATUS</span>
            <strong>{status}</strong>
            <small>{clearedRockets.length} CLEARED VEHICLES · {player.transitSatelliteLaunchedAt ? SATELLITE_MODELS.length : 0}/{SATELLITE_MODELS.length} SATELLITES</small>
          </div>
        </header>

        {nextStructure && (
          <AvailableNow action={{
            title: `Build ${nextStructure.name}`,
            detail: 'A new structure is unlocked; review its cost and choose a plot.',
            onClick: onOpenBuild,
          }} />
        )}

        <div className={styles.grid}>
          <section className={styles.panel} aria-labelledby="launchpad-program-heading">
            <div className={styles.panelHeader}>
              <div>
                <span className={styles.kicker}>OWN PROGRAM</span>
                <h3 id="launchpad-program-heading">Next operation</h3>
              </div>
              <span className={styles.panelCode}>OPS {String(player.missionsDone + 1).padStart(2, '0')}</span>
            </div>
            {player.activeMission && onResumeMission ? (
              <div className={styles.operationBody}>
                <div className={styles.operationMark} aria-hidden="true">LIVE</div>
                <div className={styles.operationCopy}>
                  <strong>{player.activeMission.label}</strong>
                  <span>This mission is already in progress. Resume it from the current flight phase.</span>
                </div>
                <button className={styles.primaryAction} data-testid="launchpad-ui-resume-mission-btn" onClick={onResumeMission}>RESUME MISSION</button>
              </div>
            ) : nextOperation ? (
              <div className={styles.operationBody}>
                <div className={styles.operationMark} aria-hidden="true">OP</div>
                <div className={styles.operationCopy}>
                  <strong>{nextOperation.title}</strong>
                  <span>{nextOperation.brief}</span>
                </div>
                <button className={styles.primaryAction} data-testid="launchpad-program-operation-btn" onClick={() => onPick(nextOperation.id)}>START OPERATION</button>
              </div>
            ) : (
              <p className={styles.emptyState}>No own-program operation is queued. Client contracts remain available from the Mission Board.</p>
            )}
          </section>

          <section className={styles.panel} aria-labelledby="launchpad-status-heading" data-testid="launchpad-status-card">
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
            legacyTestId="launchpad-rocket-fleet"
          />
          <ActionCard
            eyebrow="CLIENT OPERATIONS"
            title="Mission Board"
            detail="Browse contracts and choose the next client objective."
            action="Open contracts"
            onClick={onViewContracts}
            testId="launchpad-ui-open-contracts-btn"
            legacyTestId="launchpad-view-contracts-btn"
          />
        </div>
      </div>

      <footer className={styles.footer} data-ui-zone={UI_ZONES.bottomActions}>
        <div className={styles.footerStatus}>
          <span><i /> FULL LAUNCHPAD UI</span>
          <span>PROGRAM COMMANDS</span>
        </div>
        <div className={styles.footerActions} aria-label="Launchpad commands">
          {onResumeMission && <button className={`${styles.footerButton} ${styles.footerButtonPrimary}`} data-testid="launchpad-ui-footer-resume-mission-btn" onClick={onResumeMission}>RESUME MISSION</button>}
          <button className={styles.footerButton} data-testid="launchpad-ui-footer-focus-pad-btn" onClick={onFocusPad}>FOCUS SCENE</button>
          <button className={styles.footerButton} data-testid="launchpad-ui-footer-hangar-btn" onClick={onOpenHangar}>HANGAR</button>
          {onViewMissionLog && <button className={styles.footerButton} data-testid="launchpad-ui-footer-mission-log-btn" onClick={onViewMissionLog}>MISSION LOG</button>}
          <button className={styles.footerButton} data-testid="launchpad-ui-footer-contracts-btn" onClick={onViewContracts}>CONTRACTS</button>
        </div>
      </footer>
    </div>
  )
}
