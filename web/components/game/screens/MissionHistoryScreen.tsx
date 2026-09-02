'use client'

import type { CompletedMissionRecord, Player } from '@/lib/game-types'
import type { Client, Target } from '@/lib/data'
import styles from './MissionHistoryScreen.module.css'

interface MissionHistoryScreenProps {
  records: CompletedMissionRecord[]
  clients?: Record<string, Client>
  targets?: Target[]
  player?: Player
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
    <section className="screen-scroll theme-light" data-testid="mission-history-screen">
      <div className={styles.shell}>
        <header className={styles.header}>
          <div><div className={styles.eyebrow}>BASE · MISSION LOG</div><h1>Mission Log</h1><p>A concise record of completed client work and program operations.</p></div>
          <button className={styles.backButton} onClick={onBack}>Back to base</button>
        </header>
        <nav className={styles.tabs} aria-label="Mission log sections"><a className={styles.tabActive} href="#operations">Operations <span>{ordered.length}</span></a></nav>
        <section className={styles.summary} id="operations"><span className={styles.count}>{ordered.length}</span><span><strong>MISSIONS COMPLETED</strong><br />Your record stays available after the daily contract board refreshes.</span></section>
        {ordered.length === 0 ? <div className={styles.empty}>No completed missions yet. Choose a contract from the Mission Board to start your log.</div> : <div className={styles.list}>{ordered.map((record, index) => <article className={styles.record} key={record.runId ?? `${record.id}-${record.completedAt}`}><span className={styles.index}>{String(ordered.length - index).padStart(2, '0')}</span><div className={styles.recordCopy}><div className={styles.recordTitle}>{record.title}</div><div className={styles.recordMeta}>{record.kind === 'program' ? 'OWN PROGRAM' : record.clientName ?? 'CLIENT OPERATION'}{record.targetName ? ` · ${record.targetName}` : ''}</div></div><time className={styles.date} dateTime={new Date(record.completedAt).toISOString()}>{formatCompletedAt(record.completedAt)}</time></article>)}</div>}
      </div>
    </section>
  )
}
