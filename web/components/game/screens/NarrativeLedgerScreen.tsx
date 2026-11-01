'use client'

import { useState } from 'react'
import { NARRATIVE_LEDGER, type NarrativeLedgerState } from '@/lib/data/narrative-ledger'
import styles from './NarrativeLedgerScreen.module.css'

interface NarrativeLedgerScreenProps {
  onBack: () => void
}

// Liam, 31.10: "too complex, no rhyme or reason". One rule organises it: what state is it in?
// Pick a state on the left, pick an entry, read it on the right. Two-tone template.
const STATES: Array<{ id: NarrativeLedgerState; label: string; blurb: string }> = [
  { id: 'live', label: 'Live', blurb: 'In the game now.' },
  { id: 'adapt', label: 'Adapting', blurb: 'Partly built. Being reshaped.' },
  { id: 'planned', label: 'Planned', blurb: 'The roadmap. Some were built once and removed.' },
]

const DAILY_LOOP = ['You build for clients', 'Client XP updates', 'Next-day demand is set', 'Market prices refresh']
const LOOP_ENTRIES = new Set(['client-growth', 'market'])

export default function NarrativeLedgerScreen({ onBack }: NarrativeLedgerScreenProps) {
  const [state, setState] = useState<NarrativeLedgerState>('live')
  const entries = NARRATIVE_LEDGER.filter(entry => entry.state === state)
  const [pickedId, setPickedId] = useState<string | null>(null)
  const picked = entries.find(entry => entry.id === pickedId) ?? entries[0]
  const blurb = STATES.find(s => s.id === state)?.blurb

  return (
    <section className={styles.scene} data-testid="narrative-ledger-screen">
      <button type="button" className={styles.back} data-testid="ledger-back" onClick={onBack}>‹ Back</button>

      <div className={styles.left}>
        <h2 className={styles.title}>Narrative ledger</h2>
        <div className={styles.tabs} role="tablist" aria-label="Build state">
          {STATES.map(s => (
            <button key={s.id} type="button" role="tab" className={styles.tab} aria-selected={state === s.id} data-state={s.id}
              data-testid={`ledger-state-${s.id}`} onClick={() => { setState(s.id); setPickedId(null) }}>
              {s.label} <b>{NARRATIVE_LEDGER.filter(entry => entry.state === s.id).length}</b>
            </button>
          ))}
        </div>
        <p className={styles.blurb}>{blurb}</p>
        <ul className={styles.rows}>
          {entries.map(entry => (
            <li key={entry.id}>
              <button type="button" className={styles.row} data-selected={picked?.id === entry.id} data-testid={`ledger-entry-${entry.id}`} onClick={() => setPickedId(entry.id)}>
                <b>{entry.title}</b>
                <small>{entry.playerVerb}</small>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <article className={styles.right} data-testid="ledger-detail" data-state={picked?.state}>
        {picked && <>
          <span className={styles.eyebrow}>{picked.owner} · {picked.cadence}</span>
          <h3 className={styles.name}>{picked.title}</h3>
          <p className={styles.verb}>{picked.playerVerb}</p>
          <p className={styles.purpose}>{picked.purpose}</p>
          {LOOP_ENTRIES.has(picked.id) && (
            <ol className={styles.loop} aria-label="Daily loop, 00:01 AEST">
              {DAILY_LOOP.map(step => <li key={step}>{step}</li>)}
            </ol>
          )}
          <div className={styles.block}>
            <span className={styles.label}>Depends on</span>
            <ul className={styles.chips}>{picked.dependencies.map(dep => <li key={dep}>{dep}</li>)}</ul>
          </div>
          <div className={styles.block}>
            <span className={styles.label}>{picked.state === 'live' ? 'What is built' : picked.state === 'adapt' ? 'What is missing' : 'History and plan'}</span>
            <p className={styles.impl}>{picked.implementation}</p>
          </div>
        </>}
      </article>
    </section>
  )
}
