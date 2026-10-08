'use client'

import type { CompletedMissionRecord, Player } from '@/lib/game-types'
import { useState } from 'react'
import type { Client, Mission, Target } from '@/lib/data'
import { formatCurrency } from '@/lib/format'
import { canonicalSaturnLabel } from '@/lib/saturn-label'
import styles from './MissionHistoryScreen.module.css'

interface MissionHistoryScreenProps {
  records: CompletedMissionRecord[]
  clients?: Record<string, Client>
  targets?: Target[]
  /** Catalog missions, so an entry can show its brief and payout in the debrief. */
  missions?: Mission[]
  player?: Player
  onBack: () => void
}

function formatCompletedAt(value: number): string {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return 'DATE UNKNOWN'
  return date.toISOString().slice(0, 10)
}

export default function MissionHistoryScreen({ records, missions = [], player, onBack }: MissionHistoryScreenProps) {
  const [openKey, setOpenKey] = useState<string | null>(null)
  const recordKey = (record: CompletedMissionRecord) => record.runId ?? `${record.id}-${record.completedAt}`
  const ordered = [...records].sort((a, b) => b.completedAt - a.completedAt)
  // The detailed log below only holds the most recent runs (capped, and only
  // populated since this record-keeping shipped), so a long-lived account's
  // true lifetime count (missionsDone) can exceed ordered.length — show the
  // real total here rather than undercounting a veteran player's history.
  const lifetimeCompleted = Math.max(player?.missionsDone ?? 0, ordered.length)
  const logIsPartial = lifetimeCompleted > ordered.length

  return (
    <section className="theme-light" data-testid="mission-history-screen" style={{ position: 'relative', minHeight: '100%', background: 'var(--ln-void)' }}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div><div className={styles.eyebrow}>BASE · MISSION LOG</div><h1>Mission Log</h1><p>A concise record of completed client work and program operations.</p></div>
          <button className={styles.backButton} onClick={onBack}>Back to base</button>
        </header>
        <nav className={styles.tabs} aria-label="Mission log sections"><a className={styles.tabActive} href="#operations">Operations <span>{lifetimeCompleted}</span></a></nav>
        <section className={styles.summary} id="operations"><span className={styles.count}>{lifetimeCompleted}</span><span><strong>MISSIONS COMPLETED</strong><br />{logIsPartial ? 'Detailed entries below cover your most recent operations.' : 'Your record stays available after the daily contract board refreshes.'}</span></section>
        {ordered.length === 0 ? <div className={styles.empty}>No completed missions yet. Choose a contract from the Mission Board to start your log.</div> : <div className={styles.list}>{ordered.map((record, index) => {
          const key = recordKey(record)
          const open = openKey === key
          const mission = missions.find(item => item.id === record.id)
          const title = canonicalSaturnLabel(record.title)
          return (
            <article className={styles.record} key={key} data-open={open || undefined} style={{ flexWrap: 'wrap' }}>
              <button type="button" className={styles.recordButton} aria-expanded={open} data-testid={`mission-log-entry-${index}`} onClick={() => setOpenKey(open ? null : key)}>
                <span className={styles.index}>{String(ordered.length - index).padStart(2, '0')}</span>
                <span className={styles.recordCopy}><span className={styles.recordTitle}>{title}</span><span className={styles.recordMeta}>{record.kind === 'program' ? 'OWN PROGRAM' : record.clientName ?? 'CLIENT OPERATION'}{record.targetName ? ` · ${record.targetName}` : ''}</span></span>
                <time className={styles.date} dateTime={new Date(record.completedAt).toISOString()}>{formatCompletedAt(record.completedAt)}</time>
              </button>
              {open && (
                <div className={styles.debrief} data-testid="mission-log-debrief">
                  <div className={styles.eyebrow}>DEBRIEF</div>
                  <p>{mission ? canonicalSaturnLabel(mission.brief) : 'This operation was completed and filed to your record.'}</p>
                  <dl>
                    <div><dt>Result</dt><dd>Completed {formatCompletedAt(record.completedAt)}</dd></div>
                    {record.targetName && <div><dt>Target</dt><dd>{record.targetName}</dd></div>}
                    <div><dt>Type</dt><dd>{record.kind === 'program' ? 'Own program, no client' : record.clientName ?? 'Client operation'}</dd></div>
                    {mission && record.kind !== 'program' && mission.payout.francs > 0 && <div><dt>Payout</dt><dd>{formatCurrency(mission.payout.francs)}</dd></div>}
                    {mission?.programReward && <div><dt>Outcome</dt><dd>{canonicalSaturnLabel(mission.programReward.outcome)}</dd></div>}
                  </dl>
                </div>
              )}
            </article>
          )
        })}</div>}
      </div>
    </section>
  )
}
