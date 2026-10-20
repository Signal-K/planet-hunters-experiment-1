import Link from 'next/link'
import { WorldBackdrop } from '@/components/game/hub/WorldBackdrop'
import { PRODUCT_DESCRIPTOR, PRODUCT_WORDMARK } from '@/lib/brand'
import { SCENE_NAMES } from '@/lib/ui-strings'
import styles from './landing.module.css'

const PILLARS = [
  { tag: '01', name: 'Build', line: 'Grow one launchpad into a hangar, an exchange and a fleet.' },
  { tag: '02', name: 'Fly', line: 'Choose a rocket, fly the transit and land on real worlds.' },
  { tag: '03', name: 'Discover', line: 'Your instruments feed real science back to your agency.' },
]

export default function Home() {
  return (
    <main className={`theme-blueprint ${styles.page}`} data-testid="landnam-landing">
      <WorldBackdrop />
      <div className={styles.shade} aria-hidden="true" />

      <header className={styles.top}>
        <span className={styles.brand}>{PRODUCT_WORDMARK}<i>{PRODUCT_DESCRIPTOR}</i></span>
        <Link className={styles.signin} href="/game" data-testid="landing-sign-in">Sign in</Link>
      </header>

      <section className={styles.hero} aria-labelledby="landing-title">
        <p className={styles.eyebrow} aria-label={`${SCENE_NAMES.base} growing from one launchpad into an operating space programme`}>Base growing from one launchpad</p>
        <h1 className={styles.title} id="landing-title">Run your space agency.</h1>
        <p className={styles.copy}>Build new rockets and settle the galaxy using real science.</p>
        <div className={styles.actions}>
          <Link className={styles.primary} href="/game" data-testid="landing-enter-operations">Continue</Link>
          <Link className={styles.secondary} href="/game?gate=signup" data-testid="landing-create-account">Start new game</Link>
        </div>
        <aside className={styles.event} aria-label="Orionids event">
          <div>
            <span>ORIONIDS LIVE</span>
            <strong>Fly through the meteor shower</strong>
            <p>Start with one guided launch, catch fragments and keep the badge in your full Landnam game.</p>
          </div>
          <Link className={styles.eventCta} href="/game?entry=orionids&amp;gate=signup" data-testid="landing-orionids">
            FLY THE ORIONIDS
          </Link>
        </aside>
      </section>

      <ol className={styles.pillars}>
        {PILLARS.map(p => (
          <li key={p.tag}><span>{p.tag}</span><b>{p.name}</b><em>{p.line}</em></li>
        ))}
      </ol>
    </main>
  )
}
