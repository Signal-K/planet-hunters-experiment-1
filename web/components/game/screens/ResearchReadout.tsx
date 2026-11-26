import type { ReactNode } from 'react'
import styles from './ResearchReadout.module.css'

export default function ResearchReadout({ title, description, completed, total, action, onAction, children }: {
  title: string
  description: string
  completed: number
  total: number
  action: string
  onAction: () => void
  children: ReactNode
}) {
  return <section className={styles.panel} data-testid="research-readout">
    <header className={styles.heading}>
      <h2>{title}</h2>
      <p>{description}</p>
      <div className={styles.progress}><span>Weekly path</span><span>{completed} / {total}</span></div>
      <progress value={completed} max={total} aria-label="Weekly path completion" />
    </header>
    <div className={styles.content} data-testid="research-readout-content">{children}</div>
    <footer className={styles.footer}><button type="button" data-testid="research-primary-action" onClick={onAction}>{action}</button></footer>
  </section>
}
