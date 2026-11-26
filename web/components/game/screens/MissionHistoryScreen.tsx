'use client'

import type { CompletedMissionRecord, Player } from '@/lib/game-types'
import { useState } from 'react'
import type { Client, Mission, Target } from '@/lib/data'
import { formatCurrency } from '@/lib/format'
import { canonicalSaturnLabel } from '@/lib/saturn-label'
import { transitLogRecords } from '@/lib/mission-log'
import DestinationLandscape, { type VistaTarget } from '@/components/game/screens/DestinationLandscape'
import BoardFrame from '@/components/layout/frame/BoardFrame'
import styles from './MissionHistoryScreen.module.css'

interface MissionHistoryScreenProps {
  records: CompletedMissionRecord[]
  clients?: Record<string, Client>
  targets?: Target[]
  missions?: Mission[]
  player?: Player
  onNewMission: () => void
  onResumeMission?: () => void
  onBack: () => void
}

function formatCompletedAt(value: number): string {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return 'DATE UNKNOWN'
  return date.toISOString().slice(0, 10)
}

function vistaTarget(record: CompletedMissionRecord, missions: Mission[], targets: Target[]): VistaTarget {
  const mission = missions.find(item => item.id === record.id)
  const id = record.targetId ?? mission?.targetId
  const named = targets.find(item => item.id === id || (record.targetName != null && item.name === record.targetName))
  if (named) return { id: named.id, type: named.type, archetype: named.archetype ?? null }
  if (record.kind === 'transit') return { id: 'transit-telescope', type: 'planet', archetype: null }
  return { id: id || record.title, type: 'asteroid', archetype: null }
}

export default function MissionHistoryScreen({ records, targets = [], missions = [], player, onNewMission, onResumeMission, onBack }: MissionHistoryScreenProps) {
  const [openKey, setOpenKey] = useState<string | null>(null)
  const recordKey = (record: CompletedMissionRecord) => record.runId ?? `${record.id}-${record.completedAt}`
  const ordered = [...records, ...transitLogRecords(player ?? {})].sort((a, b) => b.completedAt - a.completedAt)
  const missionEntries = ordered.filter(record => record.kind !== 'transit').length
  const lifetimeCompleted = Math.max(player?.missionsDone ?? 0, missionEntries)

  const clientRuns = ordered.filter(record => record.kind !== 'transit' && record.kind !== 'program').length
  const ownRuns = ordered.filter(record => record.kind === 'program').length
  const transits = ordered.filter(record => record.kind === 'transit').length
  const legacyCompleted = Math.max(0, lifetimeCompleted - missionEntries)

  return (
    <section className={styles.screen} data-testid="mission-history-screen">
      <BoardFrame header={<div className={styles.header}>
        <button type="button" onClick={onBack} aria-label="Back to base">Back</button>
        <h1>Agency Hub</h1>
      </div>}>
      <div className={styles.shell}>
      <aside className={styles.overview}>
        <h2>{player?.activeMission ? 'Your flight is in progress' : 'Start your next mission'}</h2>
        <p>{player?.activeMission?.label ?? 'Choose a client contract or plan a flight for your agency.'}</p>
        {onResumeMission && <button type="button" className={styles.primary} data-testid="agency-resume-mission" onClick={onResumeMission}>Resume mission</button>}
        <button type="button" className={onResumeMission ? styles.secondary : styles.primary} data-testid="agency-new-mission" onClick={onNewMission}>New mission</button>
        <div className={styles.stats}>
          <p className={styles.stat}><span className={styles.count}>{lifetimeCompleted}</span><strong>MISSIONS COMPLETED</strong></p>
          <p className={styles.stat}><span className={styles.count}>{clientRuns}</span><strong>CLIENT RUNS</strong></p>
          <p className={styles.stat}><span className={styles.count}>{ownRuns}</span><strong>OWN RUNS</strong></p>
          <p className={styles.stat}><span className={styles.count}>{transits}</span><strong>TRANSITS</strong></p>
        </div>
      </aside>
      <div className={styles.history}>
        <h2>Mission log</h2>
        {Object.keys(player?.legacyDiscoveredBodies ?? {}).length > 0 && (
          <div className={styles.empty}>
            <div className={styles.emptyKicker}>Star Sailors discoveries</div>
            {Object.entries(player?.legacyDiscoveredBodies ?? {}).map(([id, body]) => (
              <p key={id} className={styles.emptyMessage}>
                Body #{body.anomalyId} · Discovered{body.rover ? ' · Rover on site' : ''}
              </p>
            ))}
          </div>
        )}
        {ordered.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyKicker}>Archive status</div>
            <p className={styles.emptyMessage}>
              {legacyCompleted > 0
                ? `${legacyCompleted} completed ${legacyCompleted === 1 ? 'mission predates' : 'missions predate'} detailed mission records. New missions will appear here with their full debrief.`
                : 'No completed missions yet. Choose a contract from the Mission Board to start your log.'}
            </p>
          </div>
        ) : (
          <div className={styles.list}>
            {ordered.map((record, index) => {
              const key = recordKey(record)
              const open = openKey === key
              const mission = missions.find(item => item.id === record.id)
              const title = canonicalSaturnLabel(record.title)
              const place = vistaTarget(record, missions, targets)
              return (
                <article className={styles.record} key={key} data-open={open || undefined} >
                  <button type="button" className={styles.recordButton} aria-expanded={open} data-testid={`mission-log-entry-${index}`} onClick={() => setOpenKey(open ? null : key)}>
                    <DestinationLandscape className={styles.vista} variant="card" target={place} />
                    <span className={styles.recordCopy}>
                      <span className={styles.index}>{String(ordered.length - index).padStart(2, '0')}</span>
                      <span className={styles.recordTitle}>{title}</span>
                      <span className={styles.recordMeta}>{record.kind === 'transit' ? 'TRANSIT TELESCOPE' : record.kind === 'program' ? 'OWN PROGRAM' : record.clientName ?? 'CLIENT OPERATION'}{record.targetName ? ` · ${record.targetName}` : ''}</span>
                      <time className={styles.date} dateTime={new Date(record.completedAt).toISOString()}>{formatCompletedAt(record.completedAt)}</time>
                    </span>
                  </button>
                  {open && (
                    <div className={styles.debrief} data-testid="mission-log-debrief">
                      <div className={styles.kicker}>Debrief</div>
                      <p>{record.kind === 'transit' ? 'You classified a light curve from your Space Telescope.' : mission ? canonicalSaturnLabel(mission.brief) : 'Filed to your record.'}</p>
                      <dl>
                        <div><dt>Result</dt><dd>Completed {formatCompletedAt(record.completedAt)}</dd></div>
                        {record.targetName && <div><dt>{record.kind === 'transit' ? 'Verdict' : 'Target'}</dt><dd>{record.targetName}</dd></div>}
                        {mission && record.kind !== 'program' && mission.payout.francs > 0 && <div><dt>Payout</dt><dd>{formatCurrency(mission.payout.francs)}</dd></div>}
                      </dl>
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </div>
      </div>
      </BoardFrame>
    </section>
  )
}
