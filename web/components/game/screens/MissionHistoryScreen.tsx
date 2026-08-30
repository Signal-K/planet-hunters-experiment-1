'use client'

import type { CompletedMissionRecord } from '@/lib/game-types'
import styles from './MissionHistoryScreen.module.css'

interface MissionHistoryScreenProps {
  records: CompletedMissionRecord[]
  onBack: () => void
}

function formatCompletedAt(value: number): string {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return 'DATE UNKNOWN'
  return date.toISOString().slice(0, 10)
}

export default function MissionHistoryScreen({ records, onBack }: MissionHistoryScreenProps) {
  const ordered = [...records].sort((a, b) => b.completedAt - a.completedAt)

  return (
    <section className="screen-scroll theme-deep" data-testid="mission-history-screen">
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <div className={styles.eyebrow}>EARTH BASE · MISSION LOG</div>
            <h1>Completed missions</h1>
            <p>Every contract and program operation your base has brought home.</p>
          </div>
          <button className={styles.backButton} onClick={onBack}>Back to base</button>
        </header>

        <div className={styles.summary}>
          <span className={styles.count}>{ordered.length}</span>
          <span><strong>MISSIONS COMPLETED</strong><br />Your record stays available after the daily contract board refreshes.</span>
        </div>

        {ordered.length === 0 ? (
          <div className={styles.empty}>No completed missions yet. Choose a contract from the Mission Board to start your log.</div>
        ) : (
          <div className={styles.list}>
            {ordered.map((record, index) => (
              <article className={styles.record} key={record.runId ?? `${record.id}-${record.completedAt}`}>
                <span className={styles.index}>{String(ordered.length - index).padStart(2, '0')}</span>
                <div className={styles.recordCopy}>
                  <div className={styles.recordTitle}>{record.title}</div>
                  <div className={styles.recordMeta}>
                    {record.kind === 'program' ? 'OWN PROGRAM' : record.clientName ?? 'CLIENT OPERATION'}
                    {record.targetName ? ` · ${record.targetName}` : ''}
                  </div>
                </div>
                <time className={styles.date} dateTime={new Date(record.completedAt).toISOString()}>{formatCompletedAt(record.completedAt)}</time>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
