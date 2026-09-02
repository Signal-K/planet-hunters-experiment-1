'use client'

import { NARRATIVE_LEDGER, NARRATIVE_LEDGER_STATE_LABEL, type NarrativeLedgerState } from '@/lib/data/narrative-ledger'
import styles from './NarrativeLedgerScreen.module.css'

interface NarrativeLedgerScreenProps {
  onBack: () => void
}

const STATE_ORDER: NarrativeLedgerState[] = ['live', 'adapt', 'planned']

export default function NarrativeLedgerScreen({ onBack }: NarrativeLedgerScreenProps) {
  const stateCounts = STATE_ORDER.map(state => ({
    state,
    count: NARRATIVE_LEDGER.filter(entry => entry.state === state).length,
  }))

  return (
    <section className="screen-scroll theme-deep" data-testid="narrative-ledger-screen">
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <div className={styles.eyebrow}>KES-285 · INTERNAL PRODUCT MAP</div>
            <h1>Narrative Ledger</h1>
            <p>One source of truth for the player promise, the systems behind it, and what is actually built.</p>
          </div>
          <button className={styles.backButton} onClick={onBack}>Back to base</button>
        </header>

        <section className={styles.command} aria-labelledby="launch-day-title">
          <div>
            <div className={styles.eyebrow}>THE PLAYER-FACING RULE</div>
            <h2 id="launch-day-title">What do I launch today?</h2>
            <p>Every meaningful session starts with one decision. The choices stay visible; the systems behind them stay out of the way.</p>
          </div>
          <div className={styles.actions} aria-label="Launch day choices">
            <span>CLIENT WORK</span><span>OWN INFRA</span><span>MINING</span><span>TEST LAUNCH</span>
          </div>
        </section>

        <section className={styles.cycle} aria-labelledby="cycle-title">
          <div className={styles.sectionHeading}>
            <div><div className={styles.eyebrow}>DAILY ECONOMY LOOP</div><h2 id="cycle-title">A small loop, not a 4X system</h2></div>
            <span className={styles.cycleTiming}>00:01 AEST · SCHEDULED</span>
          </div>
          <ol className={styles.flow}>
            <li><strong>1</strong><span>PLAYER BUILDS<br />FOR CLIENTS</span></li>
            <li><strong>2</strong><span>CLIENT XP<br />UPDATES</span></li>
            <li><strong>3</strong><span>NEXT-DAY DEMAND<br />IS SET</span></li>
            <li><strong>4</strong><span>MARKET PRICES<br />REFRESH</span></li>
            <li><strong>5</strong><span>SITE REVENUE<br />FUNDS TREASURY</span></li>
          </ol>
        </section>

        <section className={styles.inventory} aria-labelledby="inventory-title">
          <div className={styles.sectionHeading}>
            <div><div className={styles.eyebrow}>COMPONENT INVENTORY</div><h2 id="inventory-title">Narrative components</h2></div>
            <div className={styles.stateSummary} aria-label="Implementation state summary">
              {stateCounts.map(({ state, count }) => <span className={styles[`state_${state}`]} key={state}>{count} {NARRATIVE_LEDGER_STATE_LABEL[state]}</span>)}
            </div>
          </div>
          <div className={styles.grid}>
            {NARRATIVE_LEDGER.map(entry => (
              <article className={styles.card} key={entry.id}>
                <div className={styles.cardTop}>
                  <span className={styles.owner}>{entry.owner}</span>
                  <span className={styles[`state_${entry.state}`]}>{NARRATIVE_LEDGER_STATE_LABEL[entry.state]}</span>
                </div>
                <h3>{entry.title}</h3>
                <p className={styles.verb}>{entry.playerVerb}</p>
                <p>{entry.purpose}</p>
                <dl>
                  <div><dt>CADENCE</dt><dd>{entry.cadence}</dd></div>
                  <div><dt>DEPENDS ON</dt><dd>{entry.dependencies.join(' · ')}</dd></div>
                </dl>
                <p className={styles.implementation}>{entry.implementation}</p>
              </article>
            ))}
          </div>
        </section>

        <footer className={styles.footer}>
          <span className={styles.footerMark} />
          <p>Rule for future work: every new mechanic must name its player verb, owner, cadence, dependencies, and whether it is live, adapting, or planned before it enters the game.</p>
        </footer>
      </div>
    </section>
  )
}
