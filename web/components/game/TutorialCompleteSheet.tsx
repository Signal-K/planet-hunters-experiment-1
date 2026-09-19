'use client'

import { useState } from 'react'
import type { ProgramFocus } from '@/lib/game-types'
import PageSurface from '@/components/ui/PageSurface'
import styles from './TutorialCompleteSheet.module.css'

const FOCUSES: Array<{ id: ProgramFocus; label: string; body: string }> = [
  { id: 'client-contracts', label: 'Client contracts', body: 'Mine and deliver paid orders while building relationships with repeat clients.' },
  { id: 'mining', label: 'Independent mining', body: 'Choose your own targets, keep the ore, and decide when to sell it.' },
  { id: 'instruments', label: 'Science instruments', body: 'Launch persistent tools and work with real observation datasets.' },
  { id: 'construction', label: 'Program construction', body: 'Build storage and permanent off-world infrastructure for your own program.' },
]

interface TutorialCompleteSheetProps {
  onDone: (focuses: ProgramFocus[]) => void
  onBuildSilo: (focuses: ProgramFocus[]) => void
}

/** The guided handoff is a choice, not a dismissal. Focus areas tune the
 * Launchpad's first Free Operations menu; an empty selection is explicit
 * free-form mode and leaves every operation visible. */
export function TutorialCompleteSheet({ onDone, onBuildSilo }: TutorialCompleteSheetProps) {
  const [choosing, setChoosing] = useState(false)
  const [selected, setSelected] = useState<ProgramFocus[]>(['construction'])

  const toggle = (focus: ProgramFocus) => setSelected(current => current.includes(focus)
    ? current.filter(value => value !== focus)
    : [...current, focus])

  return (
    <PageSurface zIndex={200} contentClassName={styles.surface} testId="tutorial-complete-sheet">
      {!choosing ? (
        <section className={styles.intro}>
          <span className={styles.eyebrow}>GUIDED OPERATIONS COMPLETE</span>
          <h1>Your program starts here</h1>
          <p>You can now choose client work, mine for yourself, launch science instruments, or build permanent infrastructure. First, tell Mission Control what you want close at hand.</p>
          <button type="button" className={styles.primary} onClick={() => setChoosing(true)}>START MY PROGRAM</button>
        </section>
      ) : (
        <section className={styles.chooser}>
          <div className={styles.heading}>
            <span className={styles.eyebrow}>YOUR PROGRAM · FOCUS AREAS</span>
            <h1>What do you want to do next?</h1>
            <p>Choose any combination. These become your subscribed operations on the Launchpad; you can still reveal everything at any time.</p>
          </div>
          <div className={styles.focusGrid}>
            {FOCUSES.map(focus => {
              const active = selected.includes(focus.id)
              return <button key={focus.id} type="button" className={styles.focus} data-active={active} aria-pressed={active} onClick={() => toggle(focus.id)}>
                <span className={styles.selector} aria-hidden="true" />
                <strong>{focus.label}</strong>
                <span>{focus.body}</span>
              </button>
            })}
          </div>
          <aside className={styles.siloRecommendation}>
            <div><span>RECOMMENDED FIRST BUILD</span><strong>Build an Earth silo</strong><p>A silo lets you keep ore instead of selling every haul immediately. It is the foundation for fabrication and larger construction.</p></div>
            <button type="button" onClick={() => onBuildSilo(selected)}>BUILD A SILO FIRST</button>
          </aside>
          <div className={styles.actions}>
            <button type="button" className={styles.secondary} onClick={() => onDone([])}>USE FREE-FORM PROGRAM</button>
            <button type="button" className={styles.primary} onClick={() => onDone(selected)} disabled={selected.length === 0}>SAVE FOCUS AREAS</button>
          </div>
        </section>
      )}
    </PageSurface>
  )
}
