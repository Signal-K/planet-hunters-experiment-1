'use client'

import type { CompletedMissionRecord, Player } from '@/lib/game-types'
import { useEffect, useState } from 'react'
import type { Client, Mission, Target } from '@/lib/data'
import { formatCurrency } from '@/lib/format'
import { canonicalSaturnLabel } from '@/lib/saturn-label'
import { transitLogRecords } from '@/lib/mission-log'
import { BaseWorldCanvas } from '@/components/game/hub/BaseWorldCanvas'
import { useTimeOfDay } from '@/lib/hooks/useTimeOfDay'
import { BASE_CAMERA_HOME } from '@/lib/scene/base-camera'
import { kitScale } from '@/lib/scene/base-site'
import { sanitizeEarthBiome } from '@/lib/scene/base-world'
import DestinationLandscape, { type VistaTarget } from '@/components/game/screens/DestinationLandscape'
import styles from './MissionHistoryScreen.module.css'

interface MissionHistoryScreenProps {
  records: CompletedMissionRecord[]
  clients?: Record<string, Client>
  targets?: Target[]
  missions?: Mission[]
  player?: Player
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

export default function MissionHistoryScreen({ records, targets = [], missions = [], player, onBack }: MissionHistoryScreenProps) {
  const [openKey, setOpenKey] = useState<string | null>(null)
  const recordKey = (record: CompletedMissionRecord) => record.runId ?? `${record.id}-${record.completedAt}`
  const ordered = [...records, ...transitLogRecords(player ?? {})].sort((a, b) => b.completedAt - a.completedAt)
  const missionEntries = ordered.filter(record => record.kind !== 'transit').length
  const lifetimeCompleted = Math.max(player?.missionsDone ?? 0, missionEntries)

  const { grade } = useTimeOfDay()
  const [view, setView] = useState({ w: 1440, h: 900 })
  // The panel paints first; the world behind it starts after, so opening the log never waits on the scene.
  const [backdropReady, setBackdropReady] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setBackdropReady(true))
    return () => cancelAnimationFrame(id)
  }, [])
  useEffect(() => {
    const measure = () => setView({ w: window.innerWidth, h: window.innerHeight })
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])
  const clientRuns = ordered.filter(record => record.kind !== 'transit' && record.kind !== 'program').length
  const ownRuns = ordered.filter(record => record.kind === 'program').length
  const transits = ordered.filter(record => record.kind === 'transit').length
  const legacyCompleted = Math.max(0, lifetimeCompleted - missionEntries)

  return (
    <section className={styles.screen} data-testid="mission-history-screen">
      <div className={styles.backdrop} aria-hidden="true">
        {backdropReady && <BaseWorldCanvas px={kitScale(view)} camera={BASE_CAMERA_HOME} time={grade} biome={sanitizeEarthBiome(player?.earthBiome)} />}
      </div>
      <div className={styles.shell}>
        <div className={styles.plaque}>Mission log</div>
        <button type="button" className={styles.backButton} onClick={onBack} aria-label="Back to base">Back</button>
        <div className={styles.stats}>
          <p className={styles.stat}><span className={styles.count}>{lifetimeCompleted}</span><strong>MISSIONS COMPLETED</strong></p>
          <p className={styles.stat}><span className={styles.count}>{clientRuns}</span><strong>CLIENT RUNS</strong></p>
          <p className={styles.stat}><span className={styles.count}>{ownRuns}</span><strong>OWN RUNS</strong></p>
          <p className={styles.stat}><span className={styles.count}>{transits}</span><strong>TRANSITS</strong></p>
        </div>
        {ordered.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptySlots} aria-hidden="true"><span /><span /><span /></div>
            {legacyCompleted > 0
              ? `${legacyCompleted} completed ${legacyCompleted === 1 ? 'mission predates' : 'missions predate'} detailed mission records. New missions will appear here with their full debrief.`
              : 'No completed missions yet. Choose a contract from the Mission Board to start your log.'}
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
                <article className={styles.record} key={key} data-open={open || undefined} data-surface="cream">
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
    </section>
  )
}
