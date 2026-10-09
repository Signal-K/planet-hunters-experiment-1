'use client'

import { useEffect, useRef } from 'react'
import type { HelpTopic } from '@/lib/help/topics'
import styles from './HelpSheet.module.css'

interface HelpSheetProps {
  topic: HelpTopic
  onClose: () => void
  /** Offered when the topic has a "Show me" run. */
  onShowMe?: () => void
  /** Offered when the screen has an active training try. */
  onReplayTraining?: () => void
}

/**
 * Shared help sheet (SSL-432): bottom sheet on phones, right panel on
 * desktop. Closes with the Close button, Esc, or a tap outside the sheet.
 */
export default function HelpSheet({ topic, onClose, onShowMe, onReplayTraining }: HelpSheetProps) {
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.stopPropagation(); onClose() }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose])

  return (
    <div className={styles.scrim} data-testid="help-scrim" onClick={event => { if (event.target === event.currentTarget) onClose() }}>
      <section className={styles.sheet} role="complementary" aria-label={topic.title} data-testid="help-sheet">
        <header className={styles.head}>
          <span className={styles.badge} aria-hidden="true">OPS</span>
          <div className={styles.titleBlock}><span className={styles.kicker}>OPS BRIEFING</span><h2 className={styles.title}>{topic.title}</h2></div>
          <button ref={closeRef} type="button" className={styles.close} data-testid="help-close" onClick={onClose}>Close</button>
        </header>
        <div className={styles.body}>
          {topic.cards.map((card, index) => (
            <article key={card.title} className={styles.card} data-testid="help-card">
              {card.image && <img src={card.image.src} alt={card.image.alt} />}
              <h3><span className={styles.num}>{String(index + 1).padStart(2, '0')}</span> {card.title}</h3>
              <p>{card.body}</p>
            </article>
          ))}
        </div>
        {(onShowMe || onReplayTraining) && (
          <footer className={styles.foot}>
            {onShowMe && (
              <button type="button" className={`${styles.action} ${styles.primary}`} data-testid="help-show-me" onClick={onShowMe}>Show me</button>
            )}
            {onReplayTraining && (
              <>
                <p className={styles.note}>You can also replay this in Menu &gt; Training.</p>
                <button type="button" className={styles.action} data-testid="help-replay-training" onClick={onReplayTraining}>Replay in Menu &gt; Training</button>
              </>
            )}
          </footer>
        )}
      </section>
    </div>
  )
}
